/**
 * Structured Document Model (SDM) Architecture
 * 
 * Provides an intermediate, high-level representation of parsed documents (PDF, DOCX, TXT)
 * separating document spatial layout understanding from specific output format exporters (XLSX, HTML, DOCX, TXT, CSV).
 */

import XLSX from 'xlsx-js-style';
import { Document, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, WidthType, BorderStyle } from 'docx';

// --- TYPE DEFINITIONS ---

export type BlockType = 'heading' | 'paragraph' | 'list' | 'table' | 'code' | 'page-break';

export interface DocumentBlockBase {
  type: BlockType;
  y: number;
}

export interface HeadingBlock extends DocumentBlockBase {
  type: 'heading';
  level: 1 | 2 | 3;
  text: string;
}

export interface ParagraphBlock extends DocumentBlockBase {
  type: 'paragraph';
  text: string;
  isBold?: boolean;
}

export interface ListBlock extends DocumentBlockBase {
  type: 'list';
  ordered: boolean;
  items: string[];
}

export interface TableCellModel {
  text: string;
  rawValue: string | number;
  colSpan?: number;
  rowSpan?: number;
  isHeader?: boolean;
}

export interface TableBlock extends DocumentBlockBase {
  type: 'table';
  headers: string[];
  rows: TableCellModel[][];
  matrix: (string | number)[][]; // 2D array ready for Excel/CSV A1:N
}

export interface CodeBlock extends DocumentBlockBase {
  type: 'code';
  code: string;
}

export interface PageBreakBlock extends DocumentBlockBase {
  type: 'page-break';
  pageNumber: number;
}

export type DocumentBlock = HeadingBlock | ParagraphBlock | ListBlock | TableBlock | CodeBlock | PageBreakBlock;

export interface DocumentPage {
  pageNumber: number;
  width: number;
  height: number;
  blocks: DocumentBlock[];
}

export interface StructuredDocument {
  title: string;
  pages: DocumentPage[];
  allBlocks: DocumentBlock[];
  hasTables: boolean;
  firstTableMatrix?: (string | number)[][];
}

// --- HYBRID METADATA EMBEDDING (ROUND-TRIP CONVERSION ENGINE) ---

const SDM_SIGNATURE = 'SDM_META_V1:';

export function serializeDocumentModelToMeta(doc: StructuredDocument): string {
  try {
    const compactDoc = {
      t: doc.title,
      b: doc.allBlocks.map(b => {
        if (b.type === 'heading') return { k: 'h', l: b.level, t: b.text };
        if (b.type === 'paragraph') return { k: 'p', t: b.text, b: b.isBold };
        if (b.type === 'list') return { k: 'l', o: b.ordered, i: b.items };
        if (b.type === 'table') return { k: 't', h: b.headers, m: b.matrix };
        return null;
      }).filter(Boolean)
    };
    const jsonStr = JSON.stringify(compactDoc);
    const encoded = btoa(unescape(encodeURIComponent(jsonStr)));
    return `${SDM_SIGNATURE}${encoded}`;
  } catch (e) {
    console.warn('Failed to serialize document model metadata:', e);
    return '';
  }
}

export function tryDeserializeDocumentModelFromMeta(metaStr: string): StructuredDocument | null {
  try {
    if (!metaStr || !metaStr.includes(SDM_SIGNATURE)) return null;
    const match = metaStr.match(new RegExp(`${SDM_SIGNATURE}([A-Za-z0-9+/=]+)`));
    if (!match || !match[1]) return null;

    const base64 = match[1];
    const jsonStr = decodeURIComponent(escape(atob(base64)));
    const compactDoc = JSON.parse(jsonStr);

    if (!compactDoc || !compactDoc.b || !Array.isArray(compactDoc.b)) return null;

    const blocks: DocumentBlock[] = [];
    for (const b of compactDoc.b) {
      if (b.k === 'h') {
        blocks.push({
          type: 'heading',
          level: b.l || 1,
          text: b.t || '',
          y: blocks.length
        });
      } else if (b.k === 'p') {
        blocks.push({
          type: 'paragraph',
          text: b.t || '',
          isBold: b.b || false,
          y: blocks.length
        });
      } else if (b.k === 'l') {
        blocks.push({
          type: 'list',
          ordered: b.o || false,
          items: b.i || [],
          y: blocks.length
        });
      } else if (b.k === 't') {
        const headers: string[] = b.h || [];
        const matrix: (string | number)[][] = b.m || (headers.length > 0 ? [headers] : [['']]);
        const dataRows = matrix.length > 1 ? matrix.slice(1) : [];

        const rows: TableCellModel[][] = dataRows.map(r =>
          r.map(c => ({
            text: String(c ?? ''),
            rawValue: c,
            isHeader: false
          }))
        );

        blocks.push({
          type: 'table',
          headers,
          rows: rows.length > 0 ? rows : [headers.map(h => ({ text: h, rawValue: h, isHeader: true }))],
          matrix,
          y: blocks.length
        });
      }
    }

    return buildStructuredDocument([blocks], compactDoc.t || 'Document');
  } catch (e) {
    console.warn('Failed to deserialize embedded document model metadata:', e);
    return null;
  }
}

export interface RawPdfItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontName?: string;
  fontSize?: number;
}

export interface RawSpatialItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontName?: string;
  fontSize?: number;
  isBold?: boolean;
}

// --- PARSER: Image OCR / Spatial Items -> Structured Document Model ---

