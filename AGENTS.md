<!-- intent-skills:start -->

## Skill Loading

Before editing files for a substantial task:

- Run `pnpm dlx @tanstack/intent@latest list` from the workspace root to see available local skills.
- If a listed skill matches the task, run `pnpm dlx @tanstack/intent@latest load <package>#<skill>` before changing files.
- Use the loaded `SKILL.md` guidance while making the change.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.

<!-- intent-skills:end -->

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Agent skills

Use the repo-specific skill docs for workflows:

- `docs/agents/issue-tracker.md` — GitHub Issues via `gh`.
- `docs/agents/triage-labels.md` — canonical labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`).
- `docs/agents/domain.md` — how to consume `CONTEXT.md` and `docs/adr/`.

This is a **single-context** repo: read `CONTEXT.md` at the root and `docs/adr/` for decisions. (The multi-context example in `docs/agents/domain.md` is a template; this repo has no `apps/` or `packages/` hierarchy.)

---

## Design principles

- Do not preserve backward compatibility. Remove obsolete paths instead of adding compatibility layers, fallbacks, or migrations.
- Choose the simplest implementation that fully meets the current requirements. Avoid speculative abstractions, configuration, and indirection.
- Grow the system in layers. Start from the smallest version that works end to end, and add each new capability on top of a product that already works. Never trade a working product for unfinished complexity.
- Keep components modular and concerns clearly separated.
- Prefer established, well-maintained libraries when they reduce overall complexity or improve reliability. Do not reimplement common functionality without a clear reason.
- Lean on the dependencies already in the project before writing your own implementation or adding packages. Do not assume a library lacks a capability without checking its documentation and types.
- Make architectural decisions for the long term. Do not accept a stopgap that only works for now and is meant to be replaced later.

---

## Developer commands

Use `pnpm` (package manager is pinned to `pnpm@11.20.0` in `packageManager`).

- `pnpm install` — install dependencies.
- `pnpm dev` — Next.js dev server, bound to `0.0.0.0`.
- `pnpm build` — production build.
- `pnpm start` — production start, bound to `0.0.0.0`.
- `pnpm typecheck` — `tsc --noEmit`.
- `pnpm test` — run the full Vitest suite.
- `pnpm lint` — `ultracite check`.
- `pnpm fix` — `ultracite fix` (auto-fixes most issues).
- `pnpm db:generate` / `pnpm db:migrate` / `pnpm db:push` / `pnpm db:studio` / `pnpm db:seed` — Drizzle operations.

Before committing, run the checks in this order:

1. `pnpm fix` (or `pnpm lint` if you want to see issues first)
2. `pnpm typecheck`
3. `pnpm test`

The pre-commit hook runs `pnpm test` and then `pnpm dlx ultracite fix` and re-stages any files it changed.

## GitHub operations

Always use the `gh` CLI for GitHub operations (`gh pr`, `gh issue`, `gh repo`, `gh release`, `gh auth`, etc.). Do not use raw `git push --force`, manual browser-based PR creation, or other approaches — use `gh`. Refer to `docs/agents/issue-tracker.md` for issue/PR conventions.

---

## Local development

The app is a single Next.js 16 App Router app. Backend services run in Docker; the Next.js app runs on the host.

1. Start **LM Studio** on the host and load an OpenAI-compatible model at `http://localhost:1234/v1`.
2. Start backing services: `docker compose up`.
   - Postgres: `localhost:5432` (database `receipts`).
   - RustFS: API `localhost:9000`, console `localhost:9001` (`/rustfs/console`).
   - Inngest dev server: `localhost:8288`.
3. In another shell, run `pnpm dev`. The app is at `http://localhost:3000`.

`docker compose up` only starts services; it does **not** start the Next.js app. The RustFS webhook and Inngest dev server point to `host.docker.internal:3000/api/...`, so the host app must be reachable at `localhost:3000`.

Local env defaults are in `.env.local` (which is gitignored). Key variables:

