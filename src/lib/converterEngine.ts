import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import XLSX from 'xlsx-js-style';
import { ConversionSettings, FileItem } from '../types/converter';
import {
  parsePdfPageToBlocks,
  buildStructuredDocument,
  exportToXlsxBuffer,
  exportToCsvString,
  exportToHtmlString,
  exportToTxtString,
  exportToDocxBuffer,
  StructuredDocument,
  RawPdfItem
} from './documentModel';
import * as lamejs from 'lamejs';
// @ts-ignore
import MPEGMode from 'lamejs/src/js/MPEGMode.js';
// @ts-ignore
import Lame from 'lamejs/src/js/Lame.js';
// @ts-ignore
import BitStream from 'lamejs/src/js/BitStream.js';

function getRealExport(mod: any) {
  return mod && mod.default ? mod.default : mod;
}

function ensureLamejsGlobals() {
  const _MPEGMode = getRealExport(MPEGMode);
  const _Lame = getRealExport(Lame);
  const _BitStream = getRealExport(BitStream);
  if (typeof window !== 'undefined') {
    (window as any).MPEGMode = _MPEGMode;
    (window as any).Lame = _Lame;
    (window as any).BitStream = _BitStream;
  }
  if (typeof globalThis !== 'undefined') {
    (globalThis as any).MPEGMode = _MPEGMode;
    (globalThis as any).Lame = _Lame;
    (globalThis as any).BitStream = _BitStream;
  }
}

// Initialize globals immediately upon script import
ensureLamejsGlobals();

// Types for FFmpeg lazy loading
let ffmpegInstance: any = null;
let isFFmpegLoading = false;

/**
 * Helper to initialize local FFmpeg.wasm core from /public/ffmpeg/ with a 30-second timeout
 */
async function loadLocalFFmpegCore(ffmpeg: any, toBlobURL: any, timeoutMs = 30000): Promise<boolean> {
  return new Promise((resolve) => {
    let finished = false;
    const startTime = Date.now();
    console.log(`[FFmpeg Engine] Начало загрузки локального ядра из /ffmpeg/ (таймаут ${timeoutMs}мс)...`);

    const timer = setTimeout(() => {
      if (!finished) {
        finished = true;
        console.warn(`[FFmpeg Engine] Таймаут загрузки локального ядра FFmpeg WASM (${timeoutMs}мс), переключение на CDN...`);
        resolve(false);
      }
    }, timeoutMs);

    (async () => {
      try {
        console.log('[FFmpeg Engine] Преобразование локальных скриптов /ffmpeg/ в Blob URL...');
        const coreURL = await toBlobURL('/ffmpeg/ffmpeg-core.js', 'text/javascript');
        const wasmURL = await toBlobURL('/ffmpeg/ffmpeg-core.wasm', 'application/wasm');

        if (finished) return;

        console.log('[FFmpeg Engine] Вызов ffmpeg.load() с локальными URL...');
        await ffmpeg.load({
          coreURL,
          wasmURL,
        });

        if (!finished) {
          finished = true;
          clearTimeout(timer);
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
          console.log(`[FFmpeg Engine] ✅ Локальное ядро FFmpeg WASM успешно загружено за ${elapsed} сек!`);
          resolve(true);
        }
      } catch (err) {
        if (!finished) {
          finished = true;
          clearTimeout(timer);
          console.warn('[FFmpeg Engine] ❌ Ошибка загрузки локального ядра FFmpeg из /ffmpeg/:', err);
          resolve(false);
        }
      }
    })();
  });
}

/**
 * Helper to attempt loading FFmpeg core from a URL with a strict timeout
 */
async function loadFFmpegWithTimeout(ffmpeg: any, toBlobURL: any, baseUrl: string, providerName: string, timeoutMs = 15000): Promise<boolean> {
  return new Promise((resolve) => {
    let finished = false;
    const startTime = Date.now();
    console.log(`[FFmpeg Engine] Начало загрузки ядра из ${providerName} (${baseUrl})...`);

    const timer = setTimeout(() => {
      if (!finished) {
        finished = true;
        console.warn(`[FFmpeg Engine] Таймаут сети при загрузке из ${providerName} (${timeoutMs}мс)`);
        resolve(false);
      }
    }, timeoutMs);

    (async () => {
      try {
        const coreURL = await toBlobURL(`${baseUrl}/ffmpeg-core.js`, 'text/javascript');
        const wasmURL = await toBlobURL(`${baseUrl}/ffmpeg-core.wasm`, 'application/wasm');

        if (finished) return;

        await ffmpeg.load({
          coreURL,
          wasmURL,
        });

        if (!finished) {
          finished = true;
          clearTimeout(timer);
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
          console.log(`[FFmpeg Engine] ✅ FFmpeg WASM успешно загружен из ${providerName} за ${elapsed} сек!`);
          resolve(true);
        }
      } catch (err) {
        if (!finished) {
          finished = true;
          clearTimeout(timer);
          console.warn(`[FFmpeg Engine] ❌ Загрузка из ${providerName} не удалась:`, err);
          resolve(false);
        }
      }
    })();
  });
}

export async function getFFmpegInstance(onProgress?: (ratio: number) => void, forceRetry = false) {
  if (ffmpegInstance && !forceRetry) {
    console.log('[FFmpeg Engine] Использование имеющегося экземпляра FFmpeg');
    return ffmpegInstance;
  }
  if (forceRetry) {
    console.log('[FFmpeg Engine] Принудительный сброс и повторная инициализация FFmpeg');
    ffmpegInstance = null;
    isFFmpegLoading = false;
  }
  
  if (isFFmpegLoading) {
    console.log('[FFmpeg Engine] Ожидание завершения параллельной загрузки FFmpeg...');
    let attempts = 0;
    while (isFFmpegLoading && attempts < 150) { // 30s max wait for existing loader
      await new Promise((res) => setTimeout(res, 200));
      attempts++;
    }
    if (ffmpegInstance) return ffmpegInstance;
    isFFmpegLoading = false; // Reset if previous load timed out
  }

  try {
    isFFmpegLoading = true;
    console.log('[FFmpeg Engine] Старт инициализации FFmpeg WASM...');
    const { FFmpeg } = await import('@ffmpeg/ffmpeg');
    const { toBlobURL } = await import('@ffmpeg/util');

    const ffmpeg = new FFmpeg();

    // Attach log listener for runtime logging
    ffmpeg.on('log', (event: any) => {
      try {
        const msg = typeof event === 'string' ? event : event?.message;
        if (msg && typeof msg === 'string') {
          console.debug('[FFmpeg Core Log]', msg);
        }
      } catch (e) {
        // Safe logger ignore
      }
    });

    if (onProgress) onProgress(15);

    // 1. Primary: Try loading from local /public/ffmpeg/ with 30-second timeout
    console.log('[FFmpeg Engine] Этап 1/4: Локальное ядро /public/ffmpeg/');
    let success = await loadLocalFFmpegCore(ffmpeg, toBlobURL, 30000);

    // 2. Secondary fallback: unpkg CDN using toBlobURL with 15s timeout
    if (!success) {
      if (onProgress) onProgress(25);
      console.log('[FFmpeg Engine] Этап 2/4: unpkg CDN fallback');
      success = await loadFFmpegWithTimeout(
        ffmpeg,
        toBlobURL,
        'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd',
        'unpkg CDN',
        15000
      );
    }

    // 3. Tertiary fallback: jsDelivr CDN with 15s timeout
    if (!success) {
      if (onProgress) onProgress(30);
      console.log('[FFmpeg Engine] Этап 3/4: jsDelivr CDN fallback');
      success = await loadFFmpegWithTimeout(
        ffmpeg,
        toBlobURL,
        'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd',
        'jsDelivr CDN',
        15000
      );
    }

    // 4. Quaternary fallback: bundler module imports
    if (!success) {
      try {
        if (onProgress) onProgress(35);
        console.log('[FFmpeg Engine] Этап 4/4: Модульный импорт из сборщика');
        // @ts-ignore
        const coreJsModule = await import('@ffmpeg/core?url');
        // @ts-ignore
        const coreWasmModule = await import('@ffmpeg/core/wasm?url');
        const coreJsUrl = coreJsModule.default || coreJsModule;
        const coreWasmUrl = coreWasmModule.default || coreWasmModule;

        await ffmpeg.load({
          coreURL: await toBlobURL(coreJsUrl, 'text/javascript'),
          wasmURL: await toBlobURL(coreWasmUrl, 'application/wasm'),
        });
        success = true;
        console.log('[FFmpeg Engine] ✅ FFmpeg WASM успешно загружен из ресурсов сборщика');
      } catch (bundleErr) {
        console.warn('[FFmpeg Engine] ❌ Загрузка через импорт модуля не удалась:', bundleErr);
      }
    }

    if (!success) {
      throw new Error('Не удалось загрузить ядро FFmpeg. Пожалуйста, проверьте подключение к сети и нажмите «Повторить».');
    }

    ffmpegInstance = ffmpeg;
    isFFmpegLoading = false;
    return ffmpeg;
  } catch (err: any) {
    console.error('[FFmpeg Engine] 🚨 Ошибка загрузки FFmpeg WASM:', err);
    isFFmpegLoading = false;
    ffmpegInstance = null;
    throw new Error(`Ошибка загрузки FFmpeg WASM: ${err?.message || String(err)}`);
  }
}

/**
 * Main Client-Side Conversion Dispatcher
 */
export async function convertFileClientSide(
  item: FileItem,
  onProgress: (percent: number, statusText: string) => void
): Promise<{ blob: Blob; fileName: string }> {
  const { file, detectedFormat, targetFormat, settings, category } = item;
  const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;

  onProgress(10, 'Initializing conversion engine...');

  // ROUTING ACCORDING TO CATEGORY & FORMATS
  if (category === 'video') {
    return await convertVideo(file, detectedFormat, targetFormat, settings, baseName, onProgress);
  }

  if (category === 'image' || isImageTarget(targetFormat)) {
    return await convertImage(file, detectedFormat, targetFormat, settings, baseName, onProgress);
  }

  if (category === 'audio' || targetFormat === 'MP3_EXTRACT' || isAudioTarget(targetFormat)) {
    return await convertAudio(file, detectedFormat, targetFormat, settings, baseName, onProgress);
  }

  if (category === 'document' || isDocumentTarget(targetFormat)) {
    return await convertDocument(file, detectedFormat, targetFormat, settings, baseName, onProgress);
  }

  // Fallback generic conversion
  onProgress(50, 'Processing generic blob stream...');
  const text = await file.text();
  const blob = new Blob([text], { type: 'text/plain' });
  return { blob, fileName: `${baseName}.${targetFormat.toLowerCase()}` };
}

/* ====================================================================
   1. IMAGE CONVERSIONS (Canvas API, WebP, JPEG, PNG, ICO, BMP, PDF)
   ==================================================================== */

function isImageTarget(fmt: string): boolean {
  return ['PNG', 'JPG', 'JPEG', 'WEBP', 'GIF', 'BMP', 'ICO', 'SVG', 'AVIF', 'TIFF', 'TIF'].includes(fmt.toUpperCase());
}

