"use client"

export default function CoachError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h2 className="text-lg font-semibold mb-2">エラーが発生しました</h2>
      <p className="text-sm text-muted-foreground mb-4">
        しばらくしてからもう一度お試しください
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
      >
        もう一度試す
      </button>
    </div>
  )
}
