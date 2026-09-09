'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, RotateCcw, Sparkles, BookOpen, Loader2 } from 'lucide-react'
import { type FlashcardItem } from '@/lib/mock-data'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Flashcard, type Difficulty } from './flashcard'
import { getApiUrl } from '@/lib/api-config'
import { useAuth } from '@/lib/auth-context'
import { fetchJson } from '@/lib/http'
import { resolveSubjectFilter, useStudentSubjects } from '@/lib/student-subjects'

const SEEN_CARDS_KEY = 'estuda-anne.flashcards.seen-ids'

function isPlaceholderFront(front: string): boolean {
  const t = (front || '').toLowerCase()
  return t.includes('[card de revisão') ||
    (t.includes('aplicações práticas essenciais') && t.includes('aprendizado universitário'))
}

function readSeenCardIds(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.sessionStorage.getItem(SEEN_CARDS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function rememberSeenCardIds(ids: string[]) {
  if (typeof window === 'undefined') return
  const next = Array.from(new Set([...readSeenCardIds(), ...ids])).slice(-80)
  window.sessionStorage.setItem(SEEN_CARDS_KEY, JSON.stringify(next))
}

function mapApiCard(fc: any, isNew = false): FlashcardItem {
  return {
    id: fc.id,
    subject: fc.subject || fc.topic || fc.tags?.[0] || 'Conceito',
    front: fc.front,
    back: fc.back,
    persisted: Boolean(fc.id && !String(fc.id).startsWith('fc-')),
    isNew,
  }
}

export function ReviewSession() {
  const { user } = useAuth()
  const [cards, setCards] = useState<FlashcardItem[]>([])
  const [persistedPool, setPersistedPool] = useState<FlashcardItem[]>([])
  const [usingDemo, setUsingDemo] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [adaptiveHint, setAdaptiveHint] = useState<string | null>(null)
  const [sessionMeta, setSessionMeta] = useState<{ generated: number; mixed: number } | null>(null)
  const [current, setCurrent] = useState(0)
  const [done, setDone] = useState(false)
  const [targetCount, setTargetCount] = useState<number>(5)
  const [subjectFilter, setSubjectFilter] = useState<string>('all')
  const bffUrl = getApiUrl()

  const studentId = user?.id || ''
  const userSubjectsKey = user?.subjects?.join(',') || ''
  const availableSubjects = useStudentSubjects()

  useEffect(() => {
    async function loadDueCards() {
      if (!studentId) return
      setLoadError(null)
      try {
        const params = new URLSearchParams({ studentId })
        if (subjectFilter !== 'all') params.set('topic', subjectFilter)
        if (availableSubjects.length > 0) params.set('allowedSubjects', availableSubjects.join(','))
        const { ok, data } = await fetchJson<any[]>(
          `${bffUrl}/api/flashcards/due?${params.toString()}`,
        )
        if (ok && Array.isArray(data) && data.length > 0) {
          const seen = new Set(readSeenCardIds())
          const mapped: FlashcardItem[] = data
            .map((fc: any) => mapApiCard(fc, false))
            .filter((card) => !isPlaceholderFront(card.front))
          if (mapped.length > 0) {
            const unseen = mapped.filter((card) => !seen.has(card.id))
            const rest = mapped.filter((card) => seen.has(card.id))
            const ordered = [...unseen, ...rest]
            setPersistedPool(mapped)
            setCards(ordered.slice(0, targetCount))
            rememberSeenCardIds(ordered.slice(0, targetCount).map((card) => card.id))
            setUsingDemo(false)
            setAdaptiveHint(null)
            setSessionMeta(null)
            return
          }
        }
        if (!ok) {
          setLoadError('Não foi possível carregar os flashcards agora. Tente de novo em instantes.')
        }
      } catch {
        setLoadError('Não foi possível carregar os flashcards agora. Tente de novo em instantes.')
      }

      setUsingDemo(false)
      setPersistedPool([])
      setCards([])
      if (!loadError) {
        setLoadError(null)
      }
    }

    loadDueCards()
  }, [bffUrl, studentId, userSubjectsKey, targetCount, subjectFilter])

  useEffect(() => {
    setSubjectFilter((current) => resolveSubjectFilter(availableSubjects, current))
  }, [userSubjectsKey])

  const [sessionId, setSessionId] = useState<number>(0)

  async function handleStartExtraSession() {
    if (!studentId) {
      setLoadError('Faça login para gerar a sessão extra.')
      return
    }
    setCurrent(0)
    setDone(false)
    setLoadError(null)
    setGenerating(true)
    setSessionId((s) => s + 1)

    try {
      const { ok, data } = await fetchJson<{
        flashcards?: any[]
        generatedCount?: number
        mixedDueCount?: number
        weakTopics?: string[]
        adaptiveHint?: string
        newCardIds?: string[]
        message?: string
      }>(`${bffUrl}/api/flashcards/extra-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          topic: subjectFilter !== 'all' ? subjectFilter : undefined,
          allowedSubjects: availableSubjects,
          count: targetCount,
          excludeIds: readSeenCardIds(),
        }),
      })

      const newFlashcards = data?.flashcards || []
      if (ok && Array.isArray(newFlashcards) && newFlashcards.length > 0) {
        const newIds = new Set(data?.newCardIds || [])
        const mapped: FlashcardItem[] = newFlashcards
          .map((fc: any) => mapApiCard(fc, newIds.has(fc.id)))
          .filter((card) => !isPlaceholderFront(card.front))
        if (mapped.length === 0) {
          setLoadError('A sessão extra não trouxe cards de conteúdo. Envie material em Materiais e tente de novo.')
          return
        }
        setPersistedPool((prev) => {
          const byId = new Map(prev.map((card) => [card.id, card]))
          mapped.forEach((card) => byId.set(card.id, card))
          return [...byId.values()]
        })
        setCards(mapped)
        setUsingDemo(false)
        setAdaptiveHint(data?.adaptiveHint || null)
        setSessionMeta({
          generated: data?.generatedCount ?? mapped.filter((c) => c.isNew).length,
          mixed: data?.mixedDueCount ?? 0,
        })
        rememberSeenCardIds(mapped.map((card) => card.id))
        return
      }

      setLoadError(data?.message || 'Não foi possível gerar um lote novo agora. Tente novamente.')
    } catch {
      setLoadError('Falha ao gerar a sessão extra. Verifique a conexão e tente de novo.')
    } finally {
      setGenerating(false)
    }
  }

  async function handleGrade(difficulty: Difficulty) {
    const card = cards[current]
    const ratingMap: Record<Difficulty, number> = {
      easy: 5,
      medium: 3,
      hard: 1,
    }

    const isRealDbCard = Boolean(
      card?.persisted && card?.id && !card.id.startsWith('fc-gen-') && !card.id.startsWith('fc-')
    )

    if (isRealDbCard) {
      try {
        await fetch(`${bffUrl}/api/flashcards/${encodeURIComponent(card.id)}/review`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ grade: ratingMap[difficulty], rating: ratingMap[difficulty] }),
        })
      } catch {
        // Ignora falhas de conexão em modo offline
      }
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
              Você revisou {total} flashcards. O assistente de IA reagendou cada card conforme sua dificuldade e
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
              <p className="text-sm font-semibold text-foreground">Sessão extra adaptativa</p>
              <p className="text-xs text-muted-foreground">Gera cards novos, persiste no banco e mistura com a fila SM-2 da matéria</p>
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
              disabled={generating}
              className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors flex items-center gap-1.5 disabled:opacity-60"
            >
              {generating ? <Loader2 className="size-3.5 animate-spin" /> : <BookOpen className="size-3.5" />}
              {generating ? 'Gerando lote...' : 'Gerar Sessão Extra'}
            </button>
          </div>
        </CardContent>
      </Card>

      {sessionMeta && !usingDemo && (
        <p className="text-xs text-muted-foreground">
          Lote ativo: {sessionMeta.generated} card(s) novos persistidos
          {sessionMeta.mixed > 0 ? ` misturados com ${sessionMeta.mixed} da revisão espaçada` : ''}.
        </p>
      )}

      {adaptiveHint && !usingDemo && (
        <p className="text-xs text-foreground/80 rounded-lg border border-border bg-muted/40 px-3 py-2">
          {adaptiveHint}
        </p>
      )}

      {loadError && (
        <p className="text-xs text-destructive">{loadError}</p>
      )}

      {usingDemo && (
        <p className="text-xs text-muted-foreground">
          Demonstração: estes cards não vieram do seu material. Envie apostilas em Materiais para revisar o conteúdo persistido.
        </p>
      )}

      {!generating && total === 0 && (
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <h2 className="font-display text-lg font-semibold">Nenhum flashcard de conteúdo ainda</h2>
            <p className="text-sm text-muted-foreground text-pretty">
              A fila não usa mais cartões genéricos. Envie um material da matéria ou toque em
              {' '}
              <strong>Gerar Sessão Extra</strong>
              {' '}
              para criar cards a partir do que já está no banco.
            </p>
          </CardContent>
        </Card>
      )}

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
