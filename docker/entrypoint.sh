#!/bin/sh
set -e

npx prisma migrate deploy
npx tsx prisma/seed.ts

if [ -z "${RECEIPT_PRIVATE_KEY_B64:-}" ]; then
  mkdir -p /data
  KEY_FILE="/data/receipt_private_key_b64"
  if [ -f "$KEY_FILE" ]; then
    export RECEIPT_PRIVATE_KEY_B64="$(cat "$KEY_FILE")"
  else
    RECEIPT_PRIVATE_KEY_B64="$(node scripts/gen-receipt-key.mjs)"
    printf '%s' "$RECEIPT_PRIVATE_KEY_B64" > "$KEY_FILE"
    export RECEIPT_PRIVATE_KEY_B64
  fi
fi

exec npx next start -H 0.0.0.0 -p 3000
