'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div style={{ padding: '50px', textAlign: 'center' }}>
          <h1>500 - Something went wrong!</h1>
          <p>{error.message}</p>
          <button onClick={() => reset()} style={{ padding: '10px 20px', cursor: 'pointer' }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
