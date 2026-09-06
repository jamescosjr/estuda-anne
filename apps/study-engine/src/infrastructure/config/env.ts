import { existsSync } from 'node:fs';
import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3002),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/estuda_anne'),
  GEMINI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  CLOUDFLARE_R2_ACCOUNT_ID: z.string().optional(),
  CLOUDFLARE_R2_ACCESS_KEY_ID: z.string().optional(),
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: z.string().optional(),
  CLOUDFLARE_R2_BUCKET_NAME: z.string().optional(),
  CLOUDFLARE_R2_ENDPOINT: z.string().optional(),
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