async function convertImage(
  file: File,
  sourceFormat: string,
  targetFormat: string,
  settings: ConversionSettings,
  baseName: string,
  onProgress: (percent: number, text: string) => void
): Promise<{ blob: Blob; fileName: string }> {
  onProgress(15, 'Loading image into memory...');

  let sourceFile = file;
  const isHeic =
    sourceFormat === 'HEIC' ||
    sourceFormat === 'HEIF' ||
    file.name.toLowerCase().endsWith('.heic') ||
    file.name.toLowerCase().endsWith('.heif') ||
    file.type.includes('heic') ||
    file.type.includes('heif');

  if (isHeic) {
    onProgress(25, 'Decoding Apple HEIC/HEIF image via WASM...');
    try {
      const heic2anyModule = await import('heic2any');
      const heic2any = (heic2anyModule.default || heic2anyModule) as any;
      const convertedResult = await heic2any({
        blob: file,
        toType: 'image/png',
      });
      const pngBlob = Array.isArray(convertedResult) ? convertedResult[0] : convertedResult;
      sourceFile = new File([pngBlob], `${baseName}.png`, { type: 'image/png' });
    } catch (err: any) {
      console.error('HEIC decoding failed:', err);
      throw new Error('Не удалось декодировать HEIC файл. Проверьте цельность изображения.');
    }
  }

  const isTiff =
    sourceFormat === 'TIFF' ||
    sourceFormat === 'TIF' ||
    file.name.toLowerCase().endsWith('.tiff') ||
    file.name.toLowerCase().endsWith('.tif') ||
    file.type.includes('tiff');

  if (isTiff) {
    onProgress(25, 'Декодирование TIFF изображения через UTIF...');
    try {
      const utifModule = await import('utif');
      const UTIF = (utifModule.default || utifModule) as any;
      const buffer = await file.arrayBuffer();
      const ifds = UTIF.decode(buffer);
      if (ifds && ifds.length > 0) {
        UTIF.decodeImage(buffer, ifds[0]);
        const rgba = UTIF.toRGBA8(ifds[0]);
        const width = ifds[0].width;
        const height = ifds[0].height;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const imgData = ctx.createImageData(width, height);
          imgData.data.set(rgba);
          ctx.putImageData(imgData, 0, 0);
          const pngBlob: Blob = await new Promise((res, rej) => {
            canvas.toBlob((b) => (b ? res(b) : rej(new Error('Failed canvas blob'))), 'image/png');
          });
          sourceFile = new File([pngBlob], `${baseName}.png`, { type: 'image/png' });
        }
      }
    } catch (err: any) {
      console.error('TIFF decoding failed:', err);
    }
  }

  // Target: TIFF
  const isTargetTiff = targetFormat.toUpperCase() === 'TIFF' || targetFormat.toUpperCase() === 'TIF';
  if (isTargetTiff) {
    onProgress(60, 'Кодирование TIFF изображения через UTIF...');
    const canvas = document.createElement('canvas');
    const img = new Image();
    const url = URL.createObjectURL(sourceFile);
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image into canvas for TIFF export'));
      img.src = url;
    });
    URL.revokeObjectURL(url);

    let targetWidth = settings.imageWidth || img.width;
    let targetHeight = settings.imageHeight || img.height;
    if (settings.preserveAspectRatio && settings.imageWidth && !settings.imageHeight) {
      targetHeight = Math.round((img.height / img.width) * settings.imageWidth);
    } else if (settings.preserveAspectRatio && settings.imageHeight && !settings.imageWidth) {
      targetWidth = Math.round((img.width / img.height) * settings.imageHeight);
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
    const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
    const utifModule = await import('utif');
    const UTIF = (utifModule.default || utifModule) as any;
    const tiffBuffer = UTIF.encodeImage(new Uint8Array(imgData.data.buffer), targetWidth, targetHeight);
    const blob = new Blob([tiffBuffer], { type: 'image/tiff' });
    onProgress(100, 'Image conversion complete!');
    return { blob, fileName: `${baseName}.tiff` };
  }

  // Target: PDF
  if (targetFormat === 'PDF') {
    onProgress(40, 'Generating PDF document from image...');
    const pdfDoc = await PDFDocument.create();
    const imageBytes = new Uint8Array(await sourceFile.arrayBuffer());
    
    let embedImage;
    if ((sourceFormat === 'JPG' || sourceFormat === 'JPEG') && !isHeic) {
      embedImage = await pdfDoc.embedJpg(imageBytes);
    } else {
      // Convert to PNG first
      const pngBlob = await convertImageToCanvasBlob(sourceFile, 'image/png', 1.0, settings);
      const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());
      embedImage = await pdfDoc.embedPng(pngBytes);
    }

    const page = pdfDoc.addPage([embedImage.width, embedImage.height]);
    page.drawImage(embedImage, {
      x: 0,
      y: 0,
      width: embedImage.width,
      height: embedImage.height,
    });

    onProgress(90, 'Finalizing PDF output...');
    const pdfBytes = await pdfDoc.save();
    const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
    return { blob: pdfBlob, fileName: `${baseName}.pdf` };
  }

  // Target: Standard image formats (PNG, JPG, WEBP, BMP, ICO)
  const mimeMap: Record<string, string> = {
    PNG: 'image/png',
    JPG: 'image/jpeg',
    JPEG: 'image/jpeg',
    WEBP: 'image/webp',
    BMP: 'image/bmp',
    ICO: 'image/x-icon',
    GIF: 'image/gif',
    AVIF: 'image/avif',
  };

  const targetMime = mimeMap[targetFormat.toUpperCase()] || 'image/png';
  const quality = settings.imageQuality ?? 1.0;

  onProgress(60, `Rendering canvas with ${targetFormat} settings...`);
  const blob = await convertImageToCanvasBlob(sourceFile, targetMime, quality, settings);
  
  onProgress(100, 'Image conversion complete!');
  const ext = targetFormat.toLowerCase() === 'jpeg' ? 'jpg' : targetFormat.toLowerCase();
  return { blob, fileName: `${baseName}.${ext}` };
}

async function convertImageToCanvasBlob(
  file: File,
  mimeType: string,
  quality: number,
  settings: ConversionSettings
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let targetWidth = settings.imageWidth || img.width;
      let targetHeight = settings.imageHeight || img.height;

      if (settings.preserveAspectRatio && settings.imageWidth && !settings.imageHeight) {
        targetHeight = Math.round((img.height / img.width) * settings.imageWidth);
      } else if (settings.preserveAspectRatio && settings.imageHeight && !settings.imageWidth) {
        targetWidth = Math.round((img.width / img.height) * settings.imageHeight);
      }

      // For ICO format, standard max size is 256x256
      if (mimeType === 'image/x-icon') {
        targetWidth = Math.min(targetWidth, 256);
        targetHeight = Math.min(targetHeight, 256);
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Canvas context 2D not supported'));
        return;
      }

      // Fill white background for JPEG / BMP if missing alpha channel
      if (mimeType === 'image/jpeg' || mimeType === 'image/bmp') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetWidth, targetHeight);
      }

      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error(`Failed to export image blob as ${mimeType}`));
        },
        mimeType,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image into canvas'));
    };

    img.src = url;
  });
}

/* ====================================================================
   2. AUDIO CONVERSIONS (WebAudio API, AudioContext, WAV, MP3, OGG)
   ==================================================================== */

function isAudioTarget(fmt: string): boolean {
  return ['MP3', 'WAV', 'OGG', 'FLAC', 'M4A', 'AAC', 'OPUS', 'AIFF'].includes(fmt.toUpperCase());
}

