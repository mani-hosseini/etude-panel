import type { Metadata } from "next";
import { Outfit, Vazirmatn } from "next/font/google";

import { QueryProvider } from "@/components/providers/QueryProvider";

import "./globals.css";

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazirmatn",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ETUDE | پنل هنرجویی",
    template: "%s | ETUDE",
  },
  description:
    "پنل هنرجویی آکادمی تخصصی پیانو اتود — دوره‌ها، جلسات، برنامه کلاس و پروفایل",
  applicationName: "ETUDE Panel",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png", sizes: "any" },
      { url: "/etude-logo.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-icon.png", type: "image/png" }],
    shortcut: ["/favicon.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fa"
      dir="rtl"
      className={`${vazirmatn.variable} ${outfit.variable} h-full`}
    >
      <body className="min-h-full font-sans text-foreground antialiased">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
