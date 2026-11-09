import { inflateSync, inflateRawSync } from 'node:zlib';
import { IContentExtractor, ExtractTextInput } from '../../domain/ports/IContentExtractor.js';

function decodePdfString(raw: string): string {
  return raw
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\');
}

const PDF_METADATA_KEYS = /\/(Author|Creator|Producer|CreationDate|ModDate|Title|Subject|Keywords)\s*\(/i;
const MAX_PDF_LITERAL_LENGTH = 4096;
const MAX_PDF_ARRAY_LENGTH = 16384;
const MAX_PDF_RAW_SCAN_BYTES = 2 * 1024 * 1024;
const MAX_PDF_STREAMS = 150;
const MAX_PDF_STREAM_COMPRESSED_BYTES = 256 * 1024;
const MAX_PDF_STREAM_INFLATED_BYTES = 512 * 1024;
const MAX_PDF_TOTAL_INFLATED_BYTES = 4 * 1024 * 1024;

function isAsciiWhitespace(code: number): boolean {
  return code === 0x20 || code === 0x09 || code === 0x0a || code === 0x0d || code === 0x0c || code === 0x00;
}

function skipAsciiWhitespace(src: string, index: number, end: number = src.length): number {
  let cursor = index;
  while (cursor < end && isAsciiWhitespace(src.charCodeAt(cursor))) {
    cursor++;
  }
  return cursor;
}

function extractParenthesizedLiteralsLinear(src: string, startIndex = 0, endIndex = src.length): string[] {
  const literals: string[] = [];
  let i = startIndex;

  while (i < endIndex) {
    if (src.charCodeAt(i) !== 0x28 /* '(' */) {
      i++;
      continue;
    }

    let parenStart = i;
    let cursor = i + 1;
    let closedAt = -1;

    while (cursor < endIndex && cursor - parenStart <= MAX_PDF_LITERAL_LENGTH) {
      const ch = src.charCodeAt(cursor);
      if (ch === 0x5c /* '\\' */) {
        cursor += 2;
        continue;
      }
      if (ch === 0x28 /* '(' */) {
        parenStart = cursor;
        cursor++;
        continue;
      }
      if (ch === 0x29 /* ')' */) {
        closedAt = cursor;
        break;
      }
      cursor++;
    }

    if (closedAt === -1) {
      i = cursor + 1;
      continue;
    }

    if (closedAt > parenStart + 1) {
      literals.push(decodePdfString(src.slice(parenStart + 1, closedAt)));
    }
    i = closedAt + 1;
  }

  return literals;
}

function isPdfMetadataChunk(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 3) return true;
  if (/^D:\d{8}/.test(trimmed)) return true;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(trimmed)) return true;
  if (PDF_METADATA_KEYS.test(trimmed)) return true;
  return false;
}

