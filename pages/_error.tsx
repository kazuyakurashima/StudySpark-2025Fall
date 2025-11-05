// Sentryのエラーページを上書きするカスタムエラーページ
// ※Htmlタグを使わずReactコンポーネントのみで構成
import { NextPageContext } from 'next'

interface ErrorProps {
  statusCode: number
}

function Error({ statusCode }: ErrorProps) {
  return (
    <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h1>
        {statusCode
          ? `${statusCode} - サーバーエラーが発生しました`
          : 'クライアントエラーが発生しました'}
      </h1>
      <p>申し訳ございません。問題が発生しました。</p>
      <a href="/" style={{ color: '#0070f3', textDecoration: 'underline' }}>
        ホームに戻る
      </a>
    </div>
  )
}

Error.getInitialProps = ({ res, err }: NextPageContext): ErrorProps => {
  const statusCode = res ? res.statusCode : err ? err.statusCode! : 404
  return { statusCode }
}

export default Error