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

Use `pnpm` (package manager is pinned to `pnpm@11.19.0` in `packageManager`).

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
   - MinIO: API `localhost:9000`, console `localhost:9001`.
   - Inngest dev server: `localhost:8288`.
3. In another shell, run `pnpm dev`. The app is at `http://localhost:3000`.

`docker compose up` only starts services; it does **not** start the Next.js app. The MinIO webhook and Inngest dev server point to `host.docker.internal:3000/api/...`, so the host app must be reachable at `localhost:3000`.

Local env defaults are in `.env.local` (which is gitignored). Key variables:

- `DATABASE_URL`, `MINIO_ENDPOINT`, `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`, `MINIO_WEBHOOK_SECRET`
- `INNGEST_DEV=1`, `INNGEST_BASE_URL=http://localhost:8288`
- `LM_STUDIO_URL`, `ORC_MODEL`, `PARSE_MODEL`

---

## App architecture

- **UI**: Next.js App Router, React 19, Tailwind CSS v4, shadcn/ui `base-lyra` style.
- **Upload flow**: `POST /api/upload` creates a receipt row with `status = uploading` and returns a presigned MinIO URL. The browser uploads directly to MinIO. MinIO sends a bucket-notification `POST /api/minio-events`, which promotes the row to `status = pending` and sends `receipt/uploaded` to Inngest.
- **Extraction workflow**: `lib/inngest/functions/transcribe-receipt.ts` runs in the Inngest dev server:
  1. Mark `processing`.
  2. Download the image from MinIO.
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
- Current tests are mostly unit tests with mocked DB / AI / MinIO; they do not require Postgres, MinIO, or LM Studio.

---

## AI / local models

- The AI provider is in `lib/ai/provider.ts` and uses `@ai-sdk/openai-compatible` pointing at LM Studio.
- Default models are `glm-ocr@q8_0` (OCR) and `google/gemma-4-e4b` (parsing), configurable via `ORC_MODEL` and `PARSE_MODEL`.
- The extraction contract is `lib/db/contract.ts` (`ReceiptInformationExtractionSchema`).

---

## Gotchas

- `Dockerfile` installs `pnpm@11.12.0` but `package.json` pins `pnpm@11.19.0`. Align these if you change either.
- The pre-commit hook will auto-format and re-stage files. If it fails, inspect the hook output rather than manually re-running `git add`.
- The dev server binds to `0.0.0.0` so the Docker-hosted services can reach it via `host.docker.internal`.
- MinIO webhook auth must match `MINIO_WEBHOOK_SECRET` (the bucket notification uses `Authorization: Bearer <secret>`).
- `zod` is at v4. Some files import from `"zod"` and some from `"zod/v4"`; both resolve to v4. Prefer `"zod"` unless the file already uses `"zod/v4"`.
