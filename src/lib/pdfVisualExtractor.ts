/**
 * Advanced PDF Visual Asset Extractor
 * 
 * Extracts high-fidelity emblems, logos, stamps (печати), facsimiles/signatures (подписи),
 * and diagrams from PDF documents for lossless inclusion into Microsoft Word (.docx).
 * 
 * Features:
 * 1. Embedded Image XObject extraction with coordinate transformation matrix (CTM) tracking.
 * 2. Visual / Chroma-key segmentation for stamps & signatures in scanned or flattened PDFs.
 * 3. Alpha-channel transparency preservation (removes white/paper background so stamps and
 *    signatures overlay text and lines authentically in Word).
 * 4. Automatic semantic classification: Emblem (header), Stamp (seal), Signature (facsimile), Inline.
 */

import { ImageBlock, ImageRole } from './documentModel';

interface TransformState {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

function defaultTransform(): TransformState {
  return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
}

function applyTransform(m: TransformState, t: number[]): TransformState {
  const [a2, b2, c2, d2, e2, f2] = t;
  return {
    a: m.a * a2 + m.c * b2,
    b: m.b * a2 + m.d * b2,
    c: m.a * c2 + m.c * d2,
    d: m.b * c2 + m.d * d2,
    e: m.a * e2 + m.c * f2 + m.e,
    f: m.b * e2 + m.d * f2 + m.f,
  };
}

/**
 * Converts HTMLCanvasElement to PNG Uint8Array
 */
export async function canvasToPngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))), 'image/png');
  });
  return new Uint8Array(await blob.arrayBuffer());
}

/**
 * Isolates stamp or signature ink by setting white/light paper background to transparent alpha.
 * Smoothly blends edge pixels for clean, anti-aliased outlines.
 */
