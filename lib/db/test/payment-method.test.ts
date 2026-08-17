import { describe, expect, it } from "vitest";

import { Payment, paymentMethodEnum } from "@/lib/db/schema/receipt";
import { normalizePaymentMethod } from "@/lib/receipt/payment-method";

describe("Payment.method", () => {
  it("defaults to 'other' when the method is missing", () => {
    expect(Payment.parse({})).toStrictEqual({ method: "other" });
    expect(Payment.parse({ method: undefined })).toStrictEqual({
      method: "other",
    });
  });

  it("accepts only the enum values", () => {
    expect(paymentMethodEnum.safeParse("cash").success).toBeTruthy();
    expect(paymentMethodEnum.safeParse("card").success).toBeTruthy();
    expect(paymentMethodEnum.safeParse("other").success).toBeTruthy();
    expect(paymentMethodEnum.safeParse("VISA").success).toBeFalsy();
  });
});

describe("normalizePaymentMethod mapping", () => {
  it("returns 'other' for a missing payment or method", () => {
    const undefinedPayment = undefined as
      | { method?: string }
      | null
      | undefined;
    expect(normalizePaymentMethod(null)).toBe("other");
    expect(normalizePaymentMethod(undefinedPayment)).toBe("other");
    expect(normalizePaymentMethod({ method: undefined })).toBe("other");
  });

  it("recognizes cash", () => {
    expect(normalizePaymentMethod({ method: "cash" })).toBe("cash");
    expect(normalizePaymentMethod({ method: "Cash" })).toBe("cash");
  });

  it("maps card-like legacy values to 'card'", () => {
    for (const method of ["VISA", "Mastercard", "EFTPOS", "Debit", "credit"]) {
      expect(normalizePaymentMethod({ method })).toBe("card");
    }
  });

  it("maps unrecognized values to 'other'", () => {
    expect(normalizePaymentMethod({ method: "cheque" })).toBe("other");
  });
});
