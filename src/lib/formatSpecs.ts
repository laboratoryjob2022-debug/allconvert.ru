import { FormatOption, ConversionCategory } from '../types/converter';

export const SUPPORTED_FORMATS: FormatOption[] = [
  // IMAGE FORMATS
  { id: 'PNG', name: 'PNG Image', extension: 'png', mimeType: 'image/png', category: 'image', description: 'Lossless raster image with transparency', popular: true },
  { id: 'JPG', name: 'JPEG Image', extension: 'jpg', mimeType: 'image/jpeg', category: 'image', description: 'High compression photographic format', popular: true },
  { id: 'WEBP', name: 'WebP Image', extension: 'webp', mimeType: 'image/webp', category: 'image', description: 'Modern web image format with small size', popular: true },
  { id: 'GIF', name: 'Animated GIF', extension: 'gif', mimeType: 'image/gif', category: 'image', description: 'Graphics Interchange Format', popular: true },
  { id: 'BMP', name: 'BMP Bitmap', extension: 'bmp', mimeType: 'image/bmp', category: 'image', description: 'Uncompressed Windows Bitmap' },
  { id: 'ICO', name: 'Icon ICO', extension: 'ico', mimeType: 'image/x-icon', category: 'image', description: 'Favicon and desktop application icon' },
  { id: 'SVG', name: 'SVG Vector', extension: 'svg', mimeType: 'image/svg+xml', category: 'image', description: 'Scalable Vector Graphics' },
  { id: 'TIFF', name: 'TIFF Image', extension: 'tiff', mimeType: 'image/tiff', category: 'image', description: 'Tag Image File Format for printing', niche: true },
  { id: 'AVIF', name: 'AVIF Image', extension: 'avif', mimeType: 'image/avif', category: 'image', description: 'Next-gen highly compressed image format', niche: true },

  // AUDIO FORMATS
  { id: 'MP3', name: 'MP3 Audio', extension: 'mp3', mimeType: 'audio/mpeg', category: 'audio', description: 'Universal compressed audio format', popular: true },
  { id: 'WAV', name: 'WAV Lossless', extension: 'wav', mimeType: 'audio/wav', category: 'audio', description: 'Uncompressed PCM high-fidelity audio', popular: true },
  { id: 'OGG', name: 'OGG Vorbis', extension: 'ogg', mimeType: 'audio/ogg', category: 'audio', description: 'Open-source audio container', popular: true },
  { id: 'FLAC', name: 'FLAC Lossless', extension: 'flac', mimeType: 'audio/flac', category: 'audio', description: 'Free Lossless Audio Codec', popular: true },
  { id: 'M4A', name: 'M4A Audio', extension: 'm4a', mimeType: 'audio/mp4', category: 'audio', description: 'Apple AAC Audio container', popular: true },
  { id: 'AAC', name: 'AAC Stream', extension: 'aac', mimeType: 'audio/aac', category: 'audio', description: 'Advanced Audio Coding' },
  { id: 'OPUS', name: 'OPUS Codec', extension: 'opus', mimeType: 'audio/opus', category: 'audio', description: 'Ultra low-delay interactive speech audio', niche: true },
  { id: 'AIFF', name: 'AIFF Sound', extension: 'aiff', mimeType: 'audio/aiff', category: 'audio', description: 'Audio Interchange File Format', niche: true },

  // VIDEO FORMATS
  { id: 'MP4', name: 'MP4 Video', extension: 'mp4', mimeType: 'video/mp4', category: 'video', description: 'MPEG-4 Part 14 universal video', popular: true },
  { id: 'WEBM', name: 'WebM Video', extension: 'webm', mimeType: 'video/webm', category: 'video', description: 'Royalty-free HTML5 web video format', popular: true },
  { id: 'MOV', name: 'Apple MOV', extension: 'mov', mimeType: 'video/quicktime', category: 'video', description: 'QuickTime Movie container', popular: true },
  { id: 'AVI', name: 'AVI Video', extension: 'avi', mimeType: 'video/x-msvideo', category: 'video', description: 'Audio Video Interleave' },
  { id: 'MKV', name: 'Matroska MKV', extension: 'mkv', mimeType: 'video/x-matroska', category: 'video', description: 'Flexible open multimedia container', popular: true },
  { id: 'GIF_VID', name: 'Video to Animated GIF', extension: 'gif', mimeType: 'image/gif', category: 'video', description: 'Convert video sequence to looping GIF', popular: true },
  { id: 'MP3_EXTRACT', name: 'Extract MP3 Audio', extension: 'mp3', mimeType: 'audio/mpeg', category: 'video', description: 'Extract audio track from video file', popular: true },

  // DOCUMENT FORMATS
  { id: 'PDF', name: 'PDF Document', extension: 'pdf', mimeType: 'application/pdf', category: 'document', description: 'Portable Document Format', popular: true },
  { id: 'TXT', name: 'Plain Text', extension: 'txt', mimeType: 'text/plain', category: 'document', description: 'UTF-8 Plain Text document', popular: true },
  { id: 'MD', name: 'Markdown Text', extension: 'md', mimeType: 'text/markdown', category: 'document', description: 'Formatted Markdown document', popular: true },
  { id: 'HTML', name: 'HTML Document', extension: 'html', mimeType: 'text/html', category: 'document', description: 'HyperText Markup Language file', popular: true },
  { id: 'JSON', name: 'JSON Data', extension: 'json', mimeType: 'application/json', category: 'document', description: 'Structured JSON data document' },
  { id: 'CSV', name: 'CSV Table', extension: 'csv', mimeType: 'text/csv', category: 'document', description: 'Comma Separated Values spreadsheet', popular: true },
  { id: 'XLSX', name: 'Excel Table', extension: 'xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', category: 'document', description: 'Microsoft Excel Spreadsheet', popular: true },
  { id: 'XLS', name: 'Excel 97-2003', extension: 'xls', mimeType: 'application/vnd.ms-excel', category: 'document', description: 'Legacy Microsoft Excel Spreadsheet' },
  { id: 'XML', name: 'XML Data', extension: 'xml', mimeType: 'application/xml', category: 'document', description: 'Extensible Markup Language document' },
  { id: 'DOCX', name: 'Word Document', extension: 'docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', category: 'document', description: 'Microsoft Word Document' },
  { id: 'EPUB', name: 'ePub E-book', extension: 'epub', mimeType: 'application/epub+zip', category: 'document', description: 'Electronic Publication E-book', niche: true },
];

