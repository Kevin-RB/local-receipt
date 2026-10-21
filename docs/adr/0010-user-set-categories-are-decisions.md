# ADR-0010: A user-set line item category is a decision, not a draft

Date: 2026-10-05

## Status

Accepted

## Context

ADR-0009 made categories a derived, re-runnable layer, with one condition attached: "when manual category editing ships, a `category_source` marker (`ai` | `user`) must be added first, so a re-run preserves user corrections instead of clobbering them." This is that point.

The categorization pass classifies in a single shot over the item's name, and it is not always right. Items it cannot place stay `category_id IS NULL` — an uncategorised item is a visible gap, and the owner has no way to close it. Human review of a single line item on the receipt detail page is the cheap fix: the owner already opens that page to check what was extracted.

That review needs two things ADR-0009 does not provide:

- **A place to make the decision.** The manual edit currently replaces every line item on save (delete-then-insert), so a category chosen in the form would be discarded by the next save, and no stored row survives to hold the `user` marker.
- **A way to tell "the AI chose this" from "I chose this".** Without the marker, the only sound policy on a re-run is to overwrite everything, which would silently undo every correction — the failure mode the taxonomy change was supposed to enable.

## Decision

A manual edit now updates line items **in place**, matching submitted items to stored rows by `id`. The plan is computed in `lib/receipt/line-items.ts` (`planLineItemChanges`): a submitted id that is not stored is an insert, a stored id the user dropped is a removal, and a matched pair is an update. This is what makes a per-item category a durable value rather than a transient form field.

`receipt_items.category_source` (`ai` | `user`, default `ai`) records who decided. The categorization pass skips every item marked `user` and stamps `ai` on what it writes, so a re-run applies a taxonomy change to the AI's work and leaves human decisions alone. This is the marker ADR-0009 asked for, and it does not reopen ADR-0003 — no extraction field is recomputed and no provenance is tracked beyond this one column.

`category_source` is derived server-side and is never a value the client sends. But **which category to write cannot be decided by comparing the submitted value against the stored one**, because the submitted value is a snapshot taken when the page loaded: a categorization run may fill an item in between, and the stale form value would then be written back — recorded, misleadingly, as the owner clearing a category they never touched. That reintroduces the silent clobber through the back door, and it is worst exactly where the owner is most likely to be looking (an uncategorised item awaiting a backfill).

So the client sends a `categoryTouched` flag per item alongside the category, and it is the flag, not the value, that gates the write. An untouched item's update carries no category columns at all, leaving whatever is stored in place; a touched one is compared against the stored value to decide `ai` versus `user`. The comparison is by item id, not row index, so removing a line cannot shift it. A line the owner added has no stored counterpart: its category is whatever it was given, `user` when set and `ai` when left empty, so it stays eligible for classification.

The category is bounded by the taxonomy on the write path: `updateReceipt` rejects any submitted id that is not a leaf category, so a hand-crafted request cannot introduce a classification the rest of the app would not recognise. An uncategorised item is a legitimate value, not a validation failure — clearing a category is how the owner says "this belongs to nothing", and it is recorded as a `user` decision so a re-run respects it.

In the UI, each line item row carries a `Category` select grouped by top-level category, with "Uncategorised" as an explicit option rather than an empty field.

## Consequences

- Corrections survive re-runs, which is what makes a taxonomy change safe to apply to existing data.
- A line item the owner deliberately cleared stays uncategorised across re-runs, so the gap remains visible rather than being silently refilled.
- An unrelated save cannot overwrite a category written after the form loaded. The cost is that the category the owner sees can be stale on screen until they reload; the alternative would be writing the form's snapshot over newer data.
- New line items added by hand start uncategorised with `category_source = 'ai'`, so they are eligible for classification — the owner can also classify them directly in the same form.
- `updateReceipt` reads the receipt's items to build the plan, so the ownership check and the write happen against one row set.
- Category ids are validated on every manual edit, which is one extra taxonomy read per save. The taxonomy is small and app-owned.

## Related

- ADR-0009 (categories are derived and re-runnable) — this ADR delivers the `category_source` marker its decision anticipated.
- ADR-0003 (no re-extraction or provenance) — still stands; one marker on the category is not provenance tracking for extracted rows.
- ADR-0002 (server actions for user mutations) — `updateReceipt` remains the only write path.
- Issue #146
