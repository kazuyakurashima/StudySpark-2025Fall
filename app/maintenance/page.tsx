import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "メンテナンス中 - StudySpark",
  description: "ただいまシステムメンテナンスを実施しています",
}

export default function MaintenancePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* アイコン */}
        <div className="text-6xl">&#x1F527;</div>

        {/* タイトル */}
        <h1 className="text-2xl font-bold text-gray-900">
          ただいまメンテナンス中です
        </h1>

        {/* 説明 */}
        <div className="space-y-3 text-gray-600">
          <p>
            システムの更新作業を行っています。
          </p>
          <p className="text-sm">
            ご不便をおかけして申し訳ございません。
            <br />
            しばらくお待ちください。
          </p>
        </div>

        {/* 区切り線 */}
        <div className="border-t border-gray-200 pt-4">
          <p className="text-xs text-gray-400">
            メンテナンスが完了しましたら、以下のリンクからアクセスしてください。
          </p>
          <Link
            href="/"
            className="inline-block mt-3 text-sm text-blue-600 hover:text-blue-800 underline"
          >
            トップページへ戻る
          </Link>
        </div>
      </div>
    </div>
  )
}
