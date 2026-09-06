import { z } from 'zod';
import dotenv from 'dotenv';

import path from 'path';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3005),
  MONGODB_URI: z.string().min(1),
  JWT_SECRET: z.string().default('estuda_anne_jwt_secret_key_2026_safe'),
  ADMIN_EMAIL: z.string().default('james@estuda-anne.com'),
  ADMIN_PASSWORD: z.string().default('Admin@EstudaAnne2026!'),
});

export const env = envSchema.parse(process.env);
