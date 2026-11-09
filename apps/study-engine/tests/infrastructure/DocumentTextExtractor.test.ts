import { describe, it, expect } from 'vitest';
import {
  DocumentTextExtractor,
  extractTextFromPdfBuffer,
  extractTextFromDocxBuffer,
  extractTextFromPptxBuffer,
} from '../../src/infrastructure/extraction/DocumentTextExtractor.js';

describe('DocumentTextExtractor', () => {
  it('REQ_01_WHEN_pdf_com_strings_Tj_e_TJ_SHALL_extrair_texto_linearmente', () => {
    const pdf = Buffer.from(
      '%PDF-1.4\nBT (Arquitetura Hexagonal e DDD) Tj [(Isolamento ) -120 (do Dominio ) 40 (com \\(Portas\\))] TJ ET\n',
      'latin1'
    );
    const extracted = extractTextFromPdfBuffer(pdf);
    expect(extracted).toContain('Arquitetura Hexagonal e DDD');
    expect(extracted).toContain('Isolamento');
    expect(extracted).toContain('do Dominio');
    expect(extracted).toContain('com (Portas)');
  });

  it('REQ_02_IF_pdf_binario_adversario_com_milhares_de_parenteses_e_colchetes_abertos_SHALL_concluir_em_menos_de_500ms', () => {
    // Buffer adversário: milhares de '(' e '[' seguidos de texto sem Tj/TJ imediato + muitos streams
    const noisyParenChunk = '('.repeat(6000) + 'x'.repeat(20000) + ') NO_OP ';
    const noisyBracketChunk = '['.repeat(6000) + 'y'.repeat(20000) + '] NO_OP ';
    const fakeStreams = Array.from(
      { length: 220 },
      (_, i) => `stream\r\n${'('.repeat(200)}bin_${i}_payload${'['.repeat(200)}\r\nendstream\n`
    ).join('');
    const validTail = '\nBT (Conceito extraido com seguranca) Tj ET\n';

    const adversarialPdf = Buffer.from(
      `%PDF-1.7\n${noisyParenChunk}${noisyBracketChunk}${fakeStreams}${validTail}`,
      'latin1'
    );

    const start = performance.now();
    const result = extractTextFromPdfBuffer(adversarialPdf);
    const streamOnlyPdf = Buffer.from(
      `%PDF-1.7\n${noisyParenChunk}${noisyBracketChunk}${fakeStreams}`,
      'latin1'
    );
    const emptyStreamResult = extractTextFromPdfBuffer(streamOnlyPdf);
    const elapsedMs = performance.now() - start;

    expect(elapsedMs).toBeLessThan(500);
    expect(result).toContain('Conceito extraido com seguranca');
    expect(emptyStreamResult).toBe('');
  });

  it('REQ_06_THE_SYSTEM_SHALL_CONTINUE_TO_extrair_texto_de_pdf_docx_pptx_e_txt_validos', async () => {
    const { deflateRawSync } = await import('node:zlib');
    const slideXml = Buffer.from(
      '<?xml version="1.0"?><p:sld><a:t>Redes Neurais</a:t><a:t> e Transformers</a:t></p:sld>',
      'utf8'
    );
    const compressed = deflateRawSync(slideXml);
    const name = Buffer.from('ppt/slides/slide1.xml');
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(8, 8);
    header.writeUInt32LE(compressed.length, 18);
    header.writeUInt16LE(name.length, 26);
    const pptx = Buffer.concat([header, name, compressed]);

    expect(extractTextFromPptxBuffer(pptx)).toContain('Redes Neurais e Transformers');
  });

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

  it('extrai texto de word/document.xml em um DOCX (ZIP)', async () => {
    const { deflateRawSync } = await import('node:zlib');
    const xml = Buffer.from(
      '<?xml version="1.0"?><w:document><w:t>Le verbe etre au present</w:t><w:t> je suis tu es</w:t></w:document>',
      'utf8'
    );
    const compressed = deflateRawSync(xml);
    const name = Buffer.from('word/document.xml');
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(8, 8);
    header.writeUInt32LE(compressed.length, 18);
    header.writeUInt16LE(name.length, 26);
    const docx = Buffer.concat([header, name, compressed]);

    expect(extractTextFromDocxBuffer(docx)).toContain('verbe etre');

    const extractor = new DocumentTextExtractor();
    const result = await extractor.extractText({
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      fileName: 'Apostila.docx',
      fileBase64: docx.toString('base64'),
    });
    expect(result).toContain('je suis');
  });
});
