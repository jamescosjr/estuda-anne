'use client'

import { useState, useEffect } from 'react'
import { Sparkles, BookOpen, Loader2 } from 'lucide-react'
import { type QuizQuestion } from '@/lib/mock-data'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { QuizCard } from './quiz-card'
import { useAuth } from '@/lib/auth-context'
import { getApiUrl } from '@/lib/api-config'
import { fetchJson, shuffleInPlace } from '@/lib/http'
import { resolveSubjectFilter, useStudentSubjects } from '@/lib/student-subjects'

const SEEN_QUIZ_KEY = 'estuda-anne.quiz.seen-ids'

function readSeenQuizIds(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.sessionStorage.getItem(SEEN_QUIZ_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

function rememberSeenQuizIds(ids: string[]) {
  if (typeof window === 'undefined') return
  const seen = readSeenQuizIds()
  ids.forEach((id) => seen.add(id))
  window.sessionStorage.setItem(SEEN_QUIZ_KEY, JSON.stringify([...seen]))
}

function randomizeQuestionOptions(q: QuizQuestion): QuizQuestion {
  if (!q.options || q.options.length <= 1) return q;

  const correctOptionText = q.options.find((o) => o.id === q.correctId)?.text;
  if (!correctOptionText) return q;

  const shuffledTextList = [...q.options.map((o) => o.text)];
  shuffleInPlace(shuffledTextList);

  const optionIds = ['a', 'b', 'c', 'd', 'e'];
  const newOptions = shuffledTextList.map((text, idx) => ({
    id: optionIds[idx] || String(idx),
    text,
  }));

  const newCorrectOption = newOptions.find((o) => o.text === correctOptionText);

  return {
    ...q,
    options: newOptions,
    correctId: newCorrectOption ? newCorrectOption.id : 'a',
  };
}

function mapApiQuestion(question: any, subject: string, isNew = false): QuizQuestion {
  const rawOptions = question.options || []
  const options = rawOptions.map((opt: any, optionIdx: number) =>
    typeof opt === 'string'
      ? { id: String(optionIdx), text: opt }
      : { id: opt.id ?? String(optionIdx), text: opt.text }
  )
  const correctId =
    question.correctId ??
    String(question.correctAnswerIndex ?? 0)

  return {
    id: question.id,
    subject: question.subject || subject || 'Quiz',
    prompt: question.prompt,
    options,
    correctId,
    explanation: question.explanation || '',
    isNew,
  }
}

export function QuizSession() {
  const { user } = useAuth()
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [usingDemo, setUsingDemo] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [adaptiveHint, setAdaptiveHint] = useState<string | null>(null)
  const [sessionMeta, setSessionMeta] = useState<{ generated: number; mixed: number } | null>(null)
  const [current, setCurrent] = useState(0)
  const [targetCount, setTargetCount] = useState<number>(5)
  const [subjectFilter, setSubjectFilter] = useState<string>('all')

  const userSubjectsKey = user?.subjects?.join(',') || ''
  const availableSubjects = useStudentSubjects()

  useEffect(() => {
    setSubjectFilter((current) => resolveSubjectFilter(availableSubjects, current))
  }, [userSubjectsKey])

  useEffect(() => {
    async function loadQuizzes() {
      setLoadError(null)
      const studentId = user?.id
      if (!studentId) return
      const topic = subjectFilter !== 'all' ? subjectFilter : undefined
      try {
        const params = new URLSearchParams({
          studentId,
          count: String(targetCount),
        })
        if (topic) params.set('topic', topic)
        if (availableSubjects.length > 0) params.set('allowedSubjects', availableSubjects.join(','))
        const { ok, data } = await fetchJson<{
          questions?: any[]
          adaptiveHint?: string
          bankCount?: number
        }>(`${getApiUrl()}/api/quizzes/session?${params.toString()}`)

        if (ok && Array.isArray(data?.questions) && data.questions.length > 0) {
          const mapped = data.questions.map((question) => mapApiQuestion(question, question.subject, false))
          setUsingDemo(false)
          setQuestions(mapped.map(randomizeQuestionOptions))
          setAdaptiveHint(data.adaptiveHint || null)
          setSessionMeta({ generated: 0, mixed: data.bankCount ?? mapped.length })
          setCurrent(0)
          rememberSeenQuizIds(mapped.map((q) => q.id))
          return
        }
        if (!ok) {
          setLoadError('Não foi possível montar o quiz agora. Tente de novo em instantes.')
        }
      } catch {
        setLoadError('Não foi possível montar o quiz agora. Tente de novo em instantes.')
      }
      setUsingDemo(false)
      setAdaptiveHint(null)
      setSessionMeta(null)
      setQuestions([])
      setCurrent(0)
    }
    loadQuizzes()
  }, [userSubjectsKey, targetCount, subjectFilter, user?.id])

  async function handleStartExtraSession() {
    if (!user?.id) {
      setLoadError('Faça login para gerar a sessão extra.')
      return
    }
    setCurrent(0)
    setLoadError(null)
    setGenerating(true)

    try {
      const { ok, data } = await fetchJson<{
        questions?: any[]
        quiz?: any
        newQuestionIds?: string[]
        generatedCount?: number
        mixedBankCount?: number
        adaptiveHint?: string
        message?: string
      }>(`${getApiUrl()}/api/quizzes/extra-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: user?.id,
          topic: subjectFilter !== 'all' ? subjectFilter : undefined,
          allowedSubjects: availableSubjects,
          count: targetCount,
          excludeIds: [...readSeenQuizIds()],
        }),
      })

      const payloadQuestions = data?.questions?.length ? data.questions : data?.quiz?.questions
      if (ok && Array.isArray(payloadQuestions) && payloadQuestions.length > 0) {
        const newIds = new Set(data?.newQuestionIds || [])
        const mapped = payloadQuestions.map((q: any) =>
          mapApiQuestion(q, q.subject || data?.quiz?.title || 'Quiz Extra', newIds.has(q.id)),
        )
        setQuestions(mapped.map(randomizeQuestionOptions))
        setUsingDemo(false)
        setAdaptiveHint(data?.adaptiveHint || null)
        setSessionMeta({
          generated: data?.generatedCount ?? mapped.filter((q) => q.isNew).length,
          mixed: data?.mixedBankCount ?? 0,
        })
        rememberSeenQuizIds(mapped.map((q) => q.id))
        return
      }

      setLoadError(data?.message || 'Não foi possível gerar um lote novo agora. Tente novamente.')
    } catch {
      setLoadError('Falha ao gerar a sessão extra. Verifique a conexão e tente de novo.')
    } finally {
      setGenerating(false)
    }
  }

  const total = questions.length
  const question = questions[current]

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      {/* Control Toolbar: Estudo Sob Demanda (Fora do Horário) */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">Sessão extra adaptativa</p>
              <p className="text-xs text-muted-foreground">Lê o acervo no banco, prioriza tópicos fracos e só gera o que faltar</p>
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
              <option value={5}>5 Questões</option>
              <option value={10}>10 Questões</option>
              <option value={15}>15 Questões</option>
              <option value={20}>20 Questões</option>
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
          Lote ativo: {sessionMeta.generated} questão(ões) novas
          {sessionMeta.mixed > 0 ? ` misturadas com ${sessionMeta.mixed} do acervo` : ' do acervo persistido'}.
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

      {!generating && total === 0 && (
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <h2 className="font-display text-lg font-semibold">Nenhuma questão persistida ainda</h2>
            <p className="text-sm text-muted-foreground text-pretty">
              O quiz não usa mais perguntas genéricas. Envie o material em Materiais ou toque em
              {' '}
              <strong>Gerar Sessão Extra</strong>
              {' '}
              para montar questões a partir do acervo no banco.
            </p>
          </CardContent>
        </Card>
      )}

      {total > 0 && question && (
        <>
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium">Quiz ({current + 1} de {total}) — {question.subject}</span>
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
        </>
      )}
    </div>
  )
}