export const TARGET_FORMATS_BY_CATEGORY: Record<string, string[]> = {
  image: ['PNG', 'JPG', 'WEBP', 'GIF', 'BMP', 'ICO', 'AVIF', 'PDF'],
  audio: ['MP3', 'WAV', 'OGG', 'FLAC', 'AAC', 'M4A', 'OPUS'],
  video: ['MP4', 'WEBM', 'MOV', 'AVI', 'MKV', 'GIF_VID', 'MP3_EXTRACT'],
  document: ['PDF', 'TXT', 'MD', 'HTML', 'JSON', 'CSV', 'XLSX', 'XML'],
};

export function getAvailableTargets(
  category: ConversionCategory,
  currentFormat?: string
): FormatOption[] {
  const normCurrent = currentFormat?.toUpperCase();

  let targets = SUPPORTED_FORMATS;
  if (category !== 'all' && TARGET_FORMATS_BY_CATEGORY[category]) {
    const allowed = TARGET_FORMATS_BY_CATEGORY[category];
    targets = SUPPORTED_FORMATS.filter((f) => allowed.includes(f.id));
  } else {
    // For 'all', filter out non-target document formats like DOCX, EPUB, XLS
    const nonExportTargets = ['DOCX', 'EPUB', 'XLS'];
    targets = SUPPORTED_FORMATS.filter((f) => !nonExportTargets.includes(f.id));
  }

  return targets.filter((f) => {
    const fId = f.id.toUpperCase();
    if (fId === normCurrent) return false;
    if ((normCurrent === 'JPG' || normCurrent === 'JPEG') && (fId === 'JPG' || fId === 'JPEG')) return false;
    if ((normCurrent === 'XLSX' || normCurrent === 'XLS') && fId === 'XLSX') return false;
    return true;
  });
}

export function getDefaultTargetForCategory(
  category: ConversionCategory,
  currentFormat?: string
): string {
  const normFormat = currentFormat?.toUpperCase();
  switch (category) {
    case 'image':
      return normFormat === 'PNG' ? 'WEBP' : 'PNG';
    case 'audio':
      return normFormat === 'MP3' ? 'WAV' : 'MP3';
    case 'video':
      return normFormat === 'MP4' ? 'WEBM' : 'MP4';
    case 'document':
      if (normFormat === 'XLSX' || normFormat === 'XLS') return 'CSV';
      return normFormat === 'PDF' ? 'TXT' : 'PDF';
    default:
      return 'PNG';
  }
}
