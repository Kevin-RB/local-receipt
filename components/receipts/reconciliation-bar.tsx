import {
  CircleAlert,
  CircleCheck,
  CreditCard,
  Receipt,
  ShoppingBasket,
  Sigma,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldDescription } from "@/components/ui/field";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CENTS_EPSILON } from "@/lib/receipt/integrity";
import type { Reconciliation } from "@/lib/receipt/integrity";

const currency = new Intl.NumberFormat("en-AU", {
  currency: "AUD",
  style: "currency",
});

const formatAmount = (value: number) =>
  Number.isFinite(value) ? currency.format(value) : "—";

const roundCents = (value: number) => Math.round(value * 100) / 100;

const toAmount = (value: number | string | null | undefined) => {
  if (value === undefined || value === null || value === "") {
    return;
  }
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : undefined;
};

export const reconciliationHint = ({
  delta,
  matches,
  surchargesSum,
}: Pick<Reconciliation, "delta" | "matches" | "surchargesSum">) => {
  if (matches) {
    return;
  }

  if (delta > 0) {
    return surchargesSum === 0
      ? "The stated total is higher than the line items — an unrecorded card surcharge may be missing."
      : "The stated total is higher than the line items.";
  }

  return "The line items are higher than the stated total — a missed discount may be missing.";
};

const Metric = ({
  description,
  icon: Icon,
  label,
  value,
}: {
  description: string;
  icon: LucideIcon;
  label: string;
  value: string;
}) => (
  <Popover>
    <PopoverTrigger
      aria-label={`${label} ${value}`}
      openOnHover
      render={<Button size="lg" variant="ghost" />}
    >
      <Icon data-icon="inline-start" />
      <span className="text-muted-foreground hidden @2xl:inline">{label}</span>
      <span className="text-foreground font-medium">{value}</span>
    </PopoverTrigger>
    <PopoverContent align="start">
      <PopoverHeader>
        <PopoverTitle>{label}</PopoverTitle>
        <PopoverDescription>{description}</PopoverDescription>
      </PopoverHeader>
    </PopoverContent>
  </Popover>
);

export const ReconciliationBar = ({
  reconciliation,
  statedTotal,
}: {
  reconciliation: Reconciliation;
  statedTotal: number | undefined;
}) => {
  const { delta, itemsSum, matches, productsSum, surchargesSum } =
    reconciliation;
  const hint = reconciliationHint(reconciliation);
  const hasTotal = statedTotal !== undefined && Number.isFinite(statedTotal);
  const warning = hasTotal && !matches;
  const title = warning
    ? `Integrity Warning — ${
        delta > 0
          ? `Under by ${formatAmount(delta)}`
          : `Over by ${formatAmount(-delta)}`
      }`
    : "Matching";

  return (
    <div className="bg-background/90 sticky top-0 z-10 flex flex-col gap-3 mask-b-from-90% mask-b-to-100% pb-3 backdrop-blur-sm">
      {hasTotal ? (
        <Alert variant={warning ? "destructive" : "default"}>
          {warning ? <CircleAlert /> : <CircleCheck />}
          <AlertTitle>{title}</AlertTitle>
          {warning && hint ? <AlertDescription>{hint}</AlertDescription> : null}
        </Alert>
      ) : null}

      <div className="@container grid grid-cols-4 gap-x-4 gap-y-2">
        <Metric
          description="Sum of the product lines"
          icon={ShoppingBasket}
          label="Products"
          value={formatAmount(productsSum)}
        />
        <Metric
          description="Sum of the surcharge lines"
          icon={CreditCard}
          label="Surcharges"
          value={formatAmount(surchargesSum)}
        />
        <Metric
          description="Total of the line items (products + surcharges)"
          icon={Sigma}
          label="Items"
          value={formatAmount(itemsSum)}
        />
        <Metric
          description="Total printed on the receipt"
          icon={Receipt}
          label="Receipt"
          value={hasTotal ? formatAmount(statedTotal) : "—"}
        />
      </div>
    </div>
  );
};

export const LineReconciliationHints = ({
  lineTotal,
  quantity,
  unitPrice,
}: {
  lineTotal: number | null | undefined;
  quantity: number | null | undefined;
  unitPrice: number | null | undefined;
}) => {
  const q = toAmount(quantity);
  const u = toAmount(unitPrice);
  const t = toAmount(lineTotal);
  const hasQuantity = q !== undefined && q > 0;
  const derived = hasQuantity && t !== undefined ? t / q : undefined;
  const mismatch =
    hasQuantity &&
    u !== undefined &&
    t !== undefined &&
    Math.abs(q * u - t) >= CENTS_EPSILON;

  return (
    <>
      {derived === undefined ? null : (
        <FieldDescription>
          ≈ {formatAmount(roundCents(derived))} each
        </FieldDescription>
      )}
      {mismatch ? (
        <p className="text-destructive text-xs/relaxed">
          Quantity × unit price = {formatAmount(roundCents(q * u))}, not{" "}
          {formatAmount(t)}
        </p>
      ) : null}
    </>
  );
};
