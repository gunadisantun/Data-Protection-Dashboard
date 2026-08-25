import type { Metadata } from "next";
import { Afacad, Gabarito } from "next/font/google";
import { LanguageProvider } from "@/components/language-provider";
import { getCurrentLocale } from "@/lib/i18n-server";
import "./globals.css";

const afacad = Afacad({
  subsets: ["latin"],
  variable: "--font-afacad",
  display: "swap",
});

const gabarito = Gabarito({
  subsets: ["latin"],
  variable: "--font-gabarito",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Privacy Bro",
  description: "PDP and RoPA compliance automation dashboard",
  icons: {
    icon: "/icon.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getCurrentLocale();

  return (
    <html
      lang={locale}
      className={`${afacad.variable} ${gabarito.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <LanguageProvider locale={locale}>{children}</LanguageProvider>
      </body>
    </html>
  );
}
