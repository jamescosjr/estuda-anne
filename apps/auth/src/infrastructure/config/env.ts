import { existsSync } from 'node:fs';
import { z } from 'zod';
import dotenv from 'dotenv';

import path from 'path';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3005),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/estuda-anne'),
  JWT_SECRET: z.string().default('estuda_anne_jwt_secret_key_2026_safe'),
  ADMIN_EMAIL: z.string().default('james@estuda-anne.com'),
  ADMIN_PASSWORD: z.string().default('Admin@EstudaAnne2026!'),
});

export function rewriteLocalMongoHostForDocker(uri: string, inDocker = existsSync('/.dockerenv')): string {
  if (!inDocker || !uri) {
    return uri;
  }
  try {
    const parsed = new URL(uri);
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      parsed.hostname = 'mongodb';
      return parsed.toString();
    }
  } catch {
    return uri.replace('://localhost', '://mongodb').replace('://127.0.0.1', '://mongodb');
  }
  return uri;
}

const parsedEnv = envSchema.parse(process.env);

export const env = {
  ...parsedEnv,
  MONGODB_URI: rewriteLocalMongoHostForDocker(parsedEnv.MONGODB_URI),
};