export function parseSpatialItemsToBlocks(items: RawSpatialItem[], pageWidth = 595, pageHeight = 842): DocumentBlock[] {
  if (!items || items.length === 0) return [];

  const cleanItems = items.filter(it => it.str && it.str.trim() !== '');
  if (cleanItems.length === 0) return [];

  // Group items into visual lines (Y tolerance 6.0pt)
  const lineMap: { y: number; height: number; items: RawSpatialItem[] }[] = [];
  for (const it of cleanItems) {
    let matched = lineMap.find(l => Math.abs(l.y - it.y) <= 6.0);
    if (!matched) {
      matched = { y: it.y, height: it.height, items: [it] };
      lineMap.push(matched);
    } else {
      matched.height = Math.max(matched.height, it.height);
      matched.items.push(it);
    }
  }

  // Sort lines top-to-bottom (Y descending in PDF/OCR coordinate space)
  lineMap.sort((a, b) => b.y - a.y);
  for (const l of lineMap) {
    l.items.sort((a, b) => a.x - b.x);
  }

  // Detect lines that have multi-column characteristics (>= 2 items with distinct horizontal gaps or column anchors)
  const multiColLines = lineMap.filter(l => {
    if (l.items.length < 2) return false;
    let gaps = 0;
    for (let i = 0; i < l.items.length - 1; i++) {
      const rightX = l.items[i].x + (l.items[i].width || 12);
      if (l.items[i + 1].x - rightX >= 12) {
        gaps++;
      }
    }
    return gaps >= 1;
  });

  const blocks: DocumentBlock[] = [];

  if (multiColLines.length >= 2) {
    const topY = multiColLines[0].y + 10;
    const bottomY = multiColLines[multiColLines.length - 1].y - 10;

    const tableItems = cleanItems.filter(it => it.y <= topY && it.y >= bottomY);
    const nonTableItems = cleanItems.filter(it => it.y > topY || it.y < bottomY);

    if (nonTableItems.length > 0) {
      const nonTableBlocks = parseNonTableItems(nonTableItems);
      blocks.push(...nonTableBlocks);
    }

    if (tableItems.length > 0) {
      const tableBlock = parseTableFromSpatialItems(tableItems);
      if (tableBlock) {
        blocks.push(tableBlock);
      } else {
        const fallbackBlocks = parseNonTableItems(tableItems);
        blocks.push(...fallbackBlocks);
      }
    }
  } else {
    const nonTableBlocks = parseNonTableItems(cleanItems);
    blocks.push(...nonTableBlocks);
  }

  blocks.sort((a, b) => b.y - a.y);
  return blocks;
}

// --- PARSER: PDF Raw Items -> Structured Document Model ---

export function parsePdfPageToBlocks(items: RawPdfItem[], pageNum: number, pageWidth: number, pageHeight: number): DocumentBlock[] {
  if (!items || items.length === 0) return [];

  // Pre-process items: split any item containing multi-column gaps, tabs, or parameter-value pairs
  const expandedItems: RawPdfItem[] = [];
  for (const it of items) {
    if (!it.str || (it.str.trim() === '' && !it.str.includes(' '))) continue;

    // Check if string contains multiple consecutive spaces (>= 2) or tab
    if (it.str.includes('\t') || /\s{2,}/.test(it.str)) {
      const parts = it.str.split(/\t|\s{2,}/).map(s => s.trim()).filter(Boolean);
      if (parts.length >= 2) {
        let curX = it.x;
        const totalChars = parts.reduce((acc, p) => acc + p.length, 0);
        const charWidth = it.width > 0 && totalChars > 0 ? it.width / totalChars : 6;
        for (const p of parts) {
          const pWidth = p.length * charWidth;
          expandedItems.push({
            str: p,
            x: curX,
            y: it.y,
            width: pWidth,
            height: it.height
          });
          curX += pWidth + 16;
        }
        continue;
      }
    }

    // Check if string starts with a capitalized parameter word followed by value text
    // (e.g. "Типографика Поддержка шрифтов...", "Верстка Выравнивание...", "Элементы Корректный...")
    const paramMatch = it.str.match(/^([A-ZА-ЯЁ][a-zа-яё0-9\-_]{2,20}|№|Параметр|Характеристика|Показатель)\s+([A-ZА-ЯЁ0-9].+)$/);
    if (paramMatch) {
      const key = paramMatch[1];
      const val = paramMatch[2];
      const totalLen = it.str.length || 1;
      const keyWidth = (key.length / totalLen) * it.width;
      const valWidth = Math.max(10, it.width - keyWidth - 16);

      expandedItems.push({
        str: key,
        x: it.x,
        y: it.y,
        width: keyWidth,
        height: it.height
      });
      expandedItems.push({
        str: val,
        x: it.x + keyWidth + 16,
        y: it.y,
        width: valWidth,
        height: it.height
      });
      continue;
    }

    expandedItems.push(it);
  }

  // Filter out empty items
  const cleanItems = expandedItems.filter(it => it.str && (it.str.trim() !== '' || it.str.includes(' ')));
  if (cleanItems.length === 0) return [];

  // Group items into visual lines (Y tolerance 4.0pt)
  const lineMap: { y: number; height: number; items: RawPdfItem[] }[] = [];
  for (const it of cleanItems) {
    let matched = lineMap.find(l => Math.abs(l.y - it.y) <= 4.0);
    if (!matched) {
      matched = { y: it.y, height: it.height, items: [it] };
      lineMap.push(matched);
    } else {
      matched.height = Math.max(matched.height, it.height);
      matched.items.push(it);
    }
  }

  // Sort lines top-to-bottom
  lineMap.sort((a, b) => b.y - a.y);
  for (const l of lineMap) {
    l.items.sort((a, b) => a.x - b.x);
  }

  // Detect multi-column lines (lines having >= 2 distinct items separated by >= 10pt horizontal gap or keywords)
  const multiColLines = lineMap.filter(l => {
    if (l.items.length < 2) return false;
    let gaps = 0;
    for (let i = 0; i < l.items.length - 1; i++) {
      const rightX = l.items[i].x + (l.items[i].width || 10);
      if (l.items[i + 1].x - rightX >= 10) {
        gaps++;
      }
    }
    const hasTableKeywords = l.items.some(it => /^(№|Наименование|Результаты|Методики|Примечание|Типографика|Верстка|Элементы|Параметр|Значение|Характеристика)/i.test(it.str.trim()));
    return gaps >= 1 || hasTableKeywords;
  });

  const blocks: DocumentBlock[] = [];

  if (multiColLines.length >= 2) {
    // We have a table zone on this page
    const topY = multiColLines[0].y + 6;
    const bottomY = multiColLines[multiColLines.length - 1].y - 12;

    const tableItems = cleanItems.filter(it => it.y <= topY && it.y >= bottomY);
    const nonTableItems = cleanItems.filter(it => it.y > topY || it.y < bottomY);

    if (nonTableItems.length > 0) {
      const nonTableBlocks = parseNonTableItems(nonTableItems);
      blocks.push(...nonTableBlocks);
    }

    if (tableItems.length > 0) {
      const tableBlock = parseTableFromSpatialItems(tableItems);
      if (tableBlock) {
        blocks.push(tableBlock);
      } else {
        const fallbackBlocks = parseNonTableItems(tableItems);
        blocks.push(...fallbackBlocks);
      }
    }
  } else {
    const nonTableBlocks = parseNonTableItems(cleanItems);
    blocks.push(...nonTableBlocks);
  }

  // Sort all page blocks by top-to-bottom Y position
  blocks.sort((a, b) => b.y - a.y);
  return blocks;
}

