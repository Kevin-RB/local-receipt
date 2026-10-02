import { and, desc, eq, gte, ilike, lt, sql } from "drizzle-orm";
import "temporal-polyfill/global";

import {
  categories,
  db,
  findReceiptByIdWithItems,
  receiptItems,
  receipts,
} from "@/lib/db";
import {
  RECEIPT_TIMEZONE,
  receiptDateToISODateString,
} from "@/lib/receipt/datetime";

import type {
  CategoryTotal,
  LineItemSearch,
  MerchantTotal,
  ReceiptDetail,
  ReceiptSummary,
} from "./output-schemas";

const SEARCH_LIMIT = 25;
const LIST_LIMIT = 20;

const roundToCents = (value: number): number => Math.round(value * 100) / 100;

export const startOfReceiptDay = (isoDate: string): Date =>
  new Date(
    Temporal.PlainDate.from(isoDate).toZonedDateTime({
      timeZone: RECEIPT_TIMEZONE,
    }).epochMilliseconds
  );

export const startOfNextReceiptDay = (isoDate: string): Date =>
  new Date(
    Temporal.PlainDate.from(isoDate)
      .add({ days: 1 })
      .toZonedDateTime({ timeZone: RECEIPT_TIMEZONE }).epochMilliseconds
  );

const escapeLike = (value: string): string =>
  value.replaceAll(/[%_\\]/gu, "\\$&");

const optionalDateFilters = (from?: string, to?: string) => {
  const filters = [];
  if (from) {
    filters.push(gte(receipts.transactionDateTime, startOfReceiptDay(from)));
  }
  if (to) {
    filters.push(lt(receipts.transactionDateTime, startOfNextReceiptDay(to)));
  }
  return filters;
};

export const spendByCategory = async (
  ownerId: string,
  from: string,
  to: string
): Promise<CategoryTotal[]> => {
  const rows = await db
    .select({
      category: sql<string>`coalesce(${categories.name}, 'Uncategorised')`,
      total: sql<number>`sum(${receiptItems.lineTotal})::double precision`,
    })
    .from(receiptItems)
    .innerJoin(receipts, eq(receiptItems.receiptId, receipts.id))
    .leftJoin(categories, eq(receiptItems.categoryId, categories.id))
    .where(
      and(
        eq(receipts.userId, ownerId),
        eq(receipts.status, "done"),
        eq(receiptItems.kind, "product"),
        gte(receipts.transactionDateTime, startOfReceiptDay(from)),
        lt(receipts.transactionDateTime, startOfNextReceiptDay(to))
      )
    )
    .groupBy(categories.id, categories.name)
    .orderBy(desc(sql`sum(${receiptItems.lineTotal})`));
  return rows;
};

export const spendByMerchant = async (
  ownerId: string,
  from: string,
  to: string
): Promise<MerchantTotal[]> => {
  const rows = await db
    .select({
      merchant: sql<string>`coalesce(${receipts.merchantName}, 'Unknown')`,
      receipts: sql<number>`count(*)::int`,
      total: sql<number>`sum(${receipts.total})::double precision`,
    })
    .from(receipts)
    .where(
      and(
        eq(receipts.userId, ownerId),
        eq(receipts.status, "done"),
        gte(receipts.transactionDateTime, startOfReceiptDay(from)),
        lt(receipts.transactionDateTime, startOfNextReceiptDay(to))
      )
    )
    .groupBy(receipts.merchantName)
    .orderBy(desc(sql`sum(${receipts.total})`));
  return rows;
};

export const searchLineItems = async (
  ownerId: string,
  { from, query, to }: { from?: string; query: string; to?: string }
): Promise<LineItemSearch> => {
  const items = await db
    .select({
      category: categories.name,
      date: receipts.transactionDateTime,
      item: receiptItems.name,
      kind: receiptItems.kind,
      lineTotal: receiptItems.lineTotal,
      merchant: receipts.merchantName,
      receiptId: receipts.id,
    })
    .from(receiptItems)
    .innerJoin(receipts, eq(receiptItems.receiptId, receipts.id))
    .leftJoin(categories, eq(receiptItems.categoryId, categories.id))
    .where(
      and(
        eq(receipts.userId, ownerId),
        eq(receipts.status, "done"),
        ilike(receiptItems.name, `%${escapeLike(query)}%`),
        ...optionalDateFilters(from, to)
      )
    )
    .orderBy(desc(receipts.transactionDateTime))
    .limit(SEARCH_LIMIT);

  let total = 0;
  for (const item of items) {
    if (item.kind === "product") {
      total += item.lineTotal;
    }
  }

  return {
    count: items.length,
    items: items.map((item) => ({
      ...item,
      date: item.date ? receiptDateToISODateString(item.date) : null,
    })),
    total: roundToCents(total),
  };
};

export const listReceiptSummaries = async (
  ownerId: string,
  { from, merchant, to }: { from?: string; merchant?: string; to?: string }
): Promise<ReceiptSummary[]> => {
  const rows = await db
    .select({
      date: receipts.transactionDateTime,
      hasIntegrityWarning: receipts.hasIntegrityWarning,
      id: receipts.id,
      merchant: receipts.merchantName,
      total: receipts.total,
    })
    .from(receipts)
    .where(
      and(
        eq(receipts.userId, ownerId),
        eq(receipts.status, "done"),
        merchant
          ? ilike(receipts.merchantName, `%${escapeLike(merchant)}%`)
          : undefined,
        ...optionalDateFilters(from, to)
      )
    )
    .orderBy(desc(receipts.transactionDateTime))
    .limit(LIST_LIMIT);
  return rows.map((row) => ({
    ...row,
    date: row.date ? receiptDateToISODateString(row.date) : null,
  }));
};

export const receiptDetail = async (
  ownerId: string,
  receiptId: string
): Promise<ReceiptDetail | null> => {
  const receipt = await findReceiptByIdWithItems(receiptId, ownerId);
  if (!receipt) {
    return null;
  }

  return {
    date: receipt.transactionDateTime
      ? receiptDateToISODateString(receipt.transactionDateTime)
      : null,
    gst: receipt.gst,
    id: receipt.id,
    items: receipt.receiptItems.map((item) => ({
      kind: item.kind,
      lineTotal: item.lineTotal,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
    merchant: receipt.merchantName,
    paymentMethod: receipt.paymentMethod,
    subtotal: receipt.subtotal,
    total: receipt.total,
  };
};
