import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "会議議事録AI",
  description: "ボイスメモやテキストからGemini 3.5 Flash-Liteが実用的なアジェンダと詳細議事録を自動生成",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased font-sans">{children}</body>
    </html>
  );
}
