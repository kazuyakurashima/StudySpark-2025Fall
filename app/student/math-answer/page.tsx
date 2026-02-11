import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMathQuestionSets } from '@/app/actions/math-answer'
import { MathQuestionSetList } from './math-question-set-list'

export default async function MathAnswerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const { data: student } = await supabase
    .from('students')
    .select('id, grade')
    .eq('user_id', user.id)
    .single()

  if (!student) redirect('/')

  const { questionSets, error } = await getMathQuestionSets()

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-xl font-bold mb-6">算数プリント 解答入力</h1>

      {error ? (
        <p className="text-destructive text-sm">{error}</p>
      ) : questionSets.length === 0 ? (
        <p className="text-muted-foreground text-sm">利用可能な問題セットがありません</p>
      ) : (
        <MathQuestionSetList questionSets={questionSets} />
      )}
    </div>
  )
}
