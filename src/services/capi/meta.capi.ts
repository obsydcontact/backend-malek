import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import type { CapiEventInput, CapiSendResult } from '../../types/capi.types.js';
import { hashEmailForMeta, hashNameField, hashPhoneForMeta } from './normalize.js';

const META_EVENT_NAME: Record<CapiEventInput['eventName'], string> = {
  Lead: 'Lead',
  CompleteRegistration: 'CompleteRegistration',
  Contact: 'Contact',
};

/**
 * Sends a server-side event to Meta Conversions API.
 * Docs: https://developers.facebook.com/docs/marketing-api/conversions-api
 * See docs/05-tracking-pixels-and-capi.md for the exact hashing spec.
 */
export async function sendMetaCapiEvent(input: CapiEventInput): Promise<CapiSendResult> {
  if (!env.META_PIXEL_ID || !env.META_ACCESS_TOKEN) {
    return { platform: 'meta', success: false, error: 'Meta CAPI not configured' };
  }

  const userData: Record<string, unknown> = {
    em: hashEmailForMeta(input.email) ? [hashEmailForMeta(input.email)] : undefined,
    ph: hashPhoneForMeta(input.phone) ? [hashPhoneForMeta(input.phone)] : undefined,
    fn: hashNameField(input.firstName),
    ln: hashNameField(input.lastName),
    client_ip_address: input.clientIp,
    client_user_agent: input.userAgent,
    fbp: input.fbp,
    fbc: input.fbc,
  };

  // Remove undefined keys — Meta rejects empty arrays/null values for some fields.
  Object.keys(userData).forEach((key) => userData[key] === undefined && delete userData[key]);

  const body = {
    data: [
      {
        event_name: META_EVENT_NAME[input.eventName],
        event_time: input.eventTimeSeconds,
        event_id: input.eventId,
        action_source: 'website',
        event_source_url: input.pageUrl,
        user_data: userData,
      },
    ],
    ...(env.META_TEST_EVENT_CODE ? { test_event_code: env.META_TEST_EVENT_CODE } : {}),
  };

  const url = `https://graph.facebook.com/v20.0/${env.META_PIXEL_ID}/events?access_token=${env.META_ACCESS_TOKEN}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      logger.error({ platform: 'meta', status: res.status, response: json }, 'Meta CAPI call failed');
      return { platform: 'meta', success: false, statusCode: res.status, response: json };
    }

    return { platform: 'meta', success: true, statusCode: res.status, response: json };
  } catch (error) {
    logger.error({ platform: 'meta', error: String(error) }, 'Meta CAPI request threw');
    return { platform: 'meta', success: false, error: String(error) };
  }
}
