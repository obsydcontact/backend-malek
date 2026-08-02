import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import type { CapiEventInput, CapiSendResult } from '../../types/capi.types.js';
import { hashEmailForTikTok, hashPhoneForTikTok } from './normalize.js';

// TikTok Events API standard event names differ slightly from Meta's.
const TIKTOK_EVENT_NAME: Record<CapiEventInput['eventName'], string> = {
  Lead: 'SubmitForm',
  CompleteRegistration: 'CompleteRegistration',
  Contact: 'Contact',
};

/**
 * Sends a server-side event to the TikTok Events API.
 * Docs: https://business-api.tiktok.com/portal/docs (Events API v1.3)
 * See docs/05-tracking-pixels-and-capi.md — TikTok is the one platform
 * that KEEPS the leading '+' on the phone number (except China).
 */
export async function sendTikTokCapiEvent(input: CapiEventInput): Promise<CapiSendResult> {
  if (!env.TIKTOK_PIXEL_ID || !env.TIKTOK_ACCESS_TOKEN) {
    return { platform: 'tiktok', success: false, error: 'TikTok Events API not configured' };
  }

  const user: Record<string, unknown> = {
    email: hashEmailForTikTok(input.email),
    phone: hashPhoneForTikTok(input.phone),
    ip: input.clientIp,
    user_agent: input.userAgent,
    ttclid: input.ttclid,
  };
  Object.keys(user).forEach((key) => user[key] === undefined && delete user[key]);

  const body = {
    event_source: 'web',
    event_source_id: env.TIKTOK_PIXEL_ID,
    data: [
      {
        event: TIKTOK_EVENT_NAME[input.eventName],
        event_time: input.eventTimeSeconds,
        event_id: input.eventId,
        user,
        page: input.pageUrl ? { url: input.pageUrl } : undefined,
      },
    ],
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch('https://business-api.tiktok.com/open_api/v1.3/event/track/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Token': env.TIKTOK_ACCESS_TOKEN,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const json = await res.json().catch(() => null);
    const success = res.ok && (json as { code?: number } | null)?.code === 0;

    if (!success) {
      logger.error({ platform: 'tiktok', status: res.status, response: json }, 'TikTok Events API call failed');
    }

    return { platform: 'tiktok', success, statusCode: res.status, response: json };
  } catch (error) {
    logger.error({ platform: 'tiktok', error: String(error) }, 'TikTok Events API request threw');
    return { platform: 'tiktok', success: false, error: String(error) };
  }
}