function extractPdfLiteralStrings(src: string, operator: 'Tj' | 'TJ'): string[] {
  const chunks: string[] = [];
  const len = src.length;

  if (operator === 'Tj') {
    let i = 0;
    while (i < len) {
      if (src.charCodeAt(i) !== 0x28 /* '(' */) {
        i++;
        continue;
      }

      let parenStart = i;
      let cursor = i + 1;
      let closedAt = -1;

      while (cursor < len && cursor - parenStart <= MAX_PDF_LITERAL_LENGTH) {
        const ch = src.charCodeAt(cursor);
        if (ch === 0x5c /* '\\' */) {
          cursor += 2;
          continue;
        }
        if (ch === 0x28 /* '(' */) {
          parenStart = cursor;
          cursor++;
          continue;
        }
        if (ch === 0x29 /* ')' */) {
          closedAt = cursor;
          break;
        }
        cursor++;
      }

      if (closedAt === -1) {
        i = cursor + 1;
        continue;
      }

      const opPos = skipAsciiWhitespace(src, closedAt + 1, len);
      if (
        opPos + 1 < len &&
        src.charCodeAt(opPos) === 0x54 /* 'T' */ &&
        src.charCodeAt(opPos + 1) === 0x6a /* 'j' */
      ) {
        const rawLen = closedAt - (parenStart + 1);
        if (rawLen >= 2) {
          chunks.push(decodePdfString(src.slice(parenStart + 1, closedAt)));
        }
        i = opPos + 2;
      } else {
        i = closedAt + 1;
      }
    }
    return chunks;
  }

  let i = 0;
  while (i < len) {
    if (src.charCodeAt(i) !== 0x5b /* '[' */) {
      i++;
      continue;
    }

    let bracketStart = i;
    let cursor = i + 1;
    let closedAt = -1;
    let inParens = false;

    while (cursor < len && cursor - bracketStart <= MAX_PDF_ARRAY_LENGTH) {
      const ch = src.charCodeAt(cursor);
      if (ch === 0x5c /* '\\' */) {
        cursor += 2;
        continue;
      }
      if (inParens) {
        if (ch === 0x29 /* ')' */) {
          inParens = false;
        }
        cursor++;
        continue;
      }
      if (ch === 0x28 /* '(' */) {
        inParens = true;
        cursor++;
        continue;
      }
      if (ch === 0x5b /* '[' */) {
        bracketStart = cursor;
        cursor++;
        continue;
      }
      if (ch === 0x5d /* ']' */) {
        closedAt = cursor;
        break;
      }
      cursor++;
    }

    if (closedAt === -1) {
      i = cursor + 1;
      continue;
    }

    const opPos = skipAsciiWhitespace(src, closedAt + 1, len);
    if (
      opPos + 1 < len &&
      src.charCodeAt(opPos) === 0x54 /* 'T' */ &&
      src.charCodeAt(opPos + 1) === 0x4a /* 'J' */
    ) {
      const literals = extractParenthesizedLiteralsLinear(src, bracketStart + 1, closedAt);
      chunks.push(...literals);
      i = opPos + 2;
    } else {
      i = closedAt + 1;
    }
  }

  return chunks;
}

function extractTextFromPdfStreams(buffer: Buffer): string[] {
  const chunks: string[] = [];
  const streamHeader = Buffer.from('stream');
  const endStreamHeader = Buffer.from('endstream');
  const scanLimit = Math.min(buffer.length, MAX_PDF_RAW_SCAN_BYTES * 4);

  let pos = 0;
  let streamsInspected = 0;
  let totalInflatedBytes = 0;

  while (
    pos < scanLimit &&
    streamsInspected < MAX_PDF_STREAMS &&
    totalInflatedBytes < MAX_PDF_TOTAL_INFLATED_BYTES
  ) {
    const streamIdx = buffer.indexOf(streamHeader, pos);
    if (streamIdx === -1 || streamIdx >= scanLimit) break;

    let start = streamIdx + streamHeader.length;
    if (buffer[start] === 0x0d) start++;
    if (buffer[start] === 0x0a) start++;

    const endIdx = buffer.indexOf(endStreamHeader, start);
    if (endIdx === -1) break;

    streamsInspected++;

    let end = endIdx;
    if (end > start && (buffer[end - 1] === 0x0a || buffer[end - 1] === 0x0d)) end--;
    if (end > start && (buffer[end - 1] === 0x0a || buffer[end - 1] === 0x0d)) end--;

    const streamLength = end - start;
    if (streamLength > 0 && streamLength <= MAX_PDF_STREAM_COMPRESSED_BYTES) {
      const streamBytes = buffer.subarray(start, end);
      let inflated: Buffer | null = null;
      try {
        inflated = inflateSync(streamBytes, { maxOutputLength: MAX_PDF_STREAM_INFLATED_BYTES });
      } catch {
        try {
          inflated = inflateRawSync(streamBytes, { maxOutputLength: MAX_PDF_STREAM_INFLATED_BYTES });
        } catch {
          inflated = null;
        }
      }

      if (inflated) {
        totalInflatedBytes += inflated.length;
        const text = inflated.toString('latin1');
        const tj = extractPdfLiteralStrings(text, 'Tj');
        const TJ = extractPdfLiteralStrings(text, 'TJ');
        chunks.push(...tj, ...TJ);
      }
    }

    pos = endIdx + endStreamHeader.length;
  }

  return chunks;
}

