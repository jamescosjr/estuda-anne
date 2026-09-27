import { describe, it, expect } from 'vitest';
import { Flashcard } from '../../src/domain/entities/Flashcard.js';

describe('RN-STU-001 & RN-STU-002: Flashcard Entity & Spaced Repetition (SM-2)', () => {
  it('RN_STU_001_WHEN_criado_SHALL_inicializar_com_EF_2_5_e_intervalo_1', () => {
    const card = Flashcard.create({
      studentId: 'student-123',
      materialId: 'material-456',
      front: 'O que é mitocôndria?',
      back: 'Organela responsável pela respiração celular e produção de ATP.',
      tags: ['biologia', 'celular'],
    });

    expect(card.id).toBeDefined();
    expect(card.easeFactor).toBe(2.5);
    expect(card.repetitionIntervalDays).toBe(1);
    expect(card.repetitionsCount).toBe(0);
    expect(card.isDue(new Date())).toBe(true);
    expect(card.history).toHaveLength(0);
  });

  it('RN_STU_002_WHEN_nota_maior_igual_3_SHALL_avancar_intervalo_e_recalcular_EF', () => {
    const card = Flashcard.create({
      studentId: 'student-123',
      materialId: 'material-456',
      front: 'O que é mitocôndria?',
      back: 'Organela responsável pela respiração celular e produção de ATP.',
    });

    const baseDate = new Date('2026-09-01T10:00:00Z');

    // 1ª revisão com sucesso (nota 5)
    card.applyReview(5, baseDate);
    expect(card.repetitionsCount).toBe(1);
    expect(card.repetitionIntervalDays).toBe(1);
    expect(card.easeFactor).toBe(2.6); // 2.5 + (0.1 - 0) = 2.6

    // 2ª revisão com sucesso (nota 4)
    card.applyReview(4, baseDate);
    expect(card.repetitionsCount).toBe(2);
    expect(card.repetitionIntervalDays).toBe(6); // Segundo intervalo clássico SM-2
    expect(card.easeFactor).toBe(2.6); // delta = 0.1 - (1 * 0.1) = 0 -> permanece 2.6

    // 3ª revisão com sucesso (nota 4)
    card.applyReview(4, baseDate);
    expect(card.repetitionsCount).toBe(3);
    // Intervalo: Math.round(6 * 2.6) = 16
    expect(card.repetitionIntervalDays).toBe(16);
  });

  it('RN_STU_002_IF_nota_menor_3_THEN_SHALL_resetar_repeticoes_para_zero', () => {
    const card = Flashcard.create({
      studentId: 'student-123',
      materialId: 'material-456',
      front: 'Pergunta complexa',
      back: 'Resposta',
    });

    const date = new Date('2026-09-01T10:00:00Z');
    card.applyReview(5, date);
    card.applyReview(5, date);
    expect(card.repetitionsCount).toBe(2);

    // Lapso de memória com nota 1 (esquecimento)
    card.applyReview(1, date);
    expect(card.repetitionsCount).toBe(0);
    expect(card.repetitionIntervalDays).toBe(1);
    expect(card.history).toHaveLength(3);
  });

  it('RN_STU_002_SHALL_manter_piso_minimo_EF_de_1_3', () => {
    const card = Flashcard.create({
      studentId: 'student-123',
      materialId: 'material-456',
      front: 'Pergunta dificílima',
      back: 'Resposta',
    });

    const date = new Date('2026-09-01T10:00:00Z');
    // Aplica repetidas avaliações nota 0
    for (let i = 0; i < 10; i++) {
      card.applyReview(0, date);
    }

    expect(card.easeFactor).toBeGreaterThanOrEqual(1.3);
  });

  it('RN_STU_001_WHEN_id_temporario_SHALL_gerar_UUID_valido', () => {
    const card = Flashcard.create({
      id: 'fc-gen-Calculo-1',
      studentId: 'student-123',
      materialId: 'material-456',
      front: 'O que e limite?',
      back: 'Conceito fundamental.',
    });

    expect(card.id.startsWith('fc-gen-')).toBe(false);
    expect(card.id.startsWith('fc-')).toBe(false);
    expect(card.id.length).toBeGreaterThan(20);
  });
});
