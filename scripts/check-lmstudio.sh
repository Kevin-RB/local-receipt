#!/bin/sh
set -eu

HOST="${LM_STUDIO_HOST:-host.docker.internal}"
PORT="${LM_STUDIO_PORT:-1234}"
RETRIES="${LM_STUDIO_RETRIES:-5}"
INTERVAL="${LM_STUDIO_RETRY_INTERVAL:-2}"

check_lmstudio() {
  node -e "
    const opts = { hostname: '$HOST', port: $PORT, path: '/v1/models', timeout: 3000 };
    const req = require('http').get(opts, (res) => {
      process.exit(res.statusCode === 200 ? 0 : 1);
    });
    req.on('error', () => process.exit(1));
    req.on('timeout', () => { req.destroy(); process.exit(1); });
  "
}

echo "Checking LM Studio at ${HOST}:${PORT}..."

count=0
until check_lmstudio; do
  count=$((count + 1))
  if [ "$count" -ge "$RETRIES" ]; then
    echo "⚠️  LM Studio not reachable after $((RETRIES * INTERVAL))s."
    echo "⚠️  Starting anyway — AI features will fail until LM Studio is available."
    exit 0
  fi
  echo "LM Studio not ready, retrying in ${INTERVAL}s... ($count/$RETRIES)"
  sleep "$INTERVAL"
done

echo "✅ LM Studio is reachable"
exit 0