import { describe, it, expect } from 'vitest';
import { SubmitAIFeedbackUseCase } from '../../src/domain/usecases/SubmitAIFeedbackUseCase.js';
import { MongoAIFeedbackRepository } from '../../src/infrastructure/persistence/mongo/repositories/MongoAIFeedbackRepository.js';

describe('SubmitAIFeedbackUseCase', () => {
  it('deve registrar feedback positivo e recalcular o perfil adaptativo', async () => {
    const repository = new MongoAIFeedbackRepository();
    const useCase = new SubmitAIFeedbackUseCase(repository);

    const result = await useCase.execute({
      studentId: 'test-student-1',
      targetType: 'quiz',
      targetId: 'qz-123',
      subject: 'Cálculo I',
      rating: 'POSITIVE',
      reasonTag: 'GREAT_EXPLANATION',
    });

    expect(result.feedback.id).toBeDefined();
    expect(result.feedback.rating).toBe('POSITIVE');
    expect(result.adaptiveProfile.positiveCount).toBe(1);
    expect(result.adaptiveProfile.totalFeedbacksCount).toBe(1);
  });

  it('deve registrar feedback negativo e incluir tags para evitar no contexto da IA', async () => {
    const repository = new MongoAIFeedbackRepository();
    const useCase = new SubmitAIFeedbackUseCase(repository);

    const result = await useCase.execute({
      studentId: 'test-student-2',
      targetType: 'flashcard',
      targetId: 'fc-456',
      subject: 'Bioquímica',
      rating: 'NEGATIVE',
      reasonTag: 'OUT_OF_CONTEXT',
      comment: 'Muito genérico',
    });

    expect(result.feedback.rating).toBe('NEGATIVE');
    expect(result.adaptiveProfile.negativeCount).toBe(1);
    expect(result.adaptiveProfile.avoidTags.length).toBeGreaterThan(0);
    expect(result.adaptiveProfile.adaptivePromptInstruction).toContain('ATENÇÃO');
  });
});
