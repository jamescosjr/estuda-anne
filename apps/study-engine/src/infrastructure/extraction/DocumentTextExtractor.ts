import { inflateRawSync } from 'node:zlib';
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
  if (operator === 'Tj') {
    for (const match of src.matchAll(/\((?:\\.|[^\\)]){2,}\)\s*Tj/g)) {
      const inner = match[0].replace(/\s*Tj$/, '').slice(1, -1);
      chunks.push(decodePdfString(inner));
    }
    return chunks;
  }

  for (const match of src.matchAll(/\[((?:\\.|[^\]])*)\]\s*TJ/g)) {
    const arrayBody = match[1];
    for (const str of arrayBody.matchAll(/\((?:\\.|[^\\)])+\)/g)) {
      chunks.push(decodePdfString(str[0].slice(1, -1)));
    }
  }
  return chunks;
}

export function extractTextFromPdfBuffer(buffer: Buffer): string {
  const maxBytes = Math.min(buffer.length, 8 * 1024 * 1024);
  const src = buffer.subarray(0, maxBytes).toString('latin1');
  const chunks = [
    ...extractPdfLiteralStrings(src, 'Tj'),
    ...extractPdfLiteralStrings(src, 'TJ'),
  ].filter((chunk) => !isPdfMetadataChunk(chunk));

  return chunks.join(' ').replace(/\s+/g, ' ').trim();
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

    if (mime.includes('presentation') || name.endsWith('.pptx') || name.endsWith('.ppt')) {
      return extractTextFromPptxBuffer(buffer);
    }

    return buffer.toString('utf8').trim();
  }
}
