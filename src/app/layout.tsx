import type { Metadata, Viewport } from "next";

import { BottomNav } from "@/components/BottomNav";
import { ThemeToggle } from "@/components/ThemeToggle";

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
  themeColor: "#2659d9"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" data-theme="light" suppressHydrationWarning>
      <head>
        <ThemeBootScript />
      </head>
      <body>
        <div className="app-shell">
          {children}
          <ThemeToggle />
          <BottomNav />
        </div>
      </body>
    </html>
  );
}

function ThemeBootScript() {
  const script = `
    (() => {
      try {
        const theme = window.localStorage.getItem("omnimedia-theme") === "dark" ? "dark" : "light";
        document.documentElement.dataset.theme = theme;
        document.documentElement.style.colorScheme = theme;
      } catch {
        document.documentElement.dataset.theme = "light";
        document.documentElement.style.colorScheme = "light";
      }
    })();
  `;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
