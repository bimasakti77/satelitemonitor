#!/bin/sh
set -e

echo ">> Waiting for database..."
until npx prisma db push --skip-generate 2>/dev/null; do
  echo "   Database not ready, retrying in 3s..."
  sleep 3
done

echo ">> Database schema synced."

if [ "${RUN_SEED:-true}" = "true" ]; then
  echo ">> Seeding database..."
  npx tsx prisma/seed.ts || echo "   Seed skipped or already done."
fi

echo ">> Starting SuperApps Monitor..."
exec node server.js
