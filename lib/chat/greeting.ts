/**
 * The greeting is resolved in the browser, from the user's own clock.
 *
 * It is deliberately not computed on the server: the server's timezone is not
 * the user's, so a server-rendered greeting would be wrong for anyone outside
 * it. That leaves a hydration problem — React must render something before the
 * client has run — so the server renders *nothing* and the greeting eases in on
 * mount. An absent title is a far better first paint than a title that
 * immediately changes, which is what a server-rendered "Hello" produced.
 */

/**
 * Local hour → greeting. Boundaries are 12:00 and 18:00 in the user's own
 * timezone, read via `Date#getHours` rather than a fixed zone.
 */
export const greetingFor = (
  firstName: string,
  hour: number = new Date().getHours()
): string => {
  let greeting = "Good evening";
  if (hour < 12) {
    greeting = "Good morning";
  } else if (hour < 18) {
    greeting = "Good afternoon";
  }

  return firstName ? `${greeting}, ${firstName}` : greeting;
};

/** First name from a display name, capitalised. */
export const toDisplayName = (name: string): string => {
  const [first = ""] = name.trim().split(/\s+/u);
  return `${first.charAt(0).toUpperCase()}${first.slice(1)}`;
};
