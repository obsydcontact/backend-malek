import { z } from 'zod';

/**
 * Shape of the POST /api/leads request body. Mirrors the contact form
 * on the frontend (docs/03-architecture.md § API contract) and the
 * `Lead` Prisma model (backend/prisma/schema.prisma).
 */
export const leadGoalEnum = z.enum([
  'weight_loss',
  'muscle_building',
  'body_recomposition',
  'online_coaching',
  'personal_training',
  'nutrition_coaching',
  'other',
]);

export const leadSourceEnum = z.enum(['contact_form', 'newsletter', 'whatsapp_click', 'booking_widget']);

export const leadPayloadSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().trim().email(),
  phone: z.string().trim().min(4).max(30).optional(),
  goal: leadGoalEnum.default('other'),
  message: z.string().trim().max(2000).optional(),
  source: leadSourceEnum.default('contact_form'),
  locale: z.enum(['fr', 'en']).default('fr'),

  // Required for CAPI dedup — see docs/05-tracking-pixels-and-capi.md
  eventId: z.string().uuid(),

  pageUrl: z.string().url().optional(),
  utmSource: z.string().max(200).optional(),
  utmMedium: z.string().max(200).optional(),
  utmCampaign: z.string().max(200).optional(),

  // Raw (unhashed) click identifiers, not PII — see docs/05
  fbp: z.string().max(200).optional(),
  fbc: z.string().max(200).optional(),
  ttclid: z.string().max(200).optional(),
  scclid: z.string().max(200).optional(),
});

export type LeadPayload = z.infer<typeof leadPayloadSchema>;

export const leadGoalToPrisma: Record<z.infer<typeof leadGoalEnum>, string> = {
  weight_loss: 'WEIGHT_LOSS',
  muscle_building: 'MUSCLE_BUILDING',
  body_recomposition: 'BODY_RECOMPOSITION',
  online_coaching: 'ONLINE_COACHING',
  personal_training: 'PERSONAL_TRAINING',
  nutrition_coaching: 'NUTRITION_COACHING',
  other: 'OTHER',
};

export const leadSourceToPrisma: Record<z.infer<typeof leadSourceEnum>, string> = {
  contact_form: 'CONTACT_FORM',
  newsletter: 'NEWSLETTER',
  whatsapp_click: 'WHATSAPP_CLICK',
  booking_widget: 'BOOKING_WIDGET',
};
