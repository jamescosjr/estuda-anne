'use client'

import { useState } from 'react'
import { Eye, RotateCcw } from 'lucide-react'
import type { FlashcardItem } from '@/lib/mock-data'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

import { AIFeedbackButton } from './ai-feedback-button'

export type Difficulty = 'easy' | 'medium' | 'hard'

interface FlashcardProps {
  card: FlashcardItem
  onGrade: (difficulty: Difficulty) => void
}

export function Flashcard({ card, onGrade }: FlashcardProps) {
  const [revealed, setRevealed] = useState(false)

  function grade(difficulty: Difficulty) {
    onGrade(difficulty)
    setRevealed(false)
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div
        className={cn(
          'flex min-h-[320px] w-full flex-col rounded-3xl border border-border bg-card p-8 shadow-sm transition-colors',
          revealed && 'bg-gradient-to-b from-card to-muted/40',
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-primary">
            {card.subject}
          </p>
          <div className="flex items-center gap-1.5">
            {card.isNew && <Badge>Novo</Badge>}
            <Badge variant="neutral">{revealed ? 'Resposta' : 'Pergunta'}</Badge>
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
          <p className="font-display text-xl font-semibold leading-snug tracking-tight text-balance">
            {card.front}
          </p>
          {revealed && (
            <>
              <div className="my-6 h-px w-16 bg-border" />
              <p className="max-w-lg text-base leading-relaxed text-foreground/80 text-pretty">
                {card.back}
              </p>
              <div className="mt-4 flex justify-center">
                <AIFeedbackButton targetType="flashcard" targetId={card.id} subject={card.subject} />
              </div>
            </>
          )}
        </div>
      </div>

      {!revealed ? (
        <Button size="lg" onClick={() => setRevealed(true)} className="w-full max-w-xs">
          <Eye />
          Revelar resposta
        </Button>
      ) : (
        <div className="w-full">
          <p className="mb-3 flex items-center justify-center gap-1.5 text-center text-sm text-muted-foreground">
            <RotateCcw className="size-3.5" />
            Quão fácil foi lembrar? Isso ajusta a repetição espaçada.
          </p>
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant="secondary"
              className="h-auto flex-col gap-1 border border-[var(--success)]/30 bg-[var(--success)]/10 py-3 text-[var(--success)] hover:bg-[var(--success)]/18"
              onClick={() => grade('easy')}
            >
              <span className="text-sm font-semibold">Fácil</span>
              <span className="text-xs opacity-80">rever em 7 dias</span>
            </Button>
            <Button
              variant="secondary"
              className="h-auto flex-col gap-1 border border-[var(--warning)]/40 bg-[var(--warning)]/15 py-3 text-[var(--warning-foreground)] hover:bg-[var(--warning)]/25 dark:text-[var(--warning)]"
              onClick={() => grade('medium')}
            >
              <span className="text-sm font-semibold">Médio</span>
              <span className="text-xs opacity-80">rever em 2 dias</span>
            </Button>
            <Button
              variant="secondary"
              className="h-auto flex-col gap-1 border border-[var(--danger)]/30 bg-[var(--danger)]/10 py-3 text-[var(--danger)] hover:bg-[var(--danger)]/18"
              onClick={() => grade('hard')}
            >
              <span className="text-sm font-semibold">Difícil</span>
              <span className="text-xs opacity-80">rever hoje</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