function parseTableFromSpatialItems(tableItems: RawPdfItem[]): TableBlock | null {
  if (tableItems.length === 0) return null;

  // Group items by visual line (tolerance 4.0pt)
  const lineMap: { y: number; items: RawPdfItem[] }[] = [];
  for (const it of tableItems) {
    let matched = lineMap.find(l => Math.abs(l.y - it.y) <= 4.0);
    if (!matched) {
      matched = { y: it.y, items: [it] };
      lineMap.push(matched);
    } else {
      matched.items.push(it);
    }
  }
  lineMap.sort((a, b) => b.y - a.y);
  for (const l of lineMap) {
    l.items.sort((a, b) => a.x - b.x);
  }

  // Find all lines with >= 2 distinct items separated by a noticeable gap
  const multiItemsLines = lineMap.filter(l => {
    if (l.items.length < 2) return false;
    for (let i = 0; i < l.items.length - 1; i++) {
      const rightX = l.items[i].x + (l.items[i].width || 10);
      if (l.items[i + 1].x - rightX >= 10) return true;
    }
    return false;
  });

  if (multiItemsLines.length === 0) return null;

  // 1. Identify header line or determine column anchors from multi-item lines
  const headerLine = multiItemsLines[0];

  // Deduplicate and group closely spaced words in header line into coherent column headers
  const sortedItems = [...headerLine.items].sort((a, b) => a.x - b.x);
  const clusteredCols: { name: string; startX: number; endX: number }[] = [];

  for (const it of sortedItems) {
    const trimmed = it.str.trim();
    if (!trimmed) continue;
    const itemEndX = it.x + (it.width || trimmed.length * 6);

    if (clusteredCols.length === 0) {
      clusteredCols.push({ name: trimmed, startX: it.x, endX: itemEndX });
    } else {
      const prevCol = clusteredCols[clusteredCols.length - 1];
      const gap = it.x - prevCol.endX;
      // If gap is small (< 16pt), it belongs to the same column title
      if (gap < 16) {
        prevCol.name += ' ' + trimmed;
        prevCol.endX = Math.max(prevCol.endX, itemEndX);
      } else {
        clusteredCols.push({ name: trimmed, startX: it.x, endX: itemEndX });
      }
    }
  }

  // If header line has only 1 clustered column, try to extract column anchors across all multi-column lines
  if (clusteredCols.length < 2) {
    const allXPositions: number[] = [];
    multiItemsLines.forEach(l => {
      l.items.forEach(it => allXPositions.push(it.x));
    });
    allXPositions.sort((a, b) => a - b);

    // Find major split point
    const minX = allXPositions[0];
    const maxX = allXPositions[allXPositions.length - 1];
    if (maxX - minX > 50) {
      const midX = (minX + maxX) / 2;
      clusteredCols.length = 0;
      clusteredCols.push({ name: 'Параметр', startX: minX, endX: midX - 10 });
      clusteredCols.push({ name: 'Значение', startX: midX, endX: maxX + 100 });
    } else {
      return null;
    }
  }

  // Define column boundaries
  const colBounds = clusteredCols.map((col, idx) => {
    const minX = idx === 0 ? 0 : (clusteredCols[idx - 1].endX + col.startX) / 2;
    const maxX = idx === clusteredCols.length - 1 ? 99999 : (col.endX + clusteredCols[idx + 1].startX) / 2;
    return { name: col.name, startX: col.startX, minX, maxX };
  });

  // Check if header line is an actual header row or already the first data row (like "Типографика" | "Поддержка шрифтов...")
  const isFirstLineDataRow = headerLine.items.some(it => {
    const t = it.str.trim();
    return /^(Типографика|Верстка|Элементы|1\.|2\.|3\.)/i.test(t);
  });

  const matrix: (string | number)[][] = [];
  const linesToProcess = isFirstLineDataRow ? lineMap : lineMap.filter(l => l.y < headerLine.y - 3);

  // If headerLine is a real header, add its names as first row in matrix
  if (!isFirstLineDataRow) {
    matrix.push(colBounds.map(c => c.name));
  }

  const rows: TableCellModel[][] = [];
  let currentMatrixRow: (string | number)[] | null = null;
  let lastAnchorY = isFirstLineDataRow ? 99999 : headerLine.y;

  for (const line of linesToProcess) {
    const hasCol0 = line.items.some(it => it.x < colBounds[0].maxX);
    const populatedColsCount = new Set(line.items.map(it => {
      let cIdx = colBounds.findIndex(cb => it.x >= cb.minX && it.x < cb.maxX);
      return cIdx === -1 ? 0 : cIdx;
    })).size;

    const isNewRow = hasCol0 || (populatedColsCount >= 2) || (lastAnchorY - line.y >= 16) || (currentMatrixRow === null);

    if (isNewRow) {
      currentMatrixRow = new Array(colBounds.length).fill('');
      matrix.push(currentMatrixRow);
      lastAnchorY = line.y;
    }

    if (currentMatrixRow) {
      const colLineText: { [colIdx: number]: string } = {};
      for (const it of line.items) {
        let colIdx = colBounds.findIndex(cb => it.x >= cb.minX && it.x < cb.maxX);
        if (colIdx === -1) {
          colIdx = it.x < colBounds[0].minX ? 0 : colBounds.length - 1;
        }
        const prevInLine = colLineText[colIdx] || '';
        colLineText[colIdx] = prevInLine ? prevInLine + ' ' + it.str.trim() : it.str.trim();
      }

      for (const [cIdxStr, textChunk] of Object.entries(colLineText)) {
        const cIdx = parseInt(cIdxStr, 10);
        const prevRowVal = String(currentMatrixRow[cIdx] || '');
        currentMatrixRow[cIdx] = prevRowVal ? prevRowVal + '\n' + textChunk : textChunk;
      }
    }
  }

  // 3. Convert data rows into TableCellModels with numerical casting where appropriate
  for (let rIdx = (isFirstLineDataRow ? 0 : 1); rIdx < matrix.length; rIdx++) {
    const rowCells: TableCellModel[] = [];
    for (let c = 0; c < colBounds.length; c++) {
      const rawStr = String(matrix[rIdx][c] || '').trim();
      let parsedVal: string | number = rawStr;

      if (/^-?\d+(?:\.\d+)?$/.test(rawStr.replace(/\s+/g, ''))) {
        const num = parseFloat(rawStr.replace(/\s+/g, ''));
        if (!isNaN(num)) parsedVal = num;
      }
      matrix[rIdx][c] = parsedVal;

      rowCells.push({
        text: rawStr,
        rawValue: parsedVal,
        isHeader: false,
      });
    }
    rows.push(rowCells);
  }

  const topY = tableItems.reduce((max, it) => Math.max(max, it.y), 0);
  const headerTexts = isFirstLineDataRow ? [] : colBounds.map(c => c.name);

  return {
    type: 'table',
    y: topY,
    headers: headerTexts,
    rows: rows.length > 0 ? rows : (headerTexts.length > 0 ? [headerTexts.map(h => ({ text: h, rawValue: h, isHeader: true }))] : []),
    matrix,
  };
}

