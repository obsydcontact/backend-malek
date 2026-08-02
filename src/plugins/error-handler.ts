import type { FastifyError, FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { logger } from '../lib/logger.js';

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError | ZodError, request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        success: false,
        error: 'Validation failed',
        details: error.flatten().fieldErrors,
      });
    }

    if (error.statusCode && error.statusCode < 500) {
      return reply.status(error.statusCode).send({
        success: false,
        error: error.message,
      });
    }

    logger.error({ err: error, url: request.url }, 'Unhandled error');

    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
    });
  });

  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({ success: false, error: `Route ${request.method} ${request.url} not found` });
  });
}
