import { describe, it, expect } from 'vitest';
import { CreateMaterialSchema, ProcessMaterialBodySchema } from '../../src/application/dto/material.dto.js';

describe('CreateMaterialSchema', () => {
  it('aceita studentId no formato usr- usado pelo auth', () => {
    const parsed = CreateMaterialSchema.parse({
      studentId: 'usr-1770000000000-abc12',
      title: 'Apostila de Calculo I',
      format: 'PDF',
      fileUrl: 'https://r2.estuda-anne.local/aula.pdf',
      fileSizeBytes: 2048,
      mimeType: 'application/pdf',
    });

    expect(parsed.studentId).toBe('usr-1770000000000-abc12');
    expect(parsed.format).toBe('PDF');
  });

  it('normaliza PPTX/MP4/MP3 e IMAGE para o enum de dominio', () => {
    expect(CreateMaterialSchema.parse({
      studentId: 'student-demo-id',
      title: 'Slides da aula',
      format: 'PPTX',
      fileUrl: 'https://r2.estuda-anne.local/aula.pptx',
      fileSizeBytes: 1024,
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    }).format).toBe('PPT');

    expect(CreateMaterialSchema.parse({
      studentId: 'student-demo-id',
      title: 'Aula gravada',
      format: 'MP4',
      fileUrl: 'https://r2.estuda-anne.local/aula.mp4',
      fileSizeBytes: 1024,
      mimeType: 'video/mp4',
    }).format).toBe('VIDEO');

    expect(CreateMaterialSchema.parse({
      studentId: 'student-demo-id',
      title: 'Podcast',
      format: 'MP3',
      fileUrl: 'https://r2.estuda-anne.local/aula.mp3',
      fileSizeBytes: 1024,
      mimeType: 'audio/mpeg',
    }).format).toBe('AUDIO');

    expect(CreateMaterialSchema.parse({
      studentId: 'student-demo-id',
      title: 'Foto da prova',
      format: 'IMAGE',
      fileUrl: 'https://r2.estuda-anne.local/prova.jpg',
      fileSizeBytes: 1024,
      mimeType: 'image/jpeg',
    }).format).toBe('IMAGE');
  });

  it('aceita rawContent opcional no create', () => {
    const parsed = CreateMaterialSchema.parse({
      studentId: 'usr-1',
      title: 'Notas de aula',
      format: 'PDF',
      fileUrl: 'https://r2.estuda-anne.local/notas.pdf',
      fileSizeBytes: 2048,
      mimeType: 'application/pdf',
      rawContent: 'Conteudo extraido da apostila de limites e derivadas.',
    });

    expect(parsed.rawContent).toContain('limites e derivadas');
  });
});

describe('ProcessMaterialBodySchema', () => {
  it('aceita textContent para processar material sem rawContent previo', () => {
    const parsed = ProcessMaterialBodySchema.parse({
      textContent: 'Os fundamentos da Republica incluem cidadania e dignidade.',
    });
    expect(parsed.textContent).toContain('cidadania');
  });

  it('aceita body vazio', () => {
    expect(ProcessMaterialBodySchema.parse(undefined).textContent).toBeUndefined();
    expect(ProcessMaterialBodySchema.parse({}).textContent).toBeUndefined();
  });
});
