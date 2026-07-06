#!/bin/sh
set -e

echo ">> Waiting for database..."
until npx prisma db push --skip-generate 2>/dev/null; do
  echo "   Database not ready, retrying in 3s..."
  sleep 3
done

echo ">> Database schema synced."

if [ "${CLEAR_NEXT_CACHE:-true}" = "true" ]; then
  echo ">> Clearing Next.js cache..."
  rm -rf /app/.next/* 2>/dev/null || true
fi

if [ "${RUN_SEED:-false}" = "true" ]; then
  echo ">> Seeding database (safe mode — existing layanan tidak dihapus)..."
  npx tsx prisma/seed.ts || echo "   Seed skipped or failed."
else
  echo ">> Seed skipped (RUN_SEED=false)."
fi

echo ">> Starting development server..."
exec npm run dev -- --hostname 0.0.0.0
