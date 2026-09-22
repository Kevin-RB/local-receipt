"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { Fragment, useMemo } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import type { Control, FieldErrors, UseFormRegister } from "react-hook-form";
import type z from "zod";

import {
  LineReconciliationHints,
  ReconciliationBar,
} from "@/components/receipts/reconciliation-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/toast";
import { receiptToNested } from "@/lib/db/receipt-mapping";
import { paymentMethodEnum } from "@/lib/db/schema/receipt";
import type { PaymentMethod, ReceiptSelect } from "@/lib/db/schema/receipt";
import { lineItemKindEnum } from "@/lib/db/schema/receipt-item";
import type {
  LineItemKind,
  ReceiptItemSelect,
} from "@/lib/db/schema/receipt-item";
import { reconcile } from "@/lib/receipt/integrity";
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

type FormValues = z.input<typeof updateReceiptSchema>;

const toOptionalNumber = (value: string) =>
  value === "" ? undefined : Number(value);

const toRequiredNumber = (value: string) =>
  value === "" ? Number.NaN : Number(value);

const toLineTotal = (value: string) => (value === "" ? 0 : Number(value));

const toFiniteAmount = (value: unknown) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

const paymentMethodLabels: Record<PaymentMethod, string> = {
  card: "Card",
  cash: "Cash",
  other: "Other",
};

const paymentMethodDescriptions: Record<PaymentMethod, string> = {
  card: "Visa, Mastercard, EFTPOS, debit or credit",
  cash: "Notes and coins",
  other: "Cheque, gift card or unrecognised",
};

const paymentMethodOptions: {
  description: string;
  label: string;
  value: PaymentMethod;
}[] = paymentMethodEnum.options.map((value) => ({
  description: paymentMethodDescriptions[value],
  label: paymentMethodLabels[value],
  value,
}));

const lineItemKindLabels: Record<LineItemKind, string> = {
  discount: "Discount",
  product: "Product",
  surcharge: "Surcharge",
};

const lineItemKindItems = lineItemKindEnum.options.map((value) => ({
  label: lineItemKindLabels[value],
  value,
}));

const normalizeDatetime = (value: string | undefined) => {
  if (!value) {
    return;
  }
  return value.length === 16 ? `${value}:00` : value;
};

const buildDefaultValues = (receipt: ReceiptWithItems): FormValues => {
  const nested = receiptToNested(receipt);

  return {
    items: receipt.receiptItems.map((item) => ({
      kind: item.kind,
      lineTotal: item.lineTotal,
      name: item.name,
      quantity: item.quantity ?? undefined,
      unitPrice: item.unitPrice ?? undefined,
    })),
    merchant: nested.merchant,
    payment: nested.payment,
    receiptId: receipt.id,
    totals: nested.totals,
    transaction: nested.transaction,
  };
};

const FormFieldError = ({ error }: { error?: { message?: string } }) =>
  error?.message ? <FieldError errors={[{ message: error.message }]} /> : null;

interface ReceiptItemRowProps {
  control: Control<FormValues>;
  errors: FieldErrors<FormValues>;
  index: number;
  item: FormValues["items"][number] | undefined;
  onRemove: (index: number) => void;
  register: UseFormRegister<FormValues>;
}

