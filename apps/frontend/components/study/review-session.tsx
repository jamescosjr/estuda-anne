'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, RotateCcw, Layers, Sparkles } from 'lucide-react'
import { type FlashcardItem } from '@/lib/mock-data'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Flashcard, type Difficulty } from './flashcard'
import { getApiUrl } from '@/lib/api-config'
import { useAuth } from '@/lib/auth-context'

function generateUserFlashcards(subjects: string[]): FlashcardItem[] {
  if (!subjects || subjects.length === 0) return []

  const list: FlashcardItem[] = []
  subjects.forEach((sub, idx) => {
    list.push({
      id: `fc-${sub}-${idx}-1`,
      subject: sub,
      front: `Qual é a melhor estratégia de estudo sugerida pela Anne para a disciplina de ${sub}?`,
      back: `Fazer sessões diárias curtas (ex: 30 a 45 min) intercalando flashcards e leitura guiada para fixação profunda do conteúdo de ${sub}.`,
    })
  })
  return list
}

export function ReviewSession() {
  const { user } = useAuth()
  const [cards, setCards] = useState<FlashcardItem[]>([])
  const [current, setCurrent] = useState(0)
  const [done, setDone] = useState(false)
  const bffUrl = getApiUrl()

  const studentId = user?.id || 'guest-student'

  useEffect(() => {
    async function loadDueCards() {
      try {
        const res = await fetch(`${bffUrl}/api/flashcards/due?studentId=${encodeURIComponent(studentId)}`)
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
            return
          }
        }
      } catch (err) {
        // Fallback local por matérias
      }

      if (user?.subjects && user.subjects.length > 0) {
        setCards(generateUserFlashcards(user.subjects))
      } else {
        setCards([])
      }
    }

    loadDueCards()
  }, [bffUrl, studentId, user?.subjects])

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

    if (current === cards.length - 1) {
      setDone(true)
    } else {
      setCurrent((c) => c + 1)
    }
  }

  function restart() {
    setCurrent(0)
    setDone(false)
  }

  if (cards.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col items-center justify-center pt-8">
        <Card className="w-full border-border shadow-sm">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center space-y-4">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Layers className="size-7" />
            </span>
            <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
              Sem Flashcards Pendentes
            </h2>
            <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
              Você não possui flashcards agendados para hoje. Cadastre suas matérias no <strong className="text-foreground">Perfil</strong> ou envie uma apostila na <strong className="text-foreground">Central de Materiais</strong> para gerar novos cartões!
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const total = cards.length

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