- `DATABASE_URL`, `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_WEBHOOK_SECRET`
- `INNGEST_DEV=1`, `INNGEST_BASE_URL=http://localhost:8288`
- `LM_STUDIO_URL`, `ORC_MODEL`, `PARSE_MODEL`
- `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `INVITE_CODE` (required to register)

## Production deployment (Coolify / `docker-compose.coolify.yml`)

The production stack (ADR-0005, ADR-0006) lives in `docker-compose.coolify.yml` and deploys as one Coolify **Compose** resource on the Colima VM. To validate locally on a Docker-capable host:

```
docker compose -f docker-compose.coolify.yml config
```

Key properties:

- **Secrets only in Coolify env vars** — credentials are generated by Coolify magic variables (`SERVICE_USER_RUSTFS`, `SERVICE_PASSWORD_64_POSTGRES` / `RUSTFS` / `RUSTFSWEBHOOK` / `STORAGE` / `BETTERAUTH`) and the repo holds no credentials. The app authenticates as the least-privilege IAM user `receipts-app` (created by `rustfs-init`, scoped to `Get/Put/DeleteObject` on the bucket); the root credentials are used only by `rustfs-init` and the console, never by the running app, because root bypasses IAM evaluation. Required non-credential vars: `POSTGRES_USER`, `POSTGRES_DB`, `STORAGE_BUCKET`, `STORAGE_PUBLIC_ENDPOINT`, `STORAGE_CORS_ORIGIN` (the app's browser origin, e.g. `https://receipts.tribi.dev`), `STORAGE_CONSOLE_HOST` (the tailnet host you open the console at, e.g. `apple-admins-mac-mini`; the console origin is derived from it plus `STORAGE_CONSOLE_HOST_PORT`), `BETTER_AUTH_URL`, `INVITE_CODE`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`. Optional: `LM_STUDIO_URL`, `ORC_MODEL`, `PARSE_MODEL`, plus per-environment admin host-port overrides `POSTGRES_HOST_PORT` (default `55432`), `STORAGE_CONSOLE_HOST_PORT` (default `59001`), and `STORAGE_API_HOST_PORT` (default `59000`) — prod and staging share one Docker host, so staging must override these to avoid host-port collisions. The S3/admin API is published on the host **only** so the RustFS console can reach it (the console is a browser app that calls the API on the server listener directly; unlike MinIO's console it does not proxy server-side). The app and rustfs-init still use the compose network, and presigned traffic still goes via Traefik.
- **Console** (ADR-0006): open `http://<mini-host>:${STORAGE_CONSOLE_HOST_PORT}` and, on first use, set the RustFS server address in the console's **Server Configuration** to `http://<mini-host>:${STORAGE_API_HOST_PORT}` (saved per browser; there is no env var for it). The console origin is derived (`http://${STORAGE_CONSOLE_HOST}:${STORAGE_CONSOLE_HOST_PORT}`) and allowlisted in `RUSTFS_CORS_ALLOWED_ORIGINS`, or the browser blocks the console's API calls; the console listener's own CORS is pinned to the same origin (instead of its default `*`).
- **Images build from the repo Dockerfile** with two targets: `runner` (the app, standalone non-root Next.js server) and `migrator`. The one-shot `migrate` service runs `pnpm db:migrate`; the app starts only after it completes successfully.
- **Data**: `postgres-data`, `rustfs-data`, and `rustfs-logs` named volumes. No publicly-exposed host ports — the app publishes none at all, and postgres/rustfs publish admin ports (the `55432`/`59000`/`59001` family, per-environment overrides above) on the mini's interfaces for LAN/tailnet use only. The Cloudflare tunnel is the only public ingress: one wildcard route `*.tribi.dev → http://localhost:80` hits the Coolify Traefik proxy (T15), which routes by domain to the app/rustfs services. `coolbox.tribi.dev` (Coolify admin) and the other non-app hostnames sit behind a Cloudflare Access gate (T16).
- **Backups**: no automatic backups run in production. The original same-box `backup` container (T12) was removed (2026-09-08) because it crash-looped and Coolify attributed its Docker restart count to the whole stack, tripping the restart limit; rework via cron jobs is a planned separate task.
- **Migrations**: never at app startup. Warm `DATABASE_URL` against a throwaway DB and run `pnpm db:generate` locally; apply with the `migrate` service at deploy.

