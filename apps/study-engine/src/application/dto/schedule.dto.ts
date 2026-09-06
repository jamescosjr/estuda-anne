import { z } from 'zod';

const emptyToUndefined = (value: unknown) =>
  value === '' || value === null || value === undefined ? undefined : value;

const optionalDate = z.preprocess(
  emptyToUndefined,
  z.coerce.date().optional().refine((date) => date === undefined || !Number.isNaN(date.getTime()), {
    message: 'Invalid date',
  })
);

export const GenerateScheduleBodySchema = z.object({
  studentId: z.string().min(1),
  title: z.string().min(1),
  subjects: z.array(z.string()).optional(),
  targetExamDate: optionalDate,
  dailyStudyMinutesTarget: z.preprocess(
    emptyToUndefined,
    z.coerce.number().positive().optional()
  ),
  periodStartDate: optionalDate,
  periodEndDate: optionalDate,
  examDates: z.preprocess(
    (value) => {
      if (!Array.isArray(value)) return value;
      return value.filter((exam) => exam && typeof exam === 'object' && String((exam as { date?: string }).date || '').trim() !== '');
    },
    z.array(z.object({
      subject: z.string().optional(),
      title: z.string().optional(),
      date: z.string().min(1),
    })).optional()
  ),
});

export const GetScheduleQuerySchema = z.object({
  studentId: z.string().min(1),
});

export const CompleteScheduleItemBodySchema = z.object({
  studentId: z.string().min(1),
});

export const CompleteScheduleItemParamsSchema = z.object({
  itemId: z.string().min(1),
});

export const AnalyzeScheduleFileBodySchema = z.object({
  studentId: z.string().min(1),
  fileBase64: z.string().optional(),
  fileName: z.string().optional(),
  mimeType: z.string().optional(),
  textContent: z.string().optional(),
});
