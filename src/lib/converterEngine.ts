import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import XLSX from 'xlsx-js-style';
import { ConversionSettings, FileItem } from '../types/converter';
import {
  parsePdfPageToBlocks,
  parseSpatialItemsToBlocks,
  parseHtmlToStructuredDocument,
  parseXlsxToStructuredDocument,
  convertXlsxToStyledHtml,
  extractExcelCellValue,
  getXlsxSheetNames,
  buildStructuredDocument,
  exportToXlsxBuffer,
  exportToCsvString,
  exportToHtmlString,
  exportToXmlString,
  exportToTxtString,
  exportToDocxBuffer,
  StructuredDocument,
  RawPdfItem,
  RawSpatialItem,
  serializeDocumentModelToMeta,
  tryDeserializeDocumentModelFromMeta,
  DocumentBlock
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

  // 1. Documents, spreadsheets and structured text targets (including OCR from images)
  if (category === 'document' || isDocumentFormat(detectedFormat) || isDocumentTargetFormat(targetFormat)) {
    return await convertDocument(file, detectedFormat, targetFormat, settings, baseName, onProgress);
  }

  // 2. Images and Searchable PDF / raster PDF
  if (category === 'image' || isImageTarget(targetFormat) || targetFormat.toUpperCase() === 'PDF') {
    return await convertImage(file, detectedFormat, targetFormat, settings, baseName, onProgress);
  }

  // 3. Audio conversions and extraction
  if (category === 'audio' || targetFormat === 'MP3_EXTRACT' || isAudioTarget(targetFormat)) {
    return await convertAudio(file, detectedFormat, targetFormat, settings, baseName, onProgress);
  }

  // Fallback generic conversion
  onProgress(50, 'Processing generic blob stream...');
  const text = await file.text();
  const blob = new Blob([text], { type: 'text/plain' });
  return { blob, fileName: `${baseName}.${targetFormat.toLowerCase()}` };
}

function isDocumentFormat(fmt: string): boolean {
  return ['PDF', 'DOCX', 'DOC', 'XLSX', 'XLS', 'TXT', 'MD', 'HTML', 'HTM', 'JSON', 'CSV', 'XML', 'EPUB', 'ZIP'].includes(fmt.toUpperCase());
}

