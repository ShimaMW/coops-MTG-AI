import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "会議議事録AI | COOPs",
  description: "ボイスメモやテキストからGeminiが実用的なアジェンダと詳細議事録を自動生成",
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
      { url: "/favicon.png", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", type: "image/png" }],
  },
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