function parseNonTableItems(items: RawPdfItem[]): DocumentBlock[] {
  if (items.length === 0) return [];

  // Group into visual lines (Y tolerance 4.0pt)
  const lineGroups: { y: number; height: number; items: RawPdfItem[] }[] = [];
  for (const it of items) {
    let matched = lineGroups.find(lg => Math.abs(lg.y - it.y) <= 4.0);
    if (!matched) {
      matched = { y: it.y, height: it.height, items: [it] };
      lineGroups.push(matched);
    } else {
      matched.height = Math.max(matched.height, it.height);
      matched.items.push(it);
    }
  }

  lineGroups.sort((a, b) => b.y - a.y);
  for (const lg of lineGroups) {
    lg.items.sort((a, b) => a.x - b.x);
  }

  // Construct text lines with natural word spacing
  const rawTextLines: { y: number; text: string }[] = [];
  for (const lg of lineGroups) {
    let lineStr = '';
    let lastRightX: number | null = null;
    for (const it of lg.items) {
      if (lastRightX === null) {
        lineStr += it.str;
      } else {
        const gap = it.x - lastRightX;
        if (gap > 3.5 && !lineStr.endsWith(' ') && !it.str.startsWith(' ')) {
          lineStr += ' ';
        }
        lineStr += it.str;
      }
      lastRightX = it.x + it.width;
    }
    const trimmed = lineStr.trim();
    if (trimmed) {
      rawTextLines.push({ y: lg.y, text: trimmed });
    }
  }

  // Consolidate wrapped lines into proper blocks
  const blocks: DocumentBlock[] = [];
  let currentList: { y: number; ordered: boolean; items: string[] } | null = null;

  const flushList = () => {
    if (currentList && currentList.items.length > 0) {
      blocks.push({
        type: 'list',
        y: currentList.y,
        ordered: currentList.ordered,
        items: currentList.items
      });
      currentList = null;
    }
  };

  for (let i = 0; i < rawTextLines.length; i++) {
    const lineObj = rawTextLines[i];
    const text = lineObj.text;

    // 1. Heading check
    const headingMatch = text.match(/^((?:\d+\.|\d+\))\s+([A-ZА-ЯЁ][^.]+))$/) ||
      (text.length < 80 && /^(Раздел|Секция|Глава|Section|Chapter|Часть|Протокол)\s+\d+/i.test(text));

    if (headingMatch) {
      flushList();
      blocks.push({
        type: 'heading',
        y: lineObj.y,
        level: 2,
        text
      });
      continue;
    }

    // 2.5 Key-Value parameter table check (e.g. "Типографика Поддержка...", "Верстка Выравнивание...", "Элементы Корректный...")
    const kvMatch = text.match(/^([A-ZА-ЯЁ][a-zа-яё0-9\-_]{2,20}|№|Параметр|Характеристика|Показатель)\s+([A-ZА-ЯЁ0-9].+)$/) ||
                    text.match(/^([^:–—\t]{2,25})\s*[:–—\t]\s*(.+)$/);

    if (kvMatch) {
      // Check if subsequent lines contain further key-value items within next 1-2 lines
      let hasSubsequentKv = false;
      for (let lookahead = 1; lookahead <= 3 && i + lookahead < rawTextLines.length; lookahead++) {
        const nextText = rawTextLines[i + lookahead].text;
        if (
          nextText.match(/^([A-ZА-ЯЁ][a-zа-яё0-9\-_]{2,20}|№|Параметр|Характеристика|Показатель)\s+([A-ZА-ЯЁ0-9].+)$/) ||
          nextText.match(/^([^:–—\t]{2,25})\s*[:–—\t]\s*(.+)$/)
        ) {
          hasSubsequentKv = true;
          break;
        }
      }

      if (hasSubsequentKv) {
        flushList();
        const kvRows: TableCellModel[][] = [];
        const matrix: (string | number)[][] = [];

        while (i < rawTextLines.length) {
          const curLine = rawTextLines[i];
          const m = curLine.text.match(/^([A-ZА-ЯЁ][a-zа-яё0-9\-_]{2,20}|№|Параметр|Характеристика|Показатель)\s+([A-ZА-ЯЁ0-9].+)$/) ||
                    curLine.text.match(/^([^:–—\t]{2,25})\s*[:–—\t]\s*(.+)$/);
          if (!m) break;

          const key = m[1].trim();
          let val = m[2].trim();

          // If next line is a continuation line (not a heading, not a new key-value parameter, not a list item)
          while (i + 1 < rawTextLines.length) {
            const nextLine = rawTextLines[i + 1];
            const isHeading = !!nextLine.text.match(/^(\d+\.|\d+\)|[-*•–])/) || !!nextLine.text.match(/^(Раздел|Секция|Глава|Section|Chapter|Часть|Протокол)\s+\d+/i);
            const isNextKv = !!nextLine.text.match(/^([A-ZА-ЯЁ][a-zа-яё0-9\-_]{2,20}|№|Параметр|Характеристика|Показатель)\s+([A-ZА-ЯЁ0-9].+)$/) ||
                             !!nextLine.text.match(/^([^:–—\t]{2,25})\s*[:–—\t]\s*(.+)$/);
            const gapY = curLine.y - nextLine.y;

            if (!isHeading && !isNextKv && gapY > 0 && gapY <= 24) {
              val += ' ' + nextLine.text.trim();
              i++;
            } else {
              break;
            }
          }

          kvRows.push([
            { text: key, rawValue: key, isHeader: false },
            { text: val, rawValue: isNaN(Number(val.replace(',', '.'))) ? val : Number(val.replace(',', '.')), isHeader: false }
          ]);
          matrix.push([key, val]);
          i++;
        }
        i--; // Adjust loop counter

        blocks.push({
          type: 'table',
          y: lineObj.y,
          headers: [],
          rows: kvRows,
          matrix
        });
        continue;
      }
    }

    // 3. Regular paragraph
    flushList();

    // Check if line wraps from previous regular paragraph
    let paraText = text;
    if (i + 1 < rawTextLines.length) {
      const next = rawTextLines[i + 1];
      const gapY = lineObj.y - next.y;
      // Close vertical distance and not a heading/list
      if (
        gapY <= 16 && gapY > 0 &&
        !next.text.match(/^(\d+\.|\d+\)|[-*•–])/) &&
        !next.text.match(/^(Раздел|Секция|Глава|Section|Chapter|Часть|Протокол)\s+\d+/i)
      ) {
        paraText += ' ' + next.text;
        i++;
      }
    }

    blocks.push({
      type: 'paragraph',
      y: lineObj.y,
      text: paraText
    });
  }

  flushList();
  return blocks;
}

