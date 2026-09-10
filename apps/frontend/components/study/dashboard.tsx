'use client'

import { useEffect, useState } from 'react'
import {
  ArrowUpRight,
  BookOpen,
  CalendarClock,
  Clock,
  ListChecks,
  Sparkles,
  TrendingUp,
  FolderPlus,
  AlertTriangle,
  Flame,
  Activity,
  CheckCircle2,
} from 'lucide-react'
import { type TabId, type ScheduleEvent, type CourseProgress } from '@/lib/mock-data'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useAuth } from '@/lib/auth-context'
import { DailyBriefingCard } from './daily-briefing-card'
import { getApiUrl } from '@/lib/api-config'

const eventTypeLabels: Record<string, string> = {
  quiz: 'Quiz',
  flashcards: 'Flashcards',
  leitura: 'Leitura',
  resumo: 'Resumo',
}

const colorPalette = ['bg-chart-1', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4']

interface DashboardProps {
  onNavigate: (tab: TabId) => void
}

interface PendingItemDisplay {
  id: string
  subject: string
  title: string
  type: 'schedule_overdue' | 'flashcard_due' | 'quiz_pending' | 'reading'
  estimatedMinutes: number
  isOverdue: boolean
}

interface MetricsOverviewData {
  pendingSummary: {
    totalPendingCount: number
    overdueScheduleCount: number
    dueFlashcardsCount: number
    items: PendingItemDisplay[]
  }
  scheduleAdherence: {
    totalScheduledItems: number
    completedItems: number
    overdueItems: number
    onTimeItems: number
    adherencePercentage: number
    status: 'EM_DIA' | 'ATRASADO' | 'SEM_CRONOGRAMA'
  }
  evolutionary: {
    weeklyVelocity: Array<{
      day: string
      date: string
      targetMinutes: number
      completedMinutes: number
      completedTasksCount: number
    }>
    studyStreakDays: number
    overallCompletionPct: number
    totalTimeSpentMinutes: number
    retentionRatePct: number
  }
  subjectProgress: Array<{
    subjectName: string
    progressPct: number
    topicsTotal: number
    topicsCompleted: number
    overdueCount: number
  }>
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { user } = useAuth()
  const subjects = user?.subjects || []
  const hasSubjects = subjects.length > 0
  const [overall, setOverall] = useState(0)
  const [userProgress, setUserProgress] = useState<CourseProgress[]>([])
  const [pendingTasks, setPendingTasks] = useState<PendingItemDisplay[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<ScheduleEvent[]>([])
  const [metrics, setMetrics] = useState<MetricsOverviewData | null>(null)

  useEffect(() => {
    const studentId = user?.id
    if (!studentId) return
    const bffUrl = getApiUrl()

    async function loadDashboard() {
      try {
        const [scheduleRes, metricsRes] = await Promise.all([
          fetch(`${bffUrl}/api/study/schedule?studentId=${encodeURIComponent(studentId)}`),
          fetch(
            `${bffUrl}/api/metrics/overview?studentId=${encodeURIComponent(studentId)}${
              subjects.length ? `&subjects=${encodeURIComponent(subjects.join(','))}` : ''
            }`
          ),
        ])

        let progressRows: CourseProgress[] = subjects.map((sub, idx) => ({
          id: `c-${sub}-${idx}`,
          name: sub,
          color: colorPalette[idx % colorPalette.length],
          progress: 0,
          topics: 0,
          reviewed: 0,
        }))
        let nextEvents: ScheduleEvent[] = []
        let pct = 0

        if (scheduleRes.ok) {
          const schedule = await scheduleRes.json()
          const rawItems = Array.isArray(schedule.items) ? schedule.items : []
          const items = subjects.length > 0
            ? rawItems.filter((item: any) => item.subject && subjects.includes(item.subject))
            : rawItems
          const completed = items.filter((item: any) => item.completed).length
          pct = items.length ? Math.round((completed / items.length) * 100) : 0

          progressRows = subjects.map((sub, idx) => {
            const subjectItems = items.filter((item: any) => item.subject === sub)
            const done = subjectItems.filter((item: any) => item.completed).length
            return {
              id: `c-${sub}-${idx}`,
              name: sub,
              color: colorPalette[idx % colorPalette.length],
              progress: subjectItems.length ? Math.round((done / subjectItems.length) * 100) : 0,
              topics: subjectItems.length,
              reviewed: done,
            }
          })

          nextEvents = items
            .filter((item: any) => !item.completed)
            .slice(0, 4)
            .map((item: any) => {
              const date = item.date ? new Date(item.date) : new Date()
              return {
                id: item.id,
                day: date.toLocaleDateString('pt-BR', { weekday: 'short' }),
                date: date.toLocaleDateString('pt-BR'),
                title: item.topic || 'Sessão de estudos',
                subject: item.subject || '',
                type: item.quizIds?.length ? 'quiz' : item.flashcardIds?.length ? 'flashcards' : 'leitura',
                time: '18:00',
                done: false,
              } as ScheduleEvent
            })
        }

        if (metricsRes.ok) {
          const metricsData: MetricsOverviewData = await metricsRes.json()
          setMetrics(metricsData)
          setPendingTasks(metricsData.pendingSummary.items || [])
          if (metricsData.evolutionary?.overallCompletionPct !== undefined) {
            pct = metricsData.evolutionary.overallCompletionPct
          }

          if (metricsData.subjectProgress && metricsData.subjectProgress.length > 0) {
            const filteredSubjectProgress = subjects.length > 0
              ? metricsData.subjectProgress.filter((sp) => subjects.includes(sp.subjectName))
              : metricsData.subjectProgress

            if (subjects.length > 0) {
              progressRows = subjects.map((sub, idx) => {
                const sp = filteredSubjectProgress.find((s) => s.subjectName === sub)
                return {
                  id: `c-${sub}-${idx}`,
                  name: sub,
                  color: colorPalette[idx % colorPalette.length],
                  progress: sp ? sp.progressPct : 0,
                  topics: sp ? sp.topicsTotal : 0,
                  reviewed: sp ? sp.topicsCompleted : 0,
                }
              })
            } else {
              progressRows = filteredSubjectProgress.map((sp, idx) => ({
                id: `c-${sp.subjectName}-${idx}`,
                name: sp.subjectName,
                color: colorPalette[idx % colorPalette.length],
                progress: sp.progressPct,
                topics: sp.topicsTotal,
                reviewed: sp.topicsCompleted,
              }))
            }
          }
        }

        setOverall(pct)
        setUserProgress(progressRows)
        setUpcomingEvents(nextEvents)
      } catch {
        setOverall(0)
        setUserProgress([])
        setPendingTasks([])
        setUpcomingEvents([])
      }
    }

    loadDashboard()
  }, [user?.id, user?.subjects])

  const overdueScheduleCount = metrics?.pendingSummary?.overdueScheduleCount || 0
  const isScheduleDelayed = metrics?.scheduleAdherence?.status === 'ATRASADO' || overdueScheduleCount > 0

  return (
    <div className="flex flex-col gap-6">
      {/* Daily Briefing Card - Boas-vindas Inteligente com Streaming SSE */}
      <DailyBriefingCard />

      {/* Banner de Saudação Personalizado com Alerta de Status do Cronograma */}
      <Card className="overflow-hidden">
        <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-md">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge variant="default">
                <Sparkles className="size-3.5" />
                Plano de Estudos Personalizado
              </Badge>
              {isScheduleDelayed ? (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertTriangle className="size-3" />
                  {overdueScheduleCount} pendência(s) no cronograma
                </Badge>
              ) : metrics?.scheduleAdherence?.status === 'EM_DIA' ? (
                <Badge variant="secondary" className="flex items-center gap-1 text-[var(--success)]">
                  <CheckCircle2 className="size-3" />
                  Cronograma em dia
                </Badge>
              ) : null}
            </div>
            <h2 className="font-display text-xl font-semibold tracking-tight text-balance">
              Bom te ver, {user?.name || 'Estudante'}. {hasSubjects ? `Você concluiu ${overall}% do plano do semestre.` : 'Bem-vinda ao Estuda Anne!'}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground text-pretty">
              {hasSubjects
                ? isScheduleDelayed
                  ? `Você tem ${overdueScheduleCount} atividade(s) do cronograma que venceram e precisam de atenção!`
                  : `A Anne organizou suas revisões de ${subjects.join(', ')} e seu cronograma está em dia.`
                : 'Cadastre suas disciplinas no Perfil ou faça upload do seu cronograma para a IA organizar sua rotina de estudos!'}
            </p>
          </div>
          {hasSubjects ? (
            <div className="flex shrink-0 items-center gap-5 rounded-2xl bg-muted/60 px-6 py-4">
              <div className="relative flex size-20 items-center justify-center">
                <svg viewBox="0 0 36 36" className="size-20 -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--border)" strokeWidth="3" />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${(overall / 100) * 97.4} 97.4`}
                  />
                </svg>
                <span className="absolute font-display text-lg font-semibold">{overall}%</span>
              </div>
              <div className="text-sm">
                <p className={`flex items-center gap-1 font-medium ${isScheduleDelayed ? 'text-amber-600' : 'text-[var(--success)]'}`}>
                  <TrendingUp className="size-4" /> {isScheduleDelayed ? 'Atenção às pendências' : 'Em progresso'}
                </p>
                <p className="mt-1 text-muted-foreground">{subjects.length} matérias ativas</p>
              </div>
            </div>
          ) : (
            <Button onClick={() => onNavigate('profile')} className="gap-2 rounded-xl shrink-0">
              <FolderPlus className="size-4" />
              Configurar Perfil & Matérias
            </Button>
          )}
        </CardContent>
      </Card>

      {!hasSubjects ? (
        <Card className="border-dashed border-border p-8 text-center">
          <CardContent className="flex flex-col items-center justify-center space-y-3 p-0">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Sparkles className="size-6" />
            </span>
            <h3 className="font-semibold text-foreground text-sm">Seu Painel de Estudos está pronto!</h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              Adicione suas matérias, datas de provas ou importe a foto do seu cronograma na aba <strong className="text-foreground">Perfil</strong>.
            </p>
            <Button onClick={() => onNavigate('profile')} variant="secondary" className="rounded-xl text-xs gap-1.5 mt-2">
              Ir para o Perfil
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Seção de Acompanhamento Evolutivo */}
          {metrics?.evolutionary && (
            <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-background to-background">
              <CardHeader className="flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                  <Activity className="size-5 text-primary" />
                  <CardTitle className="text-base font-semibold">Acompanhamento Evolutivo</CardTitle>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="gap-1.5 py-1 px-3">
                    <Flame className="size-4 text-orange-500 fill-orange-500" />
                    <span>{metrics.evolutionary.studyStreakDays} dias seguidos</span>
                  </Badge>
                  <Badge variant="outline" className="gap-1.5 py-1 px-3">
                    <span>{metrics.evolutionary.retentionRatePct}% de retenção</span>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <p className="text-xs text-muted-foreground mb-4">
                  Velocidade de estudos dos últimos 7 dias (tempo dedicado e tarefas concluídas):
                </p>
                <div className="grid grid-cols-7 gap-2">
                  {metrics.evolutionary.weeklyVelocity.map((v, i) => {
                    const pct = v.targetMinutes > 0 ? Math.min(100, Math.round((v.completedMinutes / v.targetMinutes) * 100)) : 0
                    return (
                      <div key={i} className="flex flex-col items-center gap-1.5 text-center">
                        <div className="w-full bg-muted/80 rounded-lg h-20 relative flex flex-col justify-end overflow-hidden p-1">
                          <div
                            className="bg-primary/80 rounded-md transition-all duration-500 w-full"
                            style={{ height: `${Math.max(12, pct)}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-medium text-foreground">{v.day}</span>
                        <span className="text-[10px] text-muted-foreground">{v.completedMinutes}m</span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Progresso do semestre */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Progresso do semestre</CardTitle>
                <span className="text-xs text-muted-foreground">suas disciplinas</span>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                {userProgress.map((course) => (
                  <div key={course.id}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-medium">
                        <span className={`size-2.5 rounded-full ${course.color}`} aria-hidden />
                        {course.name}
                      </span>
                      <span className="text-muted-foreground">
                        {course.reviewed}/{course.topics} tópicos · {course.progress}%
                      </span>
                    </div>
                    <Progress value={course.progress} indicatorClassName={course.color} />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Pendências e Revisões sugeridas reais */}
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Revisões & Pendências</CardTitle>
                <Badge variant={isScheduleDelayed ? 'destructive' : 'warning'}>
                  {pendingTasks.length} pendente(s)
                </Badge>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {pendingTasks.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    🎉 Nenhuma pendência no momento! Seu cronograma e revisões estão 100% em dia.
                  </div>
                ) : (
                  pendingTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`flex flex-col gap-3 rounded-xl border p-3 ${
                        task.isOverdue ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-background/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`flex size-9 items-center justify-center rounded-lg ${
                              task.isOverdue ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
                            }`}
                          >
                            {task.type === 'quiz_pending' ? (
                              <ListChecks className="size-4.5" />
                            ) : task.type === 'flashcard_due' ? (
                              <BookOpen className="size-4.5" />
                            ) : (
                              <AlertTriangle className="size-4.5" />
                            )}
                          </span>
                          <div>
                            <p className="text-sm font-medium leading-tight">{task.subject}</p>
                            <p className="line-clamp-1 text-xs text-muted-foreground">{task.title}</p>
                            <p className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                              <Clock className="size-3" />
                              ~{task.estimatedMinutes} min {task.isOverdue && '· Tarefa atrasada'}
                            </p>
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={task.isOverdue ? 'destructive' : task.type === 'quiz_pending' ? 'default' : 'secondary'}
                        className="w-full"
                        onClick={() => {
                          if (task.type === 'schedule_overdue') onNavigate('schedule')
                          else if (task.type === 'quiz_pending') onNavigate('quiz')
                          else onNavigate('flashcards')
                        }}
                      >
                        {task.type === 'schedule_overdue'
                          ? 'Resolver no Cronograma'
                          : task.type === 'quiz_pending'
                          ? 'Iniciar Quiz'
                          : 'Revisar Flashcards'}
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Próximos eventos do cronograma */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarClock className="size-4 text-muted-foreground" />
                <CardTitle>Próximos eventos do cronograma</CardTitle>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onNavigate('schedule')}>
                Ver tudo <ArrowUpRight className="size-4" />
              </Button>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-3 rounded-xl border border-border p-3"
                >
                  <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-lg bg-muted text-center">
                    <span className="text-[10px] font-medium uppercase text-muted-foreground">
                      {event.day}
                    </span>
                    <span className="text-xs font-semibold">{event.time}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium leading-tight">{event.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{event.subject}</p>
                  </div>
                  <Badge variant="neutral">{eventTypeLabels[event.type]}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
