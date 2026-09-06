import { z } from 'zod';

const sm2GradeSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

export const ReviewFlashcardParamsSchema = z.object({
  id: z.string().min(1),
});

export const ReviewFlashcardBodySchema = z
  .object({
    grade: sm2GradeSchema.optional(),
    rating: sm2GradeSchema.optional(),
  })
  .superRefine((body, ctx) => {
    if (body.grade === undefined && body.rating === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'grade or rating is required',
      });
    }
  })
  .transform((body) => ({
    grade: (body.grade ?? body.rating) as 0 | 1 | 2 | 3 | 4 | 5,
  }));

export type ReviewFlashcardBodyDTO = z.infer<typeof ReviewFlashcardBodySchema>;

export const GetDueFlashcardsQuerySchema = z.object({
  studentId: z.string().min(1),
  limit: z.coerce.number().positive().max(100).optional().default(50),
});

export type GetDueFlashcardsQueryDTO = z.infer<typeof GetDueFlashcardsQuerySchema>;