**Redeploys** (T18 merge-gate CD): open a PR → branch protection requires the CI `quality` job (typecheck/lint/test) plus pullfrog review → merge to `main` → the Coolify GitHub App auto-deploys. No deploy workflow or webhook secret (both retired). Rollback is one click in Coolify.

---

## App architecture

- **UI**: Next.js App Router, React 19, Tailwind CSS v4, shadcn/ui `base-lyra` style.
- **Upload flow**: `POST /api/upload` creates a receipt row with `status = uploading` and returns a presigned storage URL. The browser uploads directly to RustFS. RustFS sends a bucket-notification `POST /api/storage-events`, which promotes the row to `status = pending` and sends `receipt/uploaded` to Inngest.
- **Extraction workflow**: `lib/inngest/functions/transcribe-receipt.ts` runs in the Inngest dev server:
  1. Mark `processing`.
  2. Download the image from RustFS.
  3. OCR with a vision model (`ORC_MODEL`).
  4. Parse the transcript into structured JSON (`PARSE_MODEL`, structured output).
  5. Store the result in Postgres and publish realtime state on `receipt:<id>`.
- **Realtime**: UI subscribes to `receipt:<id>` via `lib/inngest/channels.ts` and `lib/inngest/actions.ts`.
- **Processing status lifecycle**: `uploading` → `pending` → `processing` → `done`/`error`. See `CONTEXT.md` for domain terms.

---

## Code style

- Formatting and linting are handled by **Ultracite** (Oxlint + Oxfmt). Do not run Prettier on the source.
- `components/ui/**` and `README.md` are ignored by `oxfmt.config.ts` and `oxlint.config.ts` because `components/ui` is shadcn-generated. Do not manually lint or reformat those files.
- TypeScript is strict; `tsconfig.json` includes `ESNext.Temporal`. The app uses the native `Temporal` global.

## UI and styling

- Use existing **shadcn/ui** primitives from `components/ui/` before building a custom component. The project already has button, card, dialog, input, label, table, toast, etc.
- Add new shadcn components via the shadcn CLI; generated files land in `components/ui/` and are ignored by the linter/formatter.
- Use the theme tokens in `app/globals.css` (Tailwind CSS v4, CSS variables, `base-lyra` style). Do not introduce one-off color/spacing values or duplicate the theme elsewhere.

## Types

- The database schema in `lib/db/schema/` is the single source of truth for domain types.
- Derive new types from the Drizzle tables and their Zod schemas (e.g., `createSelectSchema`, `createInsertSchema`, `.pick()`, `.extend()`). Re-export from `lib/db/` when the type is needed in multiple places.
- Avoid duplicating field definitions in hand-written interfaces.

---

## Database

- Drizzle ORM (`1.0.0-rc.4`) with `pg` and Postgres.
- Schemas: `lib/db/schema/receipt.ts`, `lib/db/schema/receipt-item.ts`. Relations: `lib/db/relations.ts`.
- Migrations live in `drizzle/` and are generated with `pnpm db:generate`.
- For local dev you can either run `pnpm db:migrate` after generating or use `pnpm db:push`.
- `pnpm db:seed` writes demo data through the `drizzle-seed` library (reset + seed) to a dedicated `receipts_seed` database — never the app's `receipts` database. Point it elsewhere with `SEED_DATABASE_URL`. One-time setup per dev machine: create the database and migrate it, then run the app against it to view the data:
  ```
  docker exec receipt-app-postgres-1 createdb -U postgres receipts_seed
  DATABASE_URL=postgresql://postgres:postgres@localhost:5432/receipts_seed pnpm db:migrate
  pnpm db:seed
  DATABASE_URL=postgresql://postgres:postgres@localhost:5432/receipts_seed pnpm dev
  ```

