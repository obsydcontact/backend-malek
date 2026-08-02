import { Resend } from 'resend';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import type { LeadPayload } from '../schemas/lead.schema.js';

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

/**
 * Best-effort notification to the coach that a new lead came in —
 * independent of the Sheet, so they see it even before opening the
 * spreadsheet. Never throws; a failure here must never fail the
 * user-facing request. See docs/03-architecture.md § leads.service.ts.
 */
export async function notifyNewLead(lead: LeadPayload & { leadId: string }): Promise<void> {
  await Promise.allSettled([sendEmailNotification(lead), sendSlackNotification(lead)]);
}

async function sendEmailNotification(lead: LeadPayload & { leadId: string }): Promise<void> {
  if (!resend || !env.NOTIFY_EMAIL_TO) return;

  try {
    await resend.emails.send({
      from: 'Coach Malek Website <notifications@awmalek.ch>',
      to: env.NOTIFY_EMAIL_TO,
      subject: `New lead: ${lead.firstName} ${lead.lastName}`,
      text: [
        `New lead from the website (${lead.source}, locale: ${lead.locale})`,
        '',
        `Name: ${lead.firstName} ${lead.lastName}`,
        `Email: ${lead.email}`,
        `Phone: ${lead.phone ?? 'n/a'}`,
        `Goal: ${lead.goal}`,
        `Message: ${lead.message ?? 'n/a'}`,
        `Lead ID: ${lead.leadId}`,
      ].join('\n'),
    });
  } catch (error) {
    logger.error({ error: String(error) }, 'Failed to send lead notification email');
  }
}

async function sendSlackNotification(lead: LeadPayload & { leadId: string }): Promise<void> {
  if (!env.SLACK_WEBHOOK_URL) return;

  try {
    await fetch(env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `:tada: New lead — *${lead.firstName} ${lead.lastName}* (${lead.goal}) — ${lead.email}`,
      }),
    });
  } catch (error) {
    logger.error({ error: String(error) }, 'Failed to send Slack notification');
  }
}
