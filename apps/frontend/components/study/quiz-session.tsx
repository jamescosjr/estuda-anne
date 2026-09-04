'use client'

import { useState } from 'react'
import { quizQuestions } from '@/lib/mock-data'
import { Progress } from '@/components/ui/progress'
import { QuizCard } from './quiz-card'

export function QuizSession() {
  const [current, setCurrent] = useState(0)
  const total = quizQuestions.length
  const question = quizQuestions[current]

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <div>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">Quiz — {question.subject}</span>
          <span className="text-muted-foreground">
            {Math.round(((current + 1) / total) * 100)}% concluído
          </span>
        </div>
        <Progress value={((current + 1) / total) * 100} />
      </div>

      <QuizCard
        key={question.id}
        question={question}
        index={current}
        total={total}
        isLast={current === total - 1}
        onNext={() => setCurrent((c) => Math.min(c + 1, total - 1))}
      />
    </div>
  )
}
