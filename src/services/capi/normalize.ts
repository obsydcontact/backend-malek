import { createHash } from 'crypto';
import { parsePhoneNumberWithError } from 'libphonenumber-js';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';

/**
 * PII normalization + hashing for Meta, TikTok, and Snapchat CAPI.
 * See docs/05-tracking-pixels-and-capi.md for the verified spec this
 * file implements exactly. DO NOT change these rules without re-reading
 * that document — each platform has a subtly different phone format.
 */

export function sha256(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

/** Detects an already-hashed 64-char lowercase hex string, to avoid double-hashing. */
function isAlreadyHashed(value: string): boolean {
  return /^[a-f0-9]{64}$/.test(value);
}

/**
 * Converts any raw phone input (local Swiss format, international, etc.)
 * into full E.164 form, e.g. "079 123 45 67" -> "+41791234567".
 * This MUST run before any platform-specific normalization below.
 */
export function toE164(raw: string | undefined | null, defaultRegion = env.DEFAULT_PHONE_REGION): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  try {
    const parsed = parsePhoneNumberWithError(trimmed, defaultRegion as never);
    return parsed.isValid() ? parsed.number : undefined; // E.164, e.g. +41791234567
  } catch (error) {
    logger.warn({ raw, error: String(error) }, 'Failed to parse phone number to E.164');
    return undefined;
  }
}

function lowercaseTrim(value: string): string {
  return value.trim().toLowerCase();
}

// ---------------------------------------------------------------------------
// Meta (Facebook/Instagram)
// Phone: strip everything but digits (including leading '+'), strip leading
// zeros, keep country code. Example: +41 79 123 45 67 -> 41791234567
// ---------------------------------------------------------------------------
export function normalizePhoneForMeta(e164Phone: string): string {
  const digitsOnly = e164Phone.replace(/\D/g, '');
  return digitsOnly.replace(/^0+/, '');
}

export function hashEmailForMeta(email: string | undefined): string | undefined {
  if (!email) return undefined;
  if (isAlreadyHashed(email)) return email;
  return sha256(lowercaseTrim(email));
}

export function hashPhoneForMeta(rawPhone: string | undefined): string | undefined {
  const e164 = toE164(rawPhone);
  if (!e164) return undefined;
  return sha256(normalizePhoneForMeta(e164));
}

// ---------------------------------------------------------------------------
// TikTok
// Phone: E.164 WITH the leading '+' kept, except country code 86 (China),
// where BOTH the '+' and the country code are dropped entirely.
// Example: +41 79 123 45 67 -> +41791234567
// Example: +86 138 0000 0000 -> 13800000000
// ---------------------------------------------------------------------------
export function normalizePhoneForTikTok(e164Phone: string): string {
  const cleaned = e164Phone.replace(/[^\d+]/g, '');
  const isChina = cleaned.replace(/^\+/, '').startsWith('86');
  if (isChina) {
    return cleaned.replace(/^\+?86/, '');
  }
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
}

export function hashEmailForTikTok(email: string | undefined): string | undefined {
  if (!email) return undefined;
  if (isAlreadyHashed(email)) return email;
  return sha256(lowercaseTrim(email));
}

export function hashPhoneForTikTok(rawPhone: string | undefined): string | undefined {
  const e164 = toE164(rawPhone);
  if (!e164) return undefined;
  return sha256(normalizePhoneForTikTok(e164));
}

// ---------------------------------------------------------------------------
// Snapchat
// Phone: strip '+' and all non-digits, strip a leading double-zero ("00")
// international prefix, strip a leading '0' from the local number.
// Example: +41 79 123 45 67 -> 41791234567
// ---------------------------------------------------------------------------
export function normalizePhoneForSnapchat(e164Phone: string): string {
  let digits = e164Phone.replace(/\D/g, '');
  digits = digits.replace(/^00/, '');
  digits = digits.replace(/^0+/, '');
  return digits;
}

export function hashEmailForSnapchat(email: string | undefined): string | undefined {
  if (!email) return undefined;
  if (isAlreadyHashed(email)) return email;
  return sha256(lowercaseTrim(email));
}

export function hashPhoneForSnapchat(rawPhone: string | undefined): string | undefined {
  const e164 = toE164(rawPhone);
  if (!e164) return undefined;
  return sha256(normalizePhoneForSnapchat(e164));
}

// ---------------------------------------------------------------------------
// Shared helpers (fn/ln — used by Meta; hashed the same lowercase+trim way)
// ---------------------------------------------------------------------------
export function hashNameField(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, ''); // strip punctuation, keep unicode letters (accents)
  if (!normalized) return undefined;
  return sha256(normalized);
}
