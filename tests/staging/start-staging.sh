#!/usr/bin/env bash
# Starts a seeded staging LMS on http://127.0.0.1:4697 for the persona focus groups.
set -eu
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"; W="${1:-/tmp/lms-staging}"
pkill -f "[s]erver/index.ts" 2>/dev/null || true; pkill -f "[m]ock-services.mjs" 2>/dev/null || true; sleep 0.5
rm -rf "$W"; mkdir -p "$W"
for f in server shared src public index.html vite.config.ts tsconfig.json package.json node_modules dist; do ln -s "$ROOT/$f" "$W/$f"; done
node "$ROOT/node_modules/tsx/dist/cli.mjs" "$ROOT/tests/staging/seed-staging.ts" "$W" /tmp/stg-video.webm /tmp/stg-rubric.pdf
setsid nohup node "$ROOT/tests/staging/mock-services.mjs" > /tmp/stg-mock.log 2>&1 < /dev/null &
( cd "$W" && exec setsid nohup env PORT=4697 NODE_ENV=production ANTHROPIC_API_KEY=x ANTHROPIC_BASE_URL=http://127.0.0.1:4795 \
  RAZORPAY_KEY_ID=rzp_test_staging RAZORPAY_KEY_SECRET=staging RAZORPAY_API_BASE=http://127.0.0.1:4795 PAYPAL_API_BASE=http://127.0.0.1:4795 MAIL_OUTBOX=1 \
  YOUTUBE_BASE_URL=http://127.0.0.1:9 node "$ROOT/node_modules/tsx/dist/cli.mjs" server/index.ts > /tmp/stg-server.log 2>&1 < /dev/null ) &
for i in $(seq 120); do curl -sf 127.0.0.1:4697/api/health >/dev/null && break; sleep 0.5; done
curl -s 127.0.0.1:4697/api/health; echo
