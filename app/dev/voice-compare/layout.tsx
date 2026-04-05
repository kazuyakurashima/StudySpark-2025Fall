import { notFound } from "next/navigation"

export default function VoiceCompareLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NEXT_PUBLIC_VOICE_COMPARE_ENABLED !== "true") {
    notFound()
  }
  return <>{children}</>
}
