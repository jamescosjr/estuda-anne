'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, RotateCcw } from 'lucide-react'
import { flashcards as defaultFlashcards, type FlashcardItem } from '@/lib/mock-data'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Flashcard, type Difficulty } from './flashcard'

export function ReviewSession() {
  const [cards, setCards] = useState<FlashcardItem[]>(defaultFlashcards)
  const [current, setCurrent] = useState(0)
  const [done, setDone] = useState(false)
  const total = cards.length
  const bffUrl = process.env.NEXT_PUBLIC_BFF_URL || 'http://localhost:3001'

  useEffect(() => {
    async function loadDueCards() {
      try {
        const res = await fetch(`${bffUrl}/api/flashcards/due?studentId=anne-student-1`)
        if (res.ok) {
          const list = await res.json()
          if (Array.isArray(list) && list.length > 0) {
            const mapped: FlashcardItem[] = list.map((fc: any) => ({
              id: fc.id,
              subject: fc.topic || 'Conceito Geral',
              front: fc.front,
              back: fc.back,
            }))
            setCards(mapped)
          }
        }
      } catch (err) {
        // Fallback para estado inicial
      }
    }
    loadDueCards()
  }, [bffUrl])

  async function handleGrade(difficulty: Difficulty) {
    const card = cards[current]
    const ratingMap: Record<Difficulty, number> = {
      easy: 5,
      medium: 3,
      hard: 1,
    }

    try {
      await fetch(`${bffUrl}/api/flashcards/${card.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: ratingMap[difficulty] }),
      })
    } catch {
      // Ignora falhas de conexão em modo offline
    }

    if (current === total - 1) {
      setDone(true)
    } else {
      setCurrent((c) => c + 1)
    }
  }

  function restart() {
    setCurrent(0)
    setDone(false)
  }

  if (done) {
    return (
      <div className="mx-auto w-full max-w-xl">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-[var(--success)]/12 text-[var(--success)]">
              <CheckCircle2 className="size-7" />
            </span>
            <h2 className="font-display text-xl font-semibold tracking-tight">
              Revisão concluída!
            </h2>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground text-pretty">
              Você revisou {total} flashcards. A Anne reagendou cada card conforme sua dificuldade e
              atualizou seu progresso no cronograma.
            </p>
            <Button onClick={restart} variant="secondary">
              <RotateCcw />
              Revisar novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <div>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">Revisão espaçada</span>
          <span className="text-muted-foreground">
            Card {current + 1} de {total}
          </span>
        </div>
        <Progress value={((current + 1) / total) * 100} />
      </div>

      <Flashcard key={cards[current].id} card={cards[current]} onGrade={handleGrade} />
    </div>
  )
}
