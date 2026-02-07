import type React from "react"
import type { Metadata } from "next"
import localFont from "next/font/local"
import "./globals.css"

const notoSansJP = localFont({
  src: [
    {
      path: "./fonts/noto-sans-jp/NotoSansJP-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/noto-sans-jp/NotoSansJP-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-noto-sans-jp",
  display: "swap",
  preload: true,
})

// 全ページを動的レンダリングに設定（認証にcookiesを使用するため）
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "StudySpark - 学習支援アプリ",
  description: "中学受験を目指す小学6年生向けの学習支援Webアプリ",
  generator: "v0.app",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja" className={notoSansJP.variable}>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
