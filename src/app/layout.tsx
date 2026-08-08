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
  title: {
    default: "ETUDE | پنل مسترکلاس تئوری موسیقی",
    template: "%s | ETUDE Masterclass",
  },
  description:
    "پنل اختصاصی هنرجویان مسترکلاس تئوری موسیقی استاد بهرام دهقانیار — پنجشنبه‌ها ۱۱ تا ۱۳",
  applicationName: "ETUDE Masterclass",
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
        {children}
      </body>
    </html>
  );
}
