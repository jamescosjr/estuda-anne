'use client'

import { useState, useEffect } from 'react'
import { BookOpen, FileText, ListChecks, NotebookPen, Trash2, CheckCircle2, Sparkles, CalendarDays, CalendarClock } from 'lucide-react'
import { type ScheduleEvent } from '@/lib/mock-data'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/lib/auth-context'
import { getApiUrl } from '@/lib/api-config'

const typeMeta: Record<
  ScheduleEvent['type'],
  { label: string; icon: React.ElementType; className: string }
> = {
  quiz: { label: 'Quiz', icon: ListChecks, className: 'bg-chart-1/15 text-chart-1' },
  flashcards: { label: 'Flashcards', icon: BookOpen, className: 'bg-chart-2/15 text-chart-2' },
  leitura: { label: 'Leitura', icon: FileText, className: 'bg-chart-4/15 text-chart-4' },
  resumo: { label: 'Resumo', icon: NotebookPen, className: 'bg-chart-3/20 text-chart-3' },
}

function mapScheduleToEvents(schedule: any): ScheduleEvent[] {
  if (!schedule?.items || !Array.isArray(schedule.items)) return []

  return schedule.items.map((item: any) => {
    const date = item.date ? new Date(item.date) : new Date()
    const weekday = date.toLocaleDateString('pt-BR', { weekday: 'short' })
    const dateLabel = date.toLocaleDateString('pt-BR')
    const type: ScheduleEvent['type'] = item.quizIds?.length
      ? 'quiz'
      : item.flashcardIds?.length
        ? 'flashcards'
        : 'leitura'

    return {
      id: item.id,
      day: weekday,
      date: dateLabel,
      title: item.topic || 'Sessão de estudos',
      subject: item.subject || '',
      type,
      time: '18:00',
      done: Boolean(item.completed),
    }
  })
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
        checked ? 'bg-primary' : 'bg-muted-foreground/30',
      )}
    >
      <span
        className={cn(
          'inline-block size-5 rounded-full bg-background shadow transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0.5',
        )}
      />
    </button>
  )
}

