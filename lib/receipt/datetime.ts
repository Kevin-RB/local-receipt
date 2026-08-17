export const RECEIPT_TIMEZONE = "Australia/Brisbane";

export const receiptDateTimeToDate = (
  datetimeString: string,
  timezone = RECEIPT_TIMEZONE
): Date => {
  try {
    const instant = Temporal.Instant.from(datetimeString);
    const zoned = instant.toZonedDateTimeISO(timezone);
    return new Date(zoned.epochMilliseconds);
  } catch {
    const plainDateTime = Temporal.PlainDateTime.from(datetimeString);
    const zoned = plainDateTime.toZonedDateTime(timezone, {
      disambiguation: "compatible",
    });
    return new Date(zoned.epochMilliseconds);
  }
};

const pad = (value: number) => value.toString().padStart(2, "0");

export const receiptDateToLocalString = (
  date: Date,
  timezone = RECEIPT_TIMEZONE
): string => {
  const { day, hour, minute, month, year } = date
    .toTemporalInstant()
    .toZonedDateTimeISO(timezone);
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`;
};
