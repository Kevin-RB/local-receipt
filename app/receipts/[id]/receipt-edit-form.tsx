"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";

import { IntegrityBadge } from "@/components/integrity-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/toast";
import type { ReceiptSelect } from "@/lib/db/schema/receipt";
import type { ReceiptItemSelect } from "@/lib/db/schema/receipt-item";
import { computeIntegrityWarning } from "@/lib/receipt/integrity";
import { cn } from "@/lib/utils";

import { updateReceipt } from "./actions";
import { updateReceiptSchema } from "./schema";
import type { UpdateReceiptInput } from "./schema";

export type ReceiptWithItems = ReceiptSelect & {
  receiptItems: ReceiptItemSelect[];
};

interface ReceiptEditFormProps {
  receipt: ReceiptWithItems;
}

type FormValues = UpdateReceiptInput;

const toOptionalNumber = (value: string) =>
  value === "" ? undefined : Number(value);

const toRequiredNumber = (value: string) =>
  value === "" ? Number.NaN : Number(value);

const normalizeDatetime = (value: string | undefined) => {
  if (!value) {
    return;
  }
  return value.length === 16 ? `${value}:00` : value;
};

const buildDefaultValues = (receipt: ReceiptWithItems): FormValues => ({
  items: receipt.receiptItems.map((item) => ({
    lineTotal: item.lineTotal,
    name: item.name,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
  })),
  merchant: {
    abn: receipt.merchant?.abn,
    address: receipt.merchant?.address,
    name: receipt.merchant?.name ?? receipt.merchantName ?? "",
    storeId: receipt.merchant?.storeId,
  },
  payment: {
    method: receipt.payment?.method,
  },
  receiptId: receipt.id,
  totals: {
    gst: receipt.totals?.gst,
    subtotal: receipt.totals?.subtotal,
    total: receipt.totals?.total ?? 0,
  },
  transaction: {
    datetime: receipt.transaction?.datetime?.slice(0, 16),
    receiptNumber:
      receipt.transaction?.receiptNumber ?? receipt.receiptNumber ?? undefined,
  },
});

