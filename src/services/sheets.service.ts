import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

type SheetRowType = 'lead' | 'order';

/**
 * Pushes a row to the Google Sheet via the Apps Script Web App deployed
 * from google-apps-script/lead-sync.gs.js. See docs/06-google-sheets-integration.md.
 * Fire-and-forget: never throws, never blocks/fails the caller — a Sheets
 * outage must never affect the user-facing request.
 */
export async function pushToSheet(type: SheetRowType, row: Record<string, unknown>): Promise<void> {
  if (!env.GOOGLE_SHEETS_WEBHOOK_URL) {
    logger.debug({ type }, 'GOOGLE_SHEETS_WEBHOOK_URL not configured — skipping sheet sync');
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(env.GOOGLE_SHEETS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: env.GOOGLE_SHEETS_WEBHOOK_SECRET,
        type,
        row,
      }),
      signal: controller.signal,
    });

    const json = (await res.json().catch(() => null)) as { success?: boolean } | null;

    if (!json?.success) {
      logger.warn({ type, status: res.status, response: json }, 'Google Sheets sync returned a non-success response');
    }
  } catch (error) {
    logger.error({ type, error: String(error) }, 'Google Sheets sync failed');
  } finally {
    clearTimeout(timeout);
  }
}
