import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';

// A single Prisma Client instance is reused across the app's lifetime.
// In dev with `tsx watch`, guard against creating multiple instances on
// hot reload by stashing the client on the global object.
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (env.NODE_ENV === 'development') {
  global.__prisma = prisma;
}
