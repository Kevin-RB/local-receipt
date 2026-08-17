import { describe, expect, it } from "vitest";

import { Payment, paymentMethodEnum } from "@/lib/db/schema/receipt";

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
