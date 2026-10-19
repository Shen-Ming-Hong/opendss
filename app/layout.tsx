import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenDSS · 雲端工作台",
  description: "OpenDSS Cloud Workbench: edit models, compile and solve, and view power flow and fault study results in the browser. 保留 OpenDSS 原版操作脈絡的雲端工作台。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body className="antialiased">{children}</body>
    </html>
  );
}
