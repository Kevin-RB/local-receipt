export const receiptDateTimeToDate = (
  datetimeString: string,
  timezone: string
) => {
  const plainDateTime = Temporal.PlainDateTime.from(datetimeString);
  const zoned = plainDateTime.toZonedDateTime(timezone, {
    disambiguation: "compatible",
  });
  return new Date(zoned.epochMilliseconds);
};
