import { z } from "zod/v4";

import { ReceiptInformationExtractionSchema } from "@/lib/db/contract";

export const goldenSchema = z.object({
  /**
   * Expected printed text per field path (e.g. `totals.total` → "78.58"), used
   * to tell an OCR error from a parse error.
   */
  evidence: z.record(z.string(), z.string()).optional(),
  /** The human-corrected extraction the model output is compared against. */
  extraction: ReceiptInformationExtractionSchema,
  /** SHA-256 of the receipt image, which identifies the fixture. */
  id: z.string().min(1),
  /** Image path relative to the fixtures root. */
  image: z.string().min(1),
  notes: z.string().optional(),
  /**
   * The corrected OCR transcript — the printed text, verified against the
   * receipt. Lets the OCR pass be scored on its own, and lets the parse pass be
   * run against known-good text so its errors are isolated from OCR's.
   *
   * Must be authored from the receipt, never copied from a model's output:
   * a golden derived from the model under test scores that model perfect by
   * construction.
   */
  transcript: z.string().min(1).optional(),
});

export type FixtureGolden = z.infer<typeof goldenSchema>;
