import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

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
    <html lang="ja" className={notoSansJP.className}>
      <body className="antialiased font-sans">{children}</body>
    </html>
  );
}