---

## Testing

- Vitest with `globals: true`. The `@/` alias is mapped in `vitest.config.ts`.
- Run the whole suite: `pnpm test`.
- Run a focused file: `pnpm vitest run <path>` or `pnpm vitest <path>`.
- Current tests are mostly unit tests with mocked DB / AI / storage; they do not require Postgres, RustFS, or LM Studio.
- **Storage smoke check (post-deploy).** After any change to storage, the webhook, or the upload flow, upload a file in the app and confirm the receipt moves `uploading → pending` and a run appears in Inngest. A webhook that silently drops events (e.g. an object-key mismatch) produces no error and no run — this is the check that catches it.

---

## AI / local models

- The AI provider is in `lib/ai/provider.ts` and uses `@ai-sdk/openai-compatible` pointing at LM Studio.
- Default models are `glm-ocr` (OCR) and `google/gemma-4-e4b` (parsing), configurable via `ORC_MODEL` and `PARSE_MODEL`; use exactly the id LM Studio serves (from `GET /v1/models`) — it strips quant suffixes (e.g. `glm-ocr`, not `glm-ocr@q8_0`).
- Production runs LM Studio headless on the Mac mini host (`llmster`), bound to loopback only: no API auth (nothing is LAN-exposed), reached by containers via `LM_STUDIO_URL=http://host.docker.internal:1234/v1`. It does **not** auto-start on reboot — after a mini reboot run: `lms daemon up && lms load glm-ocr && lms load google/gemma-4-e4b --context-length 8192 && lms server start --port 1234` (models pinned, no idle TTL).
- The extraction contract is `lib/db/contract.ts` (`ReceiptInformationExtractionSchema`).

---

## Gotchas

- pnpm is pinned to `pnpm@11.20.0` via `packageManager` in `package.json`; keep the `Dockerfile`, CI (`ci.yml`), and this field in sync.
- The pre-commit hook will auto-format and re-stage files. If it fails, inspect the hook output rather than manually re-running `git add`.
- The dev server binds to `0.0.0.0` so the Docker-hosted services can reach it via `host.docker.internal`.
- RustFS webhook auth must match `STORAGE_WEBHOOK_SECRET` (the bucket notification uses `Authorization: Bearer <secret>`).
- RustFS's `RUSTFS_NOTIFY_WEBHOOK_QUEUE_DIR_PRIMARY` must live outside `/data`; every top-level directory under the data volume is served as a bucket, so a queue dir there appears as a phantom bucket.
- The RustFS data volume must be chowned to uid `10001` (`chown -R 10001:10001`); the single-node on-disk format is compatible with MinIO, so a MinIO volume can be re-used directly after the chown (see ADR-0006).
- Reusing a MinIO data volume drags MinIO's bucket-notification rules across (`arn:minio:…`); those targets don't exist in RustFS, and an unresolvable rule silently breaks event delivery for the whole bucket. `rustfs-init` removes the known MinIO webhook ARN before registering the RustFS rule.
- In `docker-compose.coolify.yml`, the per-environment host-port variables (`POSTGRES_HOST_PORT`, `STORAGE_CONSOLE_HOST_PORT`, `STORAGE_API_HOST_PORT`) are declared in each service's `environment:` block **as well as** in `ports:`. Coolify only discovers variables that appear under `environment:`, so a variable used solely in `ports:` is never created and the mapping silently falls back to its `:-` default — which collides when prod and staging share the Docker host.
- `zod` is at v4. Some files import from `"zod"` and some from `"zod/v4"`; both resolve to v4. Prefer `"zod"` unless the file already uses `"zod/v4"`.
