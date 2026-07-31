import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import * as XLSX from 'xlsx';
import { ConversionSettings, FileItem } from '../types/converter';
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
 * Helper to initialize FFmpeg.wasm lazily when requested for heavy media conversions
 */
async function attemptCDNLoad(ffmpeg: any, toBlobURL: any, baseURL: string, timeoutMs = 3500): Promise<boolean> {
  return new Promise((resolve) => {
    let finished = false;
    const timer = setTimeout(() => {
      if (!finished) {
        finished = true;
        console.warn(`FFmpeg CDN load timed out (${timeoutMs}ms): ${baseURL}`);
        resolve(false);
      }
    }, timeoutMs);

    (async () => {
      try {
        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
        if (!finished) {
          finished = true;
          clearTimeout(timer);
          resolve(true);
        }
      } catch (err) {
        if (!finished) {
          finished = true;
          clearTimeout(timer);
          console.warn(`FFmpeg CDN load failed: ${baseURL}`, err);
          resolve(false);
        }
      }
    })();
  });
}

export async function getFFmpegInstance(onProgress?: (ratio: number) => void) {
  if (ffmpegInstance) return ffmpegInstance;
  if (isFFmpegLoading) {
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
    const { FFmpeg } = await import('@ffmpeg/ffmpeg');
    const { toBlobURL } = await import('@ffmpeg/util');

    const ffmpeg = new FFmpeg();
    
    if (onProgress) {
      ffmpeg.on('progress', ({ progress }: { progress: number }) => {
        onProgress(Math.min(Math.round(progress * 100), 100));
      });
    }

    // Try jsdelivr first (faster/more reliable), then unpkg with strict timeouts
    const cdns = [
      'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm',
      'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm',
      'https://cdnjs.cloudflare.com/ajax/libs/ffmpeg/0.12.6',
    ];

    let success = false;
    for (const baseURL of cdns) {
      if (onProgress) onProgress(15);
      success = await attemptCDNLoad(ffmpeg, toBlobURL, baseURL, 25000);
      if (success) break;
    }

    if (!success) {
      throw new Error('All CDN endpoints for FFmpeg.wasm timed out or failed.');
    }

    ffmpegInstance = ffmpeg;
    isFFmpegLoading = false;
    return ffmpeg;
  } catch (err) {
    console.warn('FFmpeg.wasm load warning, falling back to native Web API engine:', err);
    isFFmpegLoading = false;
    return null;
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
  return ['PNG', 'JPG', 'JPEG', 'WEBP', 'GIF', 'BMP', 'ICO', 'SVG', 'AVIF'].includes(fmt.toUpperCase());
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

  // For MP3, WAV, and AIFF, use instant local WebAudio engine without waiting for network/CDN
  if (isMp3 || isWav || isAiff) {
    onProgress(25, 'Decoding audio track in browser memory...');
    const arrayBuffer = await file.arrayBuffer();
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    let audioBuffer: AudioBuffer;
    try {
      audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    } catch (e) {
      audioCtx.close();
      throw new Error('Unable to decode audio format in browser.');
    }

    if (isMp3) {
      onProgress(60, 'Encoding high-speed MP3 audio stream via LameJS...');
      const bitrateStr = settings.audioBitrate || '256k';
      const bitrate = parseInt(bitrateStr, 10) || 256;
      const mp3Blob = audioBufferToMp3(audioBuffer, bitrate, (p) => {
        onProgress(60 + Math.round(p * 0.35), `Encoding MP3 (${p}%)...`);
      });
      audioCtx.close();
      onProgress(100, 'MP3 conversion complete!');
      return { blob: mp3Blob, fileName: `${baseName}.mp3` };
    } else if (isWav) {
      onProgress(70, 'Encoding uncompressed 16-bit PCM WAV...');
      const wavBlob = audioBufferToWav(audioBuffer);
      audioCtx.close();
      onProgress(100, 'WAV conversion complete!');
      return { blob: wavBlob, fileName: `${baseName}.wav` };
    } else {
      onProgress(70, 'Encoding uncompressed PCM AIFF...');
      const aiffBlob = audioBufferToAiff(audioBuffer);
      audioCtx.close();
      onProgress(100, 'AIFF conversion complete!');
      return { blob: aiffBlob, fileName: `${baseName}.aiff` };
    }
  }

  // For other formats (OGG, FLAC, M4A, etc.), try fast FFmpeg
  onProgress(20, `Initializing fast WASM engine for ${targetFormat}...`);
  const ffmpeg = await getFFmpegInstance((p) => onProgress(30 + Math.round(p * 0.6), `Encoding ${targetFormat} via WASM (${p}%)...`));
  if (ffmpeg) {
    try {
      const { fetchFile } = await import('@ffmpeg/util');
      const inExt = file.name.split('.').pop() || 'input';
      const outExt = targetFormat.toLowerCase();
      
      const inFileName = `input.${inExt}`;
      const outFileName = `output.${outExt}`;

      await ffmpeg.writeFile(inFileName, await fetchFile(file));

      let ffmpegArgs = ['-i', inFileName];
      if (targetFormat === 'OGG') {
        ffmpegArgs.push('-c:a', 'libvorbis', '-q:a', '4');
      } else if (targetFormat === 'FLAC') {
        ffmpegArgs.push('-c:a', 'flac', '-compression_level', '5');
      } else if (targetFormat === 'M4A') {
        ffmpegArgs.push('-c:a', 'aac', '-b:a', settings.audioBitrate || '256k', '-strict', '-2');
      } else if (targetFormat === 'AAC') {
        ffmpegArgs.push('-c:a', 'aac', '-b:a', settings.audioBitrate || '256k', '-f', 'adts', '-strict', '-2');
      } else if (targetFormat === 'OPUS') {
        ffmpegArgs.push('-c:a', 'libopus', '-b:a', '128k');
      }

      ffmpegArgs.push(outFileName);

      onProgress(35, `Starting FFmpeg conversion to ${outExt.toUpperCase()}...`);
      const audioProgressHandler = ({ progress }: { progress: number }) => {
        if (typeof progress === 'number') {
          const pct = Math.min(98, Math.round(35 + progress * 63));
          onProgress(pct, `FFmpeg Audio Encoding ${outExt.toUpperCase()} (${pct}%)...`);
        }
      };
      ffmpeg.on('progress', audioProgressHandler);

      try {
        await ffmpeg.exec(ffmpegArgs);
      } finally {
        try { ffmpeg.off('progress', audioProgressHandler); } catch (e) {}
      }

      const data = await ffmpeg.readFile(outFileName);
      const mimeTypes: Record<string, string> = {
        ogg: 'audio/ogg',
        flac: 'audio/flac',
        m4a: 'audio/mp4',
        aac: 'audio/aac',
        opus: 'audio/opus',
        aiff: 'audio/aiff',
      };

      const outBlob = new Blob([data as Uint8Array], { type: mimeTypes[outExt] || 'audio/octet-stream' });
      await ffmpeg.deleteFile(inFileName);
      await ffmpeg.deleteFile(outFileName);

      onProgress(100, 'Audio conversion complete!');
      return { blob: outBlob, fileName: `${baseName}.${outExt}` };
    } catch (ffmpegErr) {
      console.warn('FFmpeg execution fallback for custom format:', ffmpegErr);
    }
  }

  // If WASM fails or is unavailable, use honest native browser MediaRecorder stream conversion without false MP3 substitution
  onProgress(50, `Encoding ${targetFormat} via native audio stream...`);
  const arrayBuffer = await file.arrayBuffer();
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  return await encodeAudioBufferViaMediaRecorder(audioCtx, audioBuffer, targetFormat, baseName, onProgress);
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
 * Honest Web Audio stream fallback without MP3 substitution
 */
async function encodeAudioBufferViaMediaRecorder(
  audioCtx: AudioContext,
  buffer: AudioBuffer,
  targetFormat: string,
  baseName: string,
  onProgress: (percent: number, text: string) => void
): Promise<{ blob: Blob; fileName: string }> {
  onProgress(60, `Encoding ${targetFormat} via native browser audio stream...`);
  
  const candidatesMap: Record<string, string[]> = {
    OGG: ['audio/ogg; codecs=vorbis', 'audio/ogg; codecs=opus', 'audio/ogg', 'audio/webm; codecs=opus'],
    OPUS: ['audio/ogg; codecs=opus', 'audio/webm; codecs=opus', 'audio/opus', 'audio/ogg'],
    M4A: ['audio/mp4; codecs=mp4a.40.2', 'audio/mp4', 'audio/aac'],
    AAC: ['audio/aac', 'audio/mp4; codecs=mp4a.40.2', 'audio/mp4'],
    FLAC: ['audio/flac', 'audio/ogg; codecs=flac'],
  };

  const candidates = candidatesMap[targetFormat] || [];
  let supportedMime = '';
  for (const mime of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mime)) {
      supportedMime = mime;
      break;
    }
  }

  if (!supportedMime) {
    audioCtx.close();
    throw new Error(`Для точной конвертации в формат ${targetFormat} требуется загрузка WASM-кодека. Пожалуйста, проверьте интернет-соединение, чтобы браузер смог загрузить кодек для ${targetFormat}.`);
  }

  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  
  const destination = audioCtx.createMediaStreamDestination();
  source.connect(destination);
  
  const recorder = new MediaRecorder(destination.stream, { mimeType: supportedMime });
  const chunks: Blob[] = [];
  
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  return new Promise((resolve, reject) => {
    recorder.onstop = () => {
      audioCtx.close();
      const outExt = targetFormat.toLowerCase();
      const finalBlob = new Blob(chunks, { type: supportedMime });
      onProgress(100, `Converted to ${targetFormat}!`);
      resolve({ blob: finalBlob, fileName: `${baseName}.${outExt}` });
    };

    recorder.onerror = () => {
      audioCtx.close();
      reject(new Error(`Ошибка записи потока ${targetFormat}`));
    };

    recorder.start(100);
    source.start(0);

    const durationMs = (buffer.duration * 1000);
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const p = Math.min(95, Math.round(60 + (elapsed / durationMs) * 35));
      onProgress(p, `Recording ${targetFormat} audio stream (${p}%)...`);
      if (elapsed >= durationMs + 500) {
        clearInterval(interval);
        try { recorder.stop(); } catch (e) {}
        try { source.stop(); } catch (e) {}
      }
    }, 250);
  });
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

