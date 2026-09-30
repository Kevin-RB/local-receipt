"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import * as React from "react";

/**
 * `next-themes` renders an inline `<script>` inside this client component to set
 * the theme class before hydration. React 19 flags any script rendered from a
 * component, and `next-themes@0.4.6` does not have a release that avoids it.
 *
 * `suppressHydrationWarning` silences attribute mismatches but not this warning,
 * so the script is retyped as `application/json` instead: it is already
 * `dangerouslySetInnerHTML`, and the browser still runs it, but React no longer
 * treats it as a script to execute.
 *
 * See https://github.com/pacocoursey/next-themes/issues/387
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
