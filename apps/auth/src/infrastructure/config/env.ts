import { z } from 'zod';
import dotenv from 'dotenv';

import path from 'path';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3005),
  MONGODB_URI: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  ADMIN_EMAIL: z.string().email().default('admin@estuda-anne.com'),
  ADMIN_PASSWORD: z.string().min(8),
});

export const env = envSchema.parse(process.env);
