# ADR-0009: Categories are a derived, re-runnable layer

Date: 2026-09-24

## Status

Accepted

## Context

We are adding a category to each line item so that spend can be aggregated by category and the AI agent can answer questions like "how much did I spend on groceries last month?". This is the first time the app stores something _derived_ from a receipt rather than something printed on it.

ADR-0003 deliberately deferred provenance tracking and re-extraction: no way to tell AI-extracted rows from human-edited ones, and no path to re-run extraction over an existing receipt. Categorization sits next to that boundary and forces the question early. Unlike extraction, a category is an _interpretation_, and the taxonomy it draws from will change — so a category that cannot be recomputed becomes stranded the moment the taxonomy is edited.

## Decision

A category is stored on the line item (`receipt_items.category_id`), assigned by a separate categorization pass that runs after extraction. The taxonomy is app-owned, controlled, two-level, and shared across all users; the pass chooses a leaf category per item.

In phase 1, categories are AI-derived only and are not manually editable. Because no human input can be overwritten, the categorization pass may be re-run over existing receipts unconditionally: it rewrites `category_id` and touches no other field.

This is **not** re-extraction. No receipt fact is recomputed, no extraction field other than the category is written, and ADR-0003 stands.

Category spend is derived by grouping line items at read time; it is never stored on the receipt row.

## Consequences

- A taxonomy change can be applied to existing data by re-running categorization alone — no re-OCR, no re-parse.
- When manual category editing ships, a `category_source` marker (`ai` | `user`) must be added first, so a re-run preserves user corrections instead of clobbering them. That is a new decision at that time.
- Because a receipt's category is never stored, a mixed receipt (e.g. a supermarket shop spanning several categories) has no single category; it has a breakdown derived from its items.
- Surcharges and discounts also receive categories. Spend-by-category therefore filters on `kind` when it wants purchases only; `kind` remains the lever, not the category.

## Related

- ADR-0003 (no re-extraction or provenance) — still stands; this decision is scoped to categories.
- ADR-0007 (GST-inclusive money model) — how category spend totals are composed.
