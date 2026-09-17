# local-receipt

Local-first receipt AI analyser.

Upload a receipt photo via the Next.js web UI, and an Inngest background job extracts merchant, line items, totals, GST, and date using local vision/language models via the AI SDK. The image is stored in RustFS, structured data in Postgres, and the UI updates live via Inngest Realtime.

## Stack

- **Next.js** (App Router) — UI and backend in one app
- **Postgres** — persistence
- **RustFS** — S3-compatible image storage
- **Inngest** — durable background jobs + realtime
- **LM Studio** — local OpenAI-compatible model endpoint (runs on host)

## Run locally

```bash
# Start services + Next.js in Docker compose.
docker compose up
```

The app is available at http://localhost:3000.

## Development

```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm test
```

See `AGENTS.md` for agent-specific conventions.