function isDocumentTargetFormat(fmt: string): boolean {
  return ['DOCX', 'DOC', 'XLSX', 'XLS', 'TXT', 'MD', 'HTML', 'HTM', 'JSON', 'CSV', 'XML', 'EPUB'].includes(fmt.toUpperCase());
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

  // Target: PDF (Searchable with invisible text layer via OCR)
  if (targetFormat === 'PDF') {
    const blob = await convertImageToSearchablePdf(sourceFile, sourceFormat, settings, isHeic, onProgress);
    return { blob, fileName: `${baseName}.pdf` };
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

let cachedLiberationRegular: ArrayBuffer | null = null;
let cachedLiberationBold: ArrayBuffer | null = null;

async function fetchCyrillicFonts(): Promise<{ regular: ArrayBuffer | null; bold: ArrayBuffer | null }> {
  if (cachedLiberationRegular && cachedLiberationBold) {
    return { regular: cachedLiberationRegular, bold: cachedLiberationBold };
  }

  // 1. Local /fonts/
  try {
    const [regRes, boldRes] = await Promise.all([
      fetch('/fonts/LiberationSans-Regular.ttf'),
      fetch('/fonts/LiberationSans-Bold.ttf'),
    ]);
    if (regRes.ok && boldRes.ok) {
      cachedLiberationRegular = await regRes.arrayBuffer();
      cachedLiberationBold = await boldRes.arrayBuffer();
      return { regular: cachedLiberationRegular, bold: cachedLiberationBold };
    }
  } catch (e) {
    console.warn('Local /fonts/ fetch failed, trying fallback CDN:', e);
  }

  // 2. CDN fallback
  try {
    const [regRes, boldRes] = await Promise.all([
      fetch('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/standard_fonts/LiberationSans-Regular.ttf'),
      fetch('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/standard_fonts/LiberationSans-Bold.ttf'),
    ]);
    if (regRes.ok && boldRes.ok) {
      cachedLiberationRegular = await regRes.arrayBuffer();
      cachedLiberationBold = await boldRes.arrayBuffer();
      return { regular: cachedLiberationRegular, bold: cachedLiberationBold };
    }
  } catch (e) {
    console.warn('CDN font fetch failed, trying Roboto fallback:', e);
  }

  // 3. Fallback to Roboto
  try {
    const res = await fetch('https://cdn.jsdelivr.net/fontsource/fonts/roboto@latest/cyrillic-400-normal.ttf');
    if (res.ok) {
      const bytes = await res.arrayBuffer();
      cachedLiberationRegular = bytes;
      cachedLiberationBold = bytes;
      return { regular: bytes, bold: bytes };
    }
  } catch (e) {
    console.warn('All font fetches failed:', e);
  }

  return { regular: null, bold: null };
}

async function renderTextToPdf(textContent: string, baseName: string, onProgress: (percent: number, text: string) => void): Promise<Blob> {
  onProgress(50, 'Генерация векторного PDF документа...');
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const fonts = await fetchCyrillicFonts();
  
  if (fonts.regular) {
    try {
      const regFont = await pdfDoc.embedFont(fonts.regular);
      const boldFont = fonts.bold ? await pdfDoc.embedFont(fonts.bold) : regFont;

      const lines = textContent.split('\n');
      let page = pdfDoc.addPage([595.28, 841.89]); // A4
      let y = 800;
      const fontSize = 10;
      const lineHeight = 14;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (y < 40) {
          page = pdfDoc.addPage([595.28, 841.89]);
          y = 800;
        }
        const isHeader = line.startsWith('#') || line.startsWith('Протокол') || i === 0;
        const cleanText = line.replace(/^#+\s*/, '').substring(0, 110);
        page.drawText(cleanText, {
          x: 40,
          y,
          size: isHeader ? fontSize + 2 : fontSize,
          font: isHeader ? boldFont : regFont,
          color: rgb(0.08, 0.1, 0.14),
        });
        y -= lineHeight;
      }

      onProgress(90, 'Сохранение PDF документа...');
      const pdfBytes = await pdfDoc.save();
      return new Blob([pdfBytes], { type: 'application/pdf' });
    } catch (err) {
      console.warn('Векторный рендеринг текста завершился ошибкой, используем Canvas:', err);
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

export async function getPdfJsLib(): Promise<any> {
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

  // 1. Check embedded SDM metadata for 100% round-trip lossless fidelity
  try {
    const metaObj = await pdfDocument.getMetadata();
    const subject = metaObj?.info?.Subject || metaObj?.metadata?.get?.('dc:description');
    if (subject && typeof subject === 'string') {
      const recoveredDoc = tryDeserializeDocumentModelFromMeta(subject);
      if (recoveredDoc) {
        onProgress(100, 'Восстановлена 100% точная исходная структура документа из метаданных...');
        return recoveredDoc;
      }
    }
  } catch (mErr) {
    console.warn('Could not read PDF metadata for SDM:', mErr);
  }

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

async function parseImageOcrToStructuredDocument(
  file: File,
  baseName: string,
  onProgress: (p: number, t: string) => void
): Promise<StructuredDocument> {
  onProgress(20, 'Распознавание структуры и таблиц документа (OCR)...');
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('rus+eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && typeof m.progress === 'number') {
        const pct = Math.min(85, Math.max(25, Math.round(25 + m.progress * 60)));
        onProgress(pct, `Распознавание структуры и таблиц: ${Math.round(m.progress * 100)}%`);
      }
    },
  });

  const result = await worker.recognize(file);
  await worker.terminate();

  const data = (result.data || {}) as any;
  const blocks: DocumentBlock[] = [];
  const recognizedText = data.text || '';
  const ocrLines = data.lines || [];

  // 1. Collect all valid words with spatial bbox
  interface SpatialWord {
    text: string;
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    w: number;
    h: number;
  }

  const allWords: SpatialWord[] = [];
  if (data.words && data.words.length > 0) {
    for (const w of data.words) {
      const t = (w.text || '').trim();
      if (!t) continue;
      const b = w.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 };
      allWords.push({
        text: t,
        x0: b.x0,
        y0: b.y0,
        x1: b.x1,
        y1: b.y1,
        w: b.x1 - b.x0,
        h: b.y1 - b.y0,
      });
    }
  }

  // 2. Cluster words into visual horizontal lines (tolerance: height / 2 or 10px)
  interface VisualLine {
    y: number;
    y0: number;
    y1: number;
    words: SpatialWord[];
    text: string;
    isMultiCol: boolean;
    columns: string[];
    isTableHeader?: boolean;
    isTableData?: boolean;
  }

  const visualLines: VisualLine[] = [];

  // Sort all words top-to-bottom, then left-to-right
  allWords.sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0);

  for (const word of allWords) {
    // Find matching line where word vertically overlaps significantly
    const matchingLine = visualLines.find(
      (l) => Math.abs(l.y0 - word.y0) <= 12 || (word.y0 >= l.y0 - 6 && word.y0 <= l.y1 + 6)
    );

    if (matchingLine) {
      matchingLine.words.push(word);
      matchingLine.y0 = Math.min(matchingLine.y0, word.y0);
      matchingLine.y1 = Math.max(matchingLine.y1, word.y1);
      matchingLine.y = matchingLine.y0;
    } else {
      visualLines.push({
        y: word.y0,
        y0: word.y0,
        y1: word.y1,
        words: [word],
        text: '',
        isMultiCol: false,
        columns: [],
      });
    }
  }

  // Fallback to ocrLines if allWords was empty
  if (visualLines.length === 0 && ocrLines.length > 0) {
    for (const lineObj of ocrLines) {
      const raw = (lineObj.text || '').trim();
      if (!raw) continue;
      const b = lineObj.bbox || { x0: 0, y0: 0, x1: 100, y1: 20 };
      const words = (lineObj.words || []).map((w) => ({
        text: (w.text || '').trim(),
        x0: w.bbox?.x0 || 0,
        y0: w.bbox?.y0 || b.y0,
        x1: w.bbox?.x1 || 10,
        y1: w.bbox?.y1 || b.y1,
        w: (w.bbox?.x1 || 10) - (w.bbox?.x0 || 0),
        h: (w.bbox?.y1 || b.y1) - (w.bbox?.y0 || b.y0),
      })).filter((w) => w.text.length > 0);

      visualLines.push({
        y: b.y0,
        y0: b.y0,
        y1: b.y1,
        words,
        text: raw,
        isMultiCol: false,
        columns: [],
      });
    }
  }

  // Sort visual lines strictly top-to-bottom
  visualLines.sort((a, b) => a.y - b.y);

  // 3. Process each line: sort words left-to-right, construct text, and detect multi-column gaps
  for (const line of visualLines) {
    line.words.sort((a, b) => a.x0 - b.x0);
    line.text = line.words.map((w) => w.text).join(' ').trim();

    // Check for explicit delimiters (tabs, pipes, semicolons)
    if (line.text.includes('\t')) {
      line.columns = line.text.split('\t').map((c) => c.trim()).filter(Boolean);
    } else if (line.text.includes(' | ') || line.text.includes(' ; ')) {
      line.columns = line.text.split(/\s+[|;]\s+/).map((c) => c.trim()).filter(Boolean);
    } else if (line.words.length >= 2) {
      // Analyze spatial gaps between consecutive words
      const detectedCols: string[] = [];
      let currentCell = line.words[0].text;
      let hasSignificantGap = false;

      for (let wIdx = 1; wIdx < line.words.length; wIdx++) {
        const prevW = line.words[wIdx - 1];
        const currW = line.words[wIdx];
        const gap = currW.x0 - prevW.x1;

        // An inter-column gap in standard scanned tables is usually >= 18-25px
        if (gap >= 20) {
          detectedCols.push(currentCell.trim());
          currentCell = currW.text;
          hasSignificantGap = true;
        } else {
          currentCell += ' ' + currW.text;
        }
      }
      if (currentCell.trim()) detectedCols.push(currentCell.trim());

      if (hasSignificantGap && detectedCols.length >= 2) {
        line.columns = detectedCols;
      }
    }

    // Identify Table Headers: "№", "Наименование", "методики", "Результаты", "Примечание", etc.
    const lowerText = line.text.toLowerCase();
    const isHeaderWords =
      (lowerText.includes('наименование') ||
        lowerText.includes('результат') ||
        lowerText.includes('методик') ||
        lowerText.includes('примечание') ||
        lowerText.includes('показател') ||
        lowerText.includes('норма')) &&
      (line.text.startsWith('№') || line.columns.length >= 2 || line.words.length >= 3);

    // Identify Table Data Rows: "1.", "2.", "3.", "1 ", "2 ", or lines with columns
    const isDataNumbered =
      /^(\d+[\.\)]|\d+\s+[A-ZА-ЯЁ]|\:\s*[А-ЯA-Z])/.test(line.text) &&
      !lowerText.startsWith('протокол') &&
      !lowerText.startsWith('дата') &&
      !lowerText.startsWith('партия');

    line.isTableHeader = isHeaderWords;
    line.isTableData = isDataNumbered || line.columns.length >= 2;
    line.isMultiCol = line.columns.length >= 2;
  }

  // 4. Group lines into Table Blocks or Headings / Paragraphs
  let currentTableRows: string[][] = [];
  let tableHeaderCols: string[] = [];
  let tableColAnchors: { minX: number; maxX: number }[] = [];

  const flushActiveTable = () => {
    if (currentTableRows.length > 0 || tableHeaderCols.length > 0) {
      let finalHeaders = tableHeaderCols;
      let dataRows = currentTableRows;

      if (finalHeaders.length === 0 && dataRows.length > 0) {
        finalHeaders = dataRows[0];
        dataRows = dataRows.slice(1);
      }

      // If header is a single combined string, try splitting standard protocol headers
      if (finalHeaders.length === 1 && finalHeaders[0].includes('Наименование')) {
        const headerStr = finalHeaders[0];
        const extracted: string[] = [];
        if (headerStr.startsWith('№')) extracted.push('№');
        if (headerStr.includes('Наименование')) extracted.push('Наименование испытания');
        if (headerStr.includes('методики')) extracted.push('№ методики');
        if (headerStr.includes('Результат')) extracted.push('Результаты испытаний');
        if (headerStr.includes('Примечание')) extracted.push('Примечание');
        if (extracted.length >= 2) {
          finalHeaders = extracted;
        }
      }

      // Determine max columns
      let maxCols = Math.max(
        finalHeaders.length,
        ...dataRows.map((r) => r.length),
        2
      );

      while (finalHeaders.length < maxCols) finalHeaders.push(`Колонка ${finalHeaders.length + 1}`);

      const normalizedData = (dataRows.length > 0 ? dataRows : [finalHeaders]).map((r) => {
        const padded = [...r];
        while (padded.length < maxCols) padded.push('');
        return padded;
      });

      const normalizedRows = normalizedData.map((r) =>
        r.map((c) => ({
          text: c,
          rawValue: isNaN(Number(c.replace(/\s+/g, '').replace(',', '.')))
            ? c
            : Number(c.replace(/\s+/g, '').replace(',', '.')),
          isHeader: false,
        }))
      );

      const matrix = [finalHeaders, ...normalizedData];

      blocks.push({
        type: 'table',
        y: blocks.length,
        headers: finalHeaders,
        rows: normalizedRows,
        matrix,
      });

      currentTableRows = [];
      tableHeaderCols = [];
      tableColAnchors = [];
    }
  };

  let insideTableMode = false;

  for (let i = 0; i < visualLines.length; i++) {
    const line = visualLines[i];
    if (!line.text) continue;

    // Check if line triggers table header
    if (line.isTableHeader) {
      flushActiveTable();
      insideTableMode = true;

      // Extract header column names
      if (line.columns.length >= 2) {
        tableHeaderCols = line.columns;
      } else {
        // Parse "№ Наименование испытания № методики Результаты испытаний Примечание"
        const parts: string[] = [];
        const t = line.text;
        const colNames = ['№', 'Наименование испытания', '№ методики', 'Результаты испытаний', 'Примечание'];
        let matched = false;
        if (t.includes('Наименование') && t.includes('Результат')) {
          parts.push('№');
          parts.push('Наименование испытания');
          if (t.includes('методики')) parts.push('№ методики');
          parts.push('Результаты испытаний');
          if (t.includes('Примечание')) parts.push('Примечание');
          tableHeaderCols = parts;
          matched = true;
        }
        if (!matched) {
          tableHeaderCols = line.words.length >= 2 ? line.words.map((w) => w.text) : [line.text];
        }
      }
      continue;
    }

    // Inside table mode: collect table data rows
    if (insideTableMode) {
      // Check if table ends (e.g. "Примечание - ", "Инженер", "Климатические условия", "Подпись")
      const isTableEnd =
        /^(Примечание\s*[-–:]|Климатические|Инженер|Ведущий|Начальник|Подпись|Заключение|Директор|Утверждаю)\b/i.test(
          line.text
        ) && !line.text.startsWith('№') && !/^(\d+[\.\)])/.test(line.text);

      if (isTableEnd) {
        flushActiveTable();
        insideTableMode = false;
      } else {
        // Add row to table
        if (line.columns.length >= 2) {
          currentTableRows.push(line.columns);
        } else if (line.isTableData || /^(\d+[\.\)]|\:\s*[A-ZА-ЯЁ])/.test(line.text)) {
          // If single line but has multiple words, attempt spatial or token division
          if (line.words.length >= 3 && tableHeaderCols.length >= 2) {
            // Distribute words into columns based on count or numbers
            const numMatch = line.text.match(/^(\d+[\.\)]|\:|\d+)\s*(.*)/);
            if (numMatch) {
              const rowNum = numMatch[1];
              const rest = numMatch[2];
              // Check if rest contains ГОСТ or methodology
              const gostMatch = rest.match(/(ГОСТ\s*[\d\.\-]+|ЭМ[^\s]+|3M[^\s]+)/i);
              if (gostMatch) {
                const gostIdx = rest.indexOf(gostMatch[0]);
                const testName = rest.substring(0, gostIdx).trim();
                const restAfterGost = rest.substring(gostIdx).trim();
                currentTableRows.push([rowNum, testName, gostMatch[0], restAfterGost]);
              } else {
                currentTableRows.push([rowNum, rest]);
              }
            } else {
              currentTableRows.push([line.text]);
            }
          } else {
            currentTableRows.push([line.text]);
          }
        } else {
          // Empty or non-matching line -> if consecutive non-matching lines, end table
          if (currentTableRows.length > 0) {
            // Could be multi-line text inside current row
            const lastRow = currentTableRows[currentTableRows.length - 1];
            if (lastRow.length > 1) {
              lastRow[1] = lastRow[1] + ' ' + line.text;
            } else {
              currentTableRows.push([line.text]);
            }
          }
        }
        continue;
      }
    }

    // Standalone multi-column line not marked as header
    if (line.isMultiCol && line.columns.length >= 2) {
      currentTableRows.push(line.columns);
      continue;
    }

    // Not inside table -> Heading or Paragraph
    flushActiveTable();

    const isHeading =
      line.text.length < 80 &&
      (line.text.startsWith('#') ||
        /^(Протокол|Акт|Паспорт|Сертификат|Заключение|Раздел|Глава|Section|Chapter)\b/i.test(line.text) ||
        /^Результаты\s+испытаний\b/i.test(line.text) ||
        /^(\d+\.|\d+\))\s+[A-ZА-ЯЁ]/.test(line.text));

    if (isHeading) {
      blocks.push({
        type: 'heading',
        y: blocks.length,
        level: line.text.startsWith('Протокол') ? 1 : 2,
        text: line.text.replace(/^#+\s*/, ''),
      });
    } else {
      blocks.push({
        type: 'paragraph',
        y: blocks.length,
        text: line.text,
      });
    }
  }

  flushActiveTable();

  // Fallback: If no blocks extracted, split recognized text line by line
  if (blocks.length === 0 && recognizedText.trim()) {
    const rawLines = recognizedText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    for (const l of rawLines) {
      blocks.push({
        type: 'paragraph',
        y: blocks.length,
        text: l,
      });
    }
  }

  return buildStructuredDocument([blocks], baseName);
}

