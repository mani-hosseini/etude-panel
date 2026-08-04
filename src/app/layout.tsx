import type { Metadata } from "next";
import { Outfit, Vazirmatn } from "next/font/google";

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
  title: "ETUDE Panel | پنل هنرجویان آموزشگاه موسیقی اتود",
  description:
    "پنل اختصاصی هنرجویان آموزشگاه موسیقی اتود — ورود، دوره‌ها، برنامه کلاس و پیشرفت",
  icons: {
    icon: "/logo.png",
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
        {children}
      </body>
    </html>
  );
}
