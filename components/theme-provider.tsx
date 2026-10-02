"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import * as React from "react";

/**
 * `next-themes` renders an inline `<script>` inside this client component to set
 * the theme class before hydration. React 19 flags any script rendered from a
 * component, and `next-themes@0.4.6` does not have a release that avoids it.
 *
 * `suppressHydrationWarning` silences attribute mismatches but not this warning.
 * `next-themes` already hardcodes that prop on the script it renders — it spreads
 * `scriptProps` first and then sets `suppressHydrationWarning: true` itself — so
 * passing it here changes nothing and is kept only as documentation of intent.
 *
 * The warning is not actually silenced. The only way to stop it would be to
 * retype the tag as `application/json`, but that tag carries the theme bootstrap
 * via `dangerouslySetInnerHTML`, so a non-executable type would stop the browser
 * running it and break theme initialisation on first paint. That trade was
 * rejected; see https://github.com/pacocoursey/next-themes/issues/387
 */
const SCRIPT_PROPS = { suppressHydrationWarning: true } as const;

export const ThemeProvider = ({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) => (
  <NextThemesProvider scriptProps={SCRIPT_PROPS} {...props}>
    {children}
  </NextThemesProvider>
);
