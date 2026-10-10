# ADR-0012: Realtime fans out one channel per owner

Date: 2026-10-09

## Status

Accepted.

## Context

The receipts table follows runs in flight (ADR-0011), and it watches **many** receipts at once. The first implementation gave each receipt its own Inngest realtime channel (`receipt:<id>`): a `ReceiptStatus` cell subscribed per row whose status was `pending` or `processing`, and the upload toast opened a separate subscription for the receipt it had just uploaded.

A channel per item is the right shape for a detail view — one run, one channel. It is the wrong shape for a list. Every subscription mints its own token through a server action and holds its own connection, so a table of N queued receipts paid N times over to watch at most the concurrency limit's worth of runs. The cost is not only object count: `useRealtime` treats a failed token mint as a retryable stream error, so when the staging token endpoint returned `500` the table re-minted every few seconds **per row** — measured as 52+ failed `POST /receipts` on a single page load, each slower than the last, with the delay proportional to the queue rather than to the work actually running.

## Decision

**One channel per owner, with the receipt id in the payload.** Every run publishes to `user:<ownerId>` on a `state` topic whose data carries `{ receiptId, state, error? }`. The receipts page opens exactly one `useRealtime` subscription and routes each message to its row by `receiptId`.

The token action derives the channel from the **session**, never from the caller. There is no id for a client to supply, so the per-receipt ownership lookup the old action needed disappears rather than being tightened: a caller can only ever subscribe to the channel their own session names.

**The page owns the refresh policy, and it refreshes only for real changes.** The live stage is rendered from the message, so `extracting` / `parsing` / `storing` never refresh. A refresh is scheduled only when a receipt **first appears** (its row did not exist when the page rendered) or **reaches a terminal state** (the run wrote the stored row, and the message carries the stage, not that data). It is deduped per receipt — one refresh per completion, again only if the receipt is re-processed — and debounced across the page, so a burst of finishes is one refetch rather than N. The rule is a pure function (`refreshForTransition`) so it is tested without a socket.

**`reconnect` stays on.** A dropped stream heals itself, and the hook backs off from 250 ms to 5 s between attempts. The storm was not caused by reconnecting — it was caused by doing so _per receipt_ against a token endpoint that was returning `500`. With one channel, any failure is at most one loop for the page, so reconnecting is worth more than the risk it adds. A token endpoint that genuinely breaks is a bug to fix, not a reason to also lose drop recovery.

## Consequences

- Subscriptions and token mints are bounded to **one per page** regardless of how many receipts are queued or how many runs are in flight.
- The table rows and the upload toast read from one map, so they agree by construction instead of being two independent streams that could disagree.
- A receipt that finishes before the subscription opens is still missed: realtime has no server-side replay (ADR-0011). One subscription opened at page load is up earlier than the per-row ones were, which narrows the window without removing it.
- The channel is per owner, so a run's publishes are not visible to another user — but the channel name is a user id, and the only thing guarding it is the token action deriving it from the session. That is the whole authorization story, and it is why the action must never take an id argument.
- A dropped stream re-establishes itself. Because there is no replay, a stage published during the gap is still missed: reconnecting recovers _future_ messages, not the one that arrived while disconnected, so a row that finished during the gap holds its last-known stage until the next terminal message or refresh.
- `messages.all[].data` is typed `unknown` by the SDK even with the topic schema attached, so the provider parses it with `receiptStateSchema` rather than casting. The parse is the type source of truth, not a runtime necessity — the hook already validates by default.

## Related

- ADR-0011 (re-process replaces stored data) — the feature whose run status this transport carries; its "realtime has no replay" consequence still holds.
- ADR-0009, ADR-0010 — unaffected; only the transport changed.
- `.agents/skills/inngest-realtime` — the "live list → global channel, fan-out from each function" pattern this follows.