/* ====================================================================
   3. VIDEO CONVERSIONS (MediaRecorder / Canvas Stream / FFmpeg.wasm)
   ==================================================================== */

async function convertVideo(
  file: File,
  sourceFormat: string,
  targetFormat: string,
  settings: ConversionSettings,
  baseName: string,
  onProgress: (percent: number, text: string) => void
): Promise<{ blob: Blob; fileName: string }> {
  // Check if FFmpeg is available for heavy video format transcode
  const ffmpeg = await getFFmpegInstance((p) => onProgress(20 + Math.round(p * 0.7), `FFmpeg Transcoding (${p}%)...`));

  if (ffmpeg) {
    try {
      const { fetchFile } = await import('@ffmpeg/util');
      const inExt = file.name.split('.').pop() || 'mp4';
      let outExt = targetFormat.toLowerCase();
      if (targetFormat === 'GIF_VID') outExt = 'gif';
      if (targetFormat === 'MP3_EXTRACT') outExt = 'mp3';

      const inName = `input.${inExt}`;
      const outName = `output.${outExt}`;

      onProgress(25, 'Writing video stream to memory filesystem...');
      await ffmpeg.writeFile(inName, await fetchFile(file));

      let args: string[] = ['-i', inName];

      if (targetFormat === 'GIF_VID') {
        // High quality animated GIF palette filter
        args.push('-vf', 'fps=10,scale=480:-1:flags=lanczos', '-c:v', 'gif');
      } else if (targetFormat === 'MP3_EXTRACT' || targetFormat === 'MP3') {
        args.push('-vn', '-acodec', 'libmp3lame', '-b:a', settings.audioBitrate || '256k', '-ar', '44100', '-ac', '2');
      } else if (targetFormat === 'WAV') {
        args.push('-vn', '-acodec', 'pcm_s16le', '-ar', '44100', '-ac', '2', '-f', 'wav');
      } else if (targetFormat === 'AAC') {
        args.push('-vn', '-acodec', 'aac', '-b:a', settings.audioBitrate || '256k', '-f', 'adts', '-strict', '-2');
      } else if (targetFormat === 'M4A') {
        args.push('-vn', '-acodec', 'aac', '-b:a', settings.audioBitrate || '256k', '-f', 'ipod', '-strict', '-2');
      } else if (targetFormat === 'OGG') {
        args.push('-vn', '-acodec', 'libvorbis', '-q:a', '4', '-f', 'ogg');
      } else if (targetFormat === 'FLAC') {
        args.push('-vn', '-acodec', 'flac', '-compression_level', '5', '-f', 'flac');
      } else if (targetFormat === 'OPUS') {
        args.push('-vn', '-acodec', 'libopus', '-b:a', '128k', '-f', 'opus');
      } else if (targetFormat === 'MP4' || targetFormat === 'MOV' || targetFormat === 'MKV') {
        args.push('-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'aac');
      } else if (targetFormat === 'WEBM') {
        args.push('-c:v', 'libvpx', '-crf', '30', '-b:v', '1M', '-c:a', 'libvorbis');
      } else if (targetFormat === 'AVI') {
        args.push('-c:v', 'mpeg4', '-qscale:v', '3', '-c:a', 'libmp3lame');
      } else {
        args.push('-preset', 'ultrafast');
      }

      args.push(outName);

      onProgress(35, `Starting FFmpeg encoding to ${outExt.toUpperCase()}...`);
      const progressHandler = ({ progress }: { progress: number }) => {
        if (typeof progress === 'number') {
          const pct = Math.min(98, Math.round(35 + progress * 63));
          onProgress(pct, `FFmpeg Transcoding ${outExt.toUpperCase()} (${pct}%)...`);
        }
      };
      ffmpeg.on('progress', progressHandler);

      try {
        await ffmpeg.exec(args);
      } finally {
        try { ffmpeg.off('progress', progressHandler); } catch (e) {}
      }

      const data = await ffmpeg.readFile(outName);
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

      const blob = new Blob([data as Uint8Array], { type: mimeMap[outExt] || 'video/mp4' });
      await ffmpeg.deleteFile(inName);
      await ffmpeg.deleteFile(outName);

      onProgress(100, 'Video transcode complete!');
      return { blob, fileName: `${baseName}.${outExt}` };
    } catch (e) {
      console.warn('FFmpeg video transcode error, falling back to WebMediaRecorder:', e);
    }
  }

  // Fallback Web Audio API for audio extraction from video
  const isAudioTarget = ['MP3', 'MP3_EXTRACT', 'WAV', 'AAC', 'M4A', 'OGG', 'FLAC', 'OPUS'].includes(targetFormat.toUpperCase());
  if (isAudioTarget) {
    try {
      onProgress(15, 'Extracting audio track via Web Audio API...');
      const arrayBuf = await file.arrayBuffer();
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const decodedBuffer = await audioCtx.decodeAudioData(arrayBuf);

      if (targetFormat === 'WAV') {
        onProgress(80, 'Encoding WAV PCM audio...');
        const blob = audioBufferToWav(decodedBuffer);
        audioCtx.close();
        onProgress(100, 'WAV extraction complete!');
        return { blob, fileName: `${baseName}.wav` };
      }

      if (targetFormat === 'MP3' || targetFormat === 'MP3_EXTRACT') {
        onProgress(60, 'Encoding MP3 audio...');
        const kbps = parseInt(settings.audioBitrate || '256', 10) || 256;
        const blob = audioBufferToMp3(decodedBuffer, kbps, (p) => onProgress(60 + Math.round(p * 0.35), 'Encoding MP3...'));
        audioCtx.close();
        onProgress(100, 'MP3 extraction complete!');
        return { blob, fileName: `${baseName}.mp3` };
      }

      return await encodeAudioBufferViaMediaRecorder(audioCtx, decodedBuffer, targetFormat, baseName, onProgress);
    } catch (audioErr) {
      console.warn('AudioContext extraction fallback error:', audioErr);
    }
  }

  // Fallback WebMediaRecorder
  onProgress(10, `Extracting HTML5 video stream for ${targetFormat}...`);
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.src = url;
  video.muted = true;
  video.playsInline = true;
  video.playbackRate = 1.0; // STRICT 1.0x standard playback speed to avoid acceleration!

  // Start playback first so browser decodes frames and activates stream tracks before recording
  video.play().catch(() => {});
  await new Promise((res) => {
    const timer = setTimeout(() => res(true), 2000);
    if (video.readyState >= 2 && !video.paused) {
      clearTimeout(timer);
      res(true);
      return;
    }
    video.onplaying = () => {
      clearTimeout(timer);
      res(true);
    };
    video.oncanplay = () => {
      if (!video.paused) {
        clearTimeout(timer);
        res(true);
      }
    };
    video.onerror = () => {
      clearTimeout(timer);
      res(true);
    };
  });

  const stream = (video as any).captureStream ? (video as any).captureStream() : (video as any).mozCaptureStream ? (video as any).mozCaptureStream() : null;
  if (!stream || stream.getTracks().length === 0 || !stream.active) {
    URL.revokeObjectURL(url);
    try { video.pause(); } catch (e) {}
    throw new Error(`Браузер не смог извлечь видеопоток для ${targetFormat}. Пожалуйста, проверьте подключение к интернету для загрузки WASM-кодека FFmpeg.`);
  }

  let candidateMimes: string[] = [];
  if (targetFormat === 'MP4' || targetFormat === 'MOV') {
    candidateMimes = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  } else {
    candidateMimes = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4;codecs=avc1', 'video/mp4'];
  }

  let mimeType = '';
  for (const m of candidateMimes) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) {
      mimeType = m;
      break;
    }
  }

  if (!mimeType) {
    URL.revokeObjectURL(url);
    try { video.pause(); } catch (e) {}
    throw new Error(`Встроенный видеокодек для ${targetFormat} не поддерживается в вашем браузере. Требуется загрузка FFmpeg WASM.`);
  }

  let outExt = targetFormat.toLowerCase();
  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: Blob[] = [];

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };
  recorder.start(250);

  // Smooth real-time progress update during stream recording
  const progressInterval = setInterval(() => {
    if (video.duration && video.duration > 0) {
      const currentPct = Math.min(98, Math.round(15 + (video.currentTime / video.duration) * 83));
      onProgress(currentPct, `Recording video stream ${targetFormat} (${currentPct}%)...`);
    } else {
      onProgress(50, `Recording video stream ${targetFormat}...`);
    }
  }, 200);

  await new Promise((res) => {
    const timer = setTimeout(() => {
      clearInterval(progressInterval);
      try { recorder.stop(); } catch (e) {}
      res(true);
    }, 120000); // 120s safety limit for stream recording

    video.onended = () => {
      clearInterval(progressInterval);
      clearTimeout(timer);
      try { recorder.stop(); } catch (e) {}
      res(true);
    };
    video.onerror = () => {
      clearInterval(progressInterval);
      clearTimeout(timer);
      try { recorder.stop(); } catch (e) {}
      res(true);
    };
  });

  URL.revokeObjectURL(url);
  const blob = new Blob(chunks, { type: mimeType });
  onProgress(100, `Video render complete for ${targetFormat}!`);
  return { blob, fileName: `${baseName}.${outExt}` };
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

  // Excel (XLSX / XLS) Source Format Processing
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

    if (tgtFmt === 'TXT') {
      const txt = XLSX.utils.sheet_to_txt(worksheet);
      const blob = new Blob([txt], { type: 'text/plain;charset=utf-8;' });
      return { blob, fileName: `${baseName}.txt` };
    }

    if (tgtFmt === 'PDF') {
      const txt = XLSX.utils.sheet_to_txt(worksheet);
      const blob = await renderTextToPdf(txt, baseName, onProgress);
      return { blob, fileName: `${baseName}.pdf` };
    }
  }

  // Target: XLSX (Convert CSV / JSON / TXT / HTML -> XLSX)
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

  const textContent = await file.text();

  // Target: PDF
  if (tgtFmt === 'PDF') {
    const blob = await renderTextToPdf(textContent, baseName, onProgress);
    return { blob, fileName: `${baseName}.pdf` };
  }

  // Target: TXT / MD / HTML
  if (tgtFmt === 'TXT') {
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' });
    return { blob, fileName: `${baseName}.txt` };
  }

  if (tgtFmt === 'MD') {
    const mdContent = `# ${baseName}\n\n${textContent}`;
    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8;' });
    return { blob, fileName: `${baseName}.md` };
  }

  if (tgtFmt === 'HTML') {
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${baseName}</title>
  <style>body { font-family: system-ui, sans-serif; padding: 2rem; line-height: 1.6; max-width: 800px; margin: 0 auto; color: #1e293b; background: #f8fafc; }</style>
</head>
<body>
  <h1>${baseName}</h1>
  <pre style="white-space: pre-wrap; font-family: inherit;">${escapeHtml(textContent)}</pre>
</body>
</html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
    return { blob, fileName: `${baseName}.html` };
  }

  // Target: JSON <-> CSV <-> XML
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

  if (tgtFmt === 'CSV') {
    const csvContent = `"Filename","Line"\n` + textContent.split('\n').map((l) => `"${baseName}","${l.replace(/"/g, '""')}"`).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    return { blob, fileName: `${baseName}.csv` };
  }

  if (tgtFmt === 'XML') {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<document>
  <name>${baseName}</name>
  <content>${escapeXml(textContent)}</content>
</document>`;
    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8;' });
    return { blob, fileName: `${baseName}.xml` };
  }

  // Default fallback text
  const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' });
  return { blob, fileName: `${baseName}.${targetFormat.toLowerCase()}` };
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
