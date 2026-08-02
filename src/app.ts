import Fastify, { type FastifyBaseLogger } from 'fastify';
import { logger } from './lib/logger.js';
import { registerCors } from './plugins/cors.js';
import { registerErrorHandler } from './plugins/error-handler.js';
import { registerRateLimit } from './plugins/rate-limit.js';
import { healthRoutes } from './routes/health.js';
import { leadsRoutes } from './routes/leads.js';
import { newsletterRoutes } from './routes/newsletter.js';

export async function buildApp() {
  const app = Fastify({
    // Cast avoids a structural type mismatch between pino's `Logger` type and
    // Fastify's `FastifyBaseLogger` interface (differing `childLoggerFactory`/
    // `msgPrefix` shapes across versions) — the pino instance is fully
    // compatible with Fastify's logger interface at runtime.
    loggerInstance: logger as unknown as FastifyBaseLogger,
    trustProxy: true, // required behind EasyPanel's reverse proxy for req.ip to be accurate
  });

  await registerCors(app);
  await registerRateLimit(app);
  registerErrorHandler(app);

  await app.register(healthRoutes);
  await app.register(leadsRoutes);
  await app.register(newsletterRoutes);

  return app;
}