export function Schedule({ onNavigateToProfile }: { onNavigateToProfile?: () => void }) {
  const { user } = useAuth()
  const [events, setEvents] = useState<ScheduleEvent[]>([])
  const [closing, setClosing] = useState(false)
  const [closedSuccess, setClosedSuccess] = useState(false)
  const [prefs, setPrefs] = useState({
    dailyReminder: true,
    reviewDue: true,
    weeklyReport: false,
    email: true,
  })

  useEffect(() => {
    const studentId = user?.id
    if (!studentId) {
      setEvents([])
      return
    }

    const bffUrl = getApiUrl()
    let cancelled = false

    async function loadSchedule() {
      try {
        const res = await fetch(`${bffUrl}/api/study/schedule?studentId=${encodeURIComponent(studentId)}`)
        if (!res.ok) {
          if (!cancelled) setEvents([])
          return
        }
        const data = await res.json()
        if (!cancelled) setEvents(mapScheduleToEvents(data))
      } catch {
        if (!cancelled) setEvents([])
      }
    }

    loadSchedule()
    return () => {
      cancelled = true
    }
  }, [user?.id, user?.subjects, user?.examDates])

  const grouped = events.reduce<Record<string, ScheduleEvent[]>>((acc, event) => {
    const key = `${event.day} · ${event.date}`
    acc[key] = acc[key] ? [...acc[key], event] : [event]
    return acc
  }, {})

  async function toggleDone(id: string) {
    const previous = events
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, done: !e.done } : e)))

    const item = previous.find((e) => e.id === id)
    if (!item || item.done) {
      return
    }

    try {
      const res = await fetch(`${getApiUrl()}/api/study/schedule/items/${encodeURIComponent(id)}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: user?.id }),
      })
      if (!res.ok) {
        setEvents(previous)
      }
    } catch {
      setEvents(previous)
    }
  }

  async function handleCloseSemester() {
    if (!confirm('Deseja realmente encerrar o semestre? Todos os arquivos do Cloudflare R2, metadados e RAG serão limpos.')) {
      return
    }

    setClosing(true)
    const bffUrl = getApiUrl()
    try {
      const response = await fetch(`${bffUrl}/api/semesters/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: user?.id || 'student-anne-demo' }),
      })
      if (response.ok) {
        setClosedSuccess(true)
        setEvents([])
      }
    } catch {
      setClosedSuccess(false)
    } finally {
      setClosing(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Lista do Cronograma */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Seu Plano de Estudos Personalizado</CardTitle>
          <CardDescription>
            Cronograma montado pela Anne com base nas suas matérias, provas e metas de estudo.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-border bg-muted/20 space-y-4">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <CalendarClock className="size-6" />
              </span>
              <div className="space-y-1">
                <h3 className="font-semibold text-foreground text-sm">Sem Cronograma Configurado</h3>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Você ainda não cadastrou suas matérias ou provas. Acesse seu perfil para configurar suas disciplinas ou envie uma foto/arquivo do seu cronograma com a IA!
                </p>
              </div>
              {onNavigateToProfile && (
                <Button onClick={onNavigateToProfile} className="gap-2 rounded-xl text-xs">
                  <Sparkles className="size-4" />
                  Configurar Perfil & Cronograma
                </Button>
              )}
            </div>
          ) : (
            Object.entries(grouped).map(([label, dayEvents]) => (
              <div key={label}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {label}
                </p>
                <div className="flex flex-col gap-2">
                  {dayEvents.map((event) => {
                    const meta = typeMeta[event.type]
                    const Icon = meta.icon
                    return (
                      <label
                        key={event.id}
                        className={cn(
                          'flex cursor-pointer items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-muted/50',
                          event.done && 'opacity-60',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={event.done}
                          onChange={() => toggleDone(event.id)}
                          className="size-4 shrink-0 accent-primary"
                        />
                        <span
                          className={cn(
                            'flex size-9 shrink-0 items-center justify-center rounded-lg',
                            meta.className,
                          )}
                        >
                          <Icon className="size-4.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p
                            className={cn(
                              'truncate text-sm font-medium leading-tight',
                              event.done && 'line-through',
                            )}
                          >
                            {event.title}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">{event.subject}</p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className="text-xs font-medium">{event.time}</span>
                          <Badge variant="neutral">{meta.label}</Badge>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Cards Laterais: Notificações & Encerramento do Semestre */}
      <div className="flex flex-col gap-6">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Preferências de notificação</CardTitle>
            <CardDescription>Escolha quando a Anne deve te lembrar de estudar.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col divide-y divide-border">
            {[
              {
                key: 'dailyReminder' as const,
                title: 'Lembrete diário',
                desc: 'Um resumo das tarefas do dia às 8h.',
              },
              {
                key: 'reviewDue' as const,
                title: 'Revisões pendentes',
                desc: 'Avisar quando flashcards estiverem no ponto de revisão.',
              },
              {
                key: 'weeklyReport' as const,
                title: 'Relatório semanal',
                desc: 'Resumo do progresso todo domingo.',
              },
              {
                key: 'email' as const,
                title: 'Notificações por e-mail',
                desc: 'Receber também no e-mail cadastrado.',
              },
            ].map((item) => (
              <div key={item.key} className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight">{item.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground text-pretty">
                    {item.desc}
                  </p>
                </div>
                <Toggle
                  checked={prefs[item.key]}
                  onChange={(v) => setPrefs((p) => ({ ...p, [item.key]: v }))}
                  label={item.title}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive">Encerramento de Semestre</CardTitle>
            <CardDescription>
              Efemeridade: limpe todos os arquivos do Cloudflare R2, metadados e dados do RAG ao concluir as matérias do semestre.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {closedSuccess ? (
              <div className="flex items-center gap-2 rounded-xl bg-success/15 p-3 text-sm font-medium text-success-foreground">
                <CheckCircle2 className="size-5 shrink-0 text-success" />
                Semestre encerrado! Arquivos e dados de RAG foram limpos.
              </div>
            ) : (
              <Button
                variant="destructive"
                className="w-full"
                disabled={closing}
                onClick={handleCloseSemester}
              >
                <Trash2 className="size-4" />
                {closing ? 'Limpando dados...' : 'Encerrar Semestre e Limpar RAG'}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
