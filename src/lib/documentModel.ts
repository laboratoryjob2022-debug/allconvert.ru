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

export interface RawPdfItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontName?: string;
  fontSize?: number;
}

// --- PARSER: PDF Raw Items -> Structured Document Model ---

export function parsePdfPageToBlocks(items: RawPdfItem[], pageNum: number, pageWidth: number, pageHeight: number): DocumentBlock[] {
  if (!items || items.length === 0) return [];

  // Filter out empty items
  const cleanItems = items.filter(it => it.str && (it.str.trim() !== '' || it.str.includes(' ')));
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

  // Detect multi-column lines (lines having >= 2 distinct items separated by >= 15pt horizontal gap)
  const multiColLines = lineMap.filter(l => {
    if (l.items.length < 2) return false;
    let gaps = 0;
    for (let i = 0; i < l.items.length - 1; i++) {
      const rightX = l.items[i].x + (l.items[i].width || 10);
      if (l.items[i + 1].x - rightX >= 15) {
        gaps++;
      }
    }
    return gaps >= 1;
  });

  const blocks: DocumentBlock[] = [];

  if (multiColLines.length >= 2) {
    // We have a table zone on this page
    const topY = multiColLines[0].y + 8;
    const bottomY = multiColLines[multiColLines.length - 1].y - 20;

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

  // 1. Discover dynamic column boundaries by clustering X coordinates
  const xStarts = tableItems.map(it => it.x).sort((a, b) => a - b);
  const colCenters: { x: number; count: number }[] = [];

  for (const x of xStarts) {
    const cluster = colCenters.find(c => Math.abs(c.x - x) <= 24);
    if (!cluster) {
      colCenters.push({ x, count: 1 });
    } else {
      cluster.x = (cluster.x * cluster.count + x) / (cluster.count + 1);
      cluster.count++;
    }
  }
  colCenters.sort((a, b) => a.x - b.x);

  if (colCenters.length === 0) return null;

  // 2. Group table items into logical row bands (vertical tolerance 16pt)
  const rowBands: { anchorY: number; items: RawPdfItem[] }[] = [];
  for (const it of tableItems) {
    let matchedBand = rowBands.find(rb => Math.abs(rb.anchorY - it.y) <= 16);
    if (!matchedBand) {
      matchedBand = { anchorY: it.y, items: [it] };
      rowBands.push(matchedBand);
    } else {
      matchedBand.items.push(it);
    }
  }

  // Sort rows top-to-bottom
  rowBands.sort((a, b) => b.anchorY - a.anchorY);

  // 3. Build matrix & cell models
  const matrix: (string | number)[][] = [];
  const rows: TableCellModel[][] = [];

  for (let rIdx = 0; rIdx < rowBands.length; rIdx++) {
    const rb = rowBands[rIdx];
    rb.items.sort((a, b) => {
      const colA = getClosestColumnIndex(a.x, colCenters);
      const colB = getClosestColumnIndex(b.x, colCenters);
      if (colA !== colB) return colA - colB;
      if (Math.abs(b.y - a.y) > 3) return b.y - a.y;
      return a.x - b.x;
    });

    const colStrings: string[] = new Array(colCenters.length).fill('');

    for (const it of rb.items) {
      const colIdx = getClosestColumnIndex(it.x, colCenters);
      const prev = colStrings[colIdx];
      colStrings[colIdx] = prev ? prev + ' ' + it.str.trim() : it.str.trim();
    }

    const rowCells: TableCellModel[] = [];
    const matrixRow: (string | number)[] = [];

    for (let c = 0; c < colCenters.length; c++) {
      const rawStr = (colStrings[c] || '').trim();
      let parsedVal: string | number = rawStr;

      // Numerical parsing if purely numeric (excluding row 0 headers)
      if (rIdx > 0 && /^-?\d+(?:\.\d+)?$/.test(rawStr.replace(/\s+/g, ''))) {
        const num = parseFloat(rawStr.replace(/\s+/g, ''));
        if (!isNaN(num)) parsedVal = num;
      }

      matrixRow.push(parsedVal);
      rowCells.push({
        text: rawStr,
        rawValue: parsedVal,
        isHeader: rIdx === 0,
      });
    }

    matrix.push(matrixRow);
    if (rIdx > 0) {
      rows.push(rowCells);
    }
  }

  const topY = tableItems.reduce((max, it) => Math.max(max, it.y), 0);
  const headerTexts = matrix.length > 0 ? matrix[0].map(v => String(v ?? '')) : [];

  return {
    type: 'table',
    y: topY,
    headers: headerTexts,
    rows: rows.length > 0 ? rows : [matrix[0]?.map(v => ({ text: String(v), rawValue: v, isHeader: true })) || []],
    matrix,
  };
}

function getClosestColumnIndex(x: number, colCenters: { x: number }[]): number {
  let bestIdx = 0;
  let minDiff = Infinity;
  for (let i = 0; i < colCenters.length; i++) {
    const diff = Math.abs(colCenters[i].x - x);
    if (diff < minDiff) {
      minDiff = diff;
      bestIdx = i;
    }
  }
  return bestIdx;
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

    // 2. Bullet or numbered list item
    const bulletMatch = text.match(/^([-*•–]|(?:\d+\.\d+|\w\)))\s*(.+)$/);
    if (bulletMatch) {
      const itemText = bulletMatch[2].trim();
      if (!currentList) {
        currentList = { y: lineObj.y, ordered: false, items: [] };
      }
      currentList.items.push(itemText);
      continue;
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

// --- EXPORTERS ---

/**
 * 1. Export to XLSX
 * Writes clean 2D array of cells (A1:G7) with genuine numbers and strings to Excel.
 */
export function exportToXlsxBuffer(doc: StructuredDocument): Uint8Array {
  const wb = XLSX.utils.book_new();

  if (doc.firstTableMatrix && doc.firstTableMatrix.length > 0) {
    // Generate clean Sheet with table grid
    const ws = XLSX.utils.aoa_to_sheet(doc.firstTableMatrix);

    // Auto-fit column widths
    const colWidths = doc.firstTableMatrix[0].map((_, colIdx) => {
      let maxLen = 10;
      for (const row of doc.firstTableMatrix!) {
        const val = row[colIdx];
        if (val !== undefined && val !== null) {
          maxLen = Math.max(maxLen, String(val).length);
        }
      }
      return { wch: maxLen + 3 };
    });
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'TableData');
  } else {
    // Fallback: Lines as Rows
    const rows = doc.allBlocks.map(b => {
      if (b.type === 'paragraph') return [b.text];
      if (b.type === 'heading') return [b.text];
      return [''];
    });
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  }

  const outBuf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Uint8Array(outBuf);
}

/**
 * 2. Export to CSV
 * Exports pure matrix data or text lines as formatted CSV.
 */
export function exportToCsvString(doc: StructuredDocument): string {
  if (doc.firstTableMatrix && doc.firstTableMatrix.length > 0) {
    return doc.firstTableMatrix
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
  }

  const lines: string[] = [];
  for (const b of doc.allBlocks) {
    if (b.type === 'heading' || b.type === 'paragraph') {
      lines.push(`"${b.text.replace(/"/g, '""')}"`);
    } else if (b.type === 'list') {
      b.items.forEach(it => lines.push(`"• ${it.replace(/"/g, '""')}"`));
    }
  }
  return lines.join('\n');
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
  const docSections: any[] = [];
  const children: any[] = [];

  // Title
  children.push(
    new Paragraph({
      text: doc.title,
      heading: HeadingLevel.TITLE,
      spacing: { after: 300 }
    })
  );

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
              children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })],
              shading: { fill: 'F1F5F9' }
            }))
          })
        );
      }

      // Data Rows
      for (const r of b.rows) {
        tableRows.push(
          new TableRow({
            children: r.map(c => new TableCell({
              children: [new Paragraph({ text: c.text })]
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
  const buffer = await Packer.toBuffer(wordDoc);
  return new Uint8Array(buffer);
}

function escapeHtml(str: string): string {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
