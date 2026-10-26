import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zel Signals — Multi-Strategy Signal Engine",
  description:
    "Connect any broker API, pick a market, stack multiple strategies and get an AI-reviewed BUY / SELL / NO TRADE signal with take-profit and stop-loss levels.",
  applicationName: "Zel Signals",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Zel Signals",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#05070d",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#05070d] text-slate-200 antialiased">{children}</body>
    </html>
  );
}
