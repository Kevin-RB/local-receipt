# ADR-0005: Public deployment on the Mac mini via Coolify (Colima), Cloudflare Tunnel, Inngest Cloud

Date: 2026-08-29

## Status

Accepted

## Context

We deploy the app publicly on a Mac mini 2024 (M4, 16GB) running macOS. Coolify runs inside a Colima Linux VM per Coolify's own macOS guide, hosts a single Docker Compose stack (Next.js, Postgres, MinIO, backup job), and the stack is exposed through one Cloudflare Tunnel with a single wildcard route `*.tribi.dev → http://localhost:80` into the Coolify Traefik proxy, which routes per-domain to the Next.js app (`receipts.tribi.dev`) and MinIO's object API (`uploads.tribi.dev`) (T15; see the update below for the pre-T15 topology). Everything else (Postgres, MinIO console, LM Studio) stays private; the Coolify admin becomes reachable at `coolify.tribi.dev` through the same proxy in T16. Extraction runs on local models loaded in LM Studio on the macOS host, reached by containers via `host.docker.internal`; a bring-your-own-key cloud LLM is the documented fallback if memory or performance fails.

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
- Postgres, MinIO console, and LM Studio are not exposed through the tunnel — the Traefik proxy routes only hostnames configured on resources, so anything unpinned on `*.tribi.dev` gets a proxy 404, not a tunnel 404. The Coolify admin is exposed at `coolify.tribi.dev` via the proxy once T16 sets the dashboard domain (optionally gated by Cloudflare Access).
- Same-box backups share a failure domain with the app until off-site storage ships; that risk is accepted while the pipeline is unproven.
- Production holds no plaintext credentials on disk: secrets live only in Coolify env vars, so the `.env.local` dev values are inapplicable to the deployed stack.

## Update (T15, 2026-09-02): single wildcard tunnel route to Traefik

The tunnel originally had per-hostname routes straight to compose service names (`receipts.tribi.dev → app:3000`, `uploads.tribi.dev → minio:9000`). T15 replaced them with one route — `*.tribi.dev → http://localhost:80` (Coolify "Access All Resources via Cloudflare Tunnel" guide) — so **all** `*.tribi.dev` traffic lands on the Coolify Traefik proxy and per-domain routing happens through Traefik labels configured in Coolify, not through per-hostname tunnel rules. Cloudflare zone TLS is **Full (Strict)** with **Always Use HTTPS**; the tunnel leg is encrypted by cloudflared regardless, so the proxy sees plain HTTP on port 80 and Traefik/Cloudflare terminate TLS the way the Coolify guides describe. New apps and domains need zero tunnel changes, and the Coolify admin becomes reachable for T16/T18. Origin certificates and a `https://localhost:443` route (Coolify's Full TLS HTTPS variant) remain the documented path if an app ever needs origin-side HTTPS for JWT or callback URLs.

## Related

- Issue #54 (public deployment)
- ADR-0001 (upload via presigned URL and bucket notification)
