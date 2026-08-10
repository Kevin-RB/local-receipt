# ADR-0002: Server Actions for user-triggered mutations

Date: 2026-08-10

## Status

Accepted

## Context

The app's first mutation path was `POST /api/upload`, a Route Handler chosen because the upload flow is an HTTP exchange: the browser requests a presigned URL, MinIO sends a bucket-notification webhook, Inngest consumes an event. Every actor is an HTTP client, and a Route Handler is the natural shape.

The manual-edit feature introduces a second kind of mutation: a signed-in user editing structured receipt data and saving it. There are no external HTTP callers here — the only caller is the app's own client component, and the payload is typed by the same Zod schemas the server already uses.

Two options were considered:

1. **Route Handler** — `PATCH /api/receipts/[id]`. Consistent with `POST /api/upload`. The client `fetch`es it with a JSON body.
2. **Next.js Server Action** — a `"use server"` function called directly from the client component. Type-safe end-to-end, no manual JSON serialization, no URL to design.

## Decision

Use **Next.js Server Actions** for user-triggered mutations. Keep Route Handlers for interactions that must be HTTP-shaped: external webhooks (MinIO bucket notifications), presigned-URL endpoints, and anything consumed by a non-app client.

The mental model: **Route Handlers are for HTTP callers; Server Actions are for the app's own UI.**

## Consequences

- This is the first Server Action in the repo. It establishes the convention for future user mutations.
- Type safety runs end-to-end: the client calls a typed function, the server receives typed arguments, and both sides share the Zod schemas from `lib/db/`.
- We lose progressive enhancement — the form is submitted via a programmatic client-side `onSubmit` (because the form uses `react-hook-form` for validation and state), not the native `action` attribute. The action is not invocable without JavaScript. Acceptable for this local-first app; revisit if offline / no-JS support becomes a requirement.
- Validation happens twice: once client-side via the Zod resolver (for inline field errors), once server-side inside the action (for safety). This is intentional — the client pass is for UX, the server pass is for correctness.
- Server Actions do not replace the Route Handlers used by the upload flow, MinIO webhook, or Inngest endpoint. Those stay as Route Handlers.

## Related

- Follow-up issue #27 (TanStack Form migration) may revisit the progressive-enhancement trade-off if the form library changes.
- Follow-up issue #25 (DB normalization) will affect what the action writes, not how it is invoked.
