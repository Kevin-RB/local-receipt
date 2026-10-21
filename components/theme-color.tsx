"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

import { THEME_COLORS } from "@/lib/theme-colors";

/**
 * `theme-color` is what the iOS status bar and the Android toolbar are painted
 * with. The layout renders a media-scoped pair so the first paint is right, but
 * the theme is a class chosen in the app, so "light on a dark OS" would leave a
 * light status bar over a dark page. Once the resolved theme is known, every
 * tag is pinned to it.
 *
 * The two tags are identical after this runs; the media queries they carried
 * are what the class-based theme cannot express.
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