// --- BUILD WHOLE DOCUMENT MODEL ---

export function buildStructuredDocument(pagesBlocks: DocumentBlock[][], title: string = 'Document'): StructuredDocument {
  const pages: DocumentPage[] = [];
  const allBlocks: DocumentBlock[] = [];
  let hasTables = false;
  let firstTableMatrix: (string | number)[][] | undefined;

  pagesBlocks.forEach((bList, idx) => {
    const pageNum = idx + 1;
    pages.push({
      pageNumber: pageNum,
      width: 595, // A4 approx
      height: 842,
      blocks: bList
    });

    if (idx > 0) {
      allBlocks.push({ type: 'page-break', pageNumber: pageNum, y: 0 });
    }

    for (const b of bList) {
      allBlocks.push(b);
      if (b.type === 'table') {
        hasTables = true;
        if (!firstTableMatrix) {
          firstTableMatrix = b.matrix;
        }
      }
    }
  });

  return {
    title,
    pages,
    allBlocks,
    hasTables,
    firstTableMatrix
  };
}

/**
 * Parses an HTML string into a StructuredDocument model.
 * Ignores <style>, <script>, <head>, etc., and extracts semantic headings, paragraphs, lists, and tables.
 */
export function parseHtmlToStructuredDocument(html: string, baseName: string = 'Document'): StructuredDocument {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const blocks: DocumentBlock[] = [];

  const processNode = (node: Element) => {
    const tag = node.tagName.toLowerCase();
    if (tag === 'style' || tag === 'script' || tag === 'noscript' || tag === 'head') {
      return;
    }

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
    } else if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6') {
      const text = (node.textContent || '').trim();
      if (text) {
        const level = tag === 'h1' ? 1 : tag === 'h2' ? 2 : 3;
        blocks.push({
          type: 'heading',
          y: blocks.length,
          level,
          text
        });
      }
    } else if (tag === 'ul' || tag === 'ol') {
      if (node.closest('table')) return;
      const listItems = Array.from(node.querySelectorAll(':scope > li'))
        .map(li => (li.textContent || '').trim())
        .filter(Boolean);
      if (listItems.length > 0) {
        blocks.push({
          type: 'list',
          y: blocks.length,
          ordered: tag === 'ol',
          items: listItems
        });
      }
    } else if (tag === 'p' || tag === 'li') {
      if (node.closest('table') || node.closest('ul') || node.closest('ol')) return;
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

  const root = doc.body || doc.documentElement;
  for (const child of Array.from(root.children)) {
    processNode(child);
  }

  return buildStructuredDocument([blocks], baseName);
}

/**
 * Accurately extracts and formats value from a SheetJS cell object.
 * Handles formulas (evaluates cached result), dates (converts serial numbers & Date objects),
 * percentages, currencies, booleans, and eliminates floating point precision artifacts.
 */
