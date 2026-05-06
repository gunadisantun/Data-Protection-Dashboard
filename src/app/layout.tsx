import type { Metadata } from "next";
import "@carrot-kpi/switzer-font/latin.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Data Protection Governance Dashboard",
  description: "PDP and RoPA compliance automation dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
