import { prisma } from '../db/client.js';
import { logger } from '../lib/logger.js';
import { leadGoalToPrisma, leadSourceToPrisma, type LeadPayload } from '../schemas/lead.schema.js';
import type { NewsletterPayload } from '../schemas/newsletter.schema.js';
import { sendMetaCapiEvent } from './capi/meta.capi.js';
import { sendSnapchatCapiEvent } from './capi/snapchat.capi.js';
import { sendTikTokCapiEvent } from './capi/tiktok.capi.js';
import { notifyNewLead } from './notifications.service.js';
import { pushToSheet } from './sheets.service.js';

interface RequestContext {
  clientIp?: string;
  userAgent?: string;
}

/**
 * Orchestrates a new lead submission end-to-end, per the API contract
 * in docs/03-architecture.md:
 *   1. Insert into Postgres (source of truth — this MUST succeed).
 *   2. Push a mirrored row to the Google Sheet (fire-and-forget).
 *   3. Fan out hashed events to Meta/TikTok/Snapchat CAPI (fire-and-forget).
 *   4. Notify the coach (fire-and-forget).
 * Steps 2-4 run in parallel via Promise.allSettled and can never fail
 * the request — the lead is already durably saved by the time they run.
 */
export async function handleNewLead(payload: LeadPayload, ctx: RequestContext) {
  const lead = await prisma.lead.create({
    data: {
      eventId: payload.eventId,
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      phone: payload.phone,
      goal: leadGoalToPrisma[payload.goal] as never,
      message: payload.message,
      source: leadSourceToPrisma[payload.source] as never,
      locale: payload.locale,
      pageUrl: payload.pageUrl,
      utmSource: payload.utmSource,
      utmMedium: payload.utmMedium,
      utmCampaign: payload.utmCampaign,
      fbp: payload.fbp,
      fbc: payload.fbc,
      ttclid: payload.ttclid,
      scclid: payload.scclid,
    },
  });

  const eventTimeSeconds = Math.floor(lead.createdAt.getTime() / 1000);

  const capiInput = {
    eventId: payload.eventId,
    eventName: 'Lead' as const,
    eventTimeSeconds,
    email: payload.email,
    phone: payload.phone,
    firstName: payload.firstName,
    lastName: payload.lastName,
    pageUrl: payload.pageUrl,
    clientIp: ctx.clientIp,
    userAgent: ctx.userAgent,
    fbp: payload.fbp,
    fbc: payload.fbc,
    ttclid: payload.ttclid,
    scclid: payload.scclid,
  };

  const results = await Promise.allSettled([
    pushToSheet('lead', {
      eventId: payload.eventId,
      leadId: lead.id,
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      phone: payload.phone ?? '',
      goal: payload.goal,
      message: payload.message ?? '',
      source: payload.source,
      locale: payload.locale,
      pageUrl: payload.pageUrl ?? '',
      utmSource: payload.utmSource ?? '',
      utmMedium: payload.utmMedium ?? '',
      utmCampaign: payload.utmCampaign ?? '',
      fbp: payload.fbp ?? '',
      fbc: payload.fbc ?? '',
      ttclid: payload.ttclid ?? '',
      scclid: payload.scclid ?? '',
      status: 'new',
    }),
    sendMetaCapiEvent(capiInput),
    sendTikTokCapiEvent(capiInput),
    sendSnapchatCapiEvent(capiInput),
    notifyNewLead({ ...payload, leadId: lead.id }),
  ]);

  const [, metaResult, tiktokResult, snapResult] = results;

  // Persist last CAPI attempt per platform for debugging match-quality
  // issues later, without needing to grep logs (see docs/09).
  await prisma.lead
    .update({
      where: { id: lead.id },
      data: {
        sheetSyncedAt: new Date(),
        capiMeta: metaResult.status === 'fulfilled' ? (metaResult.value as never) : { error: String(metaResult.reason) },
        capiTikTok: tiktokResult.status === 'fulfilled' ? (tiktokResult.value as never) : { error: String(tiktokResult.reason) },
        capiSnapchat: snapResult.status === 'fulfilled' ? (snapResult.value as never) : { error: String(snapResult.reason) },
      },
    })
    .catch((error) => logger.error({ error: String(error) }, 'Failed to persist CAPI debug results'));

  return lead;
}

export async function handleNewNewsletterSubscriber(payload: NewsletterPayload) {
  const subscriber = await prisma.newsletterSubscriber.upsert({
    where: { email: payload.email },
    update: {},
    create: { email: payload.email, locale: payload.locale },
  });

  await Promise.allSettled([
    pushToSheet('lead', {
      eventId: payload.eventId,
      leadId: subscriber.id,
      firstName: '',
      lastName: '',
      email: payload.email,
      phone: '',
      goal: '',
      message: 'Newsletter signup',
      source: 'newsletter',
      locale: payload.locale,
      status: 'new',
    }),
  ]);

  return subscriber;
}
