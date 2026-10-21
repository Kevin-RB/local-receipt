"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

/**
 * The colour at the very top of the page — the app header's background, not the
 * brand green. `#090b0c` is `--background` in the dark theme.
 */
export const THEME_COLORS = {
  dark: "#090b0c",
  light: "#ffffff",
} as const;

/**
 * `theme-color` is what the iOS status bar and the Android toolbar are painted
 * with. The layout renders a media-scoped pair so the first paint is right, but
 * the theme is a class chosen in the app, so "light on a dark OS" would leave a
 * light status bar over a dark page. Once the resolved theme is known, every
 * tag is pinned to it.
 */
export const ThemeColor = () => {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    // Undefined until `next-themes` has read the stored theme and the media
    // query; writing then would paint the wrong status bar for one frame.
    if (!resolvedTheme) {
      return;
    }

    const content =
      resolvedTheme === "dark" ? THEME_COLORS.dark : THEME_COLORS.light;

    for (const meta of document.querySelectorAll<HTMLMetaElement>(
      'meta[name="theme-color"]'
    )) {
      meta.content = content;
      meta.removeAttribute("media");
    }
  }, [resolvedTheme]);

  return null;
};
