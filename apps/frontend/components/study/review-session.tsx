'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, RotateCcw, Layers, Sparkles, BookOpen } from 'lucide-react'
import { type FlashcardItem } from '@/lib/mock-data'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Flashcard, type Difficulty } from './flashcard'
import { getApiUrl } from '@/lib/api-config'
import { useAuth } from '@/lib/auth-context'

const academicFlashcardTemplates: Record<string, { front: string; back: string }[]> = {
  'cálculo': [
    {
      front: 'O que representa geometricamente a derivada de uma função f(x) em um ponto x₀?',
      back: 'Representa a inclinação (ou coeficiente angular) da reta tangente ao gráfico da função f(x) no ponto (x₀, f(x₀)).',
    },
  ],
  'bioquímica': [
    {
      front: 'O que caracteriza a estrutura secundária de uma proteína e quais são seus principais padrões?',
      back: 'Caracteriza-se pelo arranjo espacial local da cadeia polipeptídica mantido por pontes de hidrogênio. Os dois principais padrões são a Alfa-Hélice e a Folha-Beta.',
    },
  ],
  'algoritmos': [
    {
      front: 'Qual a principal diferença de funcionamento entre uma estrutura de dados Pilha (Stack) e uma Fila (Queue)?',
      back: 'Pilha opera no sistema LIFO (Last In, First Out — o último elemento a entrar é o primeiro a sair). Fila opera no sistema FIFO (First In, First Out — o primeiro a entrar é o primeiro a sair).',
    },
  ],
}

function generateAcademicFlashcards(subjects: string[], targetCount = 5, subjectFilter = 'all'): FlashcardItem[] {
  const selectedSubjects = (!subjects || subjects.length === 0)
    ? ['Cálculo I', 'Bioquímica', 'Algoritmos e Estruturas de Dados']
    : (subjectFilter !== 'all' ? [subjectFilter] : subjects)

  const list: FlashcardItem[] = []
  let idx = 0

  while (list.length < targetCount) {
    const sub = selectedSubjects[idx % selectedSubjects.length]
    const lowerSub = sub.toLowerCase()
    const matchKey = Object.keys(academicFlashcardTemplates).find((k) => lowerSub.includes(k))
    const itemNum = Math.floor(list.length / selectedSubjects.length) + 1

    if (matchKey && academicFlashcardTemplates[matchKey][0] && itemNum === 1) {
      const template = academicFlashcardTemplates[matchKey][0]
      list.push({
        id: `fc-${sub}-${list.length}`,
        subject: sub,
        front: template.front,
        back: template.back,
      })
    } else {
      list.push({
        id: `fc-gen-${sub}-${list.length}`,
        subject: sub,
        front: `[Card Extra ${list.length + 1} / ${targetCount}] Qual a aplicação fundamental do conceito de ${sub}?`,
        back: `O conceito em ${sub} permite estruturar raciocínios analíticos para resolução de problemas e otimização do tempo em avaliações acadêmicas.`,
      })
    }
    idx++
  }

  return list
}

const DEFAULT_SUBJECTS = ['Cálculo I', 'Bioquímica', 'Algoritmos e Estruturas de Dados']

export function ReviewSession() {
  const { user } = useAuth()
  const [cards, setCards] = useState<FlashcardItem[]>([])
  const [current, setCurrent] = useState(0)
  const [done, setDone] = useState(false)
  const [targetCount, setTargetCount] = useState<number>(5)
  const [subjectFilter, setSubjectFilter] = useState<string>('all')
  const bffUrl = getApiUrl()

  const studentId = user?.id || 'guest-student'
  const userSubjectsKey = user?.subjects?.join(',') || ''
  const availableSubjects = user?.subjects && user.subjects.length > 0
    ? user.subjects
    : DEFAULT_SUBJECTS

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
        // Fallback local
      }

      setCards(generateAcademicFlashcards(availableSubjects, targetCount, subjectFilter))
    }

    loadDueCards()
  }, [bffUrl, studentId, userSubjectsKey, targetCount, subjectFilter])

  function handleStartExtraSession() {
    setCards(generateAcademicFlashcards(availableSubjects, targetCount, subjectFilter))
    setCurrent(0)
    setDone(false)
  }

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

  const total = cards.length

  if (done) {
    return (
      <div className="mx-auto w-full max-w-xl flex flex-col gap-5">
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
      {/* Toolbar Sob Demanda (Estudo Extra) */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">Flashcards Extra — Fora do Horário</p>
              <p className="text-xs text-muted-foreground">Escolha a quantidade de cartões e a matéria para praticar</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="h-8 rounded-lg border border-border bg-background text-xs px-2.5 py-1 text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">Todas as Matérias</option>
              {availableSubjects.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select
              value={targetCount}
              onChange={(e) => setTargetCount(Number(e.target.value))}
              className="h-8 rounded-lg border border-border bg-background text-xs px-2.5 py-1 text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value={5}>5 Flashcards</option>
              <option value={10}>10 Flashcards</option>
              <option value={15}>15 Flashcards</option>
              <option value={20}>20 Flashcards</option>
            </select>

            <button
              type="button"
              onClick={handleStartExtraSession}
              className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors flex items-center gap-1.5"
            >
              <BookOpen className="size-3.5" />
              Gerar Sessão Extra
            </button>
          </div>
        </CardContent>
      </Card>

      {total > 0 && cards[current] && (
        <>
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium">Revisão espaçada — {cards[current].subject}</span>
              <span className="text-muted-foreground">
                Card {current + 1} de {total}
              </span>
            </div>
            <Progress value={((current + 1) / total) * 100} />
          </div>

          <Flashcard key={cards[current].id} card={cards[current]} onGrade={handleGrade} />
        </>
      )}
    </div>
  )
}
