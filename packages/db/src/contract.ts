export interface Merchant {
  name: string;
  store_id?: string;
  address?: string;
  abn?: string;
}

export interface Transaction {
  datetime?: string;
  receipt_number?: string;
}

export interface ReceiptItem {
  name: string;
  line_total: number;
  quantity?: number;
  unit_price?: number;
}

export interface Totals {
  total: number;
  gst?: number;
  subtotal?: number;
}

export interface Payment {
  method?: string;
}

export interface ReceiptExtraction {
  merchant: Merchant;
  transaction: Transaction;
  items: ReceiptItem[];
  totals: Totals;
  payment: Payment;
}

/**
 * JSON Schema for the extraction contract.
 * Use with OpenAI response_format: { type: "json_schema", json_schema: { ... } }
 */
export const receiptExtractionJsonSchema = {
  name: "receipt_extraction",
  schema: {
    additionalProperties: false,
    properties: {
      items: {
        items: {
          additionalProperties: false,
          properties: {
            line_total: { type: "number" as const },
            name: { type: "string" as const },
            quantity: { type: "number" as const },
            unit_price: { type: "number" as const },
          },
          required: ["name", "line_total"],
          type: "object" as const,
        },
        type: "array" as const,
      },
      merchant: {
        additionalProperties: false,
        properties: {
          abn: { type: "string" as const },
          address: { type: "string" as const },
          name: { type: "string" as const },
          store_id: { type: "string" as const },
        },
        required: ["name"],
        type: "object" as const,
      },
      payment: {
        additionalProperties: false,
        properties: {
          method: { type: "string" as const },
        },
        required: [],
        type: "object" as const,
      },
      totals: {
        additionalProperties: false,
        properties: {
          gst: { type: "number" as const },
          subtotal: { type: "number" as const },
          total: { type: "number" as const },
        },
        required: ["total"],
        type: "object" as const,
      },
      transaction: {
        additionalProperties: false,
        properties: {
          datetime: { type: "string" as const },
          receipt_number: { type: "string" as const },
        },
        required: [],
        type: "object" as const,
      },
    },
    required: ["merchant", "transaction", "items", "totals", "payment"],
    type: "object" as const,
  },
  strict: true,
} as const;
