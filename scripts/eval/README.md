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
  report/report.json      # the most recent run
  report/report-*.json    # one archive per run, so runs can be diffed
```

`<id>` is the SHA-256 of the image bytes, so byte-identical duplicate uploads
collapse to a single fixture.

## Golden format

```jsonc
{
  "id": "<sha256 of the image>",
  "image": "receipts/<id>.jpg",
  // The corrected OCR transcript: the printed text, verified against the
  // receipt. Enables scoring OCR on its own and parsing against known-good
  // text. Author it from the paper — never copy a model's output, or that
  // model scores perfect by construction.
  "transcript": "ALDI STORES\nChk Breast Bulk CW 15.08\nTOTAL 75.56",
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
  // Expected printed text per field path. Superseded by `transcript` for
  // attribution, but still accepted.
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

### Naming convention: literal printed text

An item `name` records the **printed description column exactly** — no author
cleanup. That means:

- **Keep leading legend markers.** `* MCCAINS PUB STYLE 750GRAM` and
  `*%UNCLE TOBYS YOGHURT 185GRAM` are stored with their `*` / `%` prefixes.
- **Keep internal spacing as printed.** ALDI runs some names together
  (`SlcdPepperoni2x50g`, `ChsShredMozz500g`); store them that way.
- **Keep unit suffixes as printed.** Woolworths prints `Mushroom Sliced 200gp/P`.

Only the separate item-code and price columns are excluded (e.g. the `399727`
in `399727 Chk Breast Bulk CW 15.08 A`).

The golden must contain no interpretation, otherwise the harness measures *"did
the model normalise the way the author did?"* instead of *"did it read the
receipt correctly?"* — and a model that is faithful to the paper scores as
wrong. Normalisation (stripping markers, expanding spacing) is therefore a
**pipeline behaviour**: if it is wanted, the parse prompt has to ask for it, and
the eval will then measure whether it happens consistently.

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
pnpm eval                                   # end-to-end: OCR then parse
pnpm eval --ocr-model glm-ocr --parse-model google/gemma-4-e4b --parse-model <larger>
pnpm eval --fixture <id>                    # one fixture
pnpm eval --pass ocr                        # OCR only, scored against golden transcripts
pnpm eval --pass parse                      # parse only, on each fixture's golden transcript
pnpm eval --pass parse --fixture <id> --transcript <file>   # parse an external transcript
```

### Three measurements, so failures are attributable

Each pass isolates one stage:

| command | what it measures |
|---|---|
| `--pass ocr` | OCR quality, scored against the golden transcript (CER, WER, missing lines) |
| `--pass parse` | parser quality with OCR held perfect — it parses the golden transcript |
| `pnpm eval` | end-to-end — what actually ships |

The first two compose into the third, so a bad end-to-end result decomposes into
"OCR broke it" or "parser broke it" without guessing. Attribution needs the
golden `transcript`; without one, OCR cannot be scored at all.

### The parser is not reproducible

`gemma-4-*` emits reasoning traces, and its output varies run to run even at
`temperature: 0`. Two identical parse-only runs over the same four fixtures
scored **49** and **67** mismatches — ALDI alone went 6 → 19. OCR, by contrast,
was byte-identical across runs.

Practical consequences:

- **Never compare models from a single run.** A one-run difference smaller than
  the run-to-run spread is noise.
- Re-run the same command a few times and compare ranges, not point values.
- Prefer differences that show up in *kind* (a whole line missing, a field that
  is always wrong) over differences in *count*.

Results print to the terminal and land in `fixtures/report/` as
`report-<timestamp>.json` (one archive per run, so you can diff runs after
changing a prompt or swapping a model) plus `report.json` for the most recent
one.

Raw AI SDK calls (full prompts, responses, token usage, `duration_ms`) also go
to `.devtools/generations.json`; view them with `npx @ai-sdk/devtools@latest`
and open http://localhost:4983. That directory is recreated on first run.

## Comparing models

Model ids must be exactly what LM Studio serves — query them rather than
guessing, since LM Studio drops quantisation suffixes (`glm-ocr`, not
`glm-ocr@q8_0`):

```
curl -s http://localhost:1234/v1/models | jq -r '.data[].id'
```

Flags are repeatable, and the harness runs the full cross product:

```
pnpm eval \
  --ocr-model glm-ocr \
  --parse-model google/gemma-4-e4b \
  --parse-model google/gemma-4-12b-qat
```

Each combo gets its own line in the summary: matched/mismatched counts, the
`ocr` vs `parse` split, parse failures, average per-stage latency, and a
per-field breakdown (`items 115/132`, `merchant 7/12`).

Two caveats when reading results:

- **Runs are sequential on purpose.** LM Studio rejects concurrent requests,
  so fixtures are processed one at a time.
- **The first combo's latency is cold.** Moving models in and out of RAM
  dominates it — you may see `parse 136s` for the first combo and `1.7s` for
  the second. Load the models you intend to compare, then treat the first
  combo's timings as a warm-up.
