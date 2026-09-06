import { z } from 'zod';

export const GenerateScheduleBodySchema = z.object({
  studentId: z.string().min(1),
  title: z.string().min(1),
  subjects: z.array(z.string()).optional(),
  targetExamDate: z.coerce.date().optional(),
  dailyStudyMinutesTarget: z.coerce.number().positive().optional(),
  periodStartDate: z.coerce.date().optional(),
  periodEndDate: z.coerce.date().optional(),
  examDates: z.array(z.object({
    subject: z.string().optional(),
    title: z.string().optional(),
    date: z.string().min(1),
  })).optional(),
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