const ReceiptItemRow = ({
  control,
  errors,
  index,
  item,
  onRemove,
  register,
}: ReceiptItemRowProps) => {
  const lineTotalField = register(`items.${index}.lineTotal` as const, {
    setValueAs: toLineTotal,
  });

  return (
    <FieldGroup className="grid grid-cols-4">
      <Field
        className="col-span-3"
        data-invalid={!!errors.items?.[index]?.name}
      >
        <FieldLabel>Name</FieldLabel>
        <FieldContent>
          <Input
            placeholder="Item name"
            {...register(`items.${index}.name` as const)}
          />
          <FormFieldError error={errors.items?.[index]?.name} />
        </FieldContent>
      </Field>

      <Button
        aria-label="Remove item"
        className="col-span-1 self-end justify-self-end"
        onClick={() => onRemove(index)}
        type="button"
        variant="ghost"
        size="icon"
      >
        <Trash2 />
      </Button>

      <Field>
        <FieldLabel>Kind</FieldLabel>
        <FieldContent>
          <Controller
            control={control}
            name={`items.${index}.kind` as const}
            render={({ field: kindField }) => (
              <Select
                items={lineItemKindItems}
                onValueChange={(value) =>
                  kindField.onChange(value as LineItemKind)
                }
                value={kindField.value ?? "product"}
              >
                <SelectTrigger aria-label="Line kind" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {lineItemKindItems.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
          />
        </FieldContent>
      </Field>
      <Field>
        <FieldLabel>Quantity</FieldLabel>
        <FieldContent>
          <Input
            min="0"
            step="any"
            type="number"
            {...register(`items.${index}.quantity` as const, {
              setValueAs: toOptionalNumber,
            })}
          />
          <FormFieldError error={errors.items?.[index]?.quantity} />
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
          <FormFieldError error={errors.items?.[index]?.unitPrice} />
          <LineReconciliationHints
            lineTotal={item?.lineTotal}
            quantity={item?.quantity}
            unitPrice={item?.unitPrice}
          />
        </FieldContent>
      </Field>
      <Field data-invalid={!!errors.items?.[index]?.lineTotal}>
        <FieldLabel>Line Total</FieldLabel>
        <FieldContent>
          <Input
            aria-invalid={!!errors.items?.[index]?.lineTotal}
            step="0.01"
            type="number"
            {...lineTotalField}
            onBlur={(event) => {
              lineTotalField.onBlur(event);
              if (event.target.value === "") {
                event.target.value = "0";
              }
            }}
          />
          <FormFieldError error={errors.items?.[index]?.lineTotal} />
        </FieldContent>
      </Field>
    </FieldGroup>
  );
};

export const ReceiptEditForm = ({ receipt }: ReceiptEditFormProps) => {
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<FormValues, undefined, UpdateReceiptInput>({
    defaultValues: buildDefaultValues(receipt),
    resolver: zodResolver(updateReceiptSchema),
  });

  const { append, fields, remove } = useFieldArray({
    control,
    name: "items",
  });

  const watchedItems = useWatch({ control, name: "items" });
  const watchedTotals = useWatch({ control, name: "totals" });

  const statedTotal =
    watchedTotals?.total === undefined
      ? undefined
      : Number(watchedTotals.total);

  const reconciliation = useMemo(
    () =>
      reconcile(
        (watchedItems ?? []).map((item) => ({
          kind: item.kind ?? "product",
          lineTotal: toFiniteAmount(item.lineTotal),
        })),
        { total: statedTotal }
      ),
    [watchedItems, statedTotal]
  );

  const hasReconciliationData =
    (watchedItems?.length ?? 0) > 0 ||
    (statedTotal !== undefined && Number.isFinite(statedTotal));

  const onSubmit = async (data: UpdateReceiptInput) => {
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
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
      {hasReconciliationData ? (
        <ReconciliationBar
          reconciliation={reconciliation}
          statedTotal={statedTotal}
        />
      ) : null}

      <Card>
        <CardContent>
          <FieldGroup>
            <FieldSet>
              <FieldLegend>Merchant</FieldLegend>
              <FieldDescription>
                The merchant information is used to identify the store where the
                purchase was made.
              </FieldDescription>
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
              <FieldGroup className="grid grid-cols-1 sm:grid-cols-2">
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
                    <Input
                      {...register("merchant.storeId")}
                      placeholder="1234"
                    />
                  </FieldContent>
                </Field>
              </FieldGroup>
            </FieldSet>

            <FieldSeparator />

            <FieldSet>
              <FieldLegend>Transaction</FieldLegend>
              <FieldDescription>
                When the purchase was made and the receipt number.
              </FieldDescription>
              <Field>
                <FieldLabel>Date &amp; Time</FieldLabel>
                <FieldContent>
                  <Input
                    type="datetime-local"
                    {...register("transaction.datetime")}
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>Receipt Number</FieldLabel>
                <FieldContent>
                  <Input
                    {...register("transaction.receiptNumber")}
                    placeholder="0001"
                  />
                </FieldContent>
              </Field>
            </FieldSet>

            <FieldSeparator />

            <FieldSet>
              <FieldLegend>Payment Method</FieldLegend>
              <Controller
                control={control}
                name="payment.method"
                render={({ field }) => (
                  <RadioGroup
                    className="grid grid-cols-1 sm:grid-cols-3"
                    onValueChange={(value) => field.onChange(value)}
                    value={field.value}
                  >
                    {paymentMethodOptions.map((option) => (
                      <FieldLabel
                        key={option.value}
                        htmlFor={`payment-${option.value}`}
                      >
                        <Field orientation="horizontal">
                          <FieldContent>
                            <div className="font-medium">{option.label}</div>
                            <FieldDescription>
                              {option.description}
                            </FieldDescription>
                          </FieldContent>
                          <RadioGroupItem
                            id={`payment-${option.value}`}
                            value={option.value}
                          />
                        </Field>
                      </FieldLabel>
                    ))}
                  </RadioGroup>
                )}
              />
            </FieldSet>

            <FieldSeparator />

            <FieldSet>
              <FieldLegend>Totals</FieldLegend>
              <FieldDescription>
                The amounts shown on the receipt, before and after tax.
              </FieldDescription>
              <FieldGroup className="grid grid-cols-3">
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
              </FieldGroup>
            </FieldSet>

            <FieldSeparator />

            <FieldSet>
              <FieldLegend>Items</FieldLegend>
              <FieldDescription>
                The individual lines on the receipt, one per product or service.
              </FieldDescription>
              <FieldGroup>
                {fields.map((field, index) => (
                  <Fragment key={field.id}>
                    <ReceiptItemRow
                      control={control}
                      errors={errors}
                      index={index}
                      item={watchedItems?.[index]}
                      onRemove={remove}
                      register={register}
                    />
                    {index < fields.length - 1 ? <Separator /> : null}
                  </Fragment>
                ))}

                <Button
                  className={cn(fields.length === 0 && "w-full")}
                  onClick={() =>
                    append({
                      kind: "product",
                      lineTotal: 0,
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
              </FieldGroup>
            </FieldSet>
          </FieldGroup>
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
