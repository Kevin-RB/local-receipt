# ADR-0011: Re-processing replaces the stored extraction

Date: 2026-10-07

## Status

Accepted. Supersedes ADR-0003.

## Context

Some receipts extract badly — a smudged photo OCRs to noise, a receipt layout the parse prompt misreads, a small model that simply cannot read the numbers. Once stored, that extraction is permanent: there is no path back to the pipeline, so the only remedy is to delete the receipt and upload it again, which loses the object key, the transcript, and any manual edit already made.

The owner's stated need is not just "try again" but "try again **with a bigger, smarter model**". Models are currently fixed by environment variables (`ORC_MODEL`, `PARSE_MODEL`, `CATEGORIZE_MODEL`), read at module load. Being able to name the model per run is part of the feature, not a nicety: a re-process with the same model that already failed is not worth performing.

ADR-0003 deferred re-extraction, and its "Revisit when" clause named this exactly: _"Re-extraction becomes a requested feature."_ It is now requested (issue #149). Its second consequence is the live one: _"provenance will be hard to add retroactively — there is no baseline to distinguish old edits from new."_

That provenance worry is real but it is a reason to make the destructive semantics **explicit**, not a reason to keep deferring. The two candidate policies are:

- **Replace** — a re-process overwrites the stored extraction wholesale, including manual edits and user-set categories.
- **Preserve** — a re-process keeps hand-made rows and replaces only machine-made ones.

Preserve requires provenance: a column distinguishing an AI-extracted row from a hand-added one, populated correctly by every future write path (manual edit add, manual edit remove, extraction). That is a schema migration and a permanent obligation on code that does not exist yet, for the sake of a case — "I hand-corrected three lines, now I want a better model for the other twenty" — that has not been reported. Replace is the honest default: it is the same rule the pipeline already uses for its own output, it needs no new state, and it is one thing the owner can be told plainly before they click.

The one thing replace must not do is fail silently. A re-process that fails must leave the receipt exactly as it was.

## Decision

**A re-process is a second run of the existing extraction pipeline over a stored receipt.** It re-runs OCR, parsing, and categorization, and its output **replaces** the stored extraction — all line items, and every field `receiptToFlat` writes. Manual edits and user-set categories on that receipt do not survive it. The confirm dialog says so.

This is deliberately the same code path as a first extraction. `transcribe-receipt` gains a second trigger, `receipt/reprocess`, rather than a second function: the steps are identical and a near-copy is a near-copy that rots.

**Models are chosen per run.** The `receipt/reprocess` event carries `models: { ocr, parse }`. Both already existed as optional parameters on `transcribeReceiptImage` and `parseReceiptText`, so this only widens the event schema and passes the values through. The chosen ids must appear in the list LM Studio reports from `GET /v1/models`, validated server-side at trigger time — a re-process cannot proceed anyway without LM Studio, so validating costs nothing and turns a provider 404 into a message naming the problem.

Categorization re-runs over the new items, exactly as it does after a first extraction, and keeps using the environment-configured `CATEGORIZE_MODEL`. It is a separate model slot with its own existing configuration, and a third picker in a row-action dialog is speculative.

**The claim is atomic, and it happens in the server action.** The action updates the receipt from `done` or `error` to `processing` with a `WHERE status IN (...)` and requires a row back. A request that cannot claim the receipt is refused, so two rapid clicks cannot start two runs against one receipt. The function's own status guard is therefore only a shape check for this trigger — the claim already happened.

**A failed re-process restores the status it started from.** `receipt/reprocess` carries `previousStatus`, and `onFailure` writes that back rather than the usual `error` — unless the receipt is already `done`, which means `storing` committed and the new extraction is the one on the row, so there is nothing to report. Without the restore, a re-process that fails — LM Studio OOMs, the parse model rejects the schema — would leave a receipt whose stored data is still perfectly good marked `error`, which hides the edit form, drops it out of `listDoneReceipts`, and excludes it from every spend query. The data is only replaced in the final `storing` step, so any earlier failure leaves the previous extraction fully intact and the receipt should keep saying so.

**A field the new parse omits is cleared, not kept.** `receiptToFlat` maps every absent field to `null`. Drizzle drops `undefined` from an update, so passing the omission through would leave the previous extraction's value in place — which for a receipt being re-processed to be _fixed_ is the exact opposite of what was asked. (This also fixes the same latent hole in the manual edit: clearing a receipt number and saving used to keep the old one.)

**`storing` deletes before it inserts**, unconditionally, in one transaction. A first extraction has no line items to delete, so the delete is a no-op there and there is no branch to reason about. `categorizedAt` is reset to `null` in the same write: the new items carry no categories, so leaving the old stamp would claim a categorization that no longer exists.

## Consequences

- A bad extraction is recoverable without re-uploading, and the owner can pick a stronger model for the attempt.
- Manual edits and user-set categories on a re-processed receipt are lost. This is stated in the confirm dialog before the action runs, not discovered afterwards. Provenance tracking remains unshipped; if preserving hand-made rows is later wanted, it is a new column and a new ADR, and this one is the thing to supersede.
- `transcribe-receipt` carries a branch on which trigger fired. It is one `event.name` check selecting the model pair and dropping the status precondition; the steps themselves are shared, which is the point.
- The model list is fetched server-side. LM Studio is reachable from the app container but not from the browser in production, so the picker is populated by a server action rather than a client fetch.
- There is no history. A re-process leaves nothing recording that it happened, or with which models, so a receipt that is re-processed and then re-processed again is indistinguishable from one that was never touched. If that matters, it is a run-history table, not a column on `receipts`.
- A receipt is `processing` for the length of a re-process, and `processing` is what `listDoneReceipts` and the spend queries exclude. So a re-processed receipt briefly drops out of the overview and returns when the run lands. `processing` is the only in-flight status the lifecycle has; a separate one would mean touching the enum, both badge maps, the table schema, the spend queries and the edit guard to avoid a one-minute flicker.
- The picker cannot tell a vision model from a text-only one, because LM Studio's model list does not say. A text model can be chosen for OCR and will fail at the provider. The two selects are labelled by role because that is what can honestly be known here.
- An unreachable model server is reported rather than degraded around: the picker lists nothing and the trigger refuses, because no run can happen without the provider.

## Related

- ADR-0003 (no re-extraction or provenance) — superseded by this ADR; its deferral condition was met.
- ADR-0009, ADR-0010 (categories are derived; a user-set category is a decision) — both survive: a re-process replaces the items they annotate, and the `category_source` marker they rely on still governs a categorization re-run. Issue #149 does not reopen them.
- ADR-0002 (server actions for user mutations) — `reprocessReceipt` is the write path, alongside `deleteReceipt`.
- ADR-0008 (persist the OCR transcript) — a re-process overwrites the transcript with the new OCR output, so the transcript on screen is the one that produced the stored data.
- Issue #149.
