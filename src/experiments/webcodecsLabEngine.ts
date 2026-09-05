import { createFile, DataStream } from 'mp4box';
import { Muxer, StreamTarget } from 'webm-muxer';

export interface LabTelemetry {
  stage: 'idle' | 'demuxing' | 'probing' | 'converting' | 'finalizing' | 'completed' | 'error';
  progress: number; // 0 - 100
  statusMessage: string;
  hardwareAccelerated: boolean | 'software' | 'unknown';
  originalWidth: number;
  originalHeight: number;
  rotation: number;
  targetWidth: number;
  targetHeight: number;
  estimatedFps: number;
  totalFrames: number;
  processedFrames: number;
  currentProcessingFps: number;
  targetBitrateMbps: number;
  elapsedSeconds: number;
  estimatedTimeRemainingSeconds: number;
  ramUsageMb: number | null;
  outputBlob: Blob | null;
  outputSizeMb: number | null;
  hasAudio: boolean;
  error: string | null;
  logs: string[];
}

export type TelemetryCallback = (telemetry: LabTelemetry) => void;

function getRotationFromMatrix(matrix?: number[]): number {
  if (!matrix || matrix.length < 5) return 0;
  // Matrix format in MP4 is 3x3 fixed point 16.16: [a, b, u, c, d, v, x, y, w]
  const a = matrix[0] / 65536;
  const b = matrix[1] / 65536;
  const c = matrix[3] / 65536;
  const d = matrix[4] / 65536;

  if (a === 0 && b === 1 && c === -1 && d === 0) return 90;
  if (a === -1 && b === 0 && c === 0 && d === -1) return 180;
  if (a === 0 && b === -1 && c === 1 && d === 0) return 270;

  // Check normalized float representation
  if (matrix[0] === 0 && matrix[1] === 1 && matrix[3] === -1 && matrix[4] === 0) return 90;
  if (matrix[0] === -1 && matrix[1] === 0 && matrix[3] === 0 && matrix[4] === -1) return 180;
  if (matrix[0] === 0 && matrix[1] === -1 && matrix[3] === 1 && matrix[4] === 0) return 270;

  return 0;
}

function getTrackExtradata(trak: any): Uint8Array | undefined {
  if (!trak?.mdia?.minf?.stbl?.stsd?.entries) return undefined;
  for (const entry of trak.mdia.minf.stbl.stsd.entries) {
    const box = entry.avcC || entry.hvcC || entry.vpcC || entry.av1C;
    if (box) {
      const stream = new (DataStream as any)(undefined, 0, (DataStream as any).BIG_ENDIAN ?? false);
      box.write(stream);
      return new Uint8Array(stream.buffer, 8); // Skip 8-byte box header (size + fourcc)
    }
  }
  return undefined;
}

