import { randomUUID } from "node:crypto";

import { db, receiptItems, receipts } from "@/lib/db";

const demoReceipt = {
  gst: 1,
  hasIntegrityWarning: false,
  id: randomUUID(),
  merchantAbn: "89 654 321 098",
  merchantAddress: "123 Smith St, Fitzroy VIC 3065",
  merchantName: "Coles",
  merchantStoreId: "0342",
  paymentMethod: "card" as const,
  receiptNumber: "0342-0087-1234",
  status: "done" as const,
  subtotal: 9.9,
  total: 10.9,
  transactionDateTime: new Date("2026-06-15T14:32:00+10:00"),
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
