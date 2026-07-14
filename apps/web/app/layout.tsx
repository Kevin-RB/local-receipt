import type { Metadata } from "next";

import "./globals.css";

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
