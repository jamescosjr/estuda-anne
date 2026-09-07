import { describe, it, expect } from 'vitest';
import {
  DocumentTextExtractor,
  extractTextFromPdfBuffer,
} from '../../src/infrastructure/extraction/DocumentTextExtractor.js';

describe('DocumentTextExtractor', () => {
  it('extrai texto UTF-8 de arquivo texto em base64', async () => {
    const extractor = new DocumentTextExtractor();
    const text = 'Os fundamentos da Republica incluem cidadania e dignidade da pessoa humana.';
    const result = await extractor.extractText({
      mimeType: 'text/plain',
      fileName: 'notas.txt',
      fileBase64: Buffer.from(text, 'utf8').toString('base64'),
    });
    expect(result).toContain('cidadania');
  });

  it('extrai strings Tj de um PDF simples', () => {
    const pdf = Buffer.from('%PDF-1.1\nBT (Cidadania e dignidade) Tj ET\n', 'latin1');
    expect(extractTextFromPdfBuffer(pdf)).toContain('Cidadania');
  });

  it('ignora metadados de Info (Author, CreationDate) e nao varre parenteses soltos', () => {
    const pdf = Buffer.from(
      '%PDF-1.1\n/Author (Jane Doe)\n/CreationDate (D:20240101120000Z)\nBT (Fine-tuning adapta o modelo) Tj ET\n',
      'latin1'
    );
    const text = extractTextFromPdfBuffer(pdf);
    expect(text).toContain('Fine-tuning');
    expect(text).not.toContain('Jane Doe');
    expect(text).not.toContain('D:20240101');
  });

  it('prioriza textContent quando ja existe', async () => {
    const extractor = new DocumentTextExtractor();
    const result = await extractor.extractText({
      textContent: 'Conteudo extraido previamente da apostila de limites.',
      fileBase64: Buffer.from('ignore', 'utf8').toString('base64'),
    });
    expect(result).toContain('limites');
  });

  it('extrai texto de um PDF com stream comprimido (FlateDecode)', async () => {
    const { deflateSync } = await import('node:zlib');
    const innerText = 'BT (Conceito de calculo diferencial) Tj ET';
    const compressed = deflateSync(Buffer.from(innerText, 'latin1'));

    const pdfHeader = Buffer.from('%PDF-1.4\nstream\r\n', 'latin1');
    const pdfFooter = Buffer.from('\r\nendstream\n', 'latin1');
    const pdf = Buffer.concat([pdfHeader, compressed, pdfFooter]);

    const extracted = extractTextFromPdfBuffer(pdf);
    expect(extracted).toContain('Conceito de calculo diferencial');
  });
});
