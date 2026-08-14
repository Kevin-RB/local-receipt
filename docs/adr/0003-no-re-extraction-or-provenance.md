# ADR-0003: No re-extraction or provenance tracking (for now)

Date: 2026-08-13

## Status

Accepted (deferred)

## Context

The manual-edit feature ships without provenance tracking or re-extraction. Three capabilities were considered and deferred:

- A provenance column on `receipt_items` to distinguish AI-extracted rows from human-added/edited rows.
- A "manually edited" flag on the receipt row.
- A re-extraction feature (re-run the OCR + parse pipeline on an already-done receipt and replace the stored data).

## Decision

Ship without provenance or re-extraction. The integrity-warning recompute (sum of line items vs. stated total) already surfaces data-quality issues without needing to know the source of each row. Adding provenance now would be speculative complexity for a capability that may never ship.

## Consequences

- No way to tell which receipt items were AI-extracted vs. human-edited.
- No re-extraction path exists.
- If re-extraction later ships, provenance will be hard to add retroactively — there is no baseline to distinguish old edits from new.

## Revisit when

Any one of these becomes true:

1. Re-extraction becomes a requested feature (re-run extraction on an existing receipt and merge/replace the stored data).
2. The app needs audit metrics (e.g. "X% of AI-extracted rows were manually corrected").
3. A user wants to keep their manual edits and discard only the AI-extracted rows on a re-extraction.

At that point, provenance tracking needs a grilling session before implementation.

## Related

- Issue #26 (decision record)
- Manual-edit feature (#28)
