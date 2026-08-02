import { buildApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';

async function main() {
  const app = await buildApp();

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    logger.info(`Coach Malek backend listening on port ${env.PORT} (${env.NODE_ENV})`);
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main();
