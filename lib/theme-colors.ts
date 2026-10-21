/**
 * The colour at the very top of the page — the app header's background, not the
 * brand green. `#090b0c` is `--background` in the dark theme.
 *
 * A plain module, not part of the client component: `app/layout.tsx` reads these
 * in its server-side `viewport` export, and a value exported from a
 * `"use client"` module arrives there as a client reference rather than a
 * string, which drops the `content` attribute from both tags.
 */
export const THEME_COLORS = {
  dark: "#090b0c",
  light: "#ffffff",
} as const;
