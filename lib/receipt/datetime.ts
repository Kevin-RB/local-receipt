import "temporal-polyfill/global";

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

export const receiptDateToISODateString = (
  date: Date,
  timezone = RECEIPT_TIMEZONE
): string => {
  const { day, month, year } = date
    .toTemporalInstant()
    .toZonedDateTimeISO(timezone);
  return `${year}-${pad(month)}-${pad(day)}`;
};

/**
 * The transaction datetime is held as a bare local wall-clock string
 * (`YYYY-MM-DDTHH:mm`), the form's own representation. A calendar picks whole
 * days and cannot represent a time of day, so these conversions are the seam
 * between the two halves of the manual edit form.
 *
 * A day is carried as a `Date` at the browser's local midnight holding the
 * receipt-local year/month/day — never the instant that day begins. Reading the
 * day back off an instant would shift it by one for any browser west of
 * Australia/Brisbane, so the local components are read directly.
 */

const LOCAL_STRING_PATTERN =
  /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})(?:T(?<hour>\d{2}):(?<minute>\d{2}))?/u;

const TIME_PATTERN = /^(?<hour>\d{2}):(?<minute>\d{2})$/u;

const parseLocalString = (localString: string | undefined) =>
  LOCAL_STRING_PATTERN.exec(localString ?? "")?.groups;

const tryParse = <T>(parse: () => T): T | undefined => {
  try {
    return parse();
  } catch {
    // Falls through to undefined, the same answer as a value that did not
    // parse at all.
  }
};

export const receiptLocalStringToDay = (
  localString: string | undefined
): Date | undefined => {
  const parts = parseLocalString(localString);

  if (!parts?.year || !parts.month || !parts.day) {
    return;
  }

  // Temporal validates the parts: `new Date(2026, 12, 45)` would silently roll
  // over into 2027, so a date that does not exist is caught here instead.
  const plainDate = tryParse(() =>
    Temporal.PlainDate.from(`${parts.year}-${parts.month}-${parts.day}`)
  );

  if (!plainDate) {
    return;
  }

  const { day, month, year } = plainDate;
  return new Date(year, month - 1, day);
};

export const receiptLocalStringToTime = (
  localString: string | undefined
): string | undefined => {
  const { hour, minute } = parseLocalString(localString) ?? {};
  return hour && minute ? `${hour}:${minute}` : undefined;
};

const dayToISODate = (day: Date): string =>
  `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;

/**
 * Combines a calendar day with a time of day. A time that is absent or not
 * exactly `HH:mm` falls back to midnight: both inputs come from a date or time
 * input, so anything else is malformed and midnight beats emitting an
 * unparseable value.
 */
export const receiptDayToLocalString = (day: Date, time?: string): string => {
  const { hour, minute } = TIME_PATTERN.exec(time ?? "")?.groups ?? {};
  return `${dayToISODate(day)}T${hour ?? "00"}:${minute ?? "00"}`;
};
