import { z } from 'zod';

/**
 * Every environment variable the backend depends on, validated at boot.
 * Fails fast with a clear error instead of surfacing confusing runtime
 * errors deep inside a request handler. See docs/07-environment-variables.md.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  CORS_ALLOWED_ORIGINS: z
    .string()
    .default('')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
    ),

  GOOGLE_SHEETS_WEBHOOK_URL: z.string().url().optional().or(z.literal('')),
  GOOGLE_SHEETS_WEBHOOK_SECRET: z.string().optional().default(''),

  META_PIXEL_ID: z.string().optional().default(''),
  META_ACCESS_TOKEN: z.string().optional().default(''),
  META_TEST_EVENT_CODE: z.string().optional().default(''),

  TIKTOK_PIXEL_ID: z.string().optional().default(''),
  TIKTOK_ACCESS_TOKEN: z.string().optional().default(''),

  SNAPCHAT_PIXEL_ID: z.string().optional().default(''),
  SNAPCHAT_ACCESS_TOKEN: z.string().optional().default(''),

  DEFAULT_PHONE_REGION: z.string().default('CH'),

  RATE_LIMIT_MAX: z.coerce.number().default(20),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),

  NOTIFY_EMAIL_TO: z.string().optional().default(''),
  RESEND_API_KEY: z.string().optional().default(''),
  SLACK_WEBHOOK_URL: z.string().optional().default(''),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:');
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
  }

  return parsed.data;
}

export const env = loadEnv();
