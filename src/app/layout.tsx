import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "COOPs 議事録AI — 介護事業所向け AIミーティングアシスタント",
  description: "ボイスメモやテキストからGemini 3.5 Flash-Liteが実用的なアジェンダと詳細議事録を自動生成",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}
