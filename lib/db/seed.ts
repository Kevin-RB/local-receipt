import { randomUUID } from "node:crypto";

import { db, receiptItems, receipts } from "@/lib/db";

const demoReceipt = {
  hasIntegrityWarning: false,
  id: randomUUID(),
  merchant: {
    abn: "89 654 321 098",
    address: "123 Smith St, Fitzroy VIC 3065",
    name: "Coles",
    store_id: "0342",
  },
  payment: {
    method: "card" as const,
  },
  status: "done" as const,
  totals: {
    gst: 1,
    subtotal: 9.9,
    total: 10.9,
  },
  transaction: {
    datetime: "2026-06-15T14:32:00+10:00",
    receipt_number: "0342-0087-1234",
  },
};

const demoItems = [
  { lineTotal: 2.9, name: "Milk 2L", quantity: 1, unitPrice: 2.9 },
  { lineTotal: 3.5, name: "Bread", quantity: 1, unitPrice: 3.5 },
  { lineTotal: 4.5, name: "Apples 1kg", quantity: 1, unitPrice: 4.5 },
];

const inserted = await db
  .insert(receipts)
  .values(demoReceipt)
  .returning({ id: receipts.id });

const receiptId = inserted[0]?.id;
if (receiptId) {
  await db
    .insert(receiptItems)
    .values(demoItems.map((item) => ({ ...item, receiptId })));
}

process.stdout.write(`Seeded receipt with id ${receiptId}\n`);
process.exit(0);
