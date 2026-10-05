"use client";

import { CalendarIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  RECEIPT_TIMEZONE,
  receiptDateTimeToDate,
  receiptDayToLocalString,
  receiptLocalStringToDay,
  receiptLocalStringToTime,
} from "@/lib/receipt/datetime";

// Formatted in the receipt's own timezone, since the stored value is the
// wall-clock time printed on the receipt rather than the browser's.
const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-AU", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: RECEIPT_TIMEZONE,
});

interface TransactionDateTimeFieldProps {
  handleChange: (value: string) => void;
  value: string | undefined;
}

/**
 * Picks the transaction datetime as a calendar day plus a time of day, using
 * the same `Calendar` in a `Popover` as the date-range filter on the receipts
 * page so both screens share one calendar.
 *
 * A calendar has no notion of a time of day, so the two are edited separately:
 * picking a day rewrites the date and leaves the time alone, and the time
 * input rewrites the time and leaves the day alone.
 */
export const TransactionDateTimeField = ({
  handleChange,
  value,
}: TransactionDateTimeFieldProps) => {
  const [open, setOpen] = useState(false);

  const day = receiptLocalStringToDay(value);
  const time = receiptLocalStringToTime(value);

  const label = value
    ? DATE_TIME_FORMATTER.format(receiptDateTimeToDate(value))
    : "Select a date";

  return (
    <div className="flex flex-col gap-2">
      <Popover onOpenChange={setOpen} open={open}>
        <PopoverTrigger
          aria-label={`Transaction date and time: ${label}`}
          className="justify-start"
          data-slot="transaction-date-trigger"
          id="transaction-datetime"
          render={
            <Button variant="outline">
              <CalendarIcon data-icon="inline-start" />
              {label}
            </Button>
          }
        />
        <PopoverContent align="start" className="w-auto">
          <Calendar
            defaultMonth={day}
            disabled={{ after: new Date() }}
            mode="single"
            onSelect={(next) => {
              if (!next) {
                return;
              }
              handleChange(receiptDayToLocalString(next, time));
              setOpen(false);
            }}
            selected={day}
          />
        </PopoverContent>
      </Popover>
      <Input
        aria-label="Transaction time"
        disabled={!day}
        onChange={(event) => {
          if (day) {
            handleChange(receiptDayToLocalString(day, event.target.value));
          }
        }}
        step="60"
        type="time"
        value={time ?? ""}
      />
    </div>
  );
};
