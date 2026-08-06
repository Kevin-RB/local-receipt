export const receiptDateTimeToDate = (
  datetimeString: string,
  timezone: string
) => {
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
