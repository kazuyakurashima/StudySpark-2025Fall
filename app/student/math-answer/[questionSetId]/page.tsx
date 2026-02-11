import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMathQuestionsForAnswering, getMathDraftAnswers } from '@/app/actions/math-answer'
import { MathAnswerForm } from './math-answer-form'

export default async function MathAnswerInputPage({
  params,
}: {
  params: { questionSetId: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const questionSetId = Number(params.questionSetId)
  if (isNaN(questionSetId)) redirect('/student/math-answer')

  const [questionsResult, draftResult] = await Promise.all([
    getMathQuestionsForAnswering(questionSetId),
    getMathDraftAnswers(questionSetId),
  ])

  if (questionsResult.error || !questionsResult.questionSet) {
    redirect('/student/math-answer')
  }

  return (
    <MathAnswerForm
      questionSetId={questionSetId}
      questionSetTitle={questionsResult.questionSet.title}
      questions={questionsResult.questions}
      draft={draftResult}
    />
  )
}
