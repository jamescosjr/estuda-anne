import { z } from 'zod';
import { normalizeMaterialFormat } from '../../domain/value-objects/MaterialFormat.js';

const materialFormatSchema = z.string().min(1).transform((value, ctx) => {
  try {
    return normalizeMaterialFormat(value);
  } catch {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Unsupported material format: ${value}`,
    });
    return z.NEVER;
  }
});

export const CreateMaterialSchema = z.object({
  studentId: z.string().min(1),
  title: z.string().min(3).max(200),
  format: materialFormatSchema,
  fileUrl: z.string().min(1),
  fileSizeBytes: z.number().positive(),
  mimeType: z.string(),
  rawContent: z.string().min(10).optional(),
});

export type CreateMaterialDTO = z.infer<typeof CreateMaterialSchema>;

export const ProcessMaterialParamsSchema = z.object({
  id: z.string().min(1),
});

export type ProcessMaterialParamsDTO = z.infer<typeof ProcessMaterialParamsSchema>;

export const ProcessMaterialBodySchema = z.object({
  textContent: z.string().min(10).optional(),
  force: z.boolean().optional(),
  fileBase64: z.string().min(8).optional(),
  mimeType: z.string().optional(),
  fileName: z.string().optional(),
  async: z.boolean().optional(),
}).optional().default({});

export type ProcessMaterialBodyDTO = z.infer<typeof ProcessMaterialBodySchema>;
