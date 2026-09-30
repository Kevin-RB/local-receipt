import type { Metadata } from "next";

import "./globals.css";
import { Geist, IBM_Plex_Sans } from "next/font/google";

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
        {children}
        <Toaster />
      </ThemeProvider>
    </body>
  </html>
);

export default RootLayout;