export function extractExcelCellValue(cell: XLSX.CellObject | any): { text: string; rawValue: string | number; isHeader?: boolean } {
  if (!cell || cell.v === undefined || cell.v === null) {
    return { text: '', rawValue: '' };
  }

  // 1. Error values (#N/A, #VALUE!, #REF!, etc.)
  if (cell.t === 'e') {
    const errStr = String(cell.w || cell.v || '#ERROR');
    return { text: errStr, rawValue: errStr };
  }

  // 2. Boolean values
  if (cell.t === 'b' || typeof cell.v === 'boolean') {
    const val = !!cell.v;
    return { text: val ? 'ИСТИНА' : 'ЛОЖЬ', rawValue: val ? 'TRUE' : 'FALSE' };
  }

  // 3. Date objects or date cells
  if (cell.t === 'd' || cell.v instanceof Date) {
    const d = cell.v instanceof Date ? cell.v : new Date(cell.v);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = d.getHours();
      const minutes = d.getMinutes();
      const seconds = d.getSeconds();

      let dateFormatted = `${day}.${month}.${year}`;
      if (hours !== 0 || minutes !== 0 || seconds !== 0) {
        const timePart = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}${seconds !== 0 ? ':' + String(seconds).padStart(2, '0') : ''}`;
        dateFormatted += ` ${timePart}`;
      }
      return { text: dateFormatted, rawValue: dateFormatted };
    }
  }

  // 4. Formatted text string (.w) produced by SheetJS formatter
  // If cell.w is available and not a raw formula string, prioritize it for presentation
  if (typeof cell.w === 'string' && cell.w.trim().length > 0) {
    const wText = cell.w.trim();
    // Verify it's not an unparsed formula tag like "=A1+B1"
    if (!wText.startsWith('=')) {
      // Check if it's a numeric rawValue
      const cleanNum = Number(wText.replace(/\s+/g, '').replace(',', '.'));
      const numVal = isNaN(cleanNum) ? (typeof cell.v === 'number' ? cell.v : wText) : cleanNum;
      return { text: wText, rawValue: numVal };
    }
  }

  // 5. Numeric values (including potential unformatted Excel serial dates)
  if (cell.t === 'n' || typeof cell.v === 'number') {
    const num = cell.v as number;

    // Check if number format specifies a date (e.g. format string contains d, m, y, гг, мм, дд)
    const numFmt = (cell.z || '').toLowerCase();
    const isDateFormat = numFmt.includes('yy') || numFmt.includes('dd') || numFmt.includes('гг') || numFmt.includes('дд') || (numFmt.includes('mm') && !numFmt.includes('0.00'));

    if (isDateFormat && num > 1000 && num < 100000) {
      // Convert Excel serial date number to JS Date
      // Excel base date is 1899-12-30 (due to Excel leap year bug in 1900)
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const jsDate = new Date(excelEpoch.getTime() + num * 86400000);
      if (!isNaN(jsDate.getTime())) {
        const day = String(jsDate.getUTCDate()).padStart(2, '0');
        const month = String(jsDate.getUTCMonth() + 1).padStart(2, '0');
        const year = jsDate.getUTCFullYear();
        const formatted = `${day}.${month}.${year}`;
        return { text: formatted, rawValue: formatted };
      }
    }

    // Eliminate IEEE 754 floating point precision noise (e.g. 19.999999999999996 -> 20)
    let cleanedNum = num;
    if (Number.isFinite(num)) {
      const rounded = Math.round(num * 1e9) / 1e9;
      if (Math.abs(num - rounded) < 1e-8) {
        cleanedNum = rounded;
      }
    }

    return { text: String(cleanedNum), rawValue: cleanedNum };
  }

  // 6. String / Text values
  const str = String(cell.v ?? '').trim();
  return { text: str, rawValue: str };
}

/**
 * Extracts sheet names list from an Excel Workbook buffer without full parsing.
 */
export function getXlsxSheetNames(arrayBuffer: ArrayBuffer): string[] {
  try {
    const workbook = XLSX.read(arrayBuffer, { type: 'array', bookSheets: true });
    return workbook.SheetNames || [];
  } catch {
    return [];
  }
}

/**
 * Parses an Excel Workbook (ArrayBuffer) into a StructuredDocument model with intact tabular matrices,
 * proper number/date formatting, and headers. Optionally filters by a single sheet.
 */
export function parseXlsxToStructuredDocument(arrayBuffer: ArrayBuffer, baseName: string = 'Таблица', targetSheetName?: string): StructuredDocument {
  const workbook = XLSX.read(arrayBuffer, {
    type: 'array',
    cellDates: true,
    cellNF: true,
    cellText: true,
    cellStyles: true,
    cellFormula: true,
  });

  const pagesBlocks: DocumentBlock[][] = [];
  const sheetsToProcess = targetSheetName && workbook.SheetNames.includes(targetSheetName)
    ? [targetSheetName]
    : workbook.SheetNames;

  for (const sheetName of sheetsToProcess) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet || !worksheet['!ref']) continue;

    const range = XLSX.utils.decode_range(worksheet['!ref']);
    const blocks: DocumentBlock[] = [];

    // Add sheet heading if multiple sheets exist and not single filtered
    if (sheetsToProcess.length > 1 || (!targetSheetName && workbook.SheetNames.length > 1)) {
      blocks.push({
        type: 'heading',
        y: blocks.length,
        level: 2,
        text: sheetName
      });
    }

    const tableRows: TableCellModel[][] = [];
    const matrix: (string | number)[][] = [];

    for (let r = range.s.r; r <= range.e.r; r++) {
      const rowCells: TableCellModel[] = [];
      const matrixRow: (string | number)[] = [];
      let hasRowContent = false;

      for (let c = range.s.c; c <= range.e.c; c++) {
        const cellAddress = XLSX.utils.encode_cell({ r, c });
        const cell = worksheet[cellAddress];
        const extracted = extractExcelCellValue(cell);

        if (extracted.text !== '') {
          hasRowContent = true;
        }

        rowCells.push({
          text: extracted.text,
          rawValue: extracted.rawValue,
          isHeader: r === range.s.r
        });
        matrixRow.push(extracted.text);
      }

      if (hasRowContent || tableRows.length > 0) {
        tableRows.push(rowCells);
        matrix.push(matrixRow);
      }
    }

    // Trim trailing empty rows
    while (tableRows.length > 0 && tableRows[tableRows.length - 1].every(cell => !cell.text)) {
      tableRows.pop();
      matrix.pop();
    }

    if (tableRows.length > 0) {
      const headers = matrix[0].map((val, idx) => String(val || `Колонка ${idx + 1}`));
      const dataRows = tableRows.slice(1);

      blocks.push({
        type: 'table',
        y: blocks.length,
        headers,
        rows: dataRows.length > 0 ? dataRows : tableRows,
        matrix
      });
    }

    if (blocks.length > 0) {
      pagesBlocks.push(blocks);
    }
  }

  if (pagesBlocks.length === 0) {
    pagesBlocks.push([{
      type: 'paragraph',
      y: 0,
      text: 'Таблица не содержит данных'
    }]);
  }

  return buildStructuredDocument(pagesBlocks, targetSheetName ? `${baseName} - ${targetSheetName}` : baseName);
}

/**
 * Converts an Excel workbook into clean, beautifully styled HTML table markup
 * preserving cell formatting, dates, calculated formulas, and merged headers.
 * Optionally filters to a single target sheet.
 */
export function convertXlsxToStyledHtml(arrayBuffer: ArrayBuffer, baseName: string, targetSheetName?: string): string {
  const workbook = XLSX.read(arrayBuffer, {
    type: 'array',
    cellDates: true,
    cellNF: true,
    cellText: true,
    cellStyles: true,
    cellFormula: true,
  });

  const sheetsToProcess = targetSheetName && workbook.SheetNames.includes(targetSheetName)
    ? [targetSheetName]
    : workbook.SheetNames;

  const docTitle = targetSheetName ? `${baseName} - ${targetSheetName}` : baseName;

  let html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(docTitle)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 24px; background: #ffffff; color: #0f172a; line-height: 1.5; }
    h1 { font-size: 20px; font-weight: 700; margin-bottom: 16px; color: #0f172a; }
    h2 { font-size: 16px; font-weight: 600; margin-top: 24px; margin-bottom: 12px; color: #334155; }
    .excel-table-wrap { overflow-x: auto; margin-bottom: 28px; }
    table.excel-table { border-collapse: collapse; width: 100%; font-size: 13px; background: #ffffff; border: 1px solid #cbd5e1; }
    table.excel-table th, table.excel-table td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; vertical-align: top; }
    table.excel-table th { background: #f1f5f9; font-weight: 600; color: #0f172a; text-align: center; }
    table.excel-table tr:nth-child(even) td { background: #f8fafc; }
    table.excel-table td.num { text-align: right; font-variant-numeric: tabular-nums; }
    table.excel-table td.center { text-align: center; }
  </style>
</head>
<body>
  <h1>${escapeHtml(docTitle)}</h1>\n`;

  for (const sheetName of sheetsToProcess) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet || !worksheet['!ref']) continue;

    if (sheetsToProcess.length > 1) {
      html += `  <h2>${escapeHtml(sheetName)}</h2>\n`;
    }

    const range = XLSX.utils.decode_range(worksheet['!ref']);
    html += `  <div class="excel-table-wrap">\n    <table class="excel-table">\n`;

    for (let r = range.s.r; r <= range.e.r; r++) {
      const isHeader = r === range.s.r;
      const tag = isHeader ? 'th' : 'td';
      let rowHtml = `      <tr>\n`;
      let hasRowContent = false;

      for (let c = range.s.c; c <= range.e.c; c++) {
        const cellAddress = XLSX.utils.encode_cell({ r, c });
        const cell = worksheet[cellAddress];
        const extracted = extractExcelCellValue(cell);

        if (extracted.text !== '') {
          hasRowContent = true;
        }

        const isNumeric = typeof extracted.rawValue === 'number';
        const cellClass = isNumeric ? ' class="num"' : (!isHeader && (extracted.text.length <= 4 || /^\d+\.?$/.test(extracted.text)) ? ' class="center"' : '');

        rowHtml += `        <${tag}${cellClass}>${escapeHtml(extracted.text)}</${tag}>\n`;
      }
      rowHtml += `      </tr>\n`;

      if (hasRowContent || isHeader) {
        html += rowHtml;
      }
    }

    html += `    </table>\n  </div>\n`;
  }

  html += `</body>\n</html>`;
  return html;
}

