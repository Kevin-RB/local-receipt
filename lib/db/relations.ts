import { defineRelations } from "drizzle-orm";

import { receipts } from "@/lib/db/schema/receipt";
import { receiptItems } from "@/lib/db/schema/receipt-item";

export const relations = defineRelations({ receiptItems, receipts }, (r) => ({
  receiptItems: {
    receipt: r.one.receipts({
      from: r.receiptItems.receiptId,
      to: r.receipts.id,
    }),
  },
  receipts: {
    receiptItems: r.many.receiptItems(),
  },
}));
