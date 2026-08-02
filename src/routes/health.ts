import type { FastifyInstance } from 'fastify';
import { prisma } from '../db/client.js';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async (_request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return reply.status(200).send({ status: 'ok', database: 'connected' });
    } catch (error) {
      return reply.status(503).send({ status: 'degraded', database: 'unreachable' });
    }
  });
}
