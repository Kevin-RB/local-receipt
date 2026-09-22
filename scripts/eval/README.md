# Extraction-quality harness

An offline, manually-run harness that pushes real receipt images through the
shipped two-pass extraction (OCR, then parse) and diffs the result against a
human-corrected golden. Every mismatch is classified as an **OCR error** (the
transcript never contained the value) or a **parse error** (the transcript
contained it and the parser got it wrong).

It needs a live LM Studio and is **never** part of CI.

## Layout

Everything under `fixtures/` is gitignored, because real receipts contain
personal data (addresses, ABNs, partial card numbers).

```
fixtures/
  receipts/<id>.jpg|png   # fixture images, named by their SHA-256
  golden/<id>.json        # one corrected golden per fixture
  report/report.json      # last run's machine-readable output
```

`<id>` is the SHA-256 of the image bytes, so byte-identical duplicate uploads
collapse to a single fixture.

## Golden format

```jsonc
{
  "id": "<sha256 of the image>",
  "image": "receipts/<id>.jpg",
  "extraction": {
    // The human-corrected extraction, validated against the extraction contract.
    "merchant": { "name": "ALDI" },
    "payment": { "method": "card" },
    "totals": { "subtotal": 78.58, "total": 78.58 },
    "transaction": { "datetime": "2026-07-28T18:51:00" },
    "items": [
      { "kind": "product", "name": "Groceries", "lineTotal": 78.21, "quantity": 1 },
      { "kind": "surcharge", "name": "CREDIT SURCHARGE", "lineTotal": 0.37, "quantity": 1 }
    ]
  },
  // Expected printed text per field path, used to separate OCR from parse errors.
  // Omit any field the receipt does not print.
  "evidence": {
    "merchant.name": "ALDI",
    "totals.total": "78.58"
  },
  "notes": "optional"
}
```

Follow the money model (ADR-0007): `subtotal` and `gst` appear only when the
receipt prints them, `quantity` is `1` when none is printed, and `unitPrice` is
omitted unless printed.

## Building the fixture set

1. Index a directory of real receipt photos. This hashes each image, copies the
   unique ones into `fixtures/receipts/`, and reports byte-identical duplicates
   it skipped:

   ```
   pnpm eval --index ~/Receipts
   ```

2. For each printed id, author `fixtures/golden/<id>.json` by hand.

## Running

```
pnpm eval                                   # both passes, ORC_MODEL → PARSE_MODEL
pnpm eval --ocr-model glm-ocr --parse-model google/gemma-4-e4b --parse-model <larger>
pnpm eval --fixture <id>                    # one fixture
pnpm eval --pass ocr                        # OCR only (writes transcripts)
pnpm eval --pass parse --fixture <id> --transcript <file>
```

Results print to the terminal and land in `fixtures/report/report.json`, which
is suitable for diffing two runs.
