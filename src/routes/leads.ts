import type { FastifyInstance } from 'fastify';
import { leadPayloadSchema } from '../schemas/lead.schema.js';
import { handleNewLead } from '../services/leads.service.js';

export async function leadsRoutes(app: FastifyInstance) {
  app.post('/api/leads', async (request, reply) => {
    const payload = leadPayloadSchema.parse(request.body);

    const lead = await handleNewLead(payload, {
      clientIp: request.ip,
      userAgent: request.headers['user-agent'],
    });

    return reply.status(201).send({ success: true, leadId: lead.id });
  });
}
