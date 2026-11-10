import { describe, it, expect } from 'vitest';
import {
  isPedagogicallyOffTopic,
  sanitizeStudyCorpus,
  isDocumentMetaReferencing,
  isDuplicateOrHighlySimilar,
  isGenericPlaceholderPrompt,
  isUnusableStudyCorpus,
  materialHasStudyCorpus,
  isGroundedInCorpus,
  filterTopicsGroundedInCorpus,
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
      isPedagogicallyOffTopic('Anne estuda anatomia humana no curso.')
    ).toBe(true);
    expect(
      isPedagogicallyOffTopic('O que caracteriza o fine-tuning supervisionado de um LLM?')
    ).toBe(false);
  });

  it('detecta citações e referências estruturais de PDF e documento', () => {
    expect(isDocumentMetaReferencing('Segundo o item 3 do PDF, qual é a definição?')).toBe(true);
    expect(isDocumentMetaReferencing('Na página 12 do documento, o que é explicado?')).toBe(true);
    expect(isDocumentMetaReferencing('Conforme o texto enviado, como funciona o processo?')).toBe(true);
    expect(isDocumentMetaReferencing('Qual a função do ribossomo na síntese proteica?')).toBe(false);
  });

  it('detecta similaridade semântica para impedir flashcards duplicados', () => {
    const existing = ['Qual a função da mitocôndria na célula eucariótica?'];
    expect(
      isDuplicateOrHighlySimilar(
        'Qual é a função da mitocôndria na célula eucariótica?',
        existing,
        0.60
      )
    ).toBe(true);
    expect(
      isDuplicateOrHighlySimilar(
        'O que é a fotossíntese e onde ela ocorre nas plantas?',
        existing,
        0.60
      )
    ).toBe(false);
  });

  it('rejeita flashcards genericos de demonstracao (Card de Revisao / aplicacoes praticas essenciais)', () => {
    expect(
      isGenericPlaceholderPrompt(
        '[Card de Revisão — Francês #2] Quais são as aplicações práticas essenciais de Francês no aprendizado universitário?'
      )
    ).toBe(true);
    expect(
      isPedagogicallyOffTopic(
        '[Card de Revisão — Fundamentos de IA e LLMs para Programadores #1] Quais são as aplicações práticas essenciais de Fundamentos de IA e LLMs para Programadores no aprendizado universitário?'
      )
    ).toBe(true);
    expect(isGenericPlaceholderPrompt('O que caracteriza o fine-tuning supervisionado de um LLM?')).toBe(false);
  });

  it('rejeita corpus ZIP/DOCX binario e resumo de extracao falha', () => {
    expect(isUnusableStudyCorpus('PK\u0003\u0004' + '[Content_Types].xml ' + 'x'.repeat(40))).toBe(true);
    expect(
      materialHasStudyCorpus(
        'PK\u0003\u0004[Content_Types].xml' + 'x'.repeat(80),
        'O material fornecido consiste em dados binários brutos de um arquivo compactado (estrutura interna de um arquivo .docx/ZIP).'
      )
    ).toBe(false);
    expect(materialHasStudyCorpus('Le present de l indicatif se forme avec les terminaisons e es e ons ez ent.', undefined)).toBe(true);
  });

  it('RN_STU_005_WHEN_corpus_or_card_mentions_corrupted_or_unreadable_file_bytes_SHALL_reject_as_unusable_and_off_topic', () => {
    const hematologiaCorruptedFront =
      'O que caracteriza um arquivo de dados biomédicos classificado como corrompido ou ilegível nos Sistemas de Informação Laboratorial (LIS) em hematologia?';
    const hematologiaCorruptedBack =
      'Um arquivo corrompido ou ilegível é aquele cuja estrutura de bytes original sofreu alteração involuntária ou degradação de dados, impedindo que os softwares analíticos interpretem seu cabeçalho ou conteúdo. Isso inviabiliza o processamento automático de dados de amostragem celular, histogramas hematológicos e imagens de citometria.';

    expect(isDocumentMetaReferencing(hematologiaCorruptedFront)).toBe(true);
    expect(isDocumentMetaReferencing(hematologiaCorruptedBack)).toBe(true);
    expect(isPedagogicallyOffTopic(hematologiaCorruptedFront)).toBe(true);
    expect(isPedagogicallyOffTopic(hematologiaCorruptedBack)).toBe(true);

    expect(
      isUnusableStudyCorpus(
        'Não foi possível ler o arquivo enviado pois o documento encontra-se corrompido ou ilegível, apresentando falha na estrutura de bytes.'
      )
    ).toBe(true);
  });

  it('RN_STU_007_WHEN_evaluating_grounding_SHALL_require_lexical_overlap_with_uploaded_material_corpus', () => {
    const hematologiaCorpus =
      'A eritropoiese ocorre na medula óssea vermelha sob estímulo da eritropoietina renal. Os reticulócitos são eritrócitos jovens liberados na corrente sanguínea contendo RNA residual. A hemoglobina transporta oxigênio ligado ao grupo heme ferroso.';

    expect(
      isGroundedInCorpus(
        'Onde ocorre a eritropoiese e qual hormônio a estimula? Na medula óssea sob estímulo da eritropoietina.',
        hematologiaCorpus,
        ['eritropoiese', 'eritropoietina', 'reticulócitos']
      )
    ).toBe(true);

    // Card inventado sobre Sistemas de Informação Laboratorial (LIS) e bytes sem ancoragem no texto real de hematologia
    expect(
      isGroundedInCorpus(
        'O que caracteriza um arquivo classificado como corrompido nos Sistemas de Informação Laboratorial (LIS)? Alteração de bytes no cabeçalho.',
        hematologiaCorpus,
        ['eritropoiese', 'eritropoietina', 'reticulócitos']
      )
    ).toBe(false);

    // Filtra focusTopics de outras matérias (ex: Direito Constitucional, Cálculo) mantendo apenas os do corpus
    const mixedTopics = [
      { topic: 'Controle de Constitucionalidade', priorityWeight: 2.8 },
      { topic: 'Integrais Duplas', priorityWeight: 2.5 },
      { topic: 'Eritropoiese e Reticulócitos', priorityWeight: 2.2 },
    ];
    const filteredTopics = filterTopicsGroundedInCorpus(mixedTopics, hematologiaCorpus, [
      'eritropoiese',
      'reticulócitos',
    ]);

    expect(filteredTopics).toHaveLength(1);
    expect(filteredTopics[0].topic).toBe('Eritropoiese e Reticulócitos');
  });
});
