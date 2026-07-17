#!/bin/sh
# Smoke check that the Next.js container can resolve the host LM Studio endpoint.
# This script is non-blocking; it only logs the result.
set -e

LM_STUDIO_URL="${LM_STUDIO_URL:-http://host.docker.internal:1234/v1}"

echo "Checking LM Studio connectivity at ${LM_STUDIO_URL} ..."
if curl -sf "${LM_STUDIO_URL}/models" >/dev/null 2>&1; then
  echo "LM Studio is reachable at ${LM_STUDIO_URL}"
else
  echo "WARNING: LM Studio is not reachable at ${LM_STUDIO_URL} (it should be running on the host)"
fi