async function convertAudio(
  file: File,
  sourceFormat: string,
  targetFormat: string,
  settings: ConversionSettings,
  baseName: string,
  onProgress: (percent: number, text: string) => void
): Promise<{ blob: Blob; fileName: string }> {
  ensureLamejsGlobals();
  const isMp3 = targetFormat === 'MP3' || targetFormat === 'MP3_EXTRACT';
  const isWav = targetFormat === 'WAV';
  const isAiff = targetFormat === 'AIFF';

  // For MP3 (LameJS), WAV (16-bit PCM), and AIFF, use high-speed local WebAudio/JS engine
  if (isMp3 || isWav || isAiff) {
    onProgress(25, 'Декодирование аудио в памяти браузера...');
    const arrayBuffer = await file.arrayBuffer();
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    let audioBuffer: AudioBuffer;
    try {
      audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    } catch (e) {
      audioCtx.close();
      throw new Error('Не удалось декодировать аудиофайл в браузере.');
    }

    if (isMp3) {
      onProgress(60, 'Кодирование MP3 через LameJS...');
      const bitrateStr = settings.audioBitrate || '256k';
      const bitrate = parseInt(bitrateStr, 10) || 256;
      const mp3Blob = audioBufferToMp3(audioBuffer, bitrate, (p) => {
        onProgress(60 + Math.round(p * 0.35), `Кодирование MP3 (${p}%)...`);
      });
      audioCtx.close();
      onProgress(100, 'Конвертация в MP3 завершена!');
      return { blob: mp3Blob, fileName: `${baseName}.mp3` };
    } else if (isWav) {
      onProgress(70, 'Кодирование 16-bit PCM WAV...');
      const wavBlob = audioBufferToWav(audioBuffer);
      audioCtx.close();
      onProgress(100, 'Конвертация в WAV завершена!');
      return { blob: wavBlob, fileName: `${baseName}.wav` };
    } else {
      onProgress(70, 'Кодирование PCM AIFF...');
      const aiffBlob = audioBufferToAiff(audioBuffer);
      audioCtx.close();
      onProgress(100, 'Конвертация в AIFF завершена!');
      return { blob: aiffBlob, fileName: `${baseName}.aiff` };
    }
  }

  // All other audio formats (AAC, OPUS, FLAC, OGG, M4A, etc.) process strictly via FFmpeg WASM
  onProgress(20, `Инициализация FFmpeg WASM для ${targetFormat}...`);
  let ffmpeg;
  try {
    ffmpeg = await getFFmpegInstance((p) => onProgress(30 + Math.round(p * 0.2), `Загрузка ядра FFmpeg (${p}%)...`));
  } catch (err: any) {
    ffmpegInstance = null;
    throw new Error(`Ошибка загрузки FFmpeg WASM: ${err.message || String(err)}`);
  }

  if (!ffmpeg) {
    ffmpegInstance = null;
    throw new Error(`Модуль FFmpeg WASM недоступен для конвертации в ${targetFormat}.`);
  }

  const { fetchFile } = await import('@ffmpeg/util');
  const inExt = file.name.split('.').pop() || 'input';
  const outExt = targetFormat.toLowerCase();
  
  const inFileName = `input_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${inExt}`;
  const outFileName = `output_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${outExt}`;

  let ffmpegArgs: string[] = ['-y', '-i', inFileName];
  if (targetFormat === 'AAC') {
    ffmpegArgs.push('-c:a', 'aac', '-b:a', settings.audioBitrate || '256k', '-f', 'adts');
  } else if (targetFormat === 'OPUS') {
    ffmpegArgs.push('-c:a', 'opus', '-b:a', '128k', '-strict', '-2', '-f', 'ogg');
  } else if (targetFormat === 'FLAC') {
    ffmpegArgs.push('-c:a', 'flac');
  } else if (targetFormat === 'MP3') {
    ffmpegArgs.push('-c:a', 'libmp3lame', '-b:a', settings.audioBitrate || '256k');
  } else if (targetFormat === 'OGG') {
    ffmpegArgs.push('-c:a', 'libvorbis', '-q:a', '4', '-f', 'ogg');
  } else if (targetFormat === 'WAV') {
    ffmpegArgs.push('-c:a', 'pcm_s16le', '-f', 'wav');
  } else if (targetFormat === 'M4A') {
    ffmpegArgs.push('-c:a', 'aac', '-b:a', settings.audioBitrate || '256k', '-f', 'ipod');
  } else {
    ffmpegArgs.push('-c:a', 'copy');
  }
  ffmpegArgs.push(outFileName);

  onProgress(35, `Подготовка к конвертации в ${outExt.toUpperCase()}...`);
  const logs: string[] = [];
  const logHandler = (event: any) => {
    try {
      if (!event) return;
      
      // Извлекаем строку из любого формата события
      const rawMessage = typeof event === 'string' 
        ? event 
        : (event && typeof event === 'object' && 'message' in event) 
          ? event.message 
          : undefined;

      if (!rawMessage || typeof rawMessage !== 'string') return;

      // Безопасный вызов строковых методов
      if (rawMessage.startsWith('frame=') || rawMessage.startsWith('size=')) {
        // Расчет прогресса конвертации
      }
      
      if (typeof logs !== 'undefined' && Array.isArray(logs)) {
        logs.push(rawMessage);
      }
    } catch (e) {
      // Игнорируем ошибки нетипичных логов, чтобы не прерывать процесс кодирования
    }
  };
  const audioProgressHandler = (event: any) => {
    if (!event) return;
    const progress = typeof event === 'number' ? event : event.progress;
    if (typeof progress === 'number' && !isNaN(progress)) {
      const pct = Math.min(98, Math.round(35 + progress * 63));
      onProgress(pct, `Кодирование ${outExt.toUpperCase()} (${pct}%)...`);
    }
  };
  ffmpeg.on('progress', audioProgressHandler);
  ffmpeg.on('log', logHandler);

  try {
    await ffmpeg.writeFile(inFileName, await fetchFile(file));
    await ffmpeg.exec(ffmpegArgs);
    const data = await ffmpeg.readFile(outFileName);

    const dataBuffer = data instanceof Uint8Array ? data : new TextEncoder().encode(data as string);
    if (!dataBuffer || dataBuffer.byteLength === 0) {
      throw new Error(`Сформированный аудиофайл пуст (0 bytes). Пожалуйста, проверьте исходный файл.`);
    }

    const mimeTypes: Record<string, string> = {
      ogg: 'audio/ogg',
      flac: 'audio/flac',
      m4a: 'audio/mp4',
      aac: 'audio/aac',
      opus: 'audio/opus',
      aiff: 'audio/aiff',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
    };

    const outBlob = new Blob([dataBuffer], { type: mimeTypes[outExt] || 'audio/octet-stream' });
    onProgress(100, `Конвертация в ${targetFormat} завершена!`);
    return { blob: outBlob, fileName: `${baseName}.${outExt}` };
  } catch (execErr: any) {
    console.error(`Ошибка выполнения FFmpeg WASM (${targetFormat}):`, execErr, logs.join('\n'));
    ffmpegInstance = null; // Reset singleton instance on failure
    throw new Error(`Ошибка конвертации в ${targetFormat} через FFmpeg WASM: ${execErr.message || String(execErr)}`);
  } finally {
    try { ffmpeg.off('progress', audioProgressHandler); } catch (e) {}
    try { ffmpeg.off('log', logHandler); } catch (e) {}
    try { await ffmpeg.deleteFile(inFileName); } catch (e) {}
    try { await ffmpeg.deleteFile(outFileName); } catch (e) {}
  }
}

/**
 * Converts AudioBuffer to uncompressed 16-bit PCM WAV Blob
 */
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  let result: Float32Array;
  if (numChannels === 2) {
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    result = new Float32Array(left.length + right.length);
    for (let i = 0, j = 0; i < left.length; i++, j += 2) {
      result[j] = left[i];
      result[j + 1] = right[i];
    }
  } else {
    result = buffer.getChannelData(0);
  }

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataByteLength = result.length * bytesPerSample;
  const headerByteLength = 44;
  const totalLength = headerByteLength + dataByteLength;

  const arrayBuffer = new ArrayBuffer(totalLength);
  const view = new DataView(arrayBuffer);

  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* RIFF chunk length */
  view.setUint32(4, 36 + dataByteLength, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, format, true);
  /* channel count */
  view.setUint16(22, numChannels, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * blockAlign, true);
  /* block align */
  view.setUint16(32, blockAlign, true);
  /* bits per sample */
  view.setUint16(34, bitDepth, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, dataByteLength, true);

  // Write PCM float samples as 16-bit integers
  let offset = 44;
  for (let i = 0; i < result.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, result[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Converts AudioBuffer to AIFF (Apple uncompressed PCM 16-bit big-endian)
 */
function audioBufferToAiff(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bitDepth = 16;
  
  let result: Float32Array;
  if (numChannels === 2) {
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    result = new Float32Array(left.length + right.length);
    for (let i = 0, j = 0; i < left.length; i++, j += 2) {
      result[j] = left[i];
      result[j + 1] = right[i];
    }
  } else {
    result = buffer.getChannelData(0);
  }

  const bytesPerSample = bitDepth / 8;
  const dataByteLength = result.length * bytesPerSample;
  const totalLength = 12 + 26 + 8 + dataByteLength;

  const arrayBuffer = new ArrayBuffer(totalLength);
  const view = new DataView(arrayBuffer);

  writeString(view, 0, 'FORM');
  view.setUint32(4, totalLength - 8, false);
  writeString(view, 8, 'AIFF');

  writeString(view, 12, 'COMM');
  view.setUint32(16, 18, false);
  view.setUint16(20, numChannels, false);
  view.setUint32(22, buffer.length, false);
  view.setUint16(26, bitDepth, false);

  let exp = 16383 + 31;
  let sample = sampleRate;
  while (sample < 0x80000000) {
    sample *= 2;
    exp--;
  }
  view.setUint16(28, exp, false);
  view.setUint32(30, sample >>> 0, false);
  view.setUint32(34, 0, false);

  writeString(view, 38, 'SSND');
  view.setUint32(42, dataByteLength + 8, false);
  view.setUint32(46, 0, false);
  view.setUint32(50, 0, false);

  let offset = 54;
  for (let i = 0; i < result.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, result[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, false);
  }

  return new Blob([arrayBuffer], { type: 'audio/aiff' });
}

/**
 * Converts AudioBuffer to real MP3 Blob using LameJS instantly in client memory
 */
function audioBufferToMp3(buffer: AudioBuffer, bitratekbps = 192, onProgress?: (p: number) => void): Blob {
  ensureLamejsGlobals();
  const channels = Math.min(2, buffer.numberOfChannels); // mono or stereo
  const sampleRate = buffer.sampleRate;
  const mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, bitratekbps);
  
  const left = buffer.getChannelData(0);
  const right = channels > 1 ? buffer.getChannelData(1) : undefined;
  
  const leftPcm = new Int16Array(left.length);
  const rightPcm = right ? new Int16Array(right.length) : undefined;

  for (let i = 0; i < left.length; i++) {
    const sL = Math.max(-1, Math.min(1, left[i]));
    leftPcm[i] = sL < 0 ? sL * 0x8000 : sL * 0x7fff;
    if (right && rightPcm) {
      const sR = Math.max(-1, Math.min(1, right[i]));
      rightPcm[i] = sR < 0 ? sR * 0x8000 : sR * 0x7fff;
    }
  }

  const sampleBlockSize = 1152;
  const mp3Data: Int8Array[] = [];

  for (let i = 0; i < leftPcm.length; i += sampleBlockSize) {
    const leftChunk = leftPcm.subarray(i, i + sampleBlockSize);
    let mp3buf: Int8Array;
    if (channels === 2 && rightPcm) {
      const rightChunk = rightPcm.subarray(i, i + sampleBlockSize);
      mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
    } else {
      mp3buf = mp3encoder.encodeBuffer(leftChunk);
    }
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }
    if (onProgress && i % (sampleBlockSize * 50) === 0) {
      onProgress(Math.min(95, Math.round((i / leftPcm.length) * 100)));
    }
  }

  const flushBuf = mp3encoder.flush();
  if (flushBuf.length > 0) {
    mp3Data.push(flushBuf);
  }

  return new Blob(mp3Data as any, { type: 'audio/mpeg' });
}

async function cleanupFFmpegMemFS(ffmpeg: any) {
  try {
    const files = await ffmpeg.listDir('/');
    console.log('[FFmpeg Diagnostic] Файлы в MEMFS перед запуском:', files.map((f: any) => f.name).join(', '));
    for (const f of files) {
      if (!f.isDir && (f.name.startsWith('input_') || f.name.startsWith('output_') || f.name.endsWith('.tmp'))) {
        try {
          await ffmpeg.deleteFile(f.name);
          console.log(`[FFmpeg Engine] Очищен файл из MEMFS: ${f.name}`);
        } catch (e) {}
      }
    }
  } catch (e) {
    // ignore
  }
}

/* ====================================================================
   3. VIDEO CONVERSIONS (Native Canvas/MediaRecorder for WebM, FFmpeg.wasm for others)
   ==================================================================== */

