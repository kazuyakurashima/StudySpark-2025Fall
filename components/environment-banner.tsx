"use client"

const envLabel = process.env.NEXT_PUBLIC_ENV_LABEL

export function EnvironmentBanner() {
  if (!envLabel) return null

  return (
    <div className="sticky top-0 z-50 border-b border-amber-300 bg-amber-50 px-4 py-1.5 text-center text-sm font-semibold text-amber-900">
      ⚠ {envLabel} — 本番環境ではありません
    </div>
  )
}