const Section = ({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) => (
  <section>
    <h2 className="mb-4 font-heading text-sm font-medium">{title}</h2>
    <div className="space-y-3">{children}</div>
  </section>
);

const FormFieldError = ({ error }: { error?: { message?: string } }) =>
  error?.message ? <FieldError errors={[{ message: error.message }]} /> : null;

export const ReceiptEditForm = ({ receipt }: ReceiptEditFormProps) => {
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<FormValues>({
    defaultValues: buildDefaultValues(receipt),
    resolver: zodResolver(updateReceiptSchema),
  });

  const { append, fields, remove } = useFieldArray({
    control,
    name: "items",
  });

  const watchedItems = useWatch({ control, name: "items" });
  const watchedTotals = useWatch({ control, name: "totals" });

  const integrityWarning = useMemo(
    () =>
      computeIntegrityWarning(
        (watchedItems ?? []).map((item) => ({
          lineTotal: Number(item.lineTotal),
        })),
        {
          total:
            watchedTotals?.total === undefined
              ? undefined
              : Number(watchedTotals.total),
        }
      ),
    [watchedItems, watchedTotals]
  );

  const onSubmit = async (data: FormValues) => {
    const result = await updateReceipt({
      ...data,
      transaction: {
        ...data.transaction,
        datetime: normalizeDatetime(data.transaction.datetime),
      },
    });

    if (result.success) {
      toast.add({
        description: "Your changes have been stored.",
        title: "Receipt saved",
        type: "success",
      });
    } else {
      toast.add({
        description: result.error,
        title: "Save failed",
        type: "error",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <CardAction>
            <IntegrityBadge hasWarning={integrityWarning} />
          </CardAction>
        </CardHeader>

        <CardContent>
          <Section title="Merchant">
            <Field data-invalid={!!errors.merchant?.name}>
              <FieldLabel>Name</FieldLabel>
              <FieldContent>
                <Input
                  {...register("merchant.name")}
                  placeholder="Store name"
                />
                <FormFieldError error={errors.merchant?.name} />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel>Address</FieldLabel>
              <FieldContent>
                <Input
                  {...register("merchant.address")}
                  placeholder="Street address"
                />
              </FieldContent>
            </Field>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel>ABN</FieldLabel>
                <FieldContent>
                  <Input
                    {...register("merchant.abn")}
                    placeholder="00 000 000 000"
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>Store ID</FieldLabel>
                <FieldContent>
                  <Input {...register("merchant.storeId")} placeholder="1234" />
                </FieldContent>
              </Field>
            </div>
          </Section>

          <Separator className="my-(--card-spacing)" />

          <Section title="Transaction">
            <Field>
              <FieldLabel>Date &amp; Time</FieldLabel>
              <FieldContent>
                <Input
                  type="datetime-local"
                  {...register("transaction.datetime")}
                />
              </FieldContent>
            </Field>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel>Receipt Number</FieldLabel>
                <FieldContent>
                  <Input
                    {...register("transaction.receiptNumber")}
                    placeholder="0001"
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>Payment Method</FieldLabel>
                <FieldContent>
                  <Input {...register("payment.method")} placeholder="card" />
                </FieldContent>
              </Field>
            </div>
          </Section>

          <Separator className="my-(--card-spacing)" />

          <Section title="Totals">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field>
                <FieldLabel>Subtotal</FieldLabel>
                <FieldContent>
                  <Input
                    min="0"
                    step="0.01"
                    type="number"
                    {...register("totals.subtotal", {
                      setValueAs: toOptionalNumber,
                    })}
                  />
                  <FormFieldError error={errors.totals?.subtotal} />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>GST</FieldLabel>
                <FieldContent>
                  <Input
                    min="0"
                    step="0.01"
                    type="number"
                    {...register("totals.gst", {
                      setValueAs: toOptionalNumber,
                    })}
                  />
                  <FormFieldError error={errors.totals?.gst} />
                </FieldContent>
              </Field>
              <Field data-invalid={!!errors.totals?.total}>
                <FieldLabel>Total</FieldLabel>
                <FieldContent>
                  <Input
                    aria-invalid={!!errors.totals?.total}
                    min="0"
                    step="0.01"
                    type="number"
                    {...register("totals.total", {
                      setValueAs: toRequiredNumber,
                    })}
                  />
                  <FormFieldError error={errors.totals?.total} />
                </FieldContent>
              </Field>
            </div>
          </Section>

          <Separator className="my-(--card-spacing)" />

          <Section title="Items">
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div className="rounded-lg border p-3" key={field.id}>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Field data-invalid={!!errors.items?.[index]?.name}>
                        <FieldLabel>Name</FieldLabel>
                        <FieldContent>
                          <Input
                            placeholder="Item name"
                            {...register(`items.${index}.name` as const)}
                          />
                          <FormFieldError error={errors.items?.[index]?.name} />
                        </FieldContent>
                      </Field>
                    </div>
                    <Field>
                      <FieldLabel>Qty</FieldLabel>
                      <FieldContent>
                        <Input
                          min="0"
                          step="any"
                          type="number"
                          {...register(`items.${index}.quantity` as const, {
                            setValueAs: toOptionalNumber,
                          })}
                        />
                        <FormFieldError
                          error={errors.items?.[index]?.quantity}
                        />
                      </FieldContent>
                    </Field>
                    <Field>
                      <FieldLabel>Unit Price</FieldLabel>
                      <FieldContent>
                        <Input
                          min="0"
                          step="0.01"
                          type="number"
                          {...register(`items.${index}.unitPrice` as const, {
                            setValueAs: toOptionalNumber,
                          })}
                        />
                        <FormFieldError
                          error={errors.items?.[index]?.unitPrice}
                        />
                      </FieldContent>
                    </Field>
                    <div className="col-span-2">
                      <Field data-invalid={!!errors.items?.[index]?.lineTotal}>
                        <FieldLabel>Line Total</FieldLabel>
                        <FieldContent>
                          <Input
                            aria-invalid={!!errors.items?.[index]?.lineTotal}
                            min="0"
                            step="0.01"
                            type="number"
                            {...register(`items.${index}.lineTotal` as const, {
                              setValueAs: toRequiredNumber,
                            })}
                          />
                          <FormFieldError
                            error={errors.items?.[index]?.lineTotal}
                          />
                        </FieldContent>
                      </Field>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button
                      aria-label="Remove item"
                      onClick={() => remove(index)}
                      type="button"
                      variant="ghost"
                    >
                      <Trash2 data-icon="inline-start" />
                      Remove
                    </Button>
                  </div>
                </div>
              ))}

              <Button
                className={cn(fields.length === 0 && "w-full")}
                onClick={() =>
                  append({
                    lineTotal: Number.NaN,
                    name: "",
                    quantity: undefined,
                    unitPrice: undefined,
                  })
                }
                type="button"
                variant="outline"
              >
                <Plus data-icon="inline-start" />
                Add Item
              </Button>
            </div>
          </Section>
        </CardContent>

        <CardFooter className="justify-end">
          <Button disabled={isSubmitting} type="submit">
            {isSubmitting ? "Saving…" : "Save"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
};
