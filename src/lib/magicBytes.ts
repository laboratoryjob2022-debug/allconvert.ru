import { ConversionCategory } from '../types/converter';

export interface MagicByteResult {
  format: string;
  mime: string;
  category: ConversionCategory;
  hex: string;
}

/**
 * Sniffs the first 32 bytes of a file to detect its true signature/magic bytes.
 */
export async function detectMagicBytes(file: File): Promise<MagicByteResult> {
  const slice = file.slice(0, 32);
  const buffer = await slice.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  let hex = '';
  for (let i = 0; i < Math.min(bytes.length, 16); i++) {
    hex += bytes[i].toString(16).padStart(2, '0').toUpperCase() + ' ';
  }
  hex = hex.trim();

  // 1. Check Images
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
    return { format: 'PNG', mime: 'image/png', category: 'image', hex };
  }
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return { format: 'JPG', mime: 'image/jpeg', category: 'image', hex };
  }
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return { format: 'GIF', mime: 'image/gif', category: 'image', hex };
  }
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return { format: 'WEBP', mime: 'image/webp', category: 'image', hex };
  }
  if (bytes[0] === 0x42 && bytes[1] === 0x4D) {
    return { format: 'BMP', mime: 'image/bmp', category: 'image', hex };
  }
  if ((bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2A && bytes[3] === 0x00) ||
      (bytes[0] === 0x4D && bytes[1] === 0x4D && bytes[2] === 0x00 && bytes[3] === 0x2A)) {
    return { format: 'TIFF', mime: 'image/tiff', category: 'image', hex };
  }
  if (bytes[0] === 0x00 && bytes[1] === 0x00 && bytes[2] === 0x01 && bytes[3] === 0x00) {
    return { format: 'ICO', mime: 'image/x-icon', category: 'image', hex };
  }

  // 2. Check Audio
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    return { format: 'MP3', mime: 'audio/mpeg', category: 'audio', hex };
  }
  if (bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0) {
    return { format: 'MP3', mime: 'audio/mpeg', category: 'audio', hex };
  }
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45
  ) {
    return { format: 'WAV', mime: 'audio/wav', category: 'audio', hex };
  }
  if (bytes[0] === 0x66 && bytes[1] === 0x4C && bytes[2] === 0x61 && bytes[3] === 0x43) {
    return { format: 'FLAC', mime: 'audio/flac', category: 'audio', hex };
  }
  if (bytes[0] === 0x4F && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) {
    // Could be OGG audio or OGG video
    const isVideo = file.name.toLowerCase().endsWith('.ogv');
    return {
      format: isVideo ? 'OGV' : 'OGG',
      mime: isVideo ? 'video/ogg' : 'audio/ogg',
      category: isVideo ? 'video' : 'audio',
      hex
    };
  }

  // 3. Check Video
  if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
    // MP4, MOV, M4A, 3GP
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    if (brand.includes('M4A')) {
      return { format: 'M4A', mime: 'audio/mp4', category: 'audio', hex };
    }
    if (brand.includes('qt') || file.name.toLowerCase().endsWith('.mov')) {
      return { format: 'MOV', mime: 'video/quicktime', category: 'video', hex };
    }
    return { format: 'MP4', mime: 'video/mp4', category: 'video', hex };
  }
  if (bytes[0] === 0x1A && bytes[1] === 0x45 && bytes[2] === 0xDF && bytes[3] === 0xA3) {
    // EBML container (WEBM or MKV)
    const isWebm = file.name.toLowerCase().endsWith('.webm');
    return {
      format: isWebm ? 'WEBM' : 'MKV',
      mime: isWebm ? 'video/webm' : 'video/x-matroska',
      category: 'video',
      hex
    };
  }
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x41 && bytes[9] === 0x56 && bytes[10] === 0x49 && bytes[11] === 0x20
  ) {
    return { format: 'AVI', mime: 'video/x-msvideo', category: 'video', hex };
  }

  // 4. Documents & Archives
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return { format: 'PDF', mime: 'application/pdf', category: 'document', hex };
  }
  if (bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04) {
    // ZIP or Office docx/xlsx/pptx or EPUB
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (ext === 'docx') {
      return { format: 'DOCX', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', category: 'document', hex };
    }
    if (ext === 'xlsx') {
      return { format: 'XLSX', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', category: 'document', hex };
    }
    if (ext === 'epub') {
      return { format: 'EPUB', mime: 'application/epub+zip', category: 'document', hex };
    }
    return { format: 'ZIP', mime: 'application/zip', category: 'document', hex };
  }

  // SVG Check
  if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
    return { format: 'SVG', mime: 'image/svg+xml', category: 'image', hex };
  }

  // Fallback to extension matching
  const ext = file.name.split('.').pop()?.toUpperCase() || 'BIN';
  const categoryMap: Record<string, ConversionCategory> = {
    // Image
    JPG: 'image', JPEG: 'image', PNG: 'image', WEBP: 'image', GIF: 'image', BMP: 'image',
    SVG: 'image', ICO: 'image', TIFF: 'image', AVIF: 'image', HEIC: 'image',
    // Audio
    MP3: 'audio', WAV: 'audio', OGG: 'audio', FLAC: 'audio', AAC: 'audio', M4A: 'audio',
    OPUS: 'audio', WMA: 'audio', AIFF: 'audio',
    // Video
    MP4: 'video', WEBM: 'video', AVI: 'video', MOV: 'video', MKV: 'video', FLV: 'video', WMV: 'video',
    // Document
    PDF: 'document', TXT: 'document', MD: 'document', HTML: 'document', JSON: 'document',
    CSV: 'document', XML: 'document', DOCX: 'document', EPUB: 'document', XLSX: 'document', XLS: 'document'
  };

  const category = categoryMap[ext] || 'document';
  return {
    format: ext,
    mime: file.type || 'application/octet-stream',
    category,
    hex
  };
}
