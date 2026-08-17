import { generateText, Output } from "ai";

import { ReceiptInformationExtractionSchema } from "@/lib/db/contract";

import { lmstudio, ORC_MODEL, PARSE_MODEL } from "./provider";

export const TRANSCRIPTION_PROMPT =
  "Transcribe the text from this receipt image. Preserve line breaks, item names, prices, totals, dates, merchant name, and any other visible text as faithfully as possible. Return only the raw transcribed text.";

export const PARSE_PROMPT = `You are a receipt data extraction expert. Given the raw OCR transcription of a receipt, extract structured receipt data following these rules:

## Field mapping rules

- **merchant.name**: The store or business name, typically at the top of the receipt.
- **merchant.abn**: Australian Business Number if present (11-digit number, may be formatted as XX XXX XXX XXX).
- **merchant.address**: Store address, typically near the top.
- **merchant.storeId**: Store/branch identifier if present.
- **transaction.datetime**: Transaction date and time as a bare ISO 8601 string representing the local wall-clock time printed on the receipt (e.g. "2026-07-28T18:51:00"). Do NOT include a timezone suffix ("Z", "+10:00", etc.).
- **transaction.receiptNumber**: Receipt/invoice/transaction number if present.
- **items**: Array of line items. Each item must have a **name** (string) and **lineTotal** (number, in dollars). May optionally have **quantity** (number) and **unitPrice** (number).
- **totals.total**: The final total amount paid (number, in dollars). Always required.
- **totals.subtotal**: Pre-tax subtotal if present (number, in dollars).
- **totals.gst**: GST amount if present (number, in dollars).
- **payment.method**: Always present. Payment method, normalized to one of "cash", "card", or "other":
  - Card-like methods (e.g. VISA, Mastercard, EFTPOS, debit, credit) → "card"
  - Cash → "cash"
  - Anything unrecognized → "other"
  If no payment method appears on the receipt at all, return "other".

## Sub-line collapse rules

Some receipts have multi-line entries where an item name spans multiple OCR lines, and modifiers (size, colour, options) appear on separate lines below the item name. These modifiers should be folded into the **name** field of a single item, not treated as separate items.

Example:
  "REG LATTE"
  "SRIRACHA CHICKEN"
  "DINE IN"
  "LARGE"
Should become:
  { name: "REG LATTE SRIRACHA CHICKEN LARGE (DINE IN)", lineTotal: ... }

Rules for folding:
- Lines that are only a size/colour/modifier or dine-in/takeaway flag that follow an item line should be appended to the preceding item name.
- Lines that contain a dollar amount on the same line are always separate items.

## Amount extraction

- All amounts are in dollars (e.g. "$12.50" → 12.50).
- Remove currency symbols, parse as numbers.
- Negative amounts (discounts) should be treated as negative values in item lineTotals.

## Fallback rules

- If the subtotal cannot be identified but total is present, omit subtotal.
- If GST cannot be identified, omit it.
- If the merchant name cannot be found, use "Unknown Merchant".
- If the transaction datetime cannot be parsed to ISO 8601, omit it.

Return valid JSON conforming to the schema. Use appropriate types (strings for text, numbers for amounts).`;

export const transcribeReceiptImage = async (
  base64: string,
  mimeType: string
): Promise<string> => {
  const { text } = await generateText({
    maxRetries: 1,
    messages: [
      {
        content: [
          { text: TRANSCRIPTION_PROMPT, type: "text" },
          { data: base64, mediaType: mimeType, type: "file" },
        ],
        role: "user",
      },
    ],
    model: lmstudio(ORC_MODEL),
    temperature: 0,
  });
  return text;
};

export const parseReceiptText = async (transcript: string) => {
  const { output } = await generateText({
    maxRetries: 1,
    messages: [
      {
        content: `${PARSE_PROMPT}\n\nReceipt OCR transcript:\n\n${transcript}`,
        role: "user",
      },
    ],
    model: lmstudio(PARSE_MODEL),
    output: Output.object({
      schema: ReceiptInformationExtractionSchema,
    }),
    temperature: 0,
  });

  return output;
};
