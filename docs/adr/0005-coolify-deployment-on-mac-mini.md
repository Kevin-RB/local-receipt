# ADR-0005: Public deployment on the Mac mini via Coolify (Colima), Cloudflare Tunnel, Inngest Cloud

Date: 2026-08-29

## Status

Accepted

## Context

We deploy the app publicly on a Mac mini 2024 (M4, 16GB) running macOS. Coolify runs inside a Colima Linux VM per Coolify's own macOS guide, hosts a single Docker Compose stack (Next.js, Postgres, MinIO), and the stack is exposed through one Cloudflare Tunnel with a single wildcard route `*.tribi.dev → http://localhost:80` into the Coolify Traefik proxy, which routes per-domain to the Next.js app (`receipts.tribi.dev`) and MinIO's object API (`uploads.tribi.dev`) (T15; see the update below for the pre-T15 topology). Everything else (Postgres, MinIO console, LM Studio) stays private; the Coolify admin becomes reachable at `coolbox.tribi.dev` through the same proxy in T16, behind a Cloudflare Access gate (note: `coolify.tribi.dev` is not the dashboard hostname — it answers with a Cloudflare Access login redirect rather than the dashboard; see the T16–T20 update below). Extraction runs on local models loaded in LM Studio on the macOS host, reached by containers via `host.docker.internal`; a bring-your-own-key cloud LLM is the documented fallback if memory or performance fails.

Two facts drive the choices below and are easy to misremember:

- **Coolify does not officially support macOS.** Its installer targets Linux; the documented macOS path is a Colima VM running Docker Engine, and the maintainers have said macOS/Windows support is out of scope.
- **Inngest runs on Inngest Cloud, not self-hosted.** The issue originally planned a production-mode self-hosted server (signing keys, Postgres-backed).

## Decision

- Host Coolify in a Colima VM on the macOS host anyway, because the alternative — a separate full Linux VM or re-homing the mini's OS — costs more time and memory than it saves at our scale. Docker Engine effectively means "Colima" (rejected: Docker Desktop and OrbStack, neither is Coolify's documented path).
- Use Inngest Cloud over self-hosting: our functions execute in the Next.js process either way, Cloud removes one container and one Postgres database's worth of memory on a tight 16GB budget, and it drops the self-hosted signing-key ceremony. Events carry only identifiers, never receipt bytes or transcripts. Self-hosted remains the documented fallback.
- Keep ADR-0001's presigned-upload flow: the app is served on `receipts.tribi.dev` and MinIO's object API on `uploads.tribi.dev`, so image uploads never round-trip the Next.js server. This is the industry-standard pattern for object-storage uploads. Proxy-uploading through the app was rejected because it would consume app-server bandwidth for no benefit.
- Keep backups same-box for now: nightly `pg_dump` + `mc mirror` land on a local volume on the same mini with 14-day retention. Off-site storage (Backblaze B2) or an external drive is the chosen long-term destination, deferred until the pipeline is proven. This is an explicit, reversible short-cut, not a final design.
- Store secrets only in Coolify per-resource env vars — fresh values generated at rollout, never committed, interpolated into the compose stack. The dev `.env.local` values (plaintext Postgres/MinIO/webhook credentials, `INNGEST_DEV=1`, `NODE_ENV=development`) never ship.

## Consequences

- A CORS rule on the `receipts` bucket must permit PUT from `https://receipts.tribi.dev`, or production uploads fail (they work locally before this is configured).
- Postgres, MinIO console, and LM Studio are not exposed through the tunnel — the Traefik proxy routes only hostnames configured on resources, so anything unpinned on `*.tribi.dev` is caught by the Cloudflare Access gate and answers with a login redirect, not a proxy 404 (see T16). The Coolify admin is exposed at `coolbox.tribi.dev` via the proxy once T16 sets the dashboard domain, gated by Cloudflare Access.
- Same-box backups share a failure domain with the app until off-site storage ships; that risk is accepted while the pipeline is unproven. (Superseded — the backup container was removed; see the 2026-09-08 update below.)
- Production holds no plaintext credentials on disk: secrets live only in Coolify env vars, so the `.env.local` dev values are inapplicable to the deployed stack.

## Update (T15, 2026-09-02): single wildcard tunnel route to Traefik

