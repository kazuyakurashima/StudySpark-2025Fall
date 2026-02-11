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
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-xl font-bold mb-1">{questionsResult.questionSet.title}</h1>
      <p className="text-sm text-muted-foreground mb-6">
        {questionsResult.questionSet.questionCount}問
        {draftResult && draftResult.attemptNumber > 1 && (
          <span className="ml-2 text-blue-600">
            {draftResult.attemptNumber}回目の挑戦
          </span>
        )}
      </p>

      <MathAnswerForm
        questionSetId={questionSetId}
        questions={questionsResult.questions}
        draft={draftResult}
      />
    </div>
  )
}
