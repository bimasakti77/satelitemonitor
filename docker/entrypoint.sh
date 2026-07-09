#!/bin/sh
set -e

PRISMA_CLI=node_modules/prisma/build/index.js
TSX_CLI=node_modules/tsx/dist/cli.mjs

echo ">> Waiting for database..."
until node $PRISMA_CLI db push --skip-generate 2>/dev/null; do
  echo "   Database not ready, retrying in 3s..."
  sleep 3
done

echo ">> Database schema synced."

if [ "${RUN_SEED:-true}" = "true" ]; then
  echo ">> Seeding database..."
  node $TSX_CLI prisma/seed.ts || echo "   Seed skipped or already done."
fi

echo ">> Starting SuperApps Monitor..."
exec node server.js