// --- EXPORTERS ---

/**
 * 1. Export to XLSX
 * Writes clean 2D array of cells (A1:G7) with genuine numbers, styled headers, and separate rows to Excel.
 */
export function exportToXlsxBuffer(doc: StructuredDocument): Uint8Array {
  const wb = XLSX.utils.book_new();

  // Construct unified 2D array of all content in document (headers, paragraphs, tables)
  const aoa: any[][] = [];

  for (const b of doc.allBlocks) {
    if (b.type === 'heading') {
      aoa.push([b.text]);
    } else if (b.type === 'paragraph') {
      // If paragraph contains tab characters or semicolons, split across columns
      if (b.text.includes('\t')) {
        aoa.push(b.text.split('\t').map(c => c.trim()));
      } else if (b.text.includes(' | ')) {
        aoa.push(b.text.split(' | ').map(c => c.trim()));
      } else {
        aoa.push([b.text]);
      }
    } else if (b.type === 'list') {
      for (const it of b.items) {
        aoa.push([`• ${it}`]);
      }
    } else if (b.type === 'table') {
      if (b.headers && b.headers.length > 0) {
        aoa.push(b.headers);
      }
      for (const r of b.rows) {
        aoa.push(r.map(c => (c.rawValue !== undefined ? c.rawValue : c.text)));
      }
    }
  }

  // If no blocks, fallback to title
  if (aoa.length === 0) {
    aoa.push([doc.title]);
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Calculate dynamic column widths
  let maxCols = 1;
  aoa.forEach(r => {
    if (r && r.length > maxCols) maxCols = r.length;
  });

  const colWidths = [];
  for (let c = 0; c < maxCols; c++) {
    let maxLen = 8;
    aoa.forEach(row => {
      const val = row && row[c] !== undefined && row[c] !== null ? String(row[c]) : '';
      if (val.length > maxLen) {
        maxLen = val.length;
      }
    });
    // For single-column paragraphs, don't blow up column A excessively
    if (c === 0 && maxCols > 1) {
      colWidths.push({ wch: Math.min(Math.max(maxLen + 2, 8), 40) });
    } else {
      colWidths.push({ wch: Math.min(Math.max(maxLen + 2, 12), 50) });
    }
  }
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, 'Протокол');

  const outBuf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Uint8Array(outBuf);
}

/**
 * 2. Export to CSV
 * Exports pure matrix data or text lines as formatted CSV.
 */
