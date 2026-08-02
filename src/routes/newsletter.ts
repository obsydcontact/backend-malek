import type { FastifyInstance } from 'fastify';
import { newsletterPayloadSchema } from '../schemas/newsletter.schema.js';
import { handleNewNewsletterSubscriber } from '../services/leads.service.js';

export async function newsletterRoutes(app: FastifyInstance) {
  app.post('/api/newsletter', async (request, reply) => {
    const payload = newsletterPayloadSchema.parse(request.body);
    const subscriber = await handleNewNewsletterSubscriber(payload);
    return reply.status(201).send({ success: true, subscriberId: subscriber.id });
  });
}
