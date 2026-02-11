import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMathQuestionSets } from '@/app/actions/math-answer'
import { MathQuestionSetList } from './math-question-set-list'

export default async function MathAnswerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const { questionSets, error } = await getMathQuestionSets()

  return <MathQuestionSetList questionSets={questionSets} error={error} />
}
