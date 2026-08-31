#!/bin/sh
set -eu

# Production runner entrypoint (standalone Next.js server, `node server.js`).
# Best-effort LM Studio check (AI fails gracefully when the local model server
# is down), then boot the standalone server as PID 1 for graceful shutdown.
# Database migrations are applied by the separate `migrate` deploy step, not
# at app startup.

./scripts/check-lmstudio.sh
exec node server.js
