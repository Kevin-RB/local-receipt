import type { PaymentMethod } from "@/lib/db/schema/receipt";

const CARD_KEYWORDS = ["visa", "mastercard", "eftpos", "debit", "credit"];

export const normalizePaymentMethod = (
  payment: { method?: string } | null | undefined
): PaymentMethod => {
  const raw = payment?.method;
  if (!raw) {
    return "other";
  }

  const normalized = raw.trim().toLowerCase();
  if (normalized === "cash") {
    return "cash";
  }
  if (
    normalized === "card" ||
    CARD_KEYWORDS.some((keyword) => normalized.includes(keyword))
  ) {
    return "card";
  }
  return "other";
};
