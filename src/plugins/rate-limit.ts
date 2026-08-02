import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';
import { env } from '../config/env.js';

/**
 * Protects /api/leads and /api/newsletter from abuse/bot submission.
 * Deliberately generous (per docs/07-environment-variables.md defaults)
 * since this guards a marketing site's contact form, not a login endpoint.
 */
export async function registerRateLimit(app: FastifyInstance) {
  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MS,
    allowList: [],
    errorResponseBuilder: () => ({
      success: false,
      error: 'Too many requests. Please try again in a minute.',
    }),
  });
}