export function extractTextFromPdfBuffer(buffer: Buffer): string {
  const maxBytes = Math.min(buffer.length, MAX_PDF_RAW_SCAN_BYTES);
  const src = buffer.subarray(0, maxBytes).toString('latin1');
  let chunks = [
    ...extractPdfLiteralStrings(src, 'Tj'),
    ...extractPdfLiteralStrings(src, 'TJ'),
  ];

  if (chunks.length === 0) {
    chunks = extractTextFromPdfStreams(buffer);
  }

  const filtered = chunks.filter((chunk) => !isPdfMetadataChunk(chunk));
  return filtered.join(' ').replace(/\s+/g, ' ').trim();
}

export function readZipLocalEntries(buffer: Buffer): Array<{ name: string; data: Buffer }> {
  const entries: Array<{ name: string; data: Buffer }> = [];
  let offset = 0;

  while (offset + 30 <= buffer.length) {
    if (buffer.readUInt32LE(offset) !== 0x04034b50) {
      break;
    }
    const method = buffer.readUInt16LE(offset + 8);
    const flags = buffer.readUInt16LE(offset + 6);
    const compSize = buffer.readUInt32LE(offset + 18);
    const nameLen = buffer.readUInt16LE(offset + 26);
    const extraLen = buffer.readUInt16LE(offset + 28);
    const name = buffer.subarray(offset + 30, offset + 30 + nameLen).toString('utf8');
    const dataStart = offset + 30 + nameLen + extraLen;

    if ((flags & 0x8) !== 0 || dataStart + compSize > buffer.length) {
      break;
    }

    const compressed = buffer.subarray(dataStart, dataStart + compSize);
    let data = compressed;
    if (method === 8) {
      data = inflateRawSync(compressed);
    } else if (method !== 0) {
      offset = dataStart + compSize;
      continue;
    }

    entries.push({ name, data });
    offset = dataStart + compSize;
  }

  return entries;
}

export function extractTextFromDocxBuffer(buffer: Buffer): string {
  const entries = readZipLocalEntries(buffer);
  const texts: string[] = [];

  for (const entry of entries) {
    if (!/^word\/document\.xml$/i.test(entry.name)) continue;
    const xml = entry.data.toString('utf8');
    const runs = [...xml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]);
    texts.push(...runs);
  }

  return texts.join(' ').replace(/\s+/g, ' ').trim();
}

export function extractTextFromPptxBuffer(buffer: Buffer): string {
  const entries = readZipLocalEntries(buffer);
  const slideTexts: string[] = [];

  for (const entry of entries) {
    if (!/ppt\/slides\/slide\d+\.xml$/i.test(entry.name)) {
      continue;
    }
    const xml = entry.data.toString('utf8');
    const texts = [...xml.matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g)].map((m) => m[1]);
    slideTexts.push(...texts);
  }

  return slideTexts.join(' ').replace(/\s+/g, ' ').trim();
}

export class DocumentTextExtractor implements IContentExtractor {
  public async extractText(input: ExtractTextInput): Promise<string> {
    if (input.textContent && input.textContent.trim().length > 10) {
      return input.textContent.trim();
    }

    if (!input.fileBase64) {
      return '';
    }

    const buffer = Buffer.from(input.fileBase64, 'base64');
    const mime = (input.mimeType || '').toLowerCase();
    const name = (input.fileName || '').toLowerCase();

    if (mime.includes('text') || name.endsWith('.txt') || name.endsWith('.md')) {
      return buffer.toString('utf8').trim();
    }

    if (mime.includes('pdf') || name.endsWith('.pdf')) {
      return extractTextFromPdfBuffer(buffer);
    }

    if (
      mime.includes('wordprocessingml') ||
      mime.includes('msword') ||
      name.endsWith('.docx') ||
      name.endsWith('.doc')
    ) {
      return extractTextFromDocxBuffer(buffer);
    }

    if (mime.includes('presentation') || name.endsWith('.pptx') || name.endsWith('.ppt')) {
      return extractTextFromPptxBuffer(buffer);
    }

    return buffer.toString('utf8').trim();
  }
}
