import { describe, it, expect } from 'vitest';
import {
  isPedagogicallyOffTopic,
  sanitizeStudyCorpus,
} from '../../src/domain/services/StudyCorpusSanitizer.js';

describe('StudyCorpusSanitizer', () => {
  it('remove metadados de documento (autor, datas PDF/ISO) e preserva o conteudo da materia', () => {
    const raw = [
      'Author: Jane Doe',
      'CreationDate: D:20240101120000Z',
      '2026-09-07T11:54:06.000Z',
      'Mon Sep 07 2026 08:54:06 GMT-0300 (Brasilia Standard Time)',
      'Um LLM gera texto previsao token a token a partir de um prompt.',
      'Fine-tuning adapta um modelo pre-treinado a um dominio especifico.',
    ].join('\n');

    const cleaned = sanitizeStudyCorpus(raw);

    expect(cleaned).toContain('LLM gera texto');
    expect(cleaned).toContain('Fine-tuning');
    expect(cleaned).not.toMatch(/Jane Doe/);
    expect(cleaned).not.toMatch(/D:20240101/);
    expect(cleaned).not.toMatch(/2026-09-07T11:54:06/);
    expect(cleaned).not.toMatch(/Brasilia Standard Time/);
  });

  it('marca perguntas sobre metadados, datas de arquivo ou a aluna Anne como fora de escopo', () => {
    expect(
      isPedagogicallyOffTopic(
        'Ao ler a linha com a data no formato 2026-09-07T11:54:06.000Z, o que ela representa no documento?'
      )
    ).toBe(true);
    expect(
      isPedagogicallyOffTopic('Qual e o autor do PDF segundo os metadados do arquivo?')
    ).toBe(true);
    expect(
      isPedagogicallyOffTopic(
        'Suponha que Anne precisa analisar o cenario pratico: qual a melhor decisao?'
      )
    ).toBe(true);
    expect(
      isPedagogicallyOffTopic('O que caracteriza o fine-tuning supervisionado de um LLM?')
    ).toBe(false);
  });
});
