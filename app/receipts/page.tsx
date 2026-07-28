import { ReceiptsList } from "@/components/receipts-list";
import { listReceipts } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ReceiptsPage() {
  const receipts = await listReceipts();

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-bold">Receipts</h1>
      <p className="text-muted-foreground mt-2">
        {receipts.length === 0
          ? "No receipts"
          : `${receipts.length} receipt${receipts.length === 1 ? "" : "s"}`}{" "}
        in the database.
      </p>
      {receipts.length === 0 ? (
        <p className="text-muted-foreground mt-6">No receipts found.</p>
      ) : (
        <ReceiptsList receipts={receipts} />
      )}
    </main>
  );
}