async function convertVideoToWebmNative(
  file: File,
  baseName: string,
  onProgress: (percent: number, text: string) => void
): Promise<{ blob: Blob; fileName: string }> {
  return new Promise((resolve, reject) => {
    onProgress(10, 'Подготовка нативного браузерного рендера WebM...');

    const video = document.createElement('video');
    video.preload = 'auto';
    video.playsInline = true;
    video.muted = false;
    video.volume = 1.0;
    const videoUrl = URL.createObjectURL(file);
    video.src = videoUrl;

    let audioCtx: AudioContext | null = null;
    let animFrameId: number | null = null;

    const cleanup = () => {
      if (animFrameId !== null) cancelAnimationFrame(animFrameId);
      URL.revokeObjectURL(videoUrl);
      video.pause();
      video.remove();
      if (audioCtx && audioCtx.state !== 'closed') {
        audioCtx.close().catch(() => {});
      }
    };

    video.onloadedmetadata = async () => {
      try {
        onProgress(20, 'Начало записи WebM (Canvas + MediaRecorder)...');
        const width = video.videoWidth || 1280;
        const height = video.videoHeight || 720;
        const duration = video.duration || 1;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          cleanup();
          return reject(new Error('Не удалось получить 2D контекст Canvas'));
        }

        const stream = canvas.captureStream(30);

        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            audioCtx = new AudioContextClass();
            if (audioCtx.state === 'suspended') {
              await audioCtx.resume();
            }
            const source = audioCtx.createMediaElementSource(video);
            const dest = audioCtx.createMediaStreamDestination();
            source.connect(dest);
            dest.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
          }
        } catch (audioErr) {
          console.warn('Аудиодорожка недоступна для нативной трансляции:', audioErr);
        }

        let mimeType = 'video/webm;codecs=vp9,opus';
        if (typeof MediaRecorder !== 'undefined' && !MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm;codecs=vp8,opus';
        }
        if (typeof MediaRecorder !== 'undefined' && !MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm';
        }

        const mediaRecorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: 10000000,
        });

        const chunks: Blob[] = [];
        mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            chunks.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          cleanup();
          const finalBlob = new Blob(chunks, { type: 'video/webm' });
          if (finalBlob.size === 0) {
            return reject(new Error('Ошибка записи WebM: сформированный файл пуст.'));
          }
          onProgress(100, 'Конвертация в WebM завершена!');
          resolve({ blob: finalBlob, fileName: `${baseName}.webm` });
        };

        mediaRecorder.onerror = (recorderErr: any) => {
          cleanup();
          reject(new Error(`MediaRecorder error: ${recorderErr.message || String(recorderErr)}`));
        };

        const renderLoop = () => {
          if (video.currentTime >= duration || video.ended) {
            if (mediaRecorder.state !== 'inactive') {
              mediaRecorder.stop();
            }
          } else {
            ctx.drawImage(video, 0, 0, width, height);
            const progress = Math.min(98, Math.round((video.currentTime / duration) * 100));
            onProgress(progress, `Конвертация WebM (${progress}%)...`);
            animFrameId = requestAnimationFrame(renderLoop);
          }
        };

        video.onended = () => {
          if (mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
          }
        };

        mediaRecorder.start(100);
        await video.play();
        renderLoop();

      } catch (err: any) {
        cleanup();
        reject(err);
      }
    };

    video.onerror = () => {
      cleanup();
      reject(new Error('Ошибка загрузки видеофайла в элемент воспроизведения'));
    };
  });
}

async function convertVideo(
  file: File,
  sourceFormat: string,
  targetFormat: string,
  settings: ConversionSettings,
  baseName: string,
  onProgress: (percent: number, text: string) => void
): Promise<{ blob: Blob; fileName: string }> {
  if (targetFormat === 'WEBM') {
    return convertVideoToWebmNative(file, baseName, onProgress);
  }

  onProgress(20, `Инициализация FFmpeg WASM для ${targetFormat}...`);
  let ffmpeg;
  try {
    ffmpeg = await getFFmpegInstance((p) => onProgress(20 + Math.round(p * 0.2), `Загрузка ядра FFmpeg (${p}%)...`));
  } catch (err: any) {
    ffmpegInstance = null;
    throw new Error(`Ошибка загрузки FFmpeg WASM: ${err.message || String(err)}`);
  }

  if (!ffmpeg) {
    ffmpegInstance = null;
    throw new Error(`Модуль FFmpeg WASM недоступен для транскодирования видео.`);
  }

  await cleanupFFmpegMemFS(ffmpeg);

  const { fetchFile } = await import('@ffmpeg/util');
  const inExt = file.name.split('.').pop() || 'mp4';
  let outExt = targetFormat.toLowerCase();
  if (targetFormat === 'GIF_VID') outExt = 'gif';
  if (targetFormat === 'MP3_EXTRACT') outExt = 'mp3';

  const inName = `input_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${inExt}`;
  const outName = `output_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${outExt}`;

  let args: string[] = ['-y', '-i', inName];

  if (targetFormat === 'GIF_VID') {
    args.push('-vf', 'fps=10,scale=480:-1:flags=lanczos', '-c:v', 'gif');
  } else if (targetFormat === 'MP3_EXTRACT' || targetFormat === 'MP3') {
    args.push('-vn', '-c:a', 'libmp3lame', '-b:a', settings.audioBitrate || '256k', '-ar', '44100', '-ac', '2');
  } else if (targetFormat === 'WAV') {
    args.push('-vn', '-c:a', 'pcm_s16le', '-f', 'wav');
  } else if (targetFormat === 'AAC') {
    args.push('-vn', '-c:a', 'aac', '-b:a', settings.audioBitrate || '256k', '-f', 'adts');
  } else if (targetFormat === 'M4A') {
    args.push('-vn', '-c:a', 'aac', '-b:a', settings.audioBitrate || '256k', '-f', 'ipod');
  } else if (targetFormat === 'OGG') {
    args.push('-vn', '-c:a', 'libvorbis', '-q:a', '4', '-f', 'ogg');
  } else if (targetFormat === 'FLAC') {
    args.push('-vn', '-c:a', 'flac');
  } else if (targetFormat === 'OPUS') {
    args.push('-vn', '-c:a', 'opus', '-b:a', '128k', '-strict', '-2', '-f', 'ogg');
  } else if (targetFormat === 'WEBM') {
    args.push(
      '-c:v', 'libvpx',
      '-lag-in-frames', '0',
      '-auto-alt-ref', '0',
      '-g', '30',
      '-quality', 'realtime',
      '-cpu-used', '8',
      '-threads', '1',
      '-slices', '1',
      '-crf', '23',
      '-b:v', '4M',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'libopus',
      '-b:a', '128k',
      '-strict', '-2'
    );
  } else if (targetFormat === 'MP4' || targetFormat === 'MOV' || targetFormat === 'MKV') {
    args.push(
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-tune', 'zerolatency',
      '-crf', '23',
      '-threads', '1',
      '-bf', '0',
      '-refs', '1',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac'
    );
  } else if (targetFormat === 'AVI') {
    args.push('-c:v', 'mpeg4', '-qscale:v', '3', '-c:a', 'aac');
  } else {
    args.push('-preset', 'ultrafast', '-pix_fmt', 'yuv420p');
  }

  args.push(outName);

  console.log(`[FFmpeg Diagnostic] Исходный файл: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`[FFmpeg Diagnostic] Конвертация в ${targetFormat}, аргументы:`, args.join(' '));

  onProgress(35, `Транскодирование видео в ${outExt.toUpperCase()}...`);
  const logs: string[] = [];
  const logHandler = (event: any) => {
    try {
      if (!event) return;
      
      // Извлекаем строку из любого формата события
      const rawMessage = typeof event === 'string' 
        ? event 
        : (event && typeof event === 'object' && 'message' in event) 
          ? event.message 
          : undefined;

      if (!rawMessage || typeof rawMessage !== 'string') return;

      // Безопасный вызов строковых методов
      if (rawMessage.startsWith('frame=') || rawMessage.startsWith('size=')) {
        // Расчет прогресса конвертации
      }
      
      if (typeof logs !== 'undefined' && Array.isArray(logs)) {
        logs.push(rawMessage);
      }
    } catch (e) {
      // Игнорируем ошибки нетипичных логов, чтобы не прерывать процесс кодирования
    }
  };
  const progressHandler = (event: any) => {
    if (!event) return;
    const progress = typeof event === 'number' ? event : event.progress;
    if (typeof progress === 'number' && !isNaN(progress)) {
      const pct = Math.min(98, Math.round(35 + progress * 63));
      onProgress(pct, `FFmpeg Transcoding ${outExt.toUpperCase()} (${pct}%)...`);
    }
  };
  ffmpeg.on('progress', progressHandler);
  ffmpeg.on('log', logHandler);

  try {
    await ffmpeg.writeFile(inName, await fetchFile(file));
    await ffmpeg.exec(args);
    const data = await ffmpeg.readFile(outName);

    const dataBuffer = data instanceof Uint8Array ? data : new TextEncoder().encode(data as string);
    if (!dataBuffer || dataBuffer.byteLength === 0) {
      throw new Error(`Сформированный файл пуст (0 bytes). Пожалуйста, проверьте исходный медиафайл или выбранный формат.`);
    }

    const mimeMap: Record<string, string> = {
      mp4: 'video/mp4',
      webm: 'video/webm',
      gif: 'image/gif',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      aac: 'audio/aac',
      m4a: 'audio/mp4',
      ogg: 'audio/ogg',
      flac: 'audio/flac',
      opus: 'audio/opus',
      avi: 'video/x-msvideo',
      mov: 'video/quicktime',
      mkv: 'video/x-matroska',
    };

    const blob = new Blob([dataBuffer], { type: mimeMap[outExt] || 'video/mp4' });
    onProgress(100, 'Конвертация видео завершена!');
    return { blob, fileName: `${baseName}.${outExt}` };
  } catch (execErr: any) {
    console.error(`Ошибка транскодирования видео FFmpeg WASM (${targetFormat}):`, execErr, logs.join('\n'));
    ffmpegInstance = null; // Reset singleton instance on failure

    throw new Error(`Ошибка транскодирования видео в ${targetFormat} через FFmpeg WASM: ${execErr.message || String(execErr)}`);
  } finally {
    try { ffmpeg.off('progress', progressHandler); } catch (e) {}
    try { ffmpeg.off('log', logHandler); } catch (e) {}
    try { await ffmpeg.deleteFile(inName); } catch (e) {}
    try { await ffmpeg.deleteFile(outName); } catch (e) {}
  }
}

/* ====================================================================
   4. DOCUMENT & SPREADSHEET CONVERSIONS (PDF, TXT, MD, HTML, JSON, CSV, XML, XLSX, XLS)
   ==================================================================== */

function isDocumentTarget(fmt: string): boolean {
  return ['PDF', 'TXT', 'MD', 'HTML', 'JSON', 'CSV', 'XML', 'DOCX', 'EPUB', 'XLSX', 'XLS'].includes(fmt.toUpperCase());
}

let cachedRobotoFontBytes: ArrayBuffer | null = null;

async function fetchCyrillicFontBytes(): Promise<ArrayBuffer | null> {
  if (cachedRobotoFontBytes) return cachedRobotoFontBytes;
  try {
    const res = await fetch('https://cdn.jsdelivr.net/fontsource/fonts/roboto@latest/cyrillic-400-normal.ttf');
    if (res.ok) {
      cachedRobotoFontBytes = await res.arrayBuffer();
      return cachedRobotoFontBytes;
    }
  } catch (e) {
    console.warn('Network fetch for Roboto TTF failed, falling back to canvas PDF rendering:', e);
  }
  return null;
}

async function renderTextToPdf(textContent: string, baseName: string, onProgress: (percent: number, text: string) => void): Promise<Blob> {
  onProgress(50, 'Building UTF-8 PDF document...');
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const fontBytes = await fetchCyrillicFontBytes();
  
  if (fontBytes) {
    try {
      const customFont = await pdfDoc.embedFont(fontBytes);
      const lines = textContent.split('\n');
      let page = pdfDoc.addPage([595.28, 841.89]); // A4
      let y = 800;
      const fontSize = 11;
      const lineHeight = 15;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (y < 40) {
          page = pdfDoc.addPage([595.28, 841.89]);
          y = 800;
        }
        const safeLine = line.substring(0, 110);
        page.drawText(safeLine, {
          x: 40,
          y,
          size: fontSize,
          font: customFont,
          color: rgb(0.1, 0.1, 0.1),
        });
        y -= lineHeight;
      }

      onProgress(90, 'Saving PDF document...');
      const pdfBytes = await pdfDoc.save();
      return new Blob([pdfBytes], { type: 'application/pdf' });
    } catch (err) {
      console.warn('Custom font rendering error, using canvas fallback:', err);
    }
  }

  // Fallback: Render text onto Canvas 2D and embed as PNG into PDF
  onProgress(70, 'Rendering text layout via HTML5 Canvas...');
  const canvas = document.createElement('canvas');
  canvas.width = 1240; // High DPI A4 width
  const lines = textContent.split('\n');
  const lineHeight = 24;
  const padding = 60;
  canvas.height = Math.max(1754, padding * 2 + lines.length * lineHeight);

  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#1e293b';
    ctx.font = '16px sans-serif';

    let curY = padding + 20;
    for (const line of lines) {
      ctx.fillText(line, padding, curY);
      curY += lineHeight;
    }

    const dataUrl = canvas.toDataURL('image/png');
    const base64Data = dataUrl.split(',')[1];
    const pngBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    const page = pdfDoc.addPage([595.28, 841.89]);
    const embeddedPng = await pdfDoc.embedPng(pngBytes);
    page.drawImage(embeddedPng, {
      x: 0,
      y: 0,
      width: 595.28,
      height: 841.89,
    });
  }

  onProgress(90, 'Writing PDF bytes...');
  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

// Document & PDF processing helpers
let pdfjsLibInstance: any = null;

async function getPdfJsLib(): Promise<any> {
  if (pdfjsLibInstance) return pdfjsLibInstance;
  const pdfjs = await import('pdfjs-dist');
  // Configure worker URL from CDN to avoid bundler worker chunk errors
  if (pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version || '4.0.379'}/build/pdf.worker.min.mjs`;
  }
  pdfjsLibInstance = pdfjs;
  return pdfjs;
}