async function extractTextFromPdf(file: File, onProgress: (p: number, t: string) => void): Promise<string> {
  const doc = await parsePdfToStructuredDocument(file, file.name.replace(/\.[^/.]+$/, ''), onProgress);
  return exportToTxtString(doc) || 'No readable text layer found in PDF (scanned or image-only document).';
}

async function renderPdfToImageOutput(
  file: File,
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp',
  ext: string,
  settings: ConversionSettings,
  baseName: string,
  onProgress: (p: number, t: string) => void
): Promise<{ blob: Blob; fileName: string }> {
  onProgress(25, 'Загрузка PDF документа...');
  const pdfjs = await getPdfJsLib();
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdfDocument = await loadingTask.promise;
  const numPages = pdfDocument.numPages;

  const mode = settings.multiPageExportMode || 'single_merged';

  // If only 1 page in document
  if (numPages === 1) {
    onProgress(50, 'Рендеринг страницы документа в высоком разрешении...');
    const page = await pdfDocument.getPage(1);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    if (mimeType === 'image/jpeg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    await page.render({ canvasContext: ctx, viewport }).promise;
    const blob: Blob = await new Promise((res, rej) =>
      canvas.toBlob((b) => (b ? res(b) : rej(new Error('Canvas export failed'))), mimeType, 0.95)
    );
    return { blob, fileName: `${baseName}.${ext}` };
  }

  // Multi-page PDF:
  // Mode 1: ZIP Archive of all pages
  if (mode === 'zip_archive') {
    onProgress(30, `Экспорт всех ${numPages} страниц в ZIP-архив...`);
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    for (let p = 1; p <= numPages; p++) {
      const pct = Math.min(95, Math.round(30 + (p / numPages) * 60));
      onProgress(pct, `Рендеринг страницы ${p} из ${numPages}...`);
      const page = await pdfDocument.getPage(p);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d')!;
      if (mimeType === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      await page.render({ canvasContext: ctx, viewport }).promise;
      const imgBlob: Blob = await new Promise((res, rej) =>
        canvas.toBlob((b) => (b ? res(b) : rej(new Error('Canvas export failed'))), mimeType, 0.95)
      );
      const paddedNum = String(p).padStart(String(numPages).length > 1 ? String(numPages).length : 2, '0');
      zip.file(`${baseName}_стр_${paddedNum}.${ext}`, imgBlob);
    }

    onProgress(95, 'Упаковка страниц в ZIP-архив...');
    const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    return { blob: zipBlob, fileName: `${baseName}_все_страницы.zip` };
  }

  // Mode 2: Selected single page
  if (mode === 'selected_page') {
    let targetPage = 1;
    if (typeof settings.selectedPageOrSheet === 'number') {
      targetPage = settings.selectedPageOrSheet;
    } else if (typeof settings.selectedPageOrSheet === 'string') {
      const parsed = parseInt(settings.selectedPageOrSheet, 10);
      if (!isNaN(parsed)) targetPage = parsed;
    }
    targetPage = Math.max(1, Math.min(numPages, targetPage));

    onProgress(40, `Рендеринг выбранной страницы ${targetPage}...`);
    const page = await pdfDocument.getPage(targetPage);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    if (mimeType === 'image/jpeg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    await page.render({ canvasContext: ctx, viewport }).promise;
    const blob: Blob = await new Promise((res, rej) =>
      canvas.toBlob((b) => (b ? res(b) : rej(new Error('Canvas export failed'))), mimeType, 0.95)
    );
    return { blob, fileName: `${baseName}_стр_${targetPage}.${ext}` };
  }

  // Mode 3: Single Merged Infographic (Склейка всех страниц в одно изображение)
  onProgress(30, `Склейка всех ${numPages} страниц в единую инфографику...`);
  const renderedCanvases: HTMLCanvasElement[] = [];

  for (let p = 1; p <= numPages; p++) {
    const pct = Math.min(85, Math.round(30 + (p / numPages) * 50));
    onProgress(pct, `Рендеринг страницы ${p}/${numPages}...`);
    const page = await pdfDocument.getPage(p);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    if (mimeType === 'image/jpeg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    await page.render({ canvasContext: ctx, viewport }).promise;
    renderedCanvases.push(canvas);
  }

  onProgress(88, 'Объединение страниц в единое полотно...');
  const gap = 24;
  const maxWidth = Math.max(...renderedCanvases.map((c) => c.width));
  const totalHeight = renderedCanvases.reduce((sum, c) => sum + c.height, 0) + (renderedCanvases.length - 1) * gap;

  const masterCanvas = document.createElement('canvas');
  masterCanvas.width = maxWidth;
  masterCanvas.height = totalHeight;
  const masterCtx = masterCanvas.getContext('2d')!;

  masterCtx.fillStyle = '#ffffff';
  masterCtx.fillRect(0, 0, maxWidth, totalHeight);

  let currentY = 0;
  for (let i = 0; i < renderedCanvases.length; i++) {
    const pageCanvas = renderedCanvases[i];
    const offsetX = Math.round((maxWidth - pageCanvas.width) / 2);
    masterCtx.drawImage(pageCanvas, offsetX, currentY);
    currentY += pageCanvas.height + gap;
  }

  const blob: Blob = await new Promise((res, rej) =>
    masterCanvas.toBlob((b) => (b ? res(b) : rej(new Error('Canvas export failed'))), mimeType, 0.95)
  );
  return { blob, fileName: `${baseName}.${ext}` };
}

async function renderHtmlToImageBlob(
  htmlContent: string,
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp',
  quality = 0.95
): Promise<Blob> {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-99999px';
  container.style.top = '0px';
  container.style.width = '1040px';
  container.style.maxWidth = '1040px';
  container.style.background = '#ffffff';
  container.style.boxSizing = 'border-box';
  container.style.padding = '24px';
  container.style.color = '#0f172a';
  container.style.zIndex = '-9999';
  container.innerHTML = htmlContent;
  document.body.appendChild(container);

  try {
    const html2canvasModule = await import('html2canvas');
    const html2canvas = (html2canvasModule as any).default || html2canvasModule;
    const canvas = await html2canvas(container, {
      scale: 2.0,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
      windowWidth: 1080,
    });

    const blob: Blob = await new Promise((res, rej) =>
      canvas.toBlob((b: Blob | null) => (b ? res(b) : rej(new Error('Canvas export failed'))), mimeType, quality)
    );
    return blob;
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

async function renderXlsxToImageOutput(
  arrayBuffer: ArrayBuffer,
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp',
  ext: string,
  settings: ConversionSettings,
  baseName: string,
  onProgress: (p: number, t: string) => void
): Promise<{ blob: Blob; fileName: string }> {
  const workbook = XLSX.read(arrayBuffer, {
    type: 'array',
    cellDates: true,
    cellNF: true,
    cellText: true,
    cellStyles: true,
    cellFormula: true,
  });

  const sheetNames = workbook.SheetNames || ['Sheet1'];
  const mode = settings.multiPageExportMode || 'single_merged';

  // Mode 1: ZIP Archive of all sheets as individual image files
  if (mode === 'zip_archive') {
    onProgress(30, `Экспорт всех ${sheetNames.length} листов в ZIP-архив изображений...`);
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    for (let sIdx = 0; sIdx < sheetNames.length; sIdx++) {
      const sheetName = sheetNames[sIdx];
      const pct = Math.min(95, Math.round(30 + ((sIdx + 1) / sheetNames.length) * 60));
      onProgress(pct, `Рендеринг листа "${sheetName}" (${sIdx + 1}/${sheetNames.length})...`);

      const sheetHtml = convertXlsxToStyledHtml(arrayBuffer, baseName, sheetName);
      let sheetImgBlob: Blob;
      try {
        sheetImgBlob = await renderHtmlToImageBlob(sheetHtml, mimeType, settings.imageQuality || 0.95);
      } catch (err) {
        console.warn('html2canvas rendering fallback:', err);
        const sheetDocModel = parseXlsxToStructuredDocument(arrayBuffer, baseName, sheetName);
        const pdfBlob = await renderHtmlToPdfBlob(sheetHtml, `${baseName} - ${sheetName}`, () => {}, { docModel: sheetDocModel });
        const pdfFile = new File([pdfBlob], `${sheetName}.pdf`, { type: 'application/pdf' });
        const res = await renderPdfToImageOutput(pdfFile, mimeType, ext, { multiPageExportMode: 'single_merged' }, `${baseName} - ${sheetName}`, () => {});
        sheetImgBlob = res.blob;
      }

      const safeSheetName = sheetName.replace(/[/\\?%*:|"<>]/g, '_');
      zip.file(`${baseName}_${safeSheetName}.${ext}`, sheetImgBlob);
    }

    onProgress(95, 'Создание архива со всеми листами...');
    const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    return { blob: zipBlob, fileName: `${baseName}_все_листы.zip` };
  }

  // Mode 2: Selected single sheet
  if (mode === 'selected_page') {
    let targetSheet = sheetNames[0];
    if (typeof settings.selectedPageOrSheet === 'string' && sheetNames.includes(settings.selectedPageOrSheet)) {
      targetSheet = settings.selectedPageOrSheet;
    } else if (typeof settings.selectedPageOrSheet === 'number' && sheetNames[settings.selectedPageOrSheet - 1]) {
      targetSheet = sheetNames[settings.selectedPageOrSheet - 1];
    } else if (typeof settings.selectedPageOrSheet === 'string') {
      const parsedIdx = parseInt(settings.selectedPageOrSheet, 10);
      if (!isNaN(parsedIdx) && sheetNames[parsedIdx - 1]) {
        targetSheet = sheetNames[parsedIdx - 1];
      }
    }

    onProgress(50, `Рендеринг выбранного листа "${targetSheet}"...`);
    const sheetHtml = convertXlsxToStyledHtml(arrayBuffer, baseName, targetSheet);
    let blob: Blob;
    try {
      blob = await renderHtmlToImageBlob(sheetHtml, mimeType, settings.imageQuality || 0.95);
    } catch (err) {
      console.warn('html2canvas rendering fallback:', err);
      const sheetDocModel = parseXlsxToStructuredDocument(arrayBuffer, baseName, targetSheet);
      const pdfBlob = await renderHtmlToPdfBlob(sheetHtml, `${baseName} - ${targetSheet}`, onProgress, { docModel: sheetDocModel });
      const pdfFile = new File([pdfBlob], `${targetSheet}.pdf`, { type: 'application/pdf' });
      const res = await renderPdfToImageOutput(pdfFile, mimeType, ext, { multiPageExportMode: 'single_merged' }, `${baseName}_${targetSheet}`, onProgress);
      blob = res.blob;
    }
    const safeSheetName = targetSheet.replace(/[/\\?%*:|"<>]/g, '_');
    return { blob, fileName: `${baseName}_${safeSheetName}.${ext}` };
  }

  // Mode 3: Single Merged Output (Все листы на одном полотне)
  onProgress(50, 'Рендеринг таблицы в изображение...');
  const styledHtml = convertXlsxToStyledHtml(arrayBuffer, baseName);
  let blob: Blob;
  try {
    blob = await renderHtmlToImageBlob(styledHtml, mimeType, settings.imageQuality || 0.95);
  } catch (err) {
    console.warn('html2canvas rendering fallback:', err);
    const docModel = parseXlsxToStructuredDocument(arrayBuffer, baseName);
    const pdfBlob = await renderHtmlToPdfBlob(styledHtml, baseName, onProgress, { docModel });
    const pdfFile = new File([pdfBlob], `${baseName}.pdf`, { type: 'application/pdf' });
    const res = await renderPdfToImageOutput(pdfFile, mimeType, ext, { multiPageExportMode: 'single_merged' }, baseName, onProgress);
    blob = res.blob;
  }
  return { blob, fileName: `${baseName}.${ext}` };
}

async function renderPdfFirstPageToImage(
  file: File,
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp',
  onProgress: (p: number, t: string) => void
): Promise<Blob> {
  const ext = mimeType === 'image/jpeg' ? 'jpg' : (mimeType === 'image/webp' ? 'webp' : 'png');
  const res = await renderPdfToImageOutput(file, mimeType, ext, { multiPageExportMode: 'single_merged' }, 'document', onProgress);
  return res.blob;
}

async function convertImageToSearchablePdf(
  sourceFile: File,
  sourceFormat: string,
  settings: ConversionSettings,
  isHeic: boolean,
  onProgress: (percent: number, text: string) => void
): Promise<Blob> {
  onProgress(15, 'Подготовка изображения к распознаванию...');

  let imgBlobForOcr: Blob = sourceFile;

  // Prepare standard PNG / JPG Blob if source is special format or HEIC
  if (isHeic || !['PNG', 'JPG', 'JPEG', 'WEBP', 'BMP'].includes(sourceFormat.toUpperCase())) {
    try {
      imgBlobForOcr = await convertImageToCanvasBlob(sourceFile, 'image/png', 1.0, settings);
    } catch (e) {
      console.warn('Canvas conversion failed, using source file directly:', e);
      imgBlobForOcr = sourceFile;
    }
  }

  // 1. Primary path: Native Tesseract Searchable PDF Renderer (Mode 3 Invisible text)
  try {
    onProgress(25, 'Инициализация OCR-движка распознавания текста...');
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('rus+eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text' && typeof m.progress === 'number') {
          const pct = Math.min(92, Math.max(30, Math.round(30 + m.progress * 60)));
          onProgress(pct, `Распознавание текста (OCR): ${Math.round(m.progress * 100)}%`);
        } else if (m.status === 'loading language traineddata') {
          onProgress(28, 'Загрузка языковых моделей (русский + английский)...');
        }
      },
    });

    onProgress(35, 'Распознавание текста и генерация Searchable PDF...');
    const result = await worker.recognize(
      imgBlobForOcr,
      {
        pdfTitle: sourceFile.name ? sourceFile.name.replace(/\.[^/.]+$/, '') : 'Document',
      },
      { pdf: true }
    );

    await worker.terminate();

    if (result.data?.pdf && result.data.pdf.length > 0) {
      onProgress(95, 'Сохранение Searchable PDF документа...');
      const pdfArray = result.data.pdf instanceof Uint8Array ? result.data.pdf : new Uint8Array(result.data.pdf);
      return new Blob([pdfArray], { type: 'application/pdf' });
    }
  } catch (ocrErr) {
    console.warn('Tesseract native PDF generation failed, falling back to standard PDF wrapper:', ocrErr);
  }

  // 2. Fallback path: Embed image directly into standard PDFDocument
  onProgress(85, 'Генерация PDF документа...');
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  let embedImage;
  const rawBytes = new Uint8Array(await imgBlobForOcr.arrayBuffer());
  if (sourceFormat === 'JPG' || sourceFormat === 'JPEG') {
    try {
      embedImage = await pdfDoc.embedJpg(rawBytes);
    } catch {
      const pngBlob = await convertImageToCanvasBlob(sourceFile, 'image/png', 1.0, settings);
      embedImage = await pdfDoc.embedPng(new Uint8Array(await pngBlob.arrayBuffer()));
    }
  } else {
    try {
      embedImage = await pdfDoc.embedPng(rawBytes);
    } catch {
      const pngBlob = await convertImageToCanvasBlob(sourceFile, 'image/png', 1.0, settings);
      embedImage = await pdfDoc.embedPng(new Uint8Array(await pngBlob.arrayBuffer()));
    }
  }

  const page = pdfDoc.addPage([embedImage.width, embedImage.height]);
  page.drawImage(embedImage, {
    x: 0,
    y: 0,
    width: embedImage.width,
    height: embedImage.height,
  });

  onProgress(95, 'Сохранение PDF документа...');
  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

interface VectorPdfOptions {
  headerHtml?: string;
  footerHtml?: string;
  tableGrids?: number[][];
  docModel?: StructuredDocument;
}

async function renderHtmlToPdfBlob(
  htmlContent: string,
  baseName: string,
  onProgress?: (p: number, t: string) => void,
  options?: VectorPdfOptions
): Promise<Blob> {
  onProgress?.(25, 'Генерация векторного PDF документа...');

  const fonts = await fetchCyrillicFonts();

  if (fonts.regular) {
    try {
      const pdfDoc = await PDFDocument.create();
      pdfDoc.registerFontkit(fontkit);

      const regFont = await pdfDoc.embedFont(fonts.regular);
      const boldFont = fonts.bold ? await pdfDoc.embedFont(fonts.bold) : regFont;

      const pageWidth = 595.28; // A4 width pt
      const pageHeight = 841.89; // A4 height pt
      const marginX = 36; // 0.5 in / 12.7 mm
      const marginY = 36;
      const contentWidth = pageWidth - marginX * 2;
      const minY = marginY + 20;
      const maxY = pageHeight - marginY;

      let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      let curY = maxY;

      const wrapText = (text: string, font: any, fontSize: number, maxWidth: number): string[] => {
        if (!text) return [''];
        const rawLines = text.split(/\r?\n/);
        const resultLines: string[] = [];

        for (const rawLine of rawLines) {
          const trimmed = rawLine.replace(/[ \t\f\v]+/g, ' ').trim();
          if (!trimmed) continue;
          const words = trimmed.split(' ');
          let curLine = '';

          for (const word of words) {
            const testLine = curLine ? `${curLine} ${word}` : word;
            let testWidth = 0;
            try {
              testWidth = font.widthOfTextAtSize(testLine, fontSize);
            } catch {
              testWidth = testLine.length * (fontSize * 0.55);
            }

            if (testWidth <= maxWidth) {
              curLine = testLine;
            } else {
              if (curLine) {
                resultLines.push(curLine);
              }
              // Check if word itself exceeds maxWidth
              let wordWidth = 0;
              try {
                wordWidth = font.widthOfTextAtSize(word, fontSize);
              } catch {
                wordWidth = word.length * (fontSize * 0.55);
              }
              if (wordWidth > maxWidth) {
                let partial = '';
                for (const char of word) {
                  const candidate = partial + char;
                  let cWidth = 0;
                  try {
                    cWidth = font.widthOfTextAtSize(candidate, fontSize);
                  } catch {
                    cWidth = candidate.length * (fontSize * 0.55);
                  }
                  if (cWidth <= maxWidth) {
                    partial = candidate;
                  } else {
                    if (partial) resultLines.push(partial);
                    partial = char;
                  }
                }
                curLine = partial;
              } else {
                curLine = word;
              }
            }
          }
          if (curLine) {
            resultLines.push(curLine);
          }
        }
        return resultLines.length > 0 ? resultLines : [''];
      };

      const ensureSpace = (heightNeeded: number) => {
        if (curY - heightNeeded < minY) {
          currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
          curY = maxY;
        }
      };

      const drawParagraph = (text: string, isBold = false, fontSize = 9.5, mb = 4, align: 'left' | 'center' = 'left') => {
        const font = isBold ? boldFont : regFont;
        const lineHeight = fontSize * 1.35;
        const lines = wrapText(text, font, fontSize, contentWidth);
        ensureSpace(lines.length * lineHeight + mb);

        for (const l of lines) {
          let textX = marginX;
          if (align === 'center') {
            try {
              const textWidth = font.widthOfTextAtSize(l, fontSize);
              textX = marginX + Math.max(0, (contentWidth - textWidth) / 2);
            } catch {}
          }
          currentPage.drawText(l, {
            x: textX,
            y: curY - fontSize,
            size: fontSize,
            font,
            color: rgb(0.08, 0.1, 0.14),
          });
          curY -= lineHeight;
        }
        curY -= mb;
      };

      // 1. Draw Header if extracted from DOCX header XML
      if (options?.headerHtml) {
        const pDom = new DOMParser();
        const headerDoc = pDom.parseFromString(options.headerHtml, 'text/html');
        const headerText = (headerDoc.body.textContent || '').trim();
        if (headerText) {
          const hLines = headerText.split('\n').map(l => l.trim()).filter(Boolean);
          for (const hl of hLines) {
            drawParagraph(hl, false, 8, 2, 'center');
          }
          curY -= 6;
        }
      }

      // 2. Parse main content HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');

      const processHtmlNode = (node: Element) => {
        const tag = node.tagName.toLowerCase();

        if (tag === 'table') {
          const rows = Array.from(node.querySelectorAll('tr'));
          if (rows.length === 0) return;

          // Parse raw cell values
          const rawGrid: string[][] = [];
          let maxCols = 0;

          for (const tr of rows) {
            const cells = Array.from(tr.querySelectorAll('th, td'));
            const cellVals: string[] = [];
            for (const cell of cells) {
              const clone = cell.cloneNode(true) as HTMLElement;
              clone.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
              const blocks = Array.from(clone.querySelectorAll('p, div, li'));
              if (blocks.length > 0) {
                cellVals.push(
                  blocks
                    .map(b => (b.textContent || '').replace(/[ \t\f\v]+/g, ' ').trim())
                    .filter(Boolean)
                    .join('\n')
                );
              } else {
                cellVals.push(
                  (clone.textContent || '')
                    .split('\n')
                    .map(l => l.replace(/[ \t\f\v]+/g, ' ').trim())
                    .filter(Boolean)
                    .join('\n')
                );
              }
            }
            if (cellVals.length > maxCols) maxCols = cellVals.length;
            rawGrid.push(cellVals);
          }

          if (maxCols === 0) return;

          // Pad rows to maxCols
          for (const r of rawGrid) {
            while (r.length < maxCols) r.push('');
          }

          // Determine column widths
          const colWidths: number[] = new Array(maxCols).fill(0);
          const matchingGrid = options?.tableGrids?.find(g => g.length === maxCols) || options?.tableGrids?.[0];

          if (matchingGrid && matchingGrid.length === maxCols) {
            const totalDxa = matchingGrid.reduce((sum, v) => sum + v, 0);
            for (let c = 0; c < maxCols; c++) {
              colWidths[c] = (matchingGrid[c] / (totalDxa || 1)) * contentWidth;
            }
          } else {
            // Content-proportional calculation
            const maxLens: number[] = new Array(maxCols).fill(0);
            for (let c = 0; c < maxCols; c++) {
              for (const row of rawGrid) {
                const cellLen = (row[c] || '').length;
                if (cellLen > maxLens[c]) maxLens[c] = cellLen;
              }
            }

            if (maxCols > 2) {
              colWidths[0] = Math.min(Math.max(maxLens[0] * 7, 28), 38);
            }
            const assignedWidth = colWidths[0] || 0;
            const remainingWidth = contentWidth - assignedWidth;
            const remainingCols = maxCols > 2 ? maxCols - 1 : maxCols;
            const remainingLensSum = maxLens.slice(maxCols > 2 ? 1 : 0).reduce((sum, v) => sum + Math.max(v, 8), 0);

            for (let c = (maxCols > 2 ? 1 : 0); c < maxCols; c++) {
              const proportion = Math.max(maxLens[c], 8) / (remainingLensSum || 1);
              colWidths[c] = proportion * remainingWidth;
            }
          }

          const fontSize = 8.5;
          const cellLineHeight = 11.5;
          const padX = 4.5;
          const padY = 4.5;

          rawGrid.forEach((row, rIdx) => {
            const isHeader = rIdx === 0 || row.some((c, cI) => cI > 0 && (c.includes('Наименование') || c.includes('Результат')));
            const font = isHeader ? boldFont : regFont;

            const wrappedCells = row.map((cellText, cIdx) =>
              wrapText(cellText, font, fontSize, colWidths[cIdx] - padX * 2)
            );

            const maxLines = Math.max(1, ...wrappedCells.map(wc => wc.length));
            const rowHeight = Math.max(18, maxLines * cellLineHeight + padY * 2);

            ensureSpace(rowHeight);

            let cellX = marginX;
            for (let c = 0; c < maxCols; c++) {
              const w = colWidths[c];

              // Cell Background
              if (isHeader) {
                currentPage.drawRectangle({
                  x: cellX,
                  y: curY - rowHeight,
                  width: w,
                  height: rowHeight,
                  color: rgb(0.94, 0.95, 0.97),
                  borderColor: rgb(0.35, 0.4, 0.48),
                  borderWidth: 0.5,
                });
              } else {
                currentPage.drawRectangle({
                  x: cellX,
                  y: curY - rowHeight,
                  width: w,
                  height: rowHeight,
                  color: rgb(1, 1, 1),
                  borderColor: rgb(0.45, 0.5, 0.58),
                  borderWidth: 0.5,
                });
              }

              // Cell Text Lines
              let textY = curY - padY - (fontSize * 0.85);
              for (const line of wrappedCells[c]) {
                if (line) {
                  currentPage.drawText(line, {
                    x: cellX + padX,
                    y: textY,
                    size: fontSize,
                    font,
                    color: rgb(0.08, 0.1, 0.14),
                  });
                }
                textY -= cellLineHeight;
              }

              cellX += w;
            }

            curY -= rowHeight;
          });

          curY -= 10;
        } else if (tag === 'p' || tag.startsWith('h') || tag === 'li') {
          if (node.closest('table')) return;

          const clone = node.cloneNode(true) as HTMLElement;
          clone.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
          const text = (clone.textContent || '').trim();
          if (!text) return;

          const isTitle = tag === 'h1' || tag === 'h2' || tag === 'h3' || text.startsWith('Протокол');
          const isNote = text.startsWith('Примечание') || text.startsWith('Климатические');
          const isSubCaption = text.startsWith('(подпись') || text.startsWith('(должность');

          if (isTitle) {
            drawParagraph(text, true, 12, 6);
          } else if (isNote) {
            drawParagraph(text, false, 9, 5);
          } else if (isSubCaption) {
            drawParagraph(text, false, 7.5, 6);
          } else {
            const hasStrong = !!node.querySelector('strong, b') || node.tagName === 'STRONG' || node.tagName === 'B';
            drawParagraph(text, hasStrong, 9.5, 4);
          }
        } else {
          for (const child of Array.from(node.children)) {
            processHtmlNode(child);
          }
        }
      };

      for (const child of Array.from(doc.body.children)) {
        processHtmlNode(child);
      }

      // Draw footer (if extracted from DOCX footer XML)
      if (options?.footerHtml) {
        const pDom = new DOMParser();
        const footerDoc = pDom.parseFromString(options.footerHtml, 'text/html');
        const footerText = (footerDoc.body.textContent || '').trim();
        if (footerText) {
          drawParagraph(footerText, false, 8, 2, 'center');
        }
      }

      // Embed structured document model metadata for 100% round-trip lossless conversions
      if (options?.docModel) {
        try {
          const metaString = serializeDocumentModelToMeta(options.docModel);
          if (metaString) {
            pdfDoc.setSubject(metaString);
          }
        } catch (mErr) {
          console.warn('Failed to embed SDM meta in PDF:', mErr);
        }
      }

      onProgress?.(90, 'Сохранение векторного PDF файла...');
      const pdfBytes = await pdfDoc.save();
      return new Blob([pdfBytes], { type: 'application/pdf' });
    } catch (vectorErr) {
      console.warn('Векторный рендеринг PDF завершился ошибкой, переключаемся на fallback:', vectorErr);
    }
  }

  // Fallback: html2canvas
  onProgress?.(60, 'Рендеринг разметки через Canvas...');
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '794px';
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
    const imgWidth = 595.28;
    const pageHeight = 841.89;
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

  // Helper to format a table as a clean ASCII text table
  const formatTableToAscii = (tableEl: HTMLElement): string[] => {
    const tableRows = Array.from(tableEl.querySelectorAll('tr'));
    if (tableRows.length === 0) return [];

    const rawGrid: string[][] = [];
    let maxCols = 0;

    for (const tr of tableRows) {
      const cells = Array.from(tr.querySelectorAll('th, td')).map(c => extractCellText(c as HTMLElement));
      if (cells.length > maxCols) maxCols = cells.length;
      rawGrid.push(cells);
    }

    if (maxCols === 0) return [];

    // Pad all rows
    for (const row of rawGrid) {
      while (row.length < maxCols) {
        row.push('');
      }
    }

    // Determine target column widths (cap maximum width to 45 chars for word wrap)
    const colWidths: number[] = new Array(maxCols).fill(0);
    for (let c = 0; c < maxCols; c++) {
      let maxLen = 0;
      for (const row of rawGrid) {
        const len = (row[c] || '').length;
        if (len > maxLen) maxLen = len;
      }
      if (c === 0 && maxCols > 2) {
        colWidths[c] = Math.max(Math.min(maxLen, 6), 4);
      } else {
        colWidths[c] = Math.max(Math.min(maxLen, 45), 8);
      }
    }

    // Word wrap helper
    const wrapCell = (text: string, width: number): string[] => {
      if (!text) return [''];
      const words = text.split(/\s+/);
      const resLines: string[] = [];
      let cur = '';

      for (const w of words) {
        if (!cur) {
          cur = w;
        } else if ((cur + ' ' + w).length <= width) {
          cur += ' ' + w;
        } else {
          resLines.push(cur);
          cur = w;
        }
      }
      if (cur) resLines.push(cur);
      return resLines.length > 0 ? resLines : [''];
    };

    const separatorLine = '+' + colWidths.map(w => '-'.repeat(w + 2)).join('+') + '+';
    const outputLines: string[] = [];
    outputLines.push(separatorLine);

    rawGrid.forEach((row, rIdx) => {
      const wrappedCells = row.map((cell, cIdx) => wrapCell(cell, colWidths[cIdx]));
      const rowLineCount = Math.max(...wrappedCells.map(wc => wc.length));

      for (let l = 0; l < rowLineCount; l++) {
        const lineParts: string[] = [];
        for (let c = 0; c < maxCols; c++) {
          const w = colWidths[c];
          const text = wrappedCells[c][l] || '';
          const pad = ' '.repeat(Math.max(0, w - text.length));
          lineParts.push(` ${text}${pad} `);
        }
        outputLines.push('|' + lineParts.join('|') + '|');
      }

      // Add border after header row (row 0) and at the bottom of table
      if (rIdx === 0 || rIdx === rawGrid.length - 1) {
        outputLines.push(separatorLine);
      }
    });

    return outputLines;
  };

  const processNode = (node: Node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();

      if (tag === 'table') {
        const asciiLines = formatTableToAscii(el);
        if (asciiLines.length > 0) {
          lines.push(...asciiLines);
          lines.push('');
        }
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

async function extractDocxToStructuredDocument(file: File, baseName: string, onProgress: (p: number, t: string) => void): Promise<StructuredDocument> {
  onProgress(25, 'Извлечение таблиц и текста из DOCX...');
  const [docHtml, tableGrids] = await Promise.all([
    extractHtmlFromDocx(file, onProgress),
    extractDocxTableGrids(file),
  ]);

  const parser = new DOMParser();
  const doc = parser.parseFromString(docHtml, 'text/html');
  const blocks: DocumentBlock[] = [];

  const processNode = (node: Element) => {
    const tag = node.tagName.toLowerCase();
    if (tag === 'table') {
      const rows = Array.from(node.querySelectorAll('tr'));
      if (rows.length === 0) return;

      const rawGrid: string[][] = [];
      let maxCols = 0;

      for (const tr of rows) {
        const cells = Array.from(tr.children).filter(c => c.tagName.toLowerCase() === 'td' || c.tagName.toLowerCase() === 'th');
        const rowVals = cells.map(c => {
          const clone = c.cloneNode(true) as Element;
          clone.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
          return (clone.textContent || '').trim();
        });
        if (rowVals.length > maxCols) maxCols = rowVals.length;
        rawGrid.push(rowVals);
      }

      if (maxCols === 0) return;
      const headers = rawGrid.length > 0 ? rawGrid[0] : [];
      while (headers.length < maxCols) headers.push(`Колонка ${headers.length + 1}`);

      const dataRows = rawGrid.slice(1);
      const rowsFormatted = dataRows.map(r => {
        const padded = [...r];
        while (padded.length < maxCols) padded.push('');
        return padded.map(c => ({
          text: c,
          rawValue: isNaN(Number(c.replace(/\s+/g, '').replace(',', '.'))) ? c : Number(c.replace(/\s+/g, '').replace(',', '.')),
          isHeader: false
        }));
      });

      blocks.push({
        type: 'table',
        y: blocks.length,
        headers,
        rows: rowsFormatted.length > 0 ? rowsFormatted : [headers.map(h => ({ text: h, rawValue: h, isHeader: true }))],
        matrix: [headers, ...dataRows.map(r => {
          const padded = [...r];
          while (padded.length < maxCols) padded.push('');
          return padded;
        })]
      });
    } else if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
      const text = (node.textContent || '').trim();
      if (text) {
        blocks.push({
          type: 'heading',
          y: blocks.length,
          level: tag === 'h1' ? 1 : 2,
          text
        });
      }
    } else if (tag === 'p' || tag === 'li') {
      if (node.closest('table')) return;
      const text = (node.textContent || '').trim();
      if (text) {
        const isHeading = text.length < 80 && /^(Протокол|Акт|Паспорт|Сертификат|Заключение)\b/i.test(text);
        if (isHeading) {
          blocks.push({
            type: 'heading',
            y: blocks.length,
            level: 1,
            text
          });
        } else {
          blocks.push({
            type: 'paragraph',
            y: blocks.length,
            text,
            isBold: !!node.querySelector('strong, b')
          });
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

  return buildStructuredDocument([blocks], baseName);
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

async function extractDocxHeadersAndFootersHtml(file: File): Promise<{ headerHtml: string; footerHtml: string }> {
  try {
    const JSZip = (await import('jszip')).default;
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    const parser = new DOMParser();

    const parseXmlPartToHtml = (xmlStr: string): string => {
      const xmlDoc = parser.parseFromString(xmlStr, 'application/xml');
      const parts: string[] = [];

      // Check for tables in header/footer
      const tbls = Array.from(xmlDoc.getElementsByTagName('w:tbl'));
      if (tbls.length > 0) {
        for (const tbl of tbls) {
          const rows = Array.from(tbl.getElementsByTagName('w:tr'));
          parts.push('<table>');
          for (const row of rows) {
            const cells = Array.from(row.getElementsByTagName('w:tc'));
            parts.push('<tr>');
            for (const cell of cells) {
              const texts = Array.from(cell.getElementsByTagName('w:t'))
                .map((t) => t.textContent || '')
                .join(' ')
                .trim();
              parts.push(`<td>${escapeHtml(texts)}</td>`);
            }
            parts.push('</tr>');
          }
          parts.push('</table>');
        }
      }

      // Check for paragraphs outside/inside
      const ps = Array.from(xmlDoc.getElementsByTagName('w:p'));
      for (const p of ps) {
        if (p.closest('w:tbl') || p.closest('tbl')) continue;
        const texts = Array.from(p.getElementsByTagName('w:t'))
          .map((t) => t.textContent || '')
          .join('')
          .trim();
        if (texts) {
          parts.push(`<p>${escapeHtml(texts)}</p>`);
        }
      }

      return parts.join('\n');
    };

    let headerHtml = '';
    let footerHtml = '';

    // Search header files
    const headerFiles = Object.keys(zip.files).filter((name) => /^word\/header\d+\.xml$/i.test(name)).sort();
    for (const hFile of headerFiles) {
      const content = await zip.file(hFile)?.async('text');
      if (content) {
        const hHtml = parseXmlPartToHtml(content);
        if (hHtml) headerHtml += (headerHtml ? '\n' : '') + hHtml;
      }
    }

    // Search footer files
    const footerFiles = Object.keys(zip.files).filter((name) => /^word\/footer\d+\.xml$/i.test(name)).sort();
    for (const fFile of footerFiles) {
      const content = await zip.file(fFile)?.async('text');
      if (content) {
        const fHtml = parseXmlPartToHtml(content);
        if (fHtml) footerHtml += (footerHtml ? '\n' : '') + fHtml;
      }
    }

    return { headerHtml, footerHtml };
  } catch (err) {
    console.warn('Не удалось извлечь колонтитулы DOCX:', err);
    return { headerHtml: '', footerHtml: '' };
  }
}

async function extractHtmlFromDocx(file: File, onProgress: (p: number, t: string) => void): Promise<string> {
  onProgress(30, 'Converting DOCX to HTML with Mammoth...');
  const mammoth = await import('mammoth');
  const arrayBuffer = await file.arrayBuffer();
  
  const [mammothResult, { headerHtml, footerHtml }] = await Promise.all([
    (mammoth.default || mammoth).convertToHtml({ arrayBuffer }),
    extractDocxHeadersAndFootersHtml(file),
  ]);

  let bodyHtml = mammothResult.value || '';
  if (headerHtml) {
    bodyHtml = headerHtml + '\n' + bodyHtml;
  }
  if (footerHtml) {
    bodyHtml = bodyHtml + '\n' + footerHtml;
  }

  return bodyHtml;
}

async function createDocxFromText(text: string, baseName: string, onProgress: (p: number, t: string) => void): Promise<Blob> {
  onProgress(60, 'Generating Microsoft Word .docx...');
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } = await import('docx');

  const children: any[] = [];
  const lines = text.split('\n');
  let inTable = false;
  let currentTableRows: any[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isTabular = line.includes('\t') || (line.includes(';') && (line.split(';').length >= 3 || line.startsWith('№')));

    if (isTabular) {
      if (!inTable) {
        inTable = true;
        currentTableRows = [];
      }
      const sep = line.includes('\t') ? '\t' : ';';
      const cells = line.split(sep).map(c => c.trim());
      const isHeader = currentTableRows.length === 0 && (cells.some(c => c === '№' || c.includes('Наименование') || c.includes('Результат') || c.includes('Метод')));

      currentTableRows.push(
        new TableRow({
          tableHeader: isHeader,
          children: cells.map(c => new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: c, bold: isHeader, size: 20, font: 'Calibri' })] })],
            shading: isHeader ? { fill: 'F1F5F9' } : undefined,
          }))
        })
      );
    } else {
      if (inTable && currentTableRows.length > 0) {
        children.push(
          new Table({
            rows: currentTableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
              left: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
              right: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
              insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
            }
          })
        );
        children.push(new Paragraph({ text: '', spacing: { after: 120 } }));
        inTable = false;
        currentTableRows = [];
      }

      if (!line.trim()) {
        children.push(new Paragraph({ spacing: { after: 100 } }));
      } else {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: line, size: 22, font: 'Calibri' })],
            spacing: { after: 120 },
          })
        );
      }
    }
  }

  if (inTable && currentTableRows.length > 0) {
    children.push(
      new Table({
        rows: currentTableRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
          left: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
          right: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
          insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
        }
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
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

  // 0. IMAGE SOURCE HANDLING: JPG / PNG / WEBP / BMP / TIFF -> DOCX / XLSX / CSV / HTML / TXT
  if (['JPG', 'JPEG', 'PNG', 'WEBP', 'BMP', 'TIFF', 'TIF', 'HEIC'].includes(srcFmt)) {
    onProgress(25, 'Оптический анализ и распознавание структуры документа...');
    const docModel = await parseImageOcrToStructuredDocument(file, baseName, onProgress);

    if (tgtFmt === 'DOCX') {
      onProgress(80, 'Формирование редактируемого Word документа (.docx)...');
      const docxBuf = await exportToDocxBuffer(docModel);
      const blob = new Blob([docxBuf], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
      return { blob, fileName: `${baseName}.docx` };
    }

    if (tgtFmt === 'XLSX') {
      onProgress(85, 'Генерация таблицы Excel (.xlsx)...');
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

    if (tgtFmt === 'TXT') {
      const txtStr = exportToTxtString(docModel);
      const blob = new Blob([txtStr], { type: 'text/plain;charset=utf-8;' });
      return { blob, fileName: `${baseName}.txt` };
    }
  }

  // 1. PDF SOURCE SPECIAL CASES: PDF -> JPG / PNG / WEBP / BMP / ICO
  if (srcFmt === 'PDF' && (tgtFmt === 'JPG' || tgtFmt === 'JPEG')) {
    return await renderPdfToImageOutput(file, 'image/jpeg', 'jpg', settings, baseName, onProgress);
  }
  if (srcFmt === 'PDF' && tgtFmt === 'PNG') {
    return await renderPdfToImageOutput(file, 'image/png', 'png', settings, baseName, onProgress);
  }
  if (srcFmt === 'PDF' && tgtFmt === 'WEBP') {
    return await renderPdfToImageOutput(file, 'image/webp', 'webp', settings, baseName, onProgress);
  }
  if (srcFmt === 'PDF' && (tgtFmt === 'BMP' || tgtFmt === 'ICO')) {
    return await renderPdfToImageOutput(file, 'image/png', tgtFmt.toLowerCase(), settings, baseName, onProgress);
  }

  // 2. Excel (XLSX / XLS) Source Format Processing
  if (srcFmt === 'XLSX' || srcFmt === 'XLS') {
    onProgress(25, 'Анализ структуры книги Excel и листов...');
    const arrayBuffer = await file.arrayBuffer();
    const sheetNames = getXlsxSheetNames(arrayBuffer);
    const mode = settings.multiPageExportMode || 'single_merged';

    const resolveTargetSheet = (sel?: string | number): string => {
      if (typeof sel === 'string' && sheetNames.includes(sel)) return sel;
      if (typeof sel === 'number' && sheetNames[sel - 1]) return sheetNames[sel - 1];
      if (typeof sel === 'string') {
        const p = parseInt(sel, 10);
        if (!isNaN(p) && sheetNames[p - 1]) return sheetNames[p - 1];
      }
      return sheetNames[0] || 'Sheet1';
    };

    // PDF Export
    if (tgtFmt === 'PDF') {
      if (mode === 'zip_archive') {
        onProgress(35, `Экспорт ${sheetNames.length} листов в ZIP-архив PDF...`);
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        for (let i = 0; i < sheetNames.length; i++) {
          const sName = sheetNames[i];
          const pct = Math.min(95, Math.round(35 + ((i + 1) / sheetNames.length) * 55));
          onProgress(pct, `Генерация PDF для листа "${sName}" (${i + 1}/${sheetNames.length})...`);
          const sHtml = convertXlsxToStyledHtml(arrayBuffer, baseName, sName);
          const sModel = parseXlsxToStructuredDocument(arrayBuffer, baseName, sName);
          const sPdfBlob = await renderHtmlToPdfBlob(sHtml, `${baseName} - ${sName}`, () => {}, { docModel: sModel });
          const safeName = sName.replace(/[/\\?%*:|"<>]/g, '_');
          zip.file(`${baseName}_${safeName}.pdf`, sPdfBlob);
        }
        onProgress(95, 'Упаковка PDF-файлов в ZIP-архив...');
        const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
        return { blob: zipBlob, fileName: `${baseName}_все_листы_pdf.zip` };
      }

      if (mode === 'selected_page') {
        const targetSheet = resolveTargetSheet(settings.selectedPageOrSheet);
        onProgress(50, `Генерация PDF для выбранного листа "${targetSheet}"...`);
        const styledHtml = convertXlsxToStyledHtml(arrayBuffer, baseName, targetSheet);
        const docModel = parseXlsxToStructuredDocument(arrayBuffer, baseName, targetSheet);
        const blob = await renderHtmlToPdfBlob(styledHtml, `${baseName} - ${targetSheet}`, onProgress, { docModel });
        const safeName = targetSheet.replace(/[/\\?%*:|"<>]/g, '_');
        return { blob, fileName: `${baseName}_${safeName}.pdf` };
      }

      onProgress(50, 'Рендеринг всех листов книги Excel в векторный PDF...');
      const styledHtml = convertXlsxToStyledHtml(arrayBuffer, baseName);
      const docModel = parseXlsxToStructuredDocument(arrayBuffer, baseName);
      const blob = await renderHtmlToPdfBlob(styledHtml, baseName, onProgress, { docModel });
      return { blob, fileName: `${baseName}.pdf` };
    }

    // Image formats (PNG, JPG, JPEG, WEBP, BMP, ICO)
    if (tgtFmt === 'PNG' || tgtFmt === 'JPG' || tgtFmt === 'JPEG' || tgtFmt === 'WEBP' || tgtFmt === 'BMP' || tgtFmt === 'ICO') {
      const imageMime = (tgtFmt === 'JPG' || tgtFmt === 'JPEG') ? 'image/jpeg' : (tgtFmt === 'WEBP' ? 'image/webp' : 'image/png');
      const ext = (tgtFmt === 'JPEG') ? 'jpg' : tgtFmt.toLowerCase();
      return await renderXlsxToImageOutput(arrayBuffer, imageMime as any, ext, settings, baseName, onProgress);
    }

    // HTML Export
    if (tgtFmt === 'HTML') {
      if (mode === 'zip_archive') {
        onProgress(35, `Экспорт ${sheetNames.length} листов в ZIP-архив HTML...`);
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        for (let i = 0; i < sheetNames.length; i++) {
          const sName = sheetNames[i];
          const sHtml = convertXlsxToStyledHtml(arrayBuffer, baseName, sName);
          const safeName = sName.replace(/[/\\?%*:|"<>]/g, '_');
          zip.file(`${baseName}_${safeName}.html`, sHtml);
        }
        const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
        return { blob: zipBlob, fileName: `${baseName}_все_листы_html.zip` };
      }

      if (mode === 'selected_page') {
        const targetSheet = resolveTargetSheet(settings.selectedPageOrSheet);
        onProgress(60, `Генерация HTML для листа "${targetSheet}"...`);
        const styledHtml = convertXlsxToStyledHtml(arrayBuffer, baseName, targetSheet);
        const safeName = targetSheet.replace(/[/\\?%*:|"<>]/g, '_');
        const blob = new Blob([styledHtml], { type: 'text/html;charset=utf-8;' });
        return { blob, fileName: `${baseName}_${safeName}.html` };
      }

      onProgress(60, 'Генерация структурированного HTML документа...');
      const styledHtml = convertXlsxToStyledHtml(arrayBuffer, baseName);
      const blob = new Blob([styledHtml], { type: 'text/html;charset=utf-8;' });
      return { blob, fileName: `${baseName}.html` };
    }

    // DOCX Export
    if (tgtFmt === 'DOCX') {
      if (mode === 'zip_archive') {
        onProgress(35, `Экспорт ${sheetNames.length} листов в ZIP-архив Word DOCX...`);
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        for (let i = 0; i < sheetNames.length; i++) {
          const sName = sheetNames[i];
          const sModel = parseXlsxToStructuredDocument(arrayBuffer, baseName, sName);
          const docxBuf = await exportToDocxBuffer(sModel);
          const safeName = sName.replace(/[/\\?%*:|"<>]/g, '_');
          zip.file(`${baseName}_${safeName}.docx`, docxBuf);
        }
        const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
        return { blob: zipBlob, fileName: `${baseName}_все_листы_docx.zip` };
      }

      if (mode === 'selected_page') {
        const targetSheet = resolveTargetSheet(settings.selectedPageOrSheet);
        onProgress(60, `Формирование Word документа для листа "${targetSheet}"...`);
        const sModel = parseXlsxToStructuredDocument(arrayBuffer, baseName, targetSheet);
        const docxBuf = await exportToDocxBuffer(sModel);
        const safeName = targetSheet.replace(/[/\\?%*:|"<>]/g, '_');
        const blob = new Blob([docxBuf], {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
        return { blob, fileName: `${baseName}_${safeName}.docx` };
      }

      onProgress(60, 'Формирование таблицы в документе Word (.docx)...');
      const docModel = parseXlsxToStructuredDocument(arrayBuffer, baseName);
      const docxBuf = await exportToDocxBuffer(docModel);
      const blob = new Blob([docxBuf], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
      return { blob, fileName: `${baseName}.docx` };
    }

    // CSV Export
    if (tgtFmt === 'CSV') {
      if (mode === 'zip_archive') {
        onProgress(35, `Экспорт ${sheetNames.length} листов в ZIP-архив CSV...`);
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        for (let i = 0; i < sheetNames.length; i++) {
          const sName = sheetNames[i];
          const sModel = parseXlsxToStructuredDocument(arrayBuffer, baseName, sName);
          const csvStr = exportToCsvString(sModel);
          const safeName = sName.replace(/[/\\?%*:|"<>]/g, '_');
          zip.file(`${baseName}_${safeName}.csv`, '\uFEFF' + csvStr);
        }
        const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
        return { blob: zipBlob, fileName: `${baseName}_все_листы_csv.zip` };
      }

      if (mode === 'selected_page') {
        const targetSheet = resolveTargetSheet(settings.selectedPageOrSheet);
        onProgress(60, `Экспорт листа "${targetSheet}" в CSV...`);
        const sModel = parseXlsxToStructuredDocument(arrayBuffer, baseName, targetSheet);
        const csvStr = exportToCsvString(sModel);
        const safeName = targetSheet.replace(/[/\\?%*:|"<>]/g, '_');
        const blob = new Blob(['\uFEFF' + csvStr], { type: 'text/csv;charset=utf-8;' });
        return { blob, fileName: `${baseName}_${safeName}.csv` };
      }

      onProgress(60, 'Экспорт данных в CSV с точным форматированием...');
      const docModel = parseXlsxToStructuredDocument(arrayBuffer, baseName);
      const csvStr = exportToCsvString(docModel);
      const blob = new Blob(['\uFEFF' + csvStr], { type: 'text/csv;charset=utf-8;' });
      return { blob, fileName: `${baseName}.csv` };
    }

    // XML Export
    if (tgtFmt === 'XML') {
      if (mode === 'zip_archive') {
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        for (let i = 0; i < sheetNames.length; i++) {
          const sName = sheetNames[i];
          const sModel = parseXlsxToStructuredDocument(arrayBuffer, baseName, sName);
          const xmlStr = exportToXmlString(sModel);
          const safeName = sName.replace(/[/\\?%*:|"<>]/g, '_');
          zip.file(`${baseName}_${safeName}.xml`, xmlStr);
        }
        const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
        return { blob: zipBlob, fileName: `${baseName}_все_листы_xml.zip` };
      }
      if (mode === 'selected_page') {
        const targetSheet = resolveTargetSheet(settings.selectedPageOrSheet);
        const sModel = parseXlsxToStructuredDocument(arrayBuffer, baseName, targetSheet);
        const xmlStr = exportToXmlString(sModel);
        const safeName = targetSheet.replace(/[/\\?%*:|"<>]/g, '_');
        const blob = new Blob([xmlStr], { type: 'application/xml;charset=utf-8;' });
        return { blob, fileName: `${baseName}_${safeName}.xml` };
      }
      const docModel = parseXlsxToStructuredDocument(arrayBuffer, baseName);
      const xmlStr = exportToXmlString(docModel);
      const blob = new Blob([xmlStr], { type: 'application/xml;charset=utf-8;' });
      return { blob, fileName: `${baseName}.xml` };
    }

    // JSON Export
    if (tgtFmt === 'JSON') {
      if (mode === 'zip_archive') {
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        for (let i = 0; i < sheetNames.length; i++) {
          const sName = sheetNames[i];
          const sModel = parseXlsxToStructuredDocument(arrayBuffer, baseName, sName);
          const jsonStr = JSON.stringify(sModel.firstTableMatrix || [], null, 2);
          const safeName = sName.replace(/[/\\?%*:|"<>]/g, '_');
          zip.file(`${baseName}_${safeName}.json`, jsonStr);
        }
        const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
        return { blob: zipBlob, fileName: `${baseName}_все_листы_json.zip` };
      }
      if (mode === 'selected_page') {
        const targetSheet = resolveTargetSheet(settings.selectedPageOrSheet);
        const sModel = parseXlsxToStructuredDocument(arrayBuffer, baseName, targetSheet);
        const jsonStr = JSON.stringify(sModel.firstTableMatrix || [], null, 2);
        const safeName = targetSheet.replace(/[/\\?%*:|"<>]/g, '_');
        const blob = new Blob([jsonStr], { type: 'application/json' });
        return { blob, fileName: `${baseName}_${safeName}.json` };
      }
      const docModel = parseXlsxToStructuredDocument(arrayBuffer, baseName);
      const jsonData = docModel.firstTableMatrix || [];
      const jsonStr = JSON.stringify(jsonData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      return { blob, fileName: `${baseName}.json` };
    }

    // TXT / MD Export
    if (tgtFmt === 'TXT' || tgtFmt === 'MD') {
      const ext = tgtFmt.toLowerCase();
      if (mode === 'zip_archive') {
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        for (let i = 0; i < sheetNames.length; i++) {
          const sName = sheetNames[i];
          const sModel = parseXlsxToStructuredDocument(arrayBuffer, baseName, sName);
          const txtStr = exportToTxtString(sModel);
          const safeName = sName.replace(/[/\\?%*:|"<>]/g, '_');
          zip.file(`${baseName}_${safeName}.${ext}`, '\uFEFF' + txtStr);
        }
        const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
        return { blob: zipBlob, fileName: `${baseName}_все_листы_${ext}.zip` };
      }
      if (mode === 'selected_page') {
        const targetSheet = resolveTargetSheet(settings.selectedPageOrSheet);
        const sModel = parseXlsxToStructuredDocument(arrayBuffer, baseName, targetSheet);
        const txtStr = exportToTxtString(sModel);
        const safeName = targetSheet.replace(/[/\\?%*:|"<>]/g, '_');
        const blob = new Blob(['\uFEFF' + txtStr], { type: 'text/plain;charset=utf-8;' });
        return { blob, fileName: `${baseName}_${safeName}.${ext}` };
      }
      const docModel = parseXlsxToStructuredDocument(arrayBuffer, baseName);
      const txtStr = exportToTxtString(docModel);
      const blob = new Blob(['\uFEFF' + txtStr], { type: 'text/plain;charset=utf-8;' });
      return { blob, fileName: `${baseName}.${ext}` };
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

    if (tgtFmt === 'XML') {
      const xmlStr = exportToXmlString(docModel);
      const blob = new Blob([xmlStr], { type: 'application/xml;charset=utf-8;' });
      return { blob, fileName: `${baseName}.xml` };
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

    if (tgtFmt === 'PNG' || tgtFmt === 'JPG' || tgtFmt === 'JPEG' || tgtFmt === 'WEBP' || tgtFmt === 'BMP') {
      const [headerFooter, tableGrids, docModel] = await Promise.all([
        extractDocxHeadersAndFootersHtml(file),
        extractDocxTableGrids(file),
        extractDocxToStructuredDocument(file, baseName, onProgress)
      ]);
      const pdfBlob = await renderHtmlToPdfBlob(docxHtml, baseName, onProgress, {
        headerHtml: headerFooter.headerHtml,
        footerHtml: headerFooter.footerHtml,
        tableGrids,
        docModel,
      });
      const pdfFile = new File([pdfBlob], `${baseName}.pdf`, { type: 'application/pdf' });
      const imageMime = (tgtFmt === 'JPG' || tgtFmt === 'JPEG') ? 'image/jpeg' : (tgtFmt === 'WEBP' ? 'image/webp' : 'image/png');
      const ext = (tgtFmt === 'JPEG') ? 'jpg' : tgtFmt.toLowerCase();
      const imgBlob = await renderPdfFirstPageToImage(pdfFile, imageMime as any, onProgress);
      return { blob: imgBlob, fileName: `${baseName}.${ext}` };
    }

    if (tgtFmt === 'PDF') {
      const [headerFooter, tableGrids, docModel] = await Promise.all([
        extractDocxHeadersAndFootersHtml(file),
        extractDocxTableGrids(file),
        extractDocxToStructuredDocument(file, baseName, onProgress)
      ]);
      const blob = await renderHtmlToPdfBlob(docxHtml, baseName, onProgress, {
        headerHtml: headerFooter.headerHtml,
        footerHtml: headerFooter.footerHtml,
        tableGrids,
        docModel,
      });
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
      const aoa = parseDocxHtmlToAoa(docxHtml);
      const csvLines = aoa.map((row) =>
        row
          .map((cell) => {
            const rawVal = (cell || '').toString();
            // Preserve logical newlines (like separate paragraphs/GOSTs) but trim individual lines
            const normalizedLines = rawVal
              .split(/\r?\n/)
              .map(line => line.replace(/[ \t\f\v]+/g, ' ').trim())
              .filter(Boolean);
            
            const formattedVal = normalizedLines.join('\n');
            const escapedVal = formattedVal.replace(/"/g, '""');

            // If cell contains semicolon, newline, quotes, or comma, wrap in standard CSV quotes
            if (escapedVal.includes(';') || escapedVal.includes('\n') || escapedVal.includes('"') || escapedVal.includes(',')) {
              return `"${escapedVal}"`;
            }
            return escapedVal;
          })
          .join(';')
      );
      const csvStr = csvLines.join('\r\n');
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
    let blob: Blob;
    if (srcFmt === 'HTML' || textContent.trim().startsWith('<!DOCTYPE html') || textContent.trim().startsWith('<html') || (textContent.includes('<body') && textContent.includes('</'))) {
      onProgress(40, 'Парсинг HTML структуры...');
      const docModel = parseHtmlToStructuredDocument(textContent, baseName);
      onProgress(70, 'Генерация файла Microsoft Word .docx...');
      const docxBuffer = await exportToDocxBuffer(docModel);
      blob = new Blob([docxBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
    } else {
      blob = await createDocxFromText(textContent, baseName, onProgress);
    }
    return { blob, fileName: `${baseName}.docx` };
  }

  // 6. TARGET: PDF
  if (tgtFmt === 'PDF') {
    let blob: Blob;
    if (srcFmt === 'HTML' || textContent.trim().startsWith('<!DOCTYPE html') || textContent.trim().startsWith('<html') || (textContent.includes('<body') && textContent.includes('</'))) {
      blob = await renderHtmlToPdfBlob(textContent, baseName, onProgress);
    } else {
      blob = await renderTextToPdf(textContent, baseName, onProgress);
    }
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

  // 13. TARGET: Image from text/html document (PNG / JPG / WEBP)
  if (isImageTarget(tgtFmt)) {
    const pdfBlob = await renderTextToPdf(textContent, baseName, onProgress);
    const pdfFile = new File([pdfBlob], `${baseName}.pdf`, { type: 'application/pdf' });
    const imageMime = (tgtFmt === 'JPG' || tgtFmt === 'JPEG') ? 'image/jpeg' : (tgtFmt === 'WEBP' ? 'image/webp' : 'image/png');
    const ext = (tgtFmt === 'JPEG') ? 'jpg' : tgtFmt.toLowerCase();
    return await renderPdfToImageOutput(pdfFile, imageMime as any, ext, settings, baseName, onProgress);
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
