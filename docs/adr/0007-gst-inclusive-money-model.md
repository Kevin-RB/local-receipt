# ADR-0007: GST-inclusive money model with a single integrity invariant

Date: 2026-09-21

## Status

Accepted

## Context

The extraction contract treated `subtotal` as a pre-tax amount, and the integrity warning compared only the sum of line items against `total`. Reviewing real receipts showed this reading is wrong for the receipts this app captures:

- Coles prints `GST INCLUDED IN TOTAL` — prices are GST-inclusive and GST is a component of the total, not an amount added to it.
- ALDI prints `SUBTOTAL (INCL GST)` and, when a card is used, a separate `CREDIT SURCHARGE` line (e.g. `0.50%` → `0.37`) that sits inside the final `Total`.
- Woolworths prints no GST line at all.

The model was also observed inventing data: on a Coles receipt that prints no subtotal, it stored `subtotal = total − gst`. The pre-tax reading of `subtotal` invited exactly this back-solving.

## Decision

The money model is **GST-inclusive**:

- `total` is the amount paid and is required.
- `gst` is the GST **component included within** the total. It is stored only when the receipt states it, and is never added to anything.
- `subtotal` is the receipt's **printed** subtotal — the sum of line items, GST-inclusive. It is stored only when the receipt prints one, and is never derived.
- The single integrity invariant is `sum(lineTotals) = total`, where line items include surcharges and discounts. The existing `computeIntegrityWarning` formula is unchanged; what changes is that card surcharges are captured as line items (so they stop breaking the sum) and subtotal/GST no longer participate.
- A card surcharge is a line item of kind `surcharge`; a discount is a line item of kind `discount` (negative line total). Products are kind `product`.

No arithmetic relationship involving GST is asserted. The alternative "subtotal + gst = total" identity belongs to GST-exclusive pricing and does not apply to these receipts.

## Considered Options

**GST-exclusive model** (`subtotal + gst = total`). Applies to some Australian receipts, but not these. Supporting both conventions would require recording a per-receipt pricing convention and maintaining two contradictory invariants, which is precisely the ambiguity that caused the mismatches.

## Consequences

- Line-item quantity defaults to `1` at extraction when the receipt states none (a reading of the receipt). Unit price is never derived and never persisted — doing so would create invented figures indistinguishable from printed ones, and ADR-0003 deliberately provides no provenance to tell them apart.
- The diagnostics surface must explain a mismatch (products, surcharges, computed total, delta) rather than only flag it.

## Related

- ADR-0003 (no re-extraction or provenance) still stands; this decision does not add provenance.
- Spec issue #124 (GST-inclusive money model and reconciliation diagnostics).
