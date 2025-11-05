export const dynamic = 'force-dynamic'

export default function NotFound() {
  return (
    <div style={{ padding: '50px', textAlign: 'center' }}>
      <h1>404 - Page Not Found</h1>
      <p>お探しのページは見つかりませんでした。</p>
      <a href="/" style={{ color: 'blue', textDecoration: 'underline' }}>
        ホームに戻る
      </a>
    </div>
  )
}