The tunnel originally had per-hostname routes straight to compose service names (`receipts.tribi.dev → app:3000`, `uploads.tribi.dev → minio:9000`). T15 collapsed these to one operative wildcard route — `*.tribi.dev → http://localhost:80` (Coolify "Access All Resources via Cloudflare Tunnel" guide) — so **all** `*.tribi.dev` traffic lands on the Coolify Traefik proxy and per-domain routing happens through Traefik labels configured in Coolify, not through per-hostname tunnel rules. The `receipts`/`uploads` per-hostname entries remain in the tunnel but all forward to the same proxy service (kept by choice; the wildcard is what routes new domains). Cloudflare zone TLS is **Full (Strict)** with **Always Use HTTPS**; the tunnel leg is encrypted by cloudflared regardless, so the proxy sees plain HTTP on port 80 and Traefik/Cloudflare terminate TLS the way the Coolify guides describe. New apps and domains need zero tunnel changes, and the Coolify admin becomes reachable for T16/T18 at `coolbox.tribi.dev` (behind a Cloudflare Access gate). Origin certificates and a `https://localhost:443` route (Coolify's Full TLS HTTPS variant) remain the documented path if an app ever needs origin-side HTTPS for JWT or callback URLs.

## Update (2026-09-08): remove the same-box backup container

The `backup` container (T12) was removed from the compose stack. It crash-looped from the moment the extended stack first ran: `backup.sh`'s shell arithmetic parses zero-padded clock values (`09`, `05`) as octal, which BusyBox `sh` under `set -eu` treats as a fatal error, so the container exited instantly on every boot and Docker's `unless-stopped` restarted it forever. Because Coolify aggregates the maximum Docker `RestartCount` across every container bearing the app's `coolify.applicationId` label, the backup's restarts appeared as restarts of the whole application, tripping `max_restart_count` and triggering `StopApplication` — which stopped the entire stack. The decision lines above about same-box backups ("Keep backups same-box for now") and their accepted risk are **superseded**.

Backups are being reworked as a separate task (cron-based, likely off-box); until then **no automatic backups run in production**.

## Update (T16–T20, 2026-09): dashboard domain, git-backed deploy, merge-gate CD, headless LM Studio

- **T16 — dashboard domain (issue #71).** The Coolify instance (dashboard) domain is `http://coolbox.tribi.dev`, served through the same tunnel → Traefik path and fronted by a Cloudflare Access application whose policy is tied to the owner's account — only the owner reaches the Coolify login page. The ticket originally named `coolify.tribi.dev`; that hostname (like `minio.` and `console.tribi.dev`) still resolves through the wildcard but answers with a Cloudflare Access login redirect — not the dashboard and not a proxy 404, so the earlier "proxy 404" expectation is superseded. Routing the dashboard through the proxy is also what makes the GitHub App webhook URLs (`/webhooks/source/github/…`) publicly reachable for T18.
- **T17 — git-backed deploy (issue #72).** The production stack runs as a Coolify Docker Compose build-pack resource pointing at the public repo (`docker-compose.coolify.yml`, branch `main`). The first deploy exposed three latent bugs, all fixed on `main`: Node 26 dropped Corepack, so the Dockerfile installs pnpm directly; runner scripts were committed mode 0644, so the Dockerfile now `chmod +x`s them; Traefik's per-resource "Redirect HTTP to HTTPS" caused an infinite loop (the tunnel delivers plain HTTP on :80), so it stays off and Cloudflare terminates TLS plus edge http→https.
- **T18 — merge-gate CD (issue #73).** The GitHub App is installed with auto-deploy on `main`; branch protection requires the CI `quality` job (Typecheck, lint, test) plus the pullfrog review before merge. The old `.github/workflows/deploy.yml` webhook job and the `COOLIFY_DEPLOY_WEBHOOK` secret are removed — no double-deploys. Commit statuses appear on PRs; rollback is one click in Coolify.
- **T20 — headless LM Studio (issue #80).** LM Studio runs headless on the macOS host (`llmster`), bound to loopback only with no API auth (nothing is LAN-exposed); containers reach it at `LM_STUDIO_URL=http://host.docker.internal:1234/v1`. Models are pinned (`glm-ocr`, `google/gemma-4-e4b` with 8k context on parse) with no idle TTL. It does not auto-start on reboot — after a mini reboot run `lms daemon up`, load both models, and `lms server start --port 1234` (see AGENTS.md for the exact command).

## Related

- Issue #54 (public deployment)
- Issues #70–#73 (T15–T18: wildcard tunnel, dashboard domain, git-backed deploy, merge-gate CD)
- Issue #80 (T20: headless LM Studio)
- ADR-0001 (upload via presigned URL and bucket notification)
