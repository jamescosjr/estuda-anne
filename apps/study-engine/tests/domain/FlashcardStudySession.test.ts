import { describe, it, expect } from 'vitest';
import { Flashcard } from '../../src/domain/entities/Flashcard.js';
import {
  composeAdaptiveSession,
  interleaveByKey,
  materialBelongsToSubject,
  cardMatchesSubject,
  materialMatchesTopic,
  uniqueByExactFront,
} from '../../src/domain/services/FlashcardStudySession.js';

function card(front: string, materialId: string, tag: string): Flashcard {
  return Flashcard.create({
    studentId: 's1',
    materialId,
    front,
    back: `Resposta de ${front}`,
    tags: [tag],
  });
}

describe('FlashcardStudySession', () => {
  it('nao colapsa materias diferentes: intercala 1 de cada em vez de um unico assunto', () => {
    const cards = [
      card('Defina tokenizacao em LLMs', 'ia', 'IA'),
      card('O que e temperature no decoding?', 'ia', 'IA'),
      card('Enuncie o TFC', 'calc', 'Calculo'),
      card('O que e uma integral definida?', 'calc', 'Calculo'),
      card('O que e glicolise?', 'bio', 'Bioquimica'),
    ];

    const interleaved = interleaveByKey(cards, (c) => c.tags[0] || c.materialId);
    expect(interleaved.slice(0, 3).map((c) => c.tags[0])).toEqual(['IA', 'Calculo', 'Bioquimica']);
  });

  it('deduplica apenas enunciado identico, mantendo cards do mesmo tema', () => {
    const a = card('O que e um LLM?', 'ia', 'IA');
    const b = card('O que e um LLM?', 'ia', 'IA');
    const c = card('Como o attention mistura tokens?', 'ia', 'IA');
    const unique = uniqueByExactFront([a, b, c]);
    expect(unique).toHaveLength(2);
  });

  it('mistura cards novos persistidos com a fila SM-2 e prioriza ineditos', () => {
    const generated = [
      card('O que diferencia fine-tuning de RAG?', 'ia', 'IA'),
      card('Como o embedding representa um token?', 'ia', 'IA'),
    ];
    const due = [
      card('Enuncie o TFC', 'calc', 'Calculo'),
      card('O que e glicolise?', 'bio', 'Bioquimica'),
      card('Qual a complexidade media do QuickSort?', 'algo', 'Algoritmos'),
    ];

    const result = composeAdaptiveSession({
      newCards: generated,
      dueCards: due,
      count: 5,
    });

    expect(result.session.length).toBe(5);
    expect(result.newCount).toBe(2);
    expect(result.dueCount).toBe(3);
    const subjects = new Set(result.session.map((c) => c.tags[0]));
    expect(subjects.size).toBeGreaterThanOrEqual(3);
  });

  it('filtra material pelo topico da sessao extra', () => {
    expect(
      materialMatchesTopic(
        { title: 'Fundamentos de IA e LLMs para Programadores', keyConcepts: ['LLM', 'prompt'] },
        'Fundamentos de IA e LLMs para Programadores'
      )
    ).toBe(true);
    expect(
      materialMatchesTopic(
        { title: 'Calculo I', keyConcepts: ['derivada'] },
        'Fundamentos de IA e LLMs para Programadores'
      )
    ).toBe(false);
  });

  it('associa card a materia do perfil, nao ao primeiro conceito da tag', () => {
    expect(
      materialBelongsToSubject(
        { title: 'Apostila semana 3', subject: 'Direito Penal' },
        'Direito Penal'
      )
    ).toBe(true);
    expect(
      cardMatchesSubject(
        { tags: ['Dolo'] },
        { title: 'Apostila semana 3', subject: 'Direito Penal' },
        'Direito Penal'
      )
    ).toBe(true);
    expect(
      cardMatchesSubject(
        { tags: ['Culpa'] },
        { title: 'Apostila Civil', subject: 'Direito Civil' },
        'Direito Penal'
      )
    ).toBe(false);
  });
});
