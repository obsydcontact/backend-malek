#!/bin/sh
# ------------------------------------------------------------------
# Runs on every container start (see docs/09-database-and-migrations.md).
# Applies any pending Prisma migrations against DATABASE_URL BEFORE
# the Fastify server starts accepting traffic. `prisma migrate deploy`
# is safe to run on every boot: it only applies migrations that have
# not yet been applied, and is idempotent.
# ------------------------------------------------------------------
set -e

echo "[entrypoint] Running database migrations..."
npx prisma migrate deploy

echo "[entrypoint] Migrations complete. Starting server..."
exec "$@"
