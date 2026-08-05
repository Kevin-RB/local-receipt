import { ArrowLeft, BadgeAlert, FileCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { findReceiptByIdWithItems } from "@/lib/db";
import type { ReceiptSelect } from "@/lib/db/schema/receipt";

interface ReceiptDetailPageProps {
  params: Promise<{ id: string }>;
}

const currencyFormatter = new Intl.NumberFormat("en-AU", {
  currency: "AUD",
  style: "currency",
});

const dateFormatter = new Intl.DateTimeFormat("en-AU", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Australia/Brisbane",
});

const statusBadgeVariant: Record<
  ReceiptSelect["status"],
  "default" | "destructive" | "outline" | "secondary"
> = {
  done: "default",
  error: "destructive",
  pending: "secondary",
  processing: "secondary",
  uploading: "secondary",
};

const formatDateTime = (date: Date | null | undefined): string | null => {
  if (!date) {
    return null;
  }
  return dateFormatter.format(date.toTemporalInstant());
};

const formatCurrency = (value: number | undefined): string | null =>
  value === undefined ? null : currencyFormatter.format(value);

const DetailItem = ({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  return (
    <div className="grid grid-cols-2 gap-2 border-b py-2 last:border-b-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium">{value}</dd>
    </div>
  );
};

const ReceiptImage = ({
  hasImage,
  receiptId,
}: {
  hasImage: boolean;
  receiptId: string;
}) => (
  <div className="relative min-h-[400px] rounded-lg border bg-muted lg:min-h-[600px]">
    {hasImage ? (
      <Image
        alt="Receipt image"
        className="object-contain p-4"
        fill
        sizes="(max-width: 1024px) 100vw, 50vw"
        src={`/api/receipts/${receiptId}/image`}
      />
    ) : (
      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
        No image available
      </div>
    )}
  </div>
);

const MerchantSection = ({
  merchant,
  merchantName,
}: {
  merchant: ReceiptSelect["merchant"];
  merchantName: ReceiptSelect["merchantName"];
}) => (
  <section className="rounded-lg border p-4">
    <h2 className="mb-4 font-semibold">Merchant</h2>
    <dl>
      <DetailItem label="Name" value={merchantName ?? merchant?.name} />
      <DetailItem label="Address" value={merchant?.address} />
      <DetailItem label="ABN" value={merchant?.abn} />
      <DetailItem label="Store ID" value={merchant?.storeId} />
    </dl>
  </section>
);

const TransactionSection = ({
  payment,
  receiptNumber,
  transaction,
  transactionDateTime,
}: {
  payment: ReceiptSelect["payment"];
  receiptNumber: ReceiptSelect["receiptNumber"];
  transaction: ReceiptSelect["transaction"];
  transactionDateTime: ReceiptSelect["transactionDateTime"];
}) => {
  const transactionDate =
    formatDateTime(transactionDateTime) ??
    (transaction?.datetime
      ? dateFormatter.format(new Date(transaction.datetime))
      : null);

  return (
    <section className="rounded-lg border p-4">
      <h2 className="mb-4 font-semibold">Transaction</h2>
      <dl>
        <DetailItem label="Date & Time" value={transactionDate} />
        <DetailItem
          label="Receipt Number"
          value={receiptNumber ?? transaction?.receiptNumber}
        />
        <DetailItem label="Payment Method" value={payment?.method} />
      </dl>
    </section>
  );
};

const TotalsSection = ({ totals }: { totals: ReceiptSelect["totals"] }) => (
  <section className="rounded-lg border p-4">
    <h2 className="mb-4 font-semibold">Totals</h2>
    <dl>
      <DetailItem label="Subtotal" value={formatCurrency(totals?.subtotal)} />
      <DetailItem label="GST" value={formatCurrency(totals?.gst)} />
      <DetailItem label="Total" value={formatCurrency(totals?.total)} />
    </dl>
  </section>
);

interface ReceiptItem {
  id: string;
  lineTotal: number;
  name: string;
  quantity: number | null;
}

const ItemsSection = ({ items }: { items: ReceiptItem[] }) => {
  if (items.length === 0) {
    return (
      <section className="rounded-lg border p-4">
        <h2 className="mb-4 font-semibold">Items</h2>
        <p className="text-sm text-muted-foreground">No items extracted</p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border p-4">
      <h2 className="mb-4 font-semibold">Items</h2>
      <ul className="space-y-2">
        {items.map((item) => (
          <li className="flex justify-between text-sm" key={item.id}>
            <span>
              {item.name}
              {typeof item.quantity === "number" ? (
                <span className="text-muted-foreground">
                  {" "}
                  × {item.quantity}
                </span>
              ) : null}
            </span>
            <span className="font-medium">
              {currencyFormatter.format(item.lineTotal)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
};

const IntegrityBadge = ({ hasWarning }: { hasWarning: boolean }) =>
  hasWarning ? (
    <Badge variant="destructive">
      <BadgeAlert data-icon="inline-start" />
      Integrity Warning
    </Badge>
  ) : (
    <Badge variant="ghost">
      <FileCheck data-icon="inline-start" />
      Matching
    </Badge>
  );

export default async function ReceiptDetailPage({
  params,
}: ReceiptDetailPageProps) {
  const { id } = await params;
  const receipt = await findReceiptByIdWithItems(id);

  if (!receipt) {
    notFound();
  }

  return (
    <main className="container mx-auto p-6">
      <div className="mb-6">
        <Link
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          href="/"
        >
          <ArrowLeft className="mr-2 size-4" />
          Back to receipts
        </Link>
      </div>

      <h1 className="mb-2 text-2xl font-bold">Receipt Details</h1>

      <div className="mb-6 flex items-center gap-2">
        <Badge variant={statusBadgeVariant[receipt.status]}>
          {receipt.status}
        </Badge>
        <IntegrityBadge hasWarning={receipt.hasIntegrityWarning} />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <ReceiptImage
          hasImage={!!receipt.minioObjectKey}
          receiptId={receipt.id}
        />

        <div className="space-y-6">
          <MerchantSection
            merchant={receipt.merchant}
            merchantName={receipt.merchantName}
          />
          <TransactionSection
            payment={receipt.payment}
            receiptNumber={receipt.receiptNumber}
            transaction={receipt.transaction}
            transactionDateTime={receipt.transactionDateTime}
          />
          <TotalsSection totals={receipt.totals} />
          <ItemsSection items={receipt.receiptItems} />
        </div>
      </div>
    </main>
  );
}