function extractAudioSpecificConfig(trak: any): Uint8Array | undefined {
  try {
    const entry = trak?.mdia?.minf?.stbl?.stsd?.entries?.[0];
    if (entry?.esds?.esd) {
      for (const desc of entry.esds.esd.descs || []) {
        if (desc.tag === 4 && desc.descs) {
          for (const subDesc of desc.descs) {
            if (subDesc.tag === 5 && subDesc.data) {
              return subDesc.data instanceof Uint8Array ? subDesc.data : new Uint8Array(subDesc.data);
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('Could not extract esds from audio trak:', err);
  }
  return undefined;
}

function createAacAudioSpecificConfig(sampleRate: number, channelCount: number): Uint8Array {
  const sampleRates = [96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000, 7350];
  let rateIdx = sampleRates.indexOf(sampleRate);
  if (rateIdx === -1) rateIdx = 3; // default 48000 Hz
  const audioObjectType = 2; // AAC-LC
  const byte1 = (audioObjectType << 3) | (rateIdx >> 1);
  const byte2 = ((rateIdx & 1) << 7) | (channelCount << 3);
  return new Uint8Array([byte1, byte2]);
}

/**
 * Блочно-фрагментированное хранилище данных WebM.
 * Полностью обходит системный лимит V8 (2 ГБ на один непрерывный ArrayBuffer),
 * сохраняя видеопоток в виде пула блоков по 16 МБ.
 */
class ChunkedStreamStorage {
  private chunkSize: number;
  private chunks: Uint8Array[];
  public totalSize: number;

  constructor(chunkSize = 16 * 1024 * 1024) {
    this.chunkSize = chunkSize;
    this.chunks = [];
    this.totalSize = 0;
  }

  write(data: Uint8Array, position: number) {
    const endPosition = position + data.byteLength;
    if (endPosition > this.totalSize) {
      this.totalSize = endPosition;
    }

    let srcOffset = 0;
    let currentPos = position;

    while (srcOffset < data.byteLength) {
      const chunkIndex = Math.floor(currentPos / this.chunkSize);
      const chunkOffset = currentPos % this.chunkSize;
      const bytesToWrite = Math.min(data.byteLength - srcOffset, this.chunkSize - chunkOffset);

      while (this.chunks.length <= chunkIndex) {
        this.chunks.push(new Uint8Array(this.chunkSize));
      }

      this.chunks[chunkIndex].set(data.subarray(srcOffset, srcOffset + bytesToWrite), chunkOffset);

      srcOffset += bytesToWrite;
      currentPos += bytesToWrite;
    }
  }

  toBlob(): Blob {
    const parts: Uint8Array[] = [];
    let remaining = this.totalSize;
    for (let i = 0; i < this.chunks.length; i++) {
      if (remaining <= 0) break;
      const partSize = Math.min(remaining, this.chunkSize);
      if (partSize === this.chunkSize) {
        parts.push(this.chunks[i]);
      } else {
        parts.push(this.chunks[i].subarray(0, partSize));
      }
      remaining -= partSize;
    }
    return new Blob(parts, { type: 'video/webm' });
  }
}

export async function runWebCodecsConversion(
  file: File,
  onUpdate: TelemetryCallback,
  signal?: AbortSignal
): Promise<Blob> {
  const startTime = performance.now();
  let lastFpsCalcTime = startTime;
  let lastProcessedCount = 0;

  const telemetry: LabTelemetry = {
    stage: 'probing',
    progress: 0,
    statusMessage: 'Проверка поддержки WebCodecs в браузере...',
    hardwareAccelerated: 'unknown',
    originalWidth: 0,
    originalHeight: 0,
    rotation: 0,
    targetWidth: 0,
    targetHeight: 0,
    estimatedFps: 60,
    totalFrames: 0,
    processedFrames: 0,
    currentProcessingFps: 0,
    targetBitrateMbps: 30,
    elapsedSeconds: 0,
    estimatedTimeRemainingSeconds: 0,
    ramUsageMb: null,
    outputBlob: null,
    outputSizeMb: null,
    hasAudio: false,
    error: null,
    logs: [],
  };

  const addLog = (msg: string) => {
    const timeStr = new Date().toLocaleTimeString();
    const entry = `[${timeStr}] ${msg}`;
    telemetry.logs = [...(telemetry.logs || []).slice(-6), entry];
    updateTelemetry({ logs: telemetry.logs });
  };

  const updateTelemetry = (changes: Partial<LabTelemetry>) => {
    Object.assign(telemetry, changes);
    // Approximate RAM usage if browser supports performance.memory
    if ((performance as any).memory?.usedJSHeapSize) {
      telemetry.ramUsageMb = Math.round((performance as any).memory.usedJSHeapSize / (1024 * 1024));
    }
    telemetry.elapsedSeconds = Math.round((performance.now() - startTime) / 1000);
    onUpdate({ ...telemetry });
  };

  updateTelemetry({ statusMessage: 'Инициализация MP4Box и демуксинг контейнера...' });

  if (typeof (window as any).VideoDecoder === 'undefined' || typeof (window as any).VideoEncoder === 'undefined') {
    throw new Error('Ваш браузер не поддерживает WebCodecs API (VideoDecoder / VideoEncoder). Требуется Google Chrome, Edge или Chromium 94+.');
  }

  // 1. Demux MP4 file chunk by chunk
  const mp4boxFile = createFile();
  let videoTrackInfo: any = null;
  let audioTrackInfo: any = null;
  let trackDescription: Uint8Array | undefined;

  const infoPromise = new Promise<{ info: any; file: any }>((resolve, reject) => {
    mp4boxFile.onReady = (info: any) => {
      resolve({ info, file: mp4boxFile });
    };
    mp4boxFile.onError = (err: any) => {
      reject(new Error(`Ошибка парсинга MP4: ${err}`));
    };
  });

  // Read file in 16MB slices to avoid huge memory allocations
  const CHUNK_SIZE = 16 * 1024 * 1024;
  let offset = 0;
  updateTelemetry({ stage: 'demuxing', statusMessage: 'Чтение заголовков MP4 (потоковое сканирование)...' });

  // Feed chunks until metadata is ready
  while (offset < file.size && !videoTrackInfo) {
    if (signal?.aborted) throw new Error('Операция отменена пользователем');
    const end = Math.min(offset + CHUNK_SIZE, file.size);
    const chunkBlob = file.slice(offset, end);
    const buffer = await chunkBlob.arrayBuffer();
    const mp4Buffer = buffer as any;
    mp4Buffer.fileStart = offset;
    mp4boxFile.appendBuffer(mp4Buffer);
    offset = end;

    // Give microtask tick for onReady
    await new Promise((r) => setTimeout(r, 0));

    // Check if onReady resolved
    const checkState = await Promise.race([
      infoPromise.then((data) => data).catch(() => null),
      new Promise((r) => setTimeout(() => r(null), 10)),
    ]);

    if (checkState) {
      break;
    }
  }

  const { info } = await infoPromise;
  const rawVideoTrack = info.videoTracks?.[0];
  if (!rawVideoTrack) {
    throw new Error('В переданном файле не обнаружена видеодорожка');
  }

  videoTrackInfo = rawVideoTrack;
  audioTrackInfo = info.audioTracks?.[0] || null;

  const trak = mp4boxFile.getTrackById(videoTrackInfo.id);
  trackDescription = getTrackExtradata(trak);

  const origWidth = videoTrackInfo.video.width;
  const origHeight = videoTrackInfo.video.height;
  const rotation = getRotationFromMatrix(videoTrackInfo.matrix);

  // If rotated by 90 or 270 deg, swap target dimensions
  const isRotated90or270 = rotation === 90 || rotation === 270;
  const targetWidth = isRotated90or270 ? origHeight : origWidth;
  const targetHeight = isRotated90or270 ? origWidth : origHeight;

  const totalFrames = videoTrackInfo.nb_samples || 0;
  const durationSec = (videoTrackInfo.movie_duration || videoTrackInfo.duration || 1) / (videoTrackInfo.movie_timescale || videoTrackInfo.timescale || 1);
  const estimatedFps = totalFrames > 0 && durationSec > 0 ? Math.round(totalFrames / durationSec) : 60;

  // Calculate matching bitrate from original (minimum 30 Mbps)
  const originalBitrateMbps = durationSec > 0 ? Math.round(((file.size * 8) / durationSec) / 1_000_000) : 30;
  const targetBitrateMbps = Math.max(originalBitrateMbps, 30);

  updateTelemetry({
    originalWidth: origWidth,
    originalHeight: origHeight,
    rotation,
    targetWidth,
    targetHeight,
    totalFrames,
    estimatedFps,
    targetBitrateMbps,
    hasAudio: !!audioTrackInfo,
    statusMessage: `Анализ завершен: ${origWidth}x${origHeight} (поворот ${rotation}° -> ${targetWidth}x${targetHeight}), ${estimatedFps} FPS, ${totalFrames} кадров.`,
  });

  // 2. Test VideoEncoder hardware acceleration
  const vp9CodecString = 'vp09.00.41.08'; // VP9 Profile 0, Level 4.1, 8-bit
  let isHw = false;
  try {
    const hwSupport = await (window as any).VideoEncoder.isConfigSupported({
      codec: vp9CodecString,
      width: targetWidth,
      height: targetHeight,
      bitrate: targetBitrateMbps * 1_000_000,
      framerate: estimatedFps,
      hardwareAcceleration: 'prefer-hardware',
    });
    isHw = !!hwSupport.supported;
  } catch {
    isHw = false;
  }

  updateTelemetry({
    hardwareAccelerated: isHw ? true : 'software',
    statusMessage: isHw
      ? 'Аппаратный энкодер VP9 (GPU) доступен. Запуск конвейера...'
      : 'Аппаратный энкодер VP9 недоступен, будет задействован нативный многопоточный libvpx...',
  });

  // 3. Initialize Audio Decoder & Encoder if audio track exists
  let audioDecoder: any = null;
  let audioEncoder: any = null;
  let hasWorkingAudio = false;

  const audioSampleRate = audioTrackInfo?.audio?.sample_rate || 48000;
  const audioChannels = audioTrackInfo?.audio?.channel_count || 2;

  // 4. Initialize WebM Muxer with StreamTarget (bypassing the 2GB single ArrayBuffer allocation limit)
  const chunkedStorage = new ChunkedStreamStorage(16 * 1024 * 1024);
  const muxerTarget = new StreamTarget({
    onData: (data: Uint8Array, position: number) => {
      chunkedStorage.write(data, position);
    },
  });

  if (
    audioTrackInfo &&
    typeof (window as any).AudioDecoder !== 'undefined' &&
    typeof (window as any).AudioEncoder !== 'undefined'
  ) {
    const audioTrak = mp4boxFile.getTrackById(audioTrackInfo.id);
    let audioDescription = extractAudioSpecificConfig(audioTrak);
    if (!audioDescription) {
      audioDescription = createAacAudioSpecificConfig(audioSampleRate, audioChannels);
    }

    try {
      audioEncoder = new (window as any).AudioEncoder({
        output: (chunk: any, meta: any) => {
          try {
            muxer.addAudioChunk(chunk, meta);
          } catch (e: any) {
            console.error('Ошибка добавления аудиочанка в WebM:', e);
          }
        },
        error: (e: any) => {
          console.error('AudioEncoder error:', e);
          addLog(`Ошибка AudioEncoder: ${e.message || e}`);
        },
      });

      audioEncoder.configure({
        codec: 'opus',
        sampleRate: audioSampleRate,
        numberOfChannels: audioChannels,
        bitrate: 192_000,
      });

      audioDecoder = new (window as any).AudioDecoder({
        output: (audioData: any) => {
          try {
            if (audioEncoder && audioEncoder.state === 'configured') {
              audioEncoder.encode(audioData);
            }
          } finally {
            audioData.close();
          }
        },
        error: (e: any) => {
          console.error('AudioDecoder error:', e);
          addLog(`Ошибка AudioDecoder: ${e.message || e}`);
        },
      });

      audioDecoder.configure({
        codec: audioTrackInfo.codec || 'mp4a.40.2',
        sampleRate: audioSampleRate,
        numberOfChannels: audioChannels,
        description: audioDescription,
      });

      hasWorkingAudio = true;
      addLog(`Аудиоконвейер подключен: AAC (${audioSampleRate} Гц, ${audioChannels}ch) ➔ Opus (192 kbps).`);
    } catch (audioInitErr: any) {
      console.warn('Audio setup failed, continuing video-only:', audioInitErr);
      addLog(`Аудиопоток пропущен: ${audioInitErr.message || audioInitErr}`);
      hasWorkingAudio = false;
      audioDecoder = null;
      audioEncoder = null;
    }
  }

  const muxer = new Muxer({
    target: muxerTarget,
    video: {
      codec: 'V_VP9',
      width: targetWidth,
      height: targetHeight,
      frameRate: estimatedFps,
    },
    audio: hasWorkingAudio && audioTrackInfo
      ? {
          codec: 'A_OPUS',
          numberOfChannels: audioChannels,
          sampleRate: audioSampleRate,
        }
      : undefined,
    firstTimestampBehavior: 'offset',
  });

  // Canvas for hardware rotation if needed
  let rotationCanvas: OffscreenCanvas | null = null;
  let rotationCtx: OffscreenCanvasRenderingContext2D | null = null;
  if (isRotated90or270 || rotation === 180) {
    rotationCanvas = new OffscreenCanvas(targetWidth, targetHeight);
    rotationCtx = rotationCanvas.getContext('2d', { alpha: false, desynchronized: true }) as OffscreenCanvasRenderingContext2D;
  }

  // 4. Create VideoEncoder
  let encodedFramesCount = 0;
  const videoEncoder = new (window as any).VideoEncoder({
    output: (chunk: any, meta: any) => {
      muxer.addVideoChunk(chunk, meta);
      encodedFramesCount++;
    },
    error: (e: any) => {
      throw new Error(`Ошибка VideoEncoder: ${e.message || e}`);
    },
  });

  videoEncoder.configure({
    codec: vp9CodecString,
    width: targetWidth,
    height: targetHeight,
    bitrate: targetBitrateMbps * 1_000_000,
    bitrateMode: 'variable',
    framerate: estimatedFps,
    hardwareAcceleration: isHw ? 'prefer-hardware' : 'prefer-software',
  });

  // 5. Create VideoDecoder
  let decodedFramesCount = 0;
  const videoDecoder = new (window as any).VideoDecoder({
    output: (frame: VideoFrame) => {
      decodedFramesCount++;

      // Rotate frame if needed
      let frameToEncode = frame;
      if (rotationCtx && rotationCanvas) {
        rotationCtx.save();
        if (rotation === 90) {
          rotationCtx.translate(targetWidth, 0);
          rotationCtx.rotate((90 * Math.PI) / 180);
        } else if (rotation === 180) {
          rotationCtx.translate(targetWidth, targetHeight);
          rotationCtx.rotate((180 * Math.PI) / 180);
        } else if (rotation === 270) {
          rotationCtx.translate(0, targetHeight);
          rotationCtx.rotate((270 * Math.PI) / 180);
        }
        rotationCtx.drawImage(frame, 0, 0, origWidth, origHeight);
        rotationCtx.restore();

        frameToEncode = new (window as any).VideoFrame(rotationCanvas, {
          timestamp: frame.timestamp,
          duration: frame.duration || undefined,
        });
        frame.close(); // release native frame immediately
      }

      const keyFrame = decodedFramesCount % (estimatedFps * 2) === 1; // Keyframe every 2 seconds
      videoEncoder.encode(frameToEncode, { keyFrame });
      frameToEncode.close(); // release processed frame immediately

      // Telemetry update every few frames
      if (decodedFramesCount % 10 === 0 || decodedFramesCount === totalFrames) {
        const now = performance.now();
        const timeDiff = (now - lastFpsCalcTime) / 1000;
        let curFps = telemetry.currentProcessingFps;
        if (timeDiff >= 0.5) {
          curFps = Math.round((decodedFramesCount - lastProcessedCount) / timeDiff);
          lastFpsCalcTime = now;
          lastProcessedCount = decodedFramesCount;
        }

        const pct = totalFrames > 0 ? Math.min(Math.round((decodedFramesCount / totalFrames) * 98), 98) : 50;
        const framesRemaining = Math.max(totalFrames - decodedFramesCount, 0);
        const eta = curFps > 0 ? Math.round(framesRemaining / curFps) : 0;

        updateTelemetry({
          stage: 'converting',
          progress: pct,
          processedFrames: decodedFramesCount,
          currentProcessingFps: curFps,
          estimatedTimeRemainingSeconds: eta,
          statusMessage: `Кодирование: ${decodedFramesCount} / ${totalFrames} кадров (${pct}%) @ ${curFps} FPS (ETA: ${eta}c)`,
        });
      }
    },
    error: (e: any) => {
      throw new Error(`Ошибка VideoDecoder: ${e.message || e}`);
    },
  });

  videoDecoder.configure({
    codec: videoTrackInfo.codec,
    codedWidth: origWidth,
    codedHeight: origHeight,
    description: trackDescription,
    hardwareAcceleration: 'prefer-hardware',
  });

  // 6. Set extraction options on MP4Box and read samples
  const videoSamplesQueue: any[] = [];
  const audioSamplesQueue: any[] = [];
  let totalExtractedSamples = 0;
  let totalExtractedAudioSamples = 0;

  mp4boxFile.onSamples = (track_id: number, _user: any, samples: any[]) => {
    if (track_id === videoTrackInfo.id) {
      totalExtractedSamples += samples.length;
      for (const sample of samples) {
        videoSamplesQueue.push(sample);
      }
    } else if (hasWorkingAudio && audioTrackInfo && track_id === audioTrackInfo.id) {
      totalExtractedAudioSamples += samples.length;
      for (const sample of samples) {
        audioSamplesQueue.push(sample);
      }
    }
  };

  mp4boxFile.setExtractionOptions(videoTrackInfo.id, null, { nbSamples: 100 });
  if (hasWorkingAudio && audioTrackInfo) {
    mp4boxFile.setExtractionOptions(audioTrackInfo.id, null, { nbSamples: 100 });
  }

  const seekRes = mp4boxFile.seek(0, true);
  mp4boxFile.start();
  addLog(`MP4 заголовок готов: ${totalFrames} кадров. Чтение сэмплов со смещения ${seekRes?.offset ?? 0}...`);

  // Stream extraction from seek position
  let extractOffset = seekRes ? seekRes.offset : 0;
  while (extractOffset < file.size) {
    if (signal?.aborted) throw new Error('Операция отменена пользователем');
    const end = Math.min(extractOffset + CHUNK_SIZE, file.size);
    const chunkBlob = file.slice(extractOffset, end);
    const buffer = await chunkBlob.arrayBuffer();
    const mp4Buffer = buffer as any;
    mp4Buffer.fileStart = extractOffset;
    mp4boxFile.appendBuffer(mp4Buffer);
    extractOffset = end;

    // Process extracted video samples with backpressure
    while (videoSamplesQueue.length > 0) {
      if (signal?.aborted) throw new Error('Операция отменена пользователем');

      // Backpressure: prevent memory explosion by throttling when queue is full
      if (videoDecoder.decodeQueueSize > 10 || videoEncoder.encodeQueueSize > 10) {
        await new Promise((r) => setTimeout(r, 8));
        continue;
      }

      const sample = videoSamplesQueue.shift();
      const sampleType = sample.is_sync ? 'key' : 'delta';
      const sampleTimestampMicros = Math.round((sample.cts * 1_000_000) / sample.timescale);
      const sampleDurationMicros = Math.round((sample.duration * 1_000_000) / sample.timescale);

      const chunk = new (window as any).EncodedVideoChunk({
        type: sampleType,
        timestamp: sampleTimestampMicros,
        duration: sampleDurationMicros,
        data: sample.data,
      });

      videoDecoder.decode(chunk);
    }

    // Process extracted audio samples
    if (hasWorkingAudio && audioDecoder && audioDecoder.state === 'configured') {
      while (audioSamplesQueue.length > 0) {
        if (signal?.aborted) throw new Error('Операция отменена пользователем');
        if (audioDecoder.decodeQueueSize > 20 || audioEncoder.encodeQueueSize > 20) {
          await new Promise((r) => setTimeout(r, 6));
          continue;
        }
        const aSample = audioSamplesQueue.shift();
        const aTimestamp = Math.round((aSample.cts * 1_000_000) / aSample.timescale);
        const aDuration = Math.round((aSample.duration * 1_000_000) / aSample.timescale);
        const aChunk = new (window as any).EncodedAudioChunk({
          type: 'key',
          timestamp: aTimestamp,
          duration: aDuration,
          data: aSample.data,
        });
        audioDecoder.decode(aChunk);
      }
    }
  }

  mp4boxFile.flush();
  addLog(`Демуксинг MP4 завершён: ${totalExtractedSamples} видео, ${totalExtractedAudioSamples} аудио.`);

  // Process remaining queued video samples
  while (videoSamplesQueue.length > 0) {
    if (signal?.aborted) throw new Error('Операция отменена пользователем');
    if (videoDecoder.decodeQueueSize > 10 || videoEncoder.encodeQueueSize > 10) {
      await new Promise((r) => setTimeout(r, 8));
      continue;
    }
    const sample = videoSamplesQueue.shift();
    const sampleType = sample.is_sync ? 'key' : 'delta';
    const sampleTimestampMicros = Math.round((sample.cts * 1_000_000) / sample.timescale);
    const sampleDurationMicros = Math.round((sample.duration * 1_000_000) / sample.timescale);

    const chunk = new (window as any).EncodedVideoChunk({
      type: sampleType,
      timestamp: sampleTimestampMicros,
      duration: sampleDurationMicros,
      data: sample.data,
    });
    videoDecoder.decode(chunk);
  }

  // Process remaining queued audio samples
  if (hasWorkingAudio && audioDecoder && audioDecoder.state === 'configured') {
    while (audioSamplesQueue.length > 0) {
      if (signal?.aborted) throw new Error('Операция отменена пользователем');
      if (audioDecoder.decodeQueueSize > 20 || audioEncoder.encodeQueueSize > 20) {
        await new Promise((r) => setTimeout(r, 6));
        continue;
      }
      const aSample = audioSamplesQueue.shift();
      const aTimestamp = Math.round((aSample.cts * 1_000_000) / aSample.timescale);
      const aDuration = Math.round((aSample.duration * 1_000_000) / aSample.timescale);
      const aChunk = new (window as any).EncodedAudioChunk({
        type: 'key',
        timestamp: aTimestamp,
        duration: aDuration,
        data: aSample.data,
      });
      audioDecoder.decode(aChunk);
    }
  }

  // 7. Flush decoders and encoders
  updateTelemetry({ stage: 'finalizing', progress: 99, statusMessage: 'Финализация кодировщиков и сборка WebM...' });
  addLog('Финализация VideoDecoder и VideoEncoder...');

  await videoDecoder.flush();
  videoDecoder.close();

  await videoEncoder.flush();
  videoEncoder.close();

  if (hasWorkingAudio && audioDecoder && audioDecoder.state === 'configured') {
    addLog('Финализация AudioDecoder и AudioEncoder (Opus)...');
    await audioDecoder.flush();
    audioDecoder.close();
  }
  if (hasWorkingAudio && audioEncoder && audioEncoder.state === 'configured') {
    await audioEncoder.flush();
    audioEncoder.close();
  }

  // 8. Finalize Muxer and produce result
  muxer.finalize();
  const resultBlob = chunkedStorage.toBlob();
  addLog(`Сборка WebM завершена! Итоговый размер: ${(resultBlob.size / (1024 * 1024)).toFixed(2)} МБ.`);

  updateTelemetry({
    stage: 'completed',
    progress: 100,
    statusMessage: `Конвертация успешно завершена! Создан файл WebM (${(resultBlob.size / (1024 * 1024)).toFixed(2)} МБ).`,
    outputBlob: resultBlob,
    outputSizeMb: Number((resultBlob.size / (1024 * 1024)).toFixed(2)),
  });

  return resultBlob;
}
