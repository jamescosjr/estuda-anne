import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  METRICS_SERVICE_PORT: z.coerce.number().default(3004),
  METRICS_SERVICE_HOST: z.string().default('0.0.0.0'),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/estuda-anne'),
  CORS_ORIGIN: z.string().optional(),
});

export const env = envSchema.parse(process.env);
