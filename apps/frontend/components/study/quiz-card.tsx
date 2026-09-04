'use client'

import { useState } from 'react'
import { Check, ChevronRight, Sparkles, X } from 'lucide-react'
import type { QuizQuestion } from '@/lib/mock-data'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface QuizCardProps {
  question: QuizQuestion
  index: number
  total: number
  onNext: () => void
  isLast: boolean
}

export function QuizCard({ question, index, total, onNext, isLast }: QuizCardProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  const isCorrect = confirmed && selected === question.correctId

  function reset() {
    setSelected(null)
    setConfirmed(false)
  }

  function handleNext() {
    reset()
    onNext()
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-5 flex items-center justify-between">
          <Badge variant="default">
            <Sparkles className="size-3.5" />
            Questão gerada por IA
          </Badge>
          <span className="text-sm font-medium text-muted-foreground">
            {index + 1} de {total}
          </span>
        </div>

        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-primary">
          {question.subject}
        </p>
        <h2 className="font-display text-lg font-semibold leading-snug tracking-tight text-balance">
          {question.prompt}
        </h2>

        <div className="mt-6 flex flex-col gap-3">
          {question.options.map((option) => {
            const isChosen = selected === option.id
            const isAnswer = option.id === question.correctId
            const showCorrect = confirmed && isAnswer
            const showWrong = confirmed && isChosen && !isAnswer

            return (
              <button
                key={option.id}
                type="button"
                disabled={confirmed}
                onClick={() => setSelected(option.id)}
                className={cn(
                  'flex items-center gap-3 rounded-xl border p-4 text-left text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default',
                  !confirmed && isChosen && 'border-primary bg-primary/8',
                  !confirmed && !isChosen && 'border-border hover:border-primary/40 hover:bg-muted/60',
                  showCorrect && 'border-[var(--success)] bg-[var(--success)]/10',
                  showWrong && 'border-[var(--danger)] bg-[var(--danger)]/10',
                  confirmed && !showCorrect && !showWrong && 'border-border opacity-60',
                )}
              >
                <span
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold uppercase',
                    !confirmed && isChosen && 'border-primary bg-primary text-primary-foreground',
                    !confirmed && !isChosen && 'border-border text-muted-foreground',
                    showCorrect && 'border-[var(--success)] bg-[var(--success)] text-[var(--success-foreground)]',
                    showWrong && 'border-[var(--danger)] bg-[var(--danger)] text-[var(--danger-foreground)]',
                    confirmed && !showCorrect && !showWrong && 'border-border text-muted-foreground',
                  )}
                >
                  {showCorrect ? (
                    <Check className="size-4" />
                  ) : showWrong ? (
                    <X className="size-4" />
                  ) : (
                    option.id
                  )}
                </span>
                <span className="font-medium leading-relaxed">{option.text}</span>
              </button>
            )
          })}
        </div>

        {/* Feedback area */}
        {confirmed && (
          <div
            className={cn(
              'mt-5 rounded-xl border p-4',
              isCorrect
                ? 'border-[var(--success)]/40 bg-[var(--success)]/8'
                : 'border-[var(--danger)]/40 bg-[var(--danger)]/8',
            )}
          >
            <p
              className={cn(
                'flex items-center gap-2 text-sm font-semibold',
                isCorrect ? 'text-[var(--success)]' : 'text-[var(--danger)]',
              )}
            >
              {isCorrect ? <Check className="size-4" /> : <X className="size-4" />}
              {isCorrect ? 'Resposta correta!' : 'Resposta incorreta'}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-foreground/80 text-pretty">
              <span className="font-medium text-foreground">Explicação da Anne: </span>
              {question.explanation}
            </p>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          {!confirmed ? (
            <Button size="lg" disabled={!selected} onClick={() => setConfirmed(true)}>
              Confirmar resposta
            </Button>
          ) : (
            <Button size="lg" variant="secondary" onClick={handleNext} disabled={isLast}>
              {isLast ? 'Quiz concluído' : 'Próxima questão'}
              {!isLast && <ChevronRight />}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
