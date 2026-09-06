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

  it('prioriza textContent quando ja existe', async () => {
    const extractor = new DocumentTextExtractor();
    const result = await extractor.extractText({
      textContent: 'Conteudo extraido previamente da apostila de limites.',
      fileBase64: Buffer.from('ignore', 'utf8').toString('base64'),
    });
    expect(result).toContain('limites');
  });
});
