import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMathGradeResult, getMathQuestionsForAnswering } from '@/app/actions/math-answer'
import { MathResultView } from './math-result-view'

export default async function MathResultPage({
  params,
}: {
  params: { questionSetId: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const questionSetId = Number(params.questionSetId)
  if (isNaN(questionSetId)) redirect('/student/math-answer')

  const [gradeResult, questionsResult] = await Promise.all([
    getMathGradeResult(questionSetId),
    getMathQuestionsForAnswering(questionSetId),
  ])

  if (!gradeResult?.result) {
    redirect(`/student/math-answer/${questionSetId}`)
  }

  return (
    <MathResultView
      questionSetId={questionSetId}
      questionSetTitle={questionsResult.questionSet?.title || '採点結果'}
      result={gradeResult.result}
    />
  )
}