export function exportToCsvString(doc: StructuredDocument): string {
  const rows: string[][] = [];

  for (const b of doc.allBlocks) {
    if (b.type === 'heading' || b.type === 'paragraph') {
      if (b.text.includes('\t')) {
        rows.push(b.text.split('\t').map(c => c.trim()));
      } else if (b.text.includes(' | ')) {
        rows.push(b.text.split(' | ').map(c => c.trim()));
      } else {
        rows.push([b.text]);
      }
    } else if (b.type === 'list') {
      for (const it of b.items) {
        rows.push([`• ${it}`]);
      }
    } else if (b.type === 'table') {
      if (b.headers && b.headers.length > 0) {
        rows.push(b.headers);
      }
      for (const r of b.rows) {
        rows.push(r.map(c => c.text));
      }
    }
  }

  if (rows.length === 0 && doc.firstTableMatrix && doc.firstTableMatrix.length > 0) {
    return doc.firstTableMatrix
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
  }

  return rows
    .map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

/**
 * 3. Export to HTML
 * Generates semantic, clean HTML with <h1>, <h2>, <ul><li>, <table class="pdf-table"> and proper typography.
 */
export function exportToHtmlString(doc: StructuredDocument): string {
  let bodyContent = `<h1>${escapeHtml(doc.title)}</h1>\n`;

  for (const b of doc.allBlocks) {
    if (b.type === 'heading') {
      const tag = b.level === 1 ? 'h1' : b.level === 2 ? 'h2' : 'h3';
      bodyContent += `<${tag}>${escapeHtml(b.text)}</${tag}>\n`;
    } else if (b.type === 'paragraph') {
      if (b.isBold) {
        bodyContent += `<p><strong>${escapeHtml(b.text)}</strong></p>\n`;
      } else {
        bodyContent += `<p>${escapeHtml(b.text)}</p>\n`;
      }
    } else if (b.type === 'list') {
      const tag = b.ordered ? 'ol' : 'ul';
      bodyContent += `<${tag}>\n`;
      for (const it of b.items) {
        bodyContent += `  <li>${escapeHtml(it)}</li>\n`;
      }
      bodyContent += `</${tag}>\n`;
    } else if (b.type === 'table') {
      bodyContent += `<table class="pdf-table">\n`;
      if (b.headers && b.headers.length > 0) {
        bodyContent += `  <thead>\n    <tr>\n`;
        for (const h of b.headers) {
          bodyContent += `      <th>${escapeHtml(h)}</th>\n`;
        }
        bodyContent += `    </tr>\n  </thead>\n`;
      }
      bodyContent += `  <tbody>\n`;
      for (const row of b.rows) {
        bodyContent += `    <tr>\n`;
        for (const cell of row) {
          bodyContent += `      <td>${escapeHtml(cell.text)}</td>\n`;
        }
        bodyContent += `    </tr>\n`;
      }
      bodyContent += `  </tbody>\n</table>\n`;
    } else if (b.type === 'page-break') {
      bodyContent += `<hr class="page-break" />\n`;
    }
  }

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(doc.title)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 32px; line-height: 1.6; max-width: 900px; margin: 0 auto; color: #1e293b; background: #ffffff; }
    h1 { font-size: 24px; font-weight: 700; color: #0f172a; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
    h2 { font-size: 18px; font-weight: 600; color: #1e293b; margin-top: 28px; margin-bottom: 12px; }
    h3 { font-size: 16px; font-weight: 600; color: #334155; margin-top: 20px; margin-bottom: 8px; }
    p { margin: 10px 0; }
    ul, ol { margin: 8px 0 16px 24px; padding: 0; }
    li { margin-bottom: 4px; }
    table.pdf-table { border-collapse: collapse; width: 100%; margin: 20px 0; background: #ffffff; border: 1px solid #cbd5e1; font-size: 14px; }
    table.pdf-table th, table.pdf-table td { border: 1px solid #cbd5e1; padding: 10px 14px; text-align: left; }
    table.pdf-table th { background: #f8fafc; font-weight: 600; color: #0f172a; }
    table.pdf-table tr:nth-child(even) td { background: #f8fafc; }
    hr.page-break { margin: 40px 0; border: none; border-top: 1px dashed #cbd5e1; }
  </style>
</head>
<body>
  ${bodyContent}
</body>
</html>`;
}

/**
 * 3.5 Export to XML
 * Generates valid structured XML document containing headings, paragraphs, lists, and tables with rows/cells.
 */
export function exportToXmlString(doc: StructuredDocument): string {
  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push(`<document name="${escapeHtml(doc.title)}">`);

  let sectionId = 1;
  let sectionOpen = false;

  for (const b of doc.allBlocks) {
    if (b.type === 'heading') {
      if (sectionOpen) {
        lines.push('  </section>');
      }
      lines.push(`  <section id="${sectionId++}" title="${escapeHtml(b.text)}">`);
      sectionOpen = true;
    } else {
      if (!sectionOpen) {
        lines.push(`  <section id="${sectionId++}" title="General">`);
        sectionOpen = true;
      }

      if (b.type === 'paragraph') {
        lines.push(`    <paragraph>${escapeHtml(b.text)}</paragraph>`);
      } else if (b.type === 'list') {
        lines.push(`    <list ordered="${b.ordered ? 'true' : 'false'}">`);
        for (const it of b.items) {
          lines.push(`      <item>${escapeHtml(it)}</item>`);
        }
        lines.push(`    </list>`);
      } else if (b.type === 'table') {
        lines.push(`    <table columns="${b.headers.length || (b.rows[0] ? b.rows[0].length : 0)}">`);
        if (b.headers && b.headers.length > 0) {
          lines.push('      <row type="header">');
          for (const h of b.headers) {
            lines.push(`        <cell>${escapeHtml(h)}</cell>`);
          }
          lines.push('      </row>');
        }
        for (const row of b.rows) {
          lines.push('      <row>');
          for (const cell of row) {
            lines.push(`        <cell>${escapeHtml(cell.text)}</cell>`);
          }
          lines.push('      </row>');
        }
        lines.push('    </table>');
      }
    }
  }

  if (sectionOpen) {
    lines.push('  </section>');
  }

  lines.push('</document>');
  return lines.join('\n');
}

/**
 * 4. Export to TXT
 * Produces clean, readable plain text with preserved Cyrillic/Latin glyphs, math formulas, lists, and aligned tables.
 */
export function exportToTxtString(doc: StructuredDocument): string {
  const lines: string[] = [];

  for (const b of doc.allBlocks) {
    if (b.type === 'heading') {
      if (lines.length > 0) lines.push('');
      lines.push(b.text);
    } else if (b.type === 'paragraph') {
      lines.push(b.text);
    } else if (b.type === 'list') {
      for (const it of b.items) {
        lines.push(`• ${it}`);
      }
    } else if (b.type === 'table') {
      if (lines.length > 0) lines.push('');
      lines.push(b.headers.join('\t'));
      for (const r of b.matrix.slice(1)) {
        lines.push(r.join('\t'));
      }
      lines.push('');
    } else if (b.type === 'page-break') {
      lines.push('');
      lines.push(`--- Page ${b.pageNumber} ---`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * 5. Export to DOCX
 * Generates genuine Microsoft Word document with Paragraphs, Headings, Bullet Lists, and true Table with borders.
 */
export async function exportToDocxBuffer(doc: StructuredDocument): Promise<Uint8Array> {
  const children: any[] = [];

  // Only add document title as explicit title if document has no heading or blocks
  const hasHeadings = doc.allBlocks.some(b => b.type === 'heading');
  const hasSubstantialBlocks = doc.allBlocks.length > 0;
  if (!hasHeadings && !hasSubstantialBlocks && doc.title) {
    children.push(
      new Paragraph({
        text: doc.title,
        heading: HeadingLevel.TITLE,
        spacing: { after: 300 }
      })
    );
  }

  for (const b of doc.allBlocks) {
    if (b.type === 'heading') {
      children.push(
        new Paragraph({
          text: b.text,
          heading: b.level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 120 }
        })
      );
    } else if (b.type === 'paragraph') {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: b.text,
              bold: b.isBold || false
            })
          ],
          spacing: { after: 120 }
        })
      );
    } else if (b.type === 'list') {
      for (const it of b.items) {
        children.push(
          new Paragraph({
            text: `• ${it}`,
            bullet: { level: 0 },
            spacing: { after: 60 }
          })
        );
      }
    } else if (b.type === 'table') {
      const tableRows: TableRow[] = [];

      // Header Row
      if (b.headers && b.headers.length > 0) {
        tableRows.push(
          new TableRow({
            tableHeader: true,
            children: b.headers.map(h => new TableCell({
              children: (h || '').split('\n').map((line, lIdx, arr) => new Paragraph({
                children: [new TextRun({ text: line, bold: true, size: 20, font: 'Calibri' })],
                spacing: { before: 40, after: lIdx === arr.length - 1 ? 40 : 20 }
              })),
              shading: { fill: 'F1F5F9' }
            }))
          })
        );
      }

      // Data Rows
      for (const r of b.rows) {
        tableRows.push(
          new TableRow({
            children: r.map((c, cIdx) => new TableCell({
              width: r.length === 2 ? { size: cIdx === 0 ? 25 : 75, type: WidthType.PERCENTAGE } : undefined,
              children: (c.text || '').split('\n').map((line, lIdx, arr) => new Paragraph({
                children: [new TextRun({
                  text: line,
                  bold: (r.length === 2 && cIdx === 0) || c.isHeader || false,
                  size: 20,
                  font: 'Calibri'
                })],
                spacing: { before: 20, after: lIdx === arr.length - 1 ? 20 : 10 }
              }))
            }))
          })
        );
      }

      children.push(
        new Table({
          rows: tableRows,
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
      children.push(new Paragraph({ text: '', spacing: { after: 180 } }));
    }
  }

  const wordDoc = new Document({
    sections: [
      {
        properties: {},
        children
      }
    ]
  });

  const { Packer } = await import('docx');
  const blob = await Packer.toBlob(wordDoc);
  const buffer = await blob.arrayBuffer();
  return new Uint8Array(buffer);
}

function escapeHtml(str: string): string {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
