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

export const receiptToFlat = (
  nested: ReceiptNested,
  timezone = RECEIPT_TIMEZONE
): ReceiptFlatWrite => ({
  gst: nested.totals.gst,
  merchantAbn: nested.merchant.abn,
  merchantAddress: nested.merchant.address,
  merchantName: nested.merchant.name,
  merchantStoreId: nested.merchant.storeId,
  paymentMethod: nested.payment.method,
  receiptNumber: nested.transaction.receiptNumber,
  subtotal: nested.totals.subtotal,
  total: nested.totals.total,
  transactionDateTime: nested.transaction.datetime
    ? receiptDateTimeToDate(nested.transaction.datetime, timezone)
    : null,
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
