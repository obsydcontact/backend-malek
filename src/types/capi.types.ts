/**
 * Shared shape passed from leads.service.ts into each platform's CAPI
 * sender. Each sender (meta/tiktok/snapchat.capi.ts) is responsible for
 * its own hashing/normalization per docs/05-tracking-pixels-and-capi.md
 * — this type intentionally carries RAW (unhashed) values only.
 */
export interface CapiEventInput {
  eventId: string;
  eventName: 'Lead' | 'CompleteRegistration' | 'Contact';
  eventTimeSeconds: number;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  pageUrl?: string;
  clientIp?: string;
  userAgent?: string;
  fbp?: string;
  fbc?: string;
  ttclid?: string;
  scclid?: string;
}

export interface CapiSendResult {
  platform: 'meta' | 'tiktok' | 'snapchat';
  success: boolean;
  statusCode?: number;
  response?: unknown;
  error?: string;
}