async function parsePdfToStructuredDocument(file: File, baseName: string, onProgress: (p: number, t: string) => void): Promise<StructuredDocument> {
  onProgress(20, 'Loading PDF engine...');
  const pdfjs = await getPdfJsLib();
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdfDocument = await loadingTask.promise;
  const numPages = pdfDocument.numPages;
  const pagesBlocks = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    onProgress(Math.min(85, Math.round(20 + (pageNum / numPages) * 60)), `Reconstructing document structure (Page ${pageNum}/${numPages})...`);
    const page = await pdfDocument.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();
    const items: RawPdfItem[] = [];

    for (const rawItem of textContent.items as any[]) {
      if (!rawItem.str || (rawItem.str.trim() === '' && !rawItem.str.includes(' '))) continue;
      const tx = rawItem.transform;
      const x = tx ? tx[4] : 0;
      const y = tx ? tx[5] : 0;
      const width = rawItem.width || (rawItem.str.length * 6);
      const height = rawItem.height || (tx ? Math.abs(tx[0] || tx[3] || 10) : 10);

      items.push({
        str: rawItem.str,
        x,
        y,
        width,
        height,
      });
    }

    const pageBlocks = parsePdfPageToBlocks(items, pageNum, viewport.width, viewport.height);
    pagesBlocks.push(pageBlocks);
  }

  return buildStructuredDocument(pagesBlocks, baseName);
}

async function extractTextFromPdf(file: File, onProgress: (p: number, t: string) => void): Promise<string> {
  const doc = await parsePdfToStructuredDocument(file, file.name.replace(/\.[^/.]+$/, ''), onProgress);
  return exportToTxtString(doc) || 'No readable text layer found in PDF (scanned or image-only document).';
}

async function renderPdfFirstPageToImage(file: File, mimeType: 'image/png' | 'image/jpeg', onProgress: (p: number, t: string) => void): Promise<Blob> {
  onProgress(30, 'Rendering PDF page into image canvas...');
  const pdfjs = await getPdfJsLib();
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdfDocument = await loadingTask.promise;
  const page = await pdfDocument.getPage(1);
  const viewport = page.getViewport({ scale: 2.0 }); // 2x high resolution render

  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('Could not create Canvas context for PDF rendering');

  const renderContext = {
    canvasContext: ctx,
    viewport: viewport,
  };

  onProgress(60, 'Rasterizing PDF graphics...');
  await page.render(renderContext).promise;

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas export to blob failed'));
    }, mimeType, 0.95);
  });
}

async function renderHtmlToPdfBlob(htmlContent: string, baseName: string, onProgress?: (p: number, t: string) => void): Promise<Blob> {
  onProgress?.(50, 'Рендеринг разметки документа в PDF...');

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '794px'; // A4 width at 96 DPI
  container.style.minHeight = '1123px';
  container.style.padding = '40px';
  container.style.background = '#ffffff';
  container.style.color = '#111827';
  container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
  container.style.fontSize = '11pt';
  container.style.lineHeight = '1.5';
  container.style.zIndex = '-9999';
  container.style.boxSizing = 'border-box';
  container.style.pointerEvents = 'none';

  const fullHtml = `
    <style>
      table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 10pt; }
      th, td { border: 1px solid #94a3b8; padding: 6px 10px; text-align: left; vertical-align: top; }
      th { background-color: #f1f5f9; font-weight: bold; }
      p { margin: 6px 0; }
      h1, h2, h3 { margin: 16px 0 8px 0; font-weight: bold; }
      h1 { font-size: 15pt; }
      h2 { font-size: 13pt; }
      h3 { font-size: 11pt; }
    </style>
    <div>
      <h2 style="margin-top: 0; margin-bottom: 16px; font-size: 16pt;">${escapeHtml(baseName)}</h2>
      ${htmlContent}
    </div>
  `;
  container.innerHTML = fullHtml;
  document.body.appendChild(container);

  try {
    const { jsPDF } = await import('jspdf');
    const html2canvas = (await import('html2canvas')).default;

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    onProgress?.(85, 'Сборка страниц PDF...');

    const pdf = new jsPDF('p', 'pt', 'a4');
    const imgWidth = 595.28; // A4 width in pt
    const pageHeight = 841.89; // A4 height in pt
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    const imgData = canvas.toDataURL('image/png');

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;
    }

    onProgress?.(100, 'Готово!');
    return pdf.output('blob');
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

function parseHtmlToStructuredText(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const lines: string[] = [];

  const extractCellText = (cell: HTMLElement): string => {
    // Collect all paragraphs or text chunks inside the cell separated by spaces
    const paragraphs = Array.from(cell.querySelectorAll('p, div, li'));
    if (paragraphs.length > 0) {
      return paragraphs
        .map((p) => (p.textContent || '').replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .join(' ');
    }
    return (cell.textContent || '').replace(/\s+/g, ' ').trim();
  };

  const processNode = (node: Node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();

      if (tag === 'table') {
        const rows = Array.from(el.querySelectorAll('tr'));
        for (const row of rows) {
          const cells = Array.from(row.querySelectorAll('th, td')).map((c) => extractCellText(c as HTMLElement));
          if (cells.length > 0) {
            lines.push(cells.join('\t'));
          }
        }
        lines.push('');
        return;
      }

      if (tag === 'p' || tag.startsWith('h') || tag === 'li') {
        const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
        if (text) {
          lines.push(text);
        }
        return;
      }

      for (const child of Array.from(el.childNodes)) {
        processNode(child);
      }
    }
  };

  for (const child of Array.from(doc.body.childNodes)) {
    processNode(child);
  }

  return lines.join('\n');
}

function parseDocxHtmlToXml(html: string, baseName: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const lines: string[] = [];

  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push(`<document name="${escapeHtml(baseName)}">`);
  lines.push('  <section id="1" title="General">');

  const extractCellText = (cell: HTMLElement): string => {
    const paragraphs = Array.from(cell.querySelectorAll('p, div, li'));
    if (paragraphs.length > 0) {
      return paragraphs
        .map((p) => (p.textContent || '').replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .join(' ');
    }
    return (cell.textContent || '').replace(/\s+/g, ' ').trim();
  };

  const processNodes = (elements: Element[]) => {
    for (const el of elements) {
      const tag = el.tagName.toLowerCase();

      if (tag === 'table') {
        lines.push('    <table>');
        const rows = Array.from(el.querySelectorAll('tr'));
        let expectedCols = 0;

        // Determine maximum columns in table
        for (const row of rows) {
          const cellsCount = row.querySelectorAll('th, td').length;
          if (cellsCount > expectedCols) {
            expectedCols = cellsCount;
          }
        }

        rows.forEach((row, rowIndex) => {
          const cells = Array.from(row.querySelectorAll('th, td'));
          const isHeader = rowIndex === 0 || cells.some(c => c.tagName.toLowerCase() === 'th');

          const cellValues = cells.map(c => extractCellText(c as HTMLElement));
          
          // Pad with empty cells if fewer than expectedCols
          while (expectedCols > 0 && cellValues.length < expectedCols) {
            cellValues.push('');
          }

          lines.push(`      <row${isHeader ? ' type="header"' : ''}>`);
          for (const val of cellValues) {
            if (val) {
              lines.push(`        <cell>${escapeHtml(val)}</cell>`);
            } else {
              lines.push('        <cell></cell>');
            }
          }
          lines.push('      </row>');
        });

        lines.push('    </table>');
      } else if (tag === 'p' || tag.startsWith('h') || tag === 'li') {
        if (el.closest('table')) {
          continue;
        }
        const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
        if (text) {
          lines.push(`    <paragraph>${escapeHtml(text)}</paragraph>`);
        }
      } else {
        processNodes(Array.from(el.children));
      }
    }
  };

  processNodes(Array.from(doc.body.children));

  lines.push('  </section>');
  lines.push('</document>');

  return lines.join('\n');
}

function parseDocxHtmlToAoa(html: string): string[][] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const aoa: string[][] = [];

  const cleanCellText = (cell: Element): string => {
    // Сначала заменяем все теги <br> внутри ячейки на символ перевода строки
    const clone = cell.cloneNode(true) as Element;
    clone.querySelectorAll('br').forEach(br => {
      br.replaceWith('\n');
    });

    const blocks = Array.from(clone.querySelectorAll('p, div, li'));
    if (blocks.length > 0) {
      return blocks
        .map(b => (b.textContent || '').replace(/[ \t\f\v]+/g, ' ').trim())
        .filter(Boolean)
        .join('\n');
    }
    return (clone.textContent || '')
      .split('\n')
      .map(line => line.replace(/[ \t\f\v]+/g, ' ').trim())
      .filter(Boolean)
      .join('\n');
  };

  const processNode = (node: Element) => {
    const tagName = node.tagName.toLowerCase();

    if (tagName === 'table') {
      const tableRows = Array.from(node.querySelectorAll('tr'));
      let maxCols = 0;
      const parsedRows: string[][] = [];

      for (const tr of tableRows) {
        // Берем только прямые ячейки строки
        const cells = Array.from(tr.children).filter(c => {
          const t = c.tagName.toLowerCase();
          return t === 'td' || t === 'th';
        });

        const rowValues: string[] = [];
        for (const cell of cells) {
          rowValues.push(cleanCellText(cell));
        }

        if (rowValues.length > maxCols) {
          maxCols = rowValues.length;
        }
        parsedRows.push(rowValues);
      }

      // Выравниваем все строки таблицы до maxCols
      for (const rowValues of parsedRows) {
        while (rowValues.length < maxCols) {
          rowValues.push('');
        }
        aoa.push(rowValues);
      }
      aoa.push([]); // пустая строка после таблицы
    } else if (tagName === 'p' || tagName.startsWith('h') || tagName === 'li') {
      // Игнорируем параграфы внутри таблицы, так как таблица разбирается целиком выше
      if (node.closest('table')) {
        return;
      }

      const nestedTable = node.querySelector('table');
      if (nestedTable) {
        processNode(nestedTable);
      } else {
        const clone = node.cloneNode(true) as Element;
        clone.querySelectorAll('br').forEach(br => {
          br.replaceWith('\n');
        });
        const text = (clone.textContent || '').split('\n').map(l => l.replace(/[ \t\f\v]+/g, ' ').trim()).filter(Boolean).join('\n');
        if (text) {
          aoa.push([text]);
        }
      }
    } else {
      for (const child of Array.from(node.children)) {
        processNode(child);
      }
    }
  };

  for (const child of Array.from(doc.body.children)) {
    processNode(child);
  }

  return aoa;
}

async function extractTextFromDocx(file: File, onProgress: (p: number, t: string) => void): Promise<string> {
  onProgress(30, 'Parsing DOCX structure with Mammoth...');
  const mammoth = await import('mammoth');
  const arrayBuffer = await file.arrayBuffer();
  const result = await (mammoth.default || mammoth).convertToHtml({ arrayBuffer });
  return parseHtmlToStructuredText(result.value || '');
}

async function extractDocxTableGrids(file: File): Promise<number[][]> {
  try {
    const JSZip = (await import('jszip')).default;
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    const docXmlFile = zip.file('word/document.xml');
    if (!docXmlFile) return [];

    const xmlStr = await docXmlFile.async('text');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlStr, 'application/xml');
    
    // Находим все таблицы <w:tbl>
    const tbls = Array.from(xmlDoc.getElementsByTagName('w:tbl'));
    const grids: number[][] = [];

    for (const tbl of tbls) {
      // Ищем <w:tblGrid>
      const gridElem = tbl.getElementsByTagName('w:tblGrid')[0];
      if (gridElem) {
        const colElems = Array.from(gridElem.getElementsByTagName('w:gridCol'));
        const widths: number[] = [];
        for (const col of colElems) {
          const wAttr = col.getAttribute('w:w');
          if (wAttr) {
            const wVal = parseFloat(wAttr);
            if (!isNaN(wVal) && wVal > 0) {
              widths.push(wVal);
            }
          }
        }
        if (widths.length > 0) {
          grids.push(widths);
        }
      }
    }
    return grids;
  } catch (err) {
    console.warn('Не удалось извлечь tblGrid из OpenXML:', err);
    return [];
  }
}

