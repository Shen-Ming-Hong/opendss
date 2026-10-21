import type { Metadata } from "next";
import "./globals.css";

const siteUrl = "https://opendss.esperar-ai.org";
const title = "OpenDSS 雲端工作台 · OpenDSS Cloud Workbench";
const description = "Run EPRI OpenDSS online in your browser: compile .dss models, run power flow, fault and harmonics studies, and view plots and reports with no install or sign-in. 免安裝、免登入，在瀏覽器執行 OpenDSS 潮流、故障與諧波分析。";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  keywords: ["OpenDSS", "OpenDSS online", "power flow", "load flow", "fault study", "short circuit", "harmonics", "distribution system", "EPRI", "WebAssembly", "潮流分析", "故障分析"],
  alternates: { canonical: "/" },
  openGraph: { type: "website", url: "/", siteName: "OpenDSS Cloud Workbench", title, description },
  twitter: { card: "summary", title, description },
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
