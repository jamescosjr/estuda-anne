import { z } from 'zod';

export const CreateMaterialSchema = z.object({
  studentId: z.string().uuid(),
  title: z.string().min(3).max(200),
  format: z.enum(['PDF', 'PPT', 'VIDEO', 'AUDIO']),
  fileUrl: z.string().url(),
  fileSizeBytes: z.number().positive(),
  mimeType: z.string(),
});

export type CreateMaterialDTO = z.infer<typeof CreateMaterialSchema>;

export const ProcessMaterialParamsSchema = z.object({
  id: z.string().uuid(),
});

export type ProcessMaterialParamsDTO = z.infer<typeof ProcessMaterialParamsSchema>;
