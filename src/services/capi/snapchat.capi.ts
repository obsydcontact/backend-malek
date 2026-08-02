import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import type { CapiEventInput, CapiSendResult } from '../../types/capi.types.js';
import { hashEmailForSnapchat, hashPhoneForSnapchat } from './normalize.js';

// Snapchat Conversions API event types.
const SNAPCHAT_EVENT_TYPE: Record<CapiEventInput['eventName'], string> = {
  Lead: 'SIGN_UP',
  CompleteRegistration: 'SIGN_UP',
  Contact: 'SAVE',
};

/**
 * Sends a server-side event to the Snapchat Conversions API.
 * Docs: https://developers.snap.com/marketing-api/Conversions-API
 * See docs/05-tracking-pixels-and-capi.md — Snapchat strips the '+',
 * a leading "00" international prefix, AND a leading trunk '0' from
 * the local number before hashing.
 */
export async function sendSnapchatCapiEvent(input: CapiEventInput): Promise<CapiSendResult> {
  if (!env.SNAPCHAT_PIXEL_ID || !env.SNAPCHAT_ACCESS_TOKEN) {
    return { platform: 'snapchat', success: false, error: 'Snapchat Conversions API not configured' };
  }

  const body: Record<string, unknown> = {
    event_type: SNAPCHAT_EVENT_TYPE[input.eventName],
    event_conversion_type: 'WEB',
    // Snapchat expects Unix MILLISECONDS, unlike Meta/TikTok which use seconds.
    timestamp: input.eventTimeSeconds * 1000,
    event_id: input.eventId,
    hashed_email: hashEmailForSnapchat(input.email),
    hashed_phone_number: hashPhoneForSnapchat(input.phone),
    user_agent: input.userAgent,
    page_url: input.pageUrl,
  };
  Object.keys(body).forEach((key) => body[key] === undefined && delete body[key]);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`https://tr.snapchat.com/v3/${env.SNAPCHAT_PIXEL_ID}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.SNAPCHAT_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      logger.error({ platform: 'snapchat', status: res.status, response: json }, 'Snapchat CAPI call failed');
      return { platform: 'snapchat', success: false, statusCode: res.status, response: json };
    }

    return { platform: 'snapchat', success: true, statusCode: res.status, response: json };
  } catch (error) {
    logger.error({ platform: 'snapchat', error: String(error) }, 'Snapchat CAPI request threw');
    return { platform: 'snapchat', success: false, error: String(error) };
  }
}
