import type { Metadata, Viewport } from "next";

import { BottomNav } from "@/components/BottomNav";

import "./globals.css";

export const metadata: Metadata = {
  title: "理论知识刷题系统",
  description: "全媒体运营师（视听运营）三级理论知识刷题系统",
  appleWebApp: {
    capable: true,
    title: "刷题系统"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1f5be3"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="app-shell">
          {children}
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
