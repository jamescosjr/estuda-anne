import { describe, it, expect } from 'vitest';
import {
  GetDueFlashcardsQuerySchema,
  ReviewFlashcardBodySchema,
} from '../../src/application/dto/flashcard.dto.js';

describe('GetDueFlashcardsQuerySchema', () => {
  it('aceita studentId que nao e UUID', () => {
    const parsed = GetDueFlashcardsQuerySchema.parse({ studentId: 'usr-123-anne' });
    expect(parsed.studentId).toBe('usr-123-anne');
  });
});

describe('ReviewFlashcardBodySchema', () => {
  it('aceita grade SM-2', () => {
    expect(ReviewFlashcardBodySchema.parse({ grade: 4 }).grade).toBe(4);
  });

  it('aceita rating enviado pelo BFF/frontend e mapeia para grade', () => {
    expect(ReviewFlashcardBodySchema.parse({ rating: 5 }).grade).toBe(5);
  });
});
