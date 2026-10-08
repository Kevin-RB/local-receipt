import type {
  ReceiptInsert,
  ReceiptNested,
  ReceiptSelect,
} from "@/lib/db/schema/receipt";
import {
  receiptDateToLocalString,
  receiptDateTimeToDate,
  RECEIPT_TIMEZONE,
} from "@/lib/receipt/datetime";

const receiptFlatWriteKeys = [
  "gst",
  "merchantAbn",
  "merchantAddress",
  "merchantName",
  "merchantStoreId",
  "paymentMethod",
  "receiptNumber",
  "subtotal",
  "total",
  "transactionDateTime",
] as const;

export type ReceiptFlatWrite = Pick<
  ReceiptInsert,
  (typeof receiptFlatWriteKeys)[number]
>;

const parseTransactionDateTime = (
  datetime: string | undefined,
  timezone: string
): Date | null => {
  if (!datetime) {
    return null;
  }

  try {
    return receiptDateTimeToDate(datetime, timezone);
  } catch {
    return null;
  }
};

/**
 * Flattens a receipt into the columns it writes.
 *
 * Every field absent from the nested shape becomes `null`, never `undefined`.
 * Drizzle drops `undefined` from an update, so passing them through would leave
 * the previously stored value in place: clearing a receipt number and saving
 * would silently keep the old one, and a re-process — whose whole purpose is to
 * replace a bad extraction — would keep every field the new parse happened to
 * omit.
 */
export const receiptToFlat = (
  nested: ReceiptNested,
  timezone = RECEIPT_TIMEZONE
): ReceiptFlatWrite => ({
  gst: nested.totals.gst ?? null,
  merchantAbn: nested.merchant.abn ?? null,
  merchantAddress: nested.merchant.address ?? null,
  merchantName: nested.merchant.name,
  merchantStoreId: nested.merchant.storeId ?? null,
  paymentMethod: nested.payment.method,
  receiptNumber: nested.transaction.receiptNumber ?? null,
  subtotal: nested.totals.subtotal ?? null,
  total: nested.totals.total,
  transactionDateTime: parseTransactionDateTime(
    nested.transaction.datetime,
    timezone
  ),
});

export const receiptToNested = (
  receipt: ReceiptSelect,
  timezone = RECEIPT_TIMEZONE
): ReceiptNested => {
  const method =
    receipt.paymentMethod === "cash" || receipt.paymentMethod === "card"
      ? receipt.paymentMethod
      : "other";

  return {
    merchant: {
      abn: receipt.merchantAbn ?? undefined,
      address: receipt.merchantAddress ?? undefined,
      name: receipt.merchantName ?? "",
      storeId: receipt.merchantStoreId ?? undefined,
    },
    payment: { method },
    totals: {
      gst: receipt.gst ?? undefined,
      subtotal: receipt.subtotal ?? undefined,
      total: receipt.total ?? 0,
    },
    transaction: {
      datetime: receipt.transactionDateTime
        ? receiptDateToLocalString(receipt.transactionDateTime, timezone)
        : undefined,
      receiptNumber: receipt.receiptNumber ?? undefined,
    },
  };
};
