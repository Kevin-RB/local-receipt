import type { Metadata, Viewport } from "next";

import "./globals.css";
import { Geist, IBM_Plex_Sans } from "next/font/google";

import { THEME_COLORS, ThemeColor } from "@/components/theme-color";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const geistHeading = Geist({ subsets: ["latin"], variable: "--font-heading" });

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  description: "Local MVP for receipt analysis",
  title: "possum",
};

/**
 * `viewportFit: "cover"` is what makes `env(safe-area-inset-*)` non-zero, so the
 * app can paint under the notch and home indicator; the shell pads itself back
 * out. `interactiveWidget: "resizes-content"` shrinks the layout viewport when
 * the Android keyboard opens, so the chat composer is pushed up instead of
 * hidden behind it.
 */
export const viewport: Viewport = {
  colorScheme: "light dark",
  initialScale: 1,
  interactiveWidget: "resizes-content",
  themeColor: [
    { color: THEME_COLORS.light, media: "(prefers-color-scheme: light)" },
    { color: THEME_COLORS.dark, media: "(prefers-color-scheme: dark)" },
  ],
  viewportFit: "cover",
  width: "device-width",
};

const RootLayout = ({ children }: { children: React.ReactNode }) => (
  <html
    lang="en"
    suppressHydrationWarning
    className={cn("font-sans", ibmPlexSans.variable, geistHeading.variable)}
  >
    <body className="bg-background text-foreground">
      <ThemeProvider
        attribute="class"
        enableSystem
        defaultTheme="system"
        disableTransitionOnChange
      >
        <ThemeColor />
        {children}
        <Toaster />
      </ThemeProvider>
    </body>
  </html>
);

export default RootLayout;