async function extractHtmlFromDocx(file: File, onProgress: (p: number, t: string) => void): Promise<string> {
  onProgress(30, 'Converting DOCX to HTML with Mammoth...');
  const mammoth = await import('mammoth');
  const arrayBuffer = await file.arrayBuffer();
  const result = await (mammoth.default || mammoth).convertToHtml({ arrayBuffer });
  return result.value || '';
}

async function createDocxFromText(text: string, baseName: string, onProgress: (p: number, t: string) => void): Promise<Blob> {
  onProgress(60, 'Generating Microsoft Word .docx...');
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');

  const paragraphs: any[] = [
    new Paragraph({
      text: baseName,
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
    }),
  ];

  const lines = text.split('\n');
  for (const line of lines) {
    if (!line.trim()) {
      paragraphs.push(new Paragraph({ spacing: { after: 100 } }));
    } else {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: line, size: 24, font: 'Calibri' })],
          spacing: { after: 120 },
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs,
      },
    ],
  });

  onProgress(85, 'Packaging Word document...');
  const blob = await Packer.toBlob(doc);
  return blob;
}

async function convertDocument(
  file: File,
  sourceFormat: string,
  targetFormat: string,
  settings: ConversionSettings,
  baseName: string,
  onProgress: (percent: number, text: string) => void
): Promise<{ blob: Blob; fileName: string }> {
  onProgress(20, 'Reading document structure...');

  const srcFmt = sourceFormat.toUpperCase();
  const tgtFmt = targetFormat.toUpperCase();

  // 1. PDF SOURCE SPECIAL CASES: PDF -> JPG / PNG
  if (srcFmt === 'PDF' && (tgtFmt === 'JPG' || tgtFmt === 'JPEG')) {
    const blob = await renderPdfFirstPageToImage(file, 'image/jpeg', onProgress);
    return { blob, fileName: `${baseName}.jpg` };
  }
  if (srcFmt === 'PDF' && tgtFmt === 'PNG') {
    const blob = await renderPdfFirstPageToImage(file, 'image/png', onProgress);
    return { blob, fileName: `${baseName}.png` };
  }

  // 2. Excel (XLSX / XLS) Source Format Processing
  if (srcFmt === 'XLSX' || srcFmt === 'XLS') {
    onProgress(30, 'Parsing Excel workbook...');
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0] || 'Sheet1';
    const worksheet = workbook.Sheets[firstSheetName];

    if (tgtFmt === 'CSV') {
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      return { blob, fileName: `${baseName}.csv` };
    }

    if (tgtFmt === 'JSON') {
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      const jsonStr = JSON.stringify(jsonData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      return { blob, fileName: `${baseName}.json` };
    }

    if (tgtFmt === 'HTML') {
      const htmlTable = XLSX.utils.sheet_to_html(worksheet);
      const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${baseName}</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 24px; background: #f8fafc; color: #1e293b; }
    table { border-collapse: collapse; width: 100%; margin-top: 12px; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    th, td { border: 1px solid #e2e8f0; padding: 10px 14px; text-align: left; }
    th { background: #f1f5f9; font-weight: 600; }
  </style>
</head>
<body>
  <h2>${baseName}</h2>
  ${htmlTable}
</body>
</html>`;
      const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8;' });
      return { blob, fileName: `${baseName}.html` };
    }

    if (tgtFmt === 'XML') {
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, any>[];
      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<spreadsheet name="${escapeXml(baseName)}">\n  <sheet name="${escapeXml(firstSheetName)}">\n`;
      for (const row of jsonData) {
        xml += `    <row>\n`;
        for (const [key, val] of Object.entries(row)) {
          const safeKey = key.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'field';
          xml += `      <${safeKey}>${escapeXml(String(val ?? ''))}</${safeKey}>\n`;
        }
        xml += `    </row>\n`;
      }
      xml += `  </sheet>\n</spreadsheet>`;
      const blob = new Blob([xml], { type: 'application/xml;charset=utf-8;' });
      return { blob, fileName: `${baseName}.xml` };
    }

    if (tgtFmt === 'DOCX') {
      const txt = XLSX.utils.sheet_to_txt(worksheet);
      const blob = await createDocxFromText(txt, baseName, onProgress);
      return { blob, fileName: `${baseName}.docx` };
    }

    if (tgtFmt === 'PDF') {
      const txt = XLSX.utils.sheet_to_txt(worksheet);
      const blob = await renderTextToPdf(txt, baseName, onProgress);
      return { blob, fileName: `${baseName}.pdf` };
    }
  }

  // 3. TARGET: Structured Document / PDF Processing via Document Model
  if (srcFmt === 'PDF') {
    onProgress(30, 'Analyzing PDF layout & tabular structures...');
    const docModel = await parsePdfToStructuredDocument(file, baseName, onProgress);

    if (tgtFmt === 'XLSX') {
      onProgress(85, 'Generating Excel spreadsheet (.xlsx)...');
      const buf = exportToXlsxBuffer(docModel);
      const blob = new Blob([buf], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      return { blob, fileName: `${baseName}.xlsx` };
    }

    if (tgtFmt === 'CSV') {
      const csvStr = exportToCsvString(docModel);
      const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
      return { blob, fileName: `${baseName}.csv` };
    }

    if (tgtFmt === 'HTML') {
      const htmlStr = exportToHtmlString(docModel);
      const blob = new Blob([htmlStr], { type: 'text/html;charset=utf-8;' });
      return { blob, fileName: `${baseName}.html` };
    }

    if (tgtFmt === 'DOCX') {
      onProgress(80, 'Packaging structured Word document (.docx)...');
      const docxBuf = await exportToDocxBuffer(docModel);
      const blob = new Blob([docxBuf], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
      return { blob, fileName: `${baseName}.docx` };
    }

    if (tgtFmt === 'TXT') {
      const txtStr = exportToTxtString(docModel);
      const blob = new Blob([txtStr], { type: 'text/plain;charset=utf-8;' });
      return { blob, fileName: `${baseName}.txt` };
    }

    if (tgtFmt === 'MD') {
      const txtStr = exportToTxtString(docModel);
      const mdContent = `# ${baseName}\n\n${txtStr}`;
      const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8;' });
      return { blob, fileName: `${baseName}.md` };
    }

    if (tgtFmt === 'JSON') {
      const jsonStr = JSON.stringify(docModel, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      return { blob, fileName: `${baseName}.json` };
    }
  }

  // 4. SPECIALIZED SOURCE HANDLING: DOCX (Word Document)
  if (srcFmt === 'DOCX') {
    const docxHtml = await extractHtmlFromDocx(file, onProgress);
    const textContent = parseHtmlToStructuredText(docxHtml);

    if (tgtFmt === 'HTML') {
      const fullHtml = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(baseName)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 32px; line-height: 1.6; max-width: 900px; margin: 0 auto; color: #1e293b; background: #ffffff; }
    h1 { font-size: 22px; color: #0f172a; margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
    table { border-collapse: collapse; width: 100%; margin: 18px 0; font-size: 14px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; vertical-align: top; }
    th { background: #f8fafc; font-weight: bold; }
    p { margin: 6px 0; }
  </style>
</head>
<body>
  <h1>${escapeHtml(baseName)}</h1>
  ${docxHtml}
</body>
</html>`;
      const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8;' });
      return { blob, fileName: `${baseName}.html` };
    }

    if (tgtFmt === 'PDF') {
      const blob = await renderHtmlToPdfBlob(docxHtml, baseName, onProgress);
      return { blob, fileName: `${baseName}.pdf` };
    }

    if (tgtFmt === 'TXT') {
      const blob = new Blob(['\uFEFF' + textContent], { type: 'text/plain;charset=utf-8;' });
      return { blob, fileName: `${baseName}.txt` };
    }

    if (tgtFmt === 'XLSX') {
      onProgress(50, 'Сборка Excel файла из таблиц документа...');
      const [tableGrids, aoa] = await Promise.all([
        extractDocxTableGrids(file),
        Promise.resolve(parseDocxHtmlToAoa(docxHtml)),
      ]);
      const worksheet = XLSX.utils.aoa_to_sheet(aoa);

      // 1. Поиск максимального числа колонок среди всех строк
      let maxCols = 0;
      aoa.forEach(r => {
        if (r.length > maxCols) maxCols = r.length;
      });

      const colWidths: number[] = [];

      // Проверяем наличие оригинальной физической сетки OpenXML (w:tblGrid / w:gridCol)
      const primaryGrid = tableGrids.find(g => g.length === maxCols) || tableGrids[0];

      if (primaryGrid && primaryGrid.length === maxCols) {
        // Универсальный расчёт: переносим точные физические пропорции колонок из DOCX в Excel
        const totalDxa = primaryGrid.reduce((sum, val) => sum + val, 0);
        // Стандартная доступная ширина листа A4 при портретной ориентации ~82-86 символов, при альбомной ~130-140
        const isLandscape = maxCols > 6;
        const targetPageCharWidth = isLandscape ? 130 : 82;

        for (let c = 0; c < maxCols; c++) {
          const proportion = primaryGrid[c] / (totalDxa || 1);
          const calculatedWidth = Math.round(proportion * targetPageCharWidth);
          // Минимальная ширина 5 символов, чтобы контент не схлопывался
          colWidths[c] = Math.max(calculatedWidth, 5);
        }
      } else {
        // Fallback: Контент-зависимый динамический расчёт по содержимому строк
        const tableRows = aoa.filter(r => r.length >= 2);
        for (let c = 0; c < maxCols; c++) {
          let maxLen = 0;
          const targetRows = tableRows.length > 0 ? tableRows : aoa;
          targetRows.forEach(row => {
            const val = (row[c] || '').toString().trim();
            const subLines = val.split('\n');
            for (const sub of subLines) {
              const trimmed = sub.trim();
              if (trimmed.length > maxLen) {
                maxLen = trimmed.length;
              }
            }
          });

          if (c === 0 && maxCols > 2) {
            colWidths[c] = Math.min(Math.max(maxLen + 2, 6), 10);
          } else {
            colWidths[c] = Math.min(Math.max(maxLen + 3, 15), 45);
          }
        }
      }

      if (colWidths.length > 0) {
        worksheet['!cols'] = colWidths.map(wch => ({ wch }));
      }

      // Настройка метаданных страницы и печати (100% совместимость с печатью А4):
      const isLandscape = maxCols > 6;
      const targetPageCharWidth = isLandscape ? 130 : 82;

      worksheet['!pageSetup'] = {
        paperSize: 9, // Стандарт А4
        orientation: isLandscape ? 'landscape' : 'portrait',
        fitToWidth: 1,
        fitToHeight: 0,
        scale: 100,
      };

      worksheet['!margins'] = {
        left: 0.5,
        right: 0.5,
        top: 0.6,
        bottom: 0.6,
        header: 0.3,
        footer: 0.3,
      };

      worksheet['!printOptions'] = {
        gridLines: true,
      };

      worksheet['!views'] = [
        {
          showGridLines: true,
        },
      ];

      // Автоматическое объединение ячеек по ширине страницы для длинных внетабличных абзацев
      const merges: XLSX.Range[] = [];
      const rowHeights: Array<{ hpt: number }> = [];

      aoa.forEach((row, rIdx) => {
        const isTableRow = row && row.length >= 2;
        if (!isTableRow && row && row.length > 0) {
          const firstVal = (row[0] || '').toString();
          if (firstVal.length > 50 && maxCols > 1) {
            // Объединяем ячейки от первой до последней колонки таблицы (A:E), чтобы текст не уходил за границу листа
            merges.push({
              s: { r: rIdx, c: 0 },
              e: { r: rIdx, c: maxCols - 1 },
            });
            const estLines = Math.max(1, Math.ceil(firstVal.length / targetPageCharWidth));
            rowHeights[rIdx] = { hpt: Math.max(18, estLines * 16) };
          }
        }
      });

      if (merges.length > 0) {
        worksheet['!merges'] = merges;
      }
      if (rowHeights.length > 0) {
        worksheet['!rows'] = rowHeights;
      }

      // Стилизация ячеек через xlsx-js-style:
      // Перенос строк (wrapText: true) и четкие рамки (border) включаем для строк таблицы (где заполнено >= 2 колонок),
      // чтобы таблица выглядела в точности как в оригинальном DOCX бланке.
      const thinBorder = {
        top: { style: 'thin', color: { rgb: '475569' } },
        bottom: { style: 'thin', color: { rgb: '475569' } },
        left: { style: 'thin', color: { rgb: '475569' } },
        right: { style: 'thin', color: { rgb: '475569' } },
      };

      Object.keys(worksheet).forEach((cellKey) => {
        if (!cellKey.startsWith('!')) {
          const cell = worksheet[cellKey];
          if (cell && typeof cell === 'object') {
            const rawVal = (cell.v || '').toString();
            
            // Определяем индекс строки (1-based) и колонку (A, B, C...)
            const colLetter = cellKey.replace(/\d+$/, '');
            const rowMatch = cellKey.match(/\d+$/);
            const rowIndex = rowMatch ? parseInt(rowMatch[0], 10) - 1 : -1;
            const rowData = rowIndex >= 0 && rowIndex < aoa.length ? aoa[rowIndex] : [];
            const isTableRow = rowData && rowData.length >= 2;
            
            // Проверяем, является ли строка шапкой таблицы (первая строка таблицы с текстом "№" или "Наименование")
            const isHeaderRow = isTableRow && (
              rowData.some(c => typeof c === 'string' && (c.includes('Наименование') || c.includes('Результат') || c === '№'))
            );

            const isTitle = rowIndex === 0 || rawVal.startsWith('Протокол');

            // Стилизация шрифта
            const font: any = {
              name: 'Calibri',
              sz: isTitle ? 11 : 10.5,
              bold: isHeaderRow || isTitle || rawVal.startsWith('Наименование материала:') || rawVal.startsWith('Результаты испытаний'),
              color: { rgb: '0F172A' },
            };

            // Выравнивание текста
            let horizontal: 'left' | 'center' | 'right' = 'left';
            if (isHeaderRow) {
              horizontal = 'center';
            } else if (isTableRow) {
              if (colLetter === 'A' || /^\d+\.?$/.test(rawVal.trim())) {
                horizontal = 'center'; // Номера по центру
              } else if (colLetter === 'C') {
                horizontal = 'center'; // № методики по центру
              }
            }

            const isLongNonTableRow = !isTableRow && rawVal.length > 50 && maxCols > 1;

            const alignment: any = {
              wrapText: isTableRow || isLongNonTableRow, // перенос внутри таблиц и в объединенных длинных строках
              vertical: 'top',
              horizontal,
            };

            const styleObj: any = {
              font,
              alignment,
            };

            // Для табличных строк добавляем реальные границы (Borders) и заливку шапки
            if (isTableRow) {
              styleObj.border = thinBorder;
              if (isHeaderRow) {
                styleObj.fill = {
                  fgColor: { rgb: 'F1F5F9' }, // Светло-серый профессиональный фон для шапки
                };
              }
            }

            cell.s = styleObj;
          }
        }
      });

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Лист1');
      const xlsxBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([xlsxBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      return { blob, fileName: `${baseName}.xlsx` };
    }

    if (tgtFmt === 'XML') {
      const xml = parseDocxHtmlToXml(docxHtml, baseName);
      const blob = new Blob([xml], { type: 'application/xml;charset=utf-8;' });
      return { blob, fileName: `${baseName}.xml` };
    }

    if (tgtFmt === 'CSV') {
      const csvStr = convertTextToStructuredCsv(textContent);
      const blob = new Blob(['\uFEFF' + csvStr], { type: 'text/csv;charset=utf-8;' });
      return { blob, fileName: `${baseName}.csv` };
    }

    if (tgtFmt === 'MD') {
      const mdContent = `# ${baseName}\n\n${textContent}`;
      const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8;' });
      return { blob, fileName: `${baseName}.md` };
    }

    if (tgtFmt === 'JSON') {
      const jsonStr = JSON.stringify({ title: baseName, content: textContent }, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      return { blob, fileName: `${baseName}.json` };
    }
  }

  // 5. TARGET: XLSX (Convert CSV / JSON / TXT / HTML -> XLSX)
  if (tgtFmt === 'XLSX') {
    onProgress(40, 'Generating Excel spreadsheet (.xlsx)...');
    const textContent = await file.text();

    let workbook: XLSX.WorkBook;

    if (srcFmt === 'JSON' || textContent.trim().startsWith('[') || textContent.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(textContent);
        const dataArray = Array.isArray(parsed) ? parsed : [parsed];
        const worksheet = XLSX.utils.json_to_sheet(dataArray);
        workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
      } catch {
        const worksheet = XLSX.utils.aoa_to_sheet(textContent.split('\n').map(l => [l]));
        workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
      }
    } else if (srcFmt === 'CSV') {
      workbook = XLSX.read(textContent, { type: 'string' });
    } else {
      const lines = textContent.split('\n').map(line => line.split(/,|\t|;/).map(cell => cell.trim()));
      const worksheet = XLSX.utils.aoa_to_sheet(lines);
      workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    }

    const xlsxBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([xlsxBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    return { blob, fileName: `${baseName}.xlsx` };
  }

  // 6. EXTRACT TEXT CONTENT FOR OTHER FORMATS
  let textContent = '';
  if (srcFmt === 'PDF') {
    textContent = await extractTextFromPdf(file, onProgress);
  } else {
    textContent = await file.text();
  }

  // 5. TARGET: DOCX (Word Document)
  if (tgtFmt === 'DOCX') {
    const blob = await createDocxFromText(textContent, baseName, onProgress);
    return { blob, fileName: `${baseName}.docx` };
  }

  // 6. TARGET: PDF
  if (tgtFmt === 'PDF') {
    const blob = await renderTextToPdf(textContent, baseName, onProgress);
    return { blob, fileName: `${baseName}.pdf` };
  }

  // 7. TARGET: TXT
  if (tgtFmt === 'TXT') {
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' });
    return { blob, fileName: `${baseName}.txt` };
  }

  // 8. TARGET: MD (Markdown)
  if (tgtFmt === 'MD') {
    const mdContent = `# ${baseName}\n\n${textContent}`;
    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8;' });
    return { blob, fileName: `${baseName}.md` };
  }

  // 9. TARGET: HTML
  if (tgtFmt === 'HTML') {
    const htmlBody = convertTextToStructuredHtml(textContent, baseName);
    const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(baseName)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 32px; line-height: 1.6; max-width: 900px; margin: 0 auto; color: #1e293b; background: #f8fafc; }
    h1 { font-size: 24px; color: #0f172a; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
    h2, h3 { font-size: 18px; color: #1e293b; margin-top: 24px; margin-bottom: 12px; }
    p { margin: 8px 0; }
    ul { margin: 8px 0 16px 20px; padding: 0; }
    li { margin-bottom: 4px; }
    table { border-collapse: collapse; width: 100%; margin: 18px 0; background: #ffffff; border-radius: 6px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); font-size: 14px; }
    th, td { border: 1px solid #cbd5e1; padding: 10px 14px; text-align: left; }
    th { background: #f1f5f9; font-weight: 600; color: #0f172a; }
    tr:nth-child(even) td { background: #f8fafc; }
  </style>
</head>
<body>
  ${htmlBody}
</body>
</html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
    return { blob, fileName: `${baseName}.html` };
  }

  // 10. TARGET: JSON
  if (tgtFmt === 'JSON') {
    let jsonString = '';
    try {
      jsonString = JSON.stringify(JSON.parse(textContent), null, 2);
    } catch {
      jsonString = JSON.stringify({ title: baseName, content: textContent }, null, 2);
    }
    const blob = new Blob([jsonString], { type: 'application/json' });
    return { blob, fileName: `${baseName}.json` };
  }

  // 11. TARGET: CSV (Extract table grid instead of flat text)
  if (tgtFmt === 'CSV') {
    const csvContent = convertTextToStructuredCsv(textContent);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    return { blob, fileName: `${baseName}.csv` };
  }

  // 12. TARGET: XML (Semantic structured XML parsing)
  if (tgtFmt === 'XML') {
    const xml = convertTextToStructuredXml(textContent, baseName);
    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8;' });
    return { blob, fileName: `${baseName}.xml` };
  }

  // Default fallback text
  const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' });
  return { blob, fileName: `${baseName}.${targetFormat.toLowerCase()}` };
}

function convertTextToStructuredXml(rawText: string, baseName: string): string {
  // If input is already JSON
  if (rawText.trim().startsWith('{') || rawText.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(rawText);
      const jsonXml = jsonToXml(parsed, 'root');
      return `<?xml version="1.0" encoding="UTF-8"?>\n<document name="${escapeXml(baseName)}">\n${jsonXml}\n</document>`;
    } catch {
      // Fall through to text structure parsing
    }
  }

  const lines = rawText.split('\n');
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<document name="${escapeXml(baseName)}">\n`;

  let currentSectionTitle: string | null = null;
  let sectionIndex = 1;
  let inList = false;
  let inTable = false;
  let tableRows: string[][] = [];

  const flushTable = () => {
    if (!inTable || tableRows.length === 0) {
      inTable = false;
      tableRows = [];
      return;
    }
    xml += `    <table>\n`;
    tableRows.forEach((row, rIdx) => {
      const isHeader = rIdx === 0 && row.length > 1;
      xml += `      <row${isHeader ? ' type="header"' : ''}>\n`;
      row.forEach((cell) => {
        xml += `        <cell>${escapeXml(cell.trim())}</cell>\n`;
      });
      xml += `      </row>\n`;
    });
    xml += `    </table>\n`;
    inTable = false;
    tableRows = [];
  };

  const flushList = () => {
    if (inList) {
      xml += `    </list>\n`;
      inList = false;
    }
  };

  const closeSectionIfNeeded = () => {
    flushTable();
    flushList();
    if (currentSectionTitle !== null) {
      xml += `  </section>\n`;
      currentSectionTitle = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) {
      flushTable();
      flushList();
      continue;
    }

    // Page divider from PDF
    const pageMatch = line.match(/^---\s*Page\s*(\d+)\s*---$/i);
    if (pageMatch) {
      closeSectionIfNeeded();
      xml += `  <!-- Page ${pageMatch[1]} -->\n`;
      continue;
    }

    // Heading detection: e.g. "1. Проверка текстовых блоков...", "## Heading", "SECTION 1", "Глава 2:"
    const headingMatch = line.match(/^((?:\d+\.|\d+\)|\#{1,4})\s+(.+))$/) ||
      (line.length < 80 && /^(Раздел|Секция|Глава|Section|Chapter|Часть)\s+\d+/i.test(line));

    if (headingMatch && !line.includes('\t') && !line.includes('|')) {
      closeSectionIfNeeded();
      const title = headingMatch[2] ? headingMatch[2].trim() : line;
      xml += `  <section id="${sectionIndex++}" title="${escapeXml(title)}">\n`;
      currentSectionTitle = title;
      continue;
    }

    // Open default section if none open yet
    if (currentSectionTitle === null) {
      xml += `  <section id="${sectionIndex++}" title="General">\n`;
      currentSectionTitle = 'General';
    }

    // Table row detection: lines containing tabs (\t), pipes (|), or multiple aligned columns (>= 2 columns)
    let isTableRow = false;
    let cells: string[] = [];

    if (line.includes('\t')) {
      cells = line.split('\t').map(c => c.trim()).filter(c => c.length > 0);
      if (cells.length >= 2) isTableRow = true;
    } else if (line.includes('|')) {
      cells = line.split('|').map(c => c.trim()).filter(c => c.length > 0);
      // Exclude markdown separator lines like |---|---|
      if (cells.length >= 2 && !cells.every(c => /^[-:]+$/.test(c))) {
        isTableRow = true;
      }
    } else {
      // Check for multiple space-separated tabular columns (e.g. "1001  Ноутбук Pro 15\"  Электроника  15  1 299.99")
      const multiSpaceCells = line.split(/\s{3,}|\s{2,}(?=[A-Za-zА-Яа-я0-9$€₽])/).map(c => c.trim()).filter(c => c.length > 0);
      if (multiSpaceCells.length >= 3) {
        cells = multiSpaceCells;
        isTableRow = true;
      }
    }

    if (isTableRow) {
      flushList();
      inTable = true;
      tableRows.push(cells);
      continue;
    } else {
      flushTable();
    }

    // List item detection: bullet points (*, -, •) or nested numbered items (1.1, a), etc.)
    const listMatch = line.match(/^([-*•–]|(?:\d+\.\d+|\w\)))\s+(.+)$/);
    if (listMatch) {
      if (!inList) {
        xml += `    <list>\n`;
        inList = true;
      }
      xml += `      <item>${escapeXml(listMatch[2].trim())}</item>\n`;
      continue;
    } else {
      flushList();
    }

    // Regular paragraph
    xml += `    <paragraph>${escapeXml(line)}</paragraph>\n`;
  }

  closeSectionIfNeeded();
  xml += `</document>`;
  return xml;
}

function jsonToXml(obj: any, tagName: string, indent: string = '    '): string {
  if (obj === null || obj === undefined) {
    return `${indent}<${tagName}/>`;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => jsonToXml(item, 'item', indent)).join('\n');
  }
  if (typeof obj === 'object') {
    let result = `${indent}<${tagName}>\n`;
    for (const [k, v] of Object.entries(obj)) {
      const safeKey = k.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'field';
      result += jsonToXml(v, safeKey, indent + '  ') + '\n';
    }
    result += `${indent}</${tagName}>`;
    return result;
  }
  return `${indent}<${tagName}>${escapeXml(String(obj))}</${tagName}>`;
}

function convertTextToStructuredHtml(rawText: string, baseName: string): string {
  const lines = rawText.split('\n');
  let html = `<h1>${escapeHtml(baseName)}</h1>\n`;
  let inList = false;
  let inTable = false;
  let tableRows: string[][] = [];

  const flushTable = () => {
    if (!inTable || tableRows.length === 0) {
      inTable = false;
      tableRows = [];
      return;
    }
    html += `<table>\n`;
    tableRows.forEach((row, rIdx) => {
      const isHeader = rIdx === 0;
      html += `  <tr>\n`;
      row.forEach((cell) => {
        const tag = isHeader ? 'th' : 'td';
        html += `    <${tag}>${escapeHtml(cell.trim())}</${tag}>\n`;
      });
      html += `  </tr>\n`;
    });
    html += `</table>\n`;
    inTable = false;
    tableRows = [];
  };

  const flushList = () => {
    if (inList) {
      html += `</ul>\n`;
      inList = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      flushTable();
      flushList();
      continue;
    }

    if (/^---\s*Page\s*\d+\s*---$/i.test(line)) {
      flushTable();
      flushList();
      html += `<hr style="margin: 32px 0; border: none; border-top: 1px dashed #cbd5e1;" />\n`;
      continue;
    }

    // Heading detection (e.g. "1. Проверка текстовых блоков...", "## Heading", "3. Тестовая таблица")
    const headingMatch = line.match(/^((?:\d+\.|\d+\)|\#{1,4})\s+(.+))$/) ||
      (line.length < 80 && /^(Раздел|Секция|Глава|Section|Chapter|Часть)\s+\d+/i.test(line));

    if (headingMatch && !line.includes('\t') && !line.includes('|')) {
      flushTable();
      flushList();
      html += `<h2>${escapeHtml(line)}</h2>\n`;
      continue;
    }

    // Table detection: line contains tabs or pipes and multiple non-empty items
    let isTableRow = false;
    let cells: string[] = [];

    if (line.includes('\t')) {
      cells = line.split('\t').map(c => c.trim());
      if (cells.filter(c => c.length > 0).length >= 2) isTableRow = true;
    } else if (line.includes('|')) {
      cells = line.split('|').map(c => c.trim()).filter(c => c.length > 0);
      if (cells.length >= 2 && !cells.every(c => /^[-:]+$/.test(c))) {
        isTableRow = true;
      }
    }

    if (isTableRow) {
      flushList();
      inTable = true;
      tableRows.push(cells);
      continue;
    } else {
      flushTable();
    }

    const listMatch = line.match(/^([-*•–]|(?:\d+\.\d+|\w\)))\s+(.+)$/);
    if (listMatch) {
      if (!inList) {
        html += `<ul>\n`;
        inList = true;
      }
      html += `  <li>${escapeHtml(listMatch[2].trim())}</li>\n`;
      continue;
    } else {
      flushList();
    }

    html += `<p>${escapeHtml(line)}</p>\n`;
  }

  flushTable();
  flushList();
  return html;
}

function convertTextToStructuredCsv(rawText: string): string {
  const lines = rawText.split('\n');
  const tableRows: string[][] = [];
  const textRows: string[][] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    let cells: string[] = [];
    if (line.includes('\t')) {
      cells = line.split('\t').map(c => c.trim());
      if (cells.filter(c => c.length > 0).length >= 2) {
        tableRows.push(cells);
        continue;
      }
    } else if (line.includes('|')) {
      cells = line.split('|').map(c => c.trim()).filter(c => c.length > 0);
      if (cells.length >= 2 && !cells.every(c => /^[-:]+$/.test(c))) {
        tableRows.push(cells);
        continue;
      }
    }

    textRows.push([line]);
  }

  // If we found a proper table in the document, prioritize exporting the clean table grid to CSV
  const finalRows = tableRows.length > 0 ? tableRows : textRows;

  return finalRows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

// WebM memory efficiency & VP9 WebAssembly WASM memory optimization fix Applied
