import type { Metadata } from "next";

import "./globals.css";
import { Geist } from "next/font/google";

import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  description: "Local MVP for receipt analysis",
  title: "Receipt AI Analyser",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body suppressHydrationWarning className="bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
