export type ConversionCategory = 'all' | 'audio' | 'video' | 'image' | 'document';

export type FileStatus = 'idle' | 'detecting' | 'converting' | 'completed' | 'error';

export interface FormatOption {
  id: string;
  name: string;
  extension: string;
  mimeType: string;
  category: ConversionCategory;
  description: string;
  popular?: boolean;
  niche?: boolean;
}

export interface ConversionSettings {
  imageQuality?: number; // 0.1 to 1.0
  imageWidth?: number;
  imageHeight?: number;
  preserveAspectRatio?: boolean;
  audioBitrate?: '64k' | '128k' | '192k' | '256k' | '320k';
  audioSampleRate?: 44100 | 48000 | 22050;
  videoFps?: 15 | 24 | 30 | 60;
  videoResolution?: 'original' | '1080p' | '720p' | '480p';
  pdfPageSize?: 'a4' | 'letter';
}

export interface FileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  detectedFormat: string;
  detectedMime: string;
  category: ConversionCategory;
  magicBytesHex?: string;
  targetFormat: string;
  status: FileStatus;
  progress: number;
  statusText?: string;
  convertedBlob?: Blob;
  convertedName?: string;
  convertedSize?: number;
  error?: string;
  settings: ConversionSettings;
  createdAt: number;
  convertedAt?: number;
}

export interface HistoryItem {
  id: string;
  fileName: string;
  originalFormat: string;
  targetFormat: string;
  originalSize: number;
  convertedSize: number;
  category: ConversionCategory;
  durationMs: number;
  timestamp: number;
  status: 'success' | 'failed';
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  provider: 'google' | 'yandex';
  createdAt: number;
}