export function applyInkTransparency(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const len = data.length;

  for (let i = 0; i < len; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a === 0) continue;

    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    // Detect white or near-white paper background
    if (lum >= 238) {
      data[i + 3] = 0; // Pure transparent
    } else if (lum >= 195) {
      // Soft gradient anti-aliasing
      const factor = (238 - lum) / 43;
      data[i + 3] = Math.round(a * factor);
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

/**
 * Checks if a pixel color matches official stamp ink (Blue, Purple, Violet, Cyan, Red)
 */
export function isStampInk(r: number, g: number, b: number): boolean {
  // Blue / Violet / Purple ink
  const isBlueViolet = b >= 80 && (b - r) >= 14 && (b - g) >= 8 && (r + g + b) < 670;
  // Red seal / Notary / Urgent stamp ink
  const isRedSeal = r >= 115 && (r - g) >= 28 && (r - b) >= 28 && (r + g + b) < 670;
  return isBlueViolet || isRedSeal;
}

/**
 * Extracts visual elements (emblems, stamps, signatures, images) from a single PDF page
 */
export async function extractVisualElementsFromPdfPage(
  page: any,
  viewport: any,
  pageNum: number,
  onProgress?: (text: string) => void
): Promise<ImageBlock[]> {
  const extractedBlocks: ImageBlock[] = [];
  const pageWidth = viewport.width;
  const pageHeight = viewport.height;

  // 1. Render the page onto a high-DPI canvas (2.0 scale)
  // This accomplishes two things:
  // a) PDF.js populates page.objs with all decoded image assets.
  // b) We have a pristine raster rendering for chroma/color stamp & signature segmentation.
  const scale = 2.0;
  const renderViewport = page.getViewport({ scale });
  const renderCanvas = document.createElement('canvas');
  renderCanvas.width = Math.round(renderViewport.width);
  renderCanvas.height = Math.round(renderViewport.height);
  const renderCtx = renderCanvas.getContext('2d', { willReadFrequently: true });

  if (renderCtx) {
    try {
      await page.render({ canvasContext: renderCtx, viewport: renderViewport }).promise;
    } catch (renderErr) {
      console.warn(`[VisualExtractor] Page ${pageNum} render warning:`, renderErr);
    }
  }

  // 2. Scan PDF Operator List for Image XObjects
  try {
    const opList = await page.getOperatorList();
    const fnArray: number[] = opList.fnArray || [];
    const argsArray: any[] = opList.argsArray || [];

    // PDF.js OPS constants
    const OPS_save = 10;
    const OPS_restore = 11;
    const OPS_transform = 12;
    const OPS_paintImageXObject = 85;
    const OPS_paintInlineImageXObject = 86;
    const OPS_paintImageMaskXObject = 83;

    const matrixStack: TransformState[] = [];
    let currentMatrix: TransformState = defaultTransform();

    for (let i = 0; i < fnArray.length; i++) {
      const fn = fnArray[i];
      const args = argsArray[i];

      if (fn === OPS_save) {
        matrixStack.push({ ...currentMatrix });
      } else if (fn === OPS_restore) {
        currentMatrix = matrixStack.pop() || defaultTransform();
      } else if (fn === OPS_transform && Array.isArray(args) && args.length >= 6) {
        currentMatrix = applyTransform(currentMatrix, args);
      } else if (
        fn === OPS_paintImageXObject ||
        fn === OPS_paintInlineImageXObject ||
        fn === OPS_paintImageMaskXObject
      ) {
        const objId = Array.isArray(args) ? args[0] : args;
        if (!objId || typeof objId !== 'string') continue;

        // Retrieve image data from page.objs or page.commonObjs
        let imgData: any = null;
        if (page.objs && page.objs.has(objId)) {
          imgData = page.objs.get(objId);
        } else if (page.commonObjs && page.commonObjs.has(objId)) {
          imgData = page.commonObjs.get(objId);
        } else if (page.objs) {
          try {
            imgData = await new Promise((res) => {
              const timer = setTimeout(() => res(null), 800);
              page.objs.get(objId, (data: any) => {
                clearTimeout(timer);
                res(data);
              });
            });
          } catch {
            imgData = null;
          }
        }

        if (!imgData) continue;

        const imgWidth = imgData.width || 100;
        const imgHeight = imgData.height || 100;

        // Compute physical coordinates on PDF page (in pt)
        const dispW = Math.hypot(currentMatrix.a, currentMatrix.b) || imgWidth;
        const dispH = Math.hypot(currentMatrix.c, currentMatrix.d) || imgHeight;
        const posX = currentMatrix.e;
        const posYPdf = currentMatrix.f;
        // In PDF coordinate space, (0,0) is bottom-left
        const posYTop = pageHeight - (posYPdf + dispH);

        // Skip background page wallpapers or full-page scans (>85% of page)
        if (dispW >= pageWidth * 0.85 && dispH >= pageHeight * 0.85) {
          continue;
        }

        // Skip tiny decorative specks (<12px)
        if (dispW < 12 || dispH < 12) {
          continue;
        }

        // Render extracted image to an offscreen canvas
        const imgCanvas = document.createElement('canvas');
        imgCanvas.width = imgWidth;
        imgCanvas.height = imgHeight;
        const imgCtx = imgCanvas.getContext('2d');
        if (!imgCtx) continue;

        if (imgData.bitmap) {
          imgCtx.drawImage(imgData.bitmap, 0, 0);
        } else if (imgData.data) {
          let imageDataObj: ImageData | null = null;
          const raw = imgData.data;
          const pixelCount = imgWidth * imgHeight;

          if (raw.length === pixelCount * 4) {
            imageDataObj = new ImageData(new Uint8ClampedArray(raw), imgWidth, imgHeight);
          } else if (raw.length === pixelCount * 3) {
            const rgba = new Uint8ClampedArray(pixelCount * 4);
            let s = 0, d = 0;
            while (s < raw.length) {
              rgba[d] = raw[s];
              rgba[d + 1] = raw[s + 1];
              rgba[d + 2] = raw[s + 2];
              rgba[d + 3] = 255;
              s += 3;
              d += 4;
            }
            imageDataObj = new ImageData(rgba, imgWidth, imgHeight);
          } else if (raw.length === pixelCount) {
            const rgba = new Uint8ClampedArray(pixelCount * 4);
            for (let p = 0; p < pixelCount; p++) {
              const val = raw[p];
              rgba[p * 4] = val;
              rgba[p * 4 + 1] = val;
              rgba[p * 4 + 2] = val;
              rgba[p * 4 + 3] = 255;
            }
            imageDataObj = new ImageData(rgba, imgWidth, imgHeight);
          }

          if (imageDataObj) {
            imgCtx.putImageData(imageDataObj, 0, 0);
          }
        }

        // Semantic Role Classification
        let role: ImageRole = 'inline';
        let alignment: 'left' | 'center' | 'right' = 'center';

        const isHeaderZone = posYTop <= pageHeight * 0.28;
        const isFooterZone = posYTop >= pageHeight * 0.45;
        const aspectRatio = dispW / (dispH || 1);

        if (isHeaderZone) {
          role = 'emblem';
          const centerX = posX + dispW / 2;
          if (Math.abs(centerX - pageWidth / 2) < pageWidth * 0.18) {
            alignment = 'center';
          } else if (posX < pageWidth * 0.35) {
            alignment = 'left';
          } else {
            alignment = 'right';
          }
        } else if (isFooterZone) {
          // Stamp (round or oval seal, typically ~60-220pt)
          if (aspectRatio >= 0.7 && aspectRatio <= 1.45 && dispW >= 40 && dispW <= 240) {
            role = 'stamp';
            // Apply transparency to remove white paper background
            applyInkTransparency(imgCtx, imgWidth, imgHeight);
          } else if (aspectRatio > 1.45 && dispH <= 120) {
            // Handwritten signature / Facsimile
            role = 'signature';
            applyInkTransparency(imgCtx, imgWidth, imgHeight);
          } else {
            role = 'inline';
          }
        }

        const pngBytes = await canvasToPngBytes(imgCanvas);

        extractedBlocks.push({
          type: 'image',
          y: Math.max(0, posYTop),
          data: pngBytes,
          format: 'png',
          width: Math.round(dispW),
          height: Math.round(dispH),
          x: Math.round(posX),
          role,
          alignment,
          pageNumber: pageNum,
          floating: (role === 'stamp' || role === 'signature') ? {
            x: Math.round(posX),
            y: Math.round(Math.max(0, posYTop)),
            allowOverlap: true,
            behindDocument: false,
          } : undefined,
          altText: role === 'emblem' ? 'Эмблема / Логотип' : (role === 'stamp' ? 'Печать организации' : 'Подпись'),
        });
      }
    }
  } catch (opErr) {
    console.warn(`[VisualExtractor] Error parsing operator list on page ${pageNum}:`, opErr);
  }

  // 3. Fallback / Augmentation: Chroma-based Stamp & Signature Segmentation
  // If no stamp was detected via image XObjects (e.g. document was scanned or printed to PDF),
  // detect blue / purple / red ink stamps directly on the rendered canvas!
  const hasStampXObject = extractedBlocks.some(b => b.role === 'stamp');

  if (renderCtx && !hasStampXObject) {
    try {
      const renderW = renderCanvas.width;
      const renderH = renderCanvas.height;
      const startY = Math.round(renderH * 0.40); // Bottom 60% of page
      const sampleStep = 2; // Fast sub-sampling

      const regionImageData = renderCtx.getImageData(0, startY, renderW, renderH - startY);
      const data = regionImageData.data;

      let minX = renderW;
      let maxX = 0;
      let minY = renderH - startY;
      let maxY = 0;
      let stampPixelCount = 0;

      for (let y = 0; y < renderH - startY; y += sampleStep) {
        const rowOffset = y * renderW * 4;
        for (let x = 0; x < renderW; x += sampleStep) {
          const idx = rowOffset + x * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];

          if (isStampInk(r, g, b)) {
            stampPixelCount++;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      // Check if cluster is large enough to constitute an official seal (>= 150 sampled pixels)
      if (stampPixelCount >= 150 && maxX > minX && maxY > minY) {
        const cropW = (maxX - minX) + 16;
        const cropH = (maxY - minY) + 16;
        const cropX = Math.max(0, minX - 8);
        const cropY = startY + Math.max(0, minY - 8);

        const ptW = cropW / scale;
        const ptH = cropH / scale;
        const ptX = cropX / scale;
        const ptY = cropY / scale;

        // Ensure dimensions match realistic stamp bounds (40pt - 260pt)
        if (ptW >= 40 && ptW <= 260 && ptH >= 40 && ptH <= 260) {
          const stampCanvas = document.createElement('canvas');
          stampCanvas.width = Math.round(cropW);
          stampCanvas.height = Math.round(cropH);
          const stampCtx = stampCanvas.getContext('2d');

          if (stampCtx) {
            stampCtx.drawImage(
              renderCanvas,
              cropX, cropY, cropW, cropH,
              0, 0, cropW, cropH
            );

            // Isolate stamp ink with clean transparency
            applyInkTransparency(stampCtx, stampCanvas.width, stampCanvas.height);

            const stampBytes = await canvasToPngBytes(stampCanvas);

            onProgress?.(`Обнаружен и извлечен оттиск печати (Page ${pageNum})...`);

            extractedBlocks.push({
              type: 'image',
              y: Math.round(ptY),
              data: stampBytes,
              format: 'png',
              width: Math.round(ptW),
              height: Math.round(ptH),
              x: Math.round(ptX),
              role: 'stamp',
              pageNumber: pageNum,
              floating: {
                x: Math.round(ptX),
                y: Math.round(ptY),
                allowOverlap: true,
                behindDocument: false,
              },
              altText: 'Печать организации (распознано по цветному оттиску)',
            });
          }
        }
      }
    } catch (segErr) {
      console.warn(`[VisualExtractor] Stamp chroma segmentation warning on page ${pageNum}:`, segErr);
    }
  }

  // 4. Header Emblem Segmentation for Scanned Documents
  // If no emblem XObject was found, inspect the top 22% of page for graphical emblem
  const hasEmblem = extractedBlocks.some(b => b.role === 'emblem');
  if (renderCtx && !hasEmblem && pageNum === 1) {
    try {
      const renderW = renderCanvas.width;
      const headerH = Math.round(renderCanvas.height * 0.22);
      const headerImgData = renderCtx.getImageData(0, 0, renderW, headerH);
      const data = headerImgData.data;

      // Scan for non-white graphic density in the upper header
      let minX = renderW;
      let maxX = 0;
      let minY = headerH;
      let maxY = 0;
      let graphicPixels = 0;

      for (let y = 8; y < headerH - 8; y += 2) {
        const rowOffset = y * renderW * 4;
        for (let x = 16; x < renderW - 16; x += 2) {
          const idx = rowOffset + x * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;

          if (lum < 200) {
            graphicPixels++;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      // If there's an isolated compact logo in center or left (not a full line of text across width)
      const clusterW = (maxX - minX);
      const clusterH = (maxY - minY);
      const ptW = clusterW / scale;
      const ptH = clusterH / scale;

      if (graphicPixels >= 100 && ptW >= 30 && ptW <= 300 && ptH >= 20 && ptH <= 120 && (clusterW < renderW * 0.6)) {
        const cropX = Math.max(0, minX - 4);
        const cropY = Math.max(0, minY - 4);
        const cropW = clusterW + 8;
        const cropH = clusterH + 8;

        const emblemCanvas = document.createElement('canvas');
        emblemCanvas.width = Math.round(cropW);
        emblemCanvas.height = Math.round(cropH);
        const emblemCtx = emblemCanvas.getContext('2d');

        if (emblemCtx) {
          emblemCtx.drawImage(renderCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
          applyInkTransparency(emblemCtx, emblemCanvas.width, emblemCanvas.height);

          const emblemBytes = await canvasToPngBytes(emblemCanvas);
          const ptX = cropX / scale;
          const ptY = cropY / scale;

          const centerX = ptX + ptW / 2;
          const alignment = Math.abs(centerX - pageWidth / 2) < pageWidth * 0.18 ? 'center' : (ptX < pageWidth * 0.35 ? 'left' : 'right');

          extractedBlocks.unshift({
            type: 'image',
            y: Math.round(ptY),
            data: emblemBytes,
            format: 'png',
            width: Math.round(ptW),
            height: Math.round(ptH),
            x: Math.round(ptX),
            role: 'emblem',
            alignment,
            pageNumber: pageNum,
            altText: 'Эмблема / Логотип шапки документа',
          });
        }
      }
    } catch (embErr) {
      console.warn(`[VisualExtractor] Emblem header segmentation warning on page ${pageNum}:`, embErr);
    }
  }

  return extractedBlocks;
}
