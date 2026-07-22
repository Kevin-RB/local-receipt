import { randomUUID } from "node:crypto";

import { db, receipts } from "@/lib/db";

const demoReceipt = {
  hasIntegrityWarning: false,
  id: randomUUID(),
  items: [
    { line_total: 2.9, name: "Milk 2L", quantity: 1, unit_price: 2.9 },
    { line_total: 3.5, name: "Bread", quantity: 1, unit_price: 3.5 },
    { line_total: 4.5, name: "Apples 1kg", quantity: 1, unit_price: 4.5 },
  ],
  merchant: {
    abn: "89 654 321 098",
    address: "123 Smith St, Fitzroy VIC 3065",
    name: "Coles",
    store_id: "0342",
  },
  payment: {
    method: "EFT",
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

const inserted = await db
  .insert(receipts)
  .values(demoReceipt)
  .returning({ id: receipts.id });

process.stdout.write(`Seeded receipt with id ${inserted[0]?.id}\n`);
process.exit(0);
