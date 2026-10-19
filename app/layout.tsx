import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenDSS｜繁體中文雲端工作台",
  description: "保留 OpenDSS 原版操作脈絡的繁體中文工作台：編輯模型、編譯執行、查看潮流與故障分析結果。",
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
    <html lang="zh-Hant">
      <body className="antialiased">{children}</body>
    </html>
  );
}
