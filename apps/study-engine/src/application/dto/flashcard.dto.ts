import { z } from 'zod';

export const ReviewFlashcardParamsSchema = z.object({
  id: z.string().uuid(),
});

export const ReviewFlashcardBodySchema = z.object({
  grade: z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
});

export type ReviewFlashcardBodyDTO = z.infer<typeof ReviewFlashcardBodySchema>;

export const GetDueFlashcardsQuerySchema = z.object({
  studentId: z.string().uuid(),
  limit: z.coerce.number().positive().max(100).optional().default(50),
});

export type GetDueFlashcardsQueryDTO = z.infer<typeof GetDueFlashcardsQuerySchema>;
