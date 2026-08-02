import { z } from 'zod';

export const newsletterPayloadSchema = z.object({
  email: z.string().trim().email(),
  locale: z.enum(['fr', 'en']).default('fr'),
  eventId: z.string().uuid(),
});

export type NewsletterPayload = z.infer<typeof newsletterPayloadSchema>;
