import type { Metadata } from "next";
import { Noto_Sans_Arabic, Source_Sans_3 } from "next/font/google";
import { getLang } from "@/lib/lang";
import "./globals.css";

const source = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source",
});

const noto = Noto_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto",
});

export const metadata: Metadata = {
  title: "Haier Service Center",
  description: "Stock, cash, expenses, and direct complaints for Haier Service Center.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const lang = await getLang();
  return (
    <html lang={lang === "ur" ? "ur" : "en"} dir={lang === "ur" ? "rtl" : "ltr"}>
      <body data-lang={lang} className={`${source.variable} ${noto.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
