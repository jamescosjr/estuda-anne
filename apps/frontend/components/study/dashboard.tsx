'use client'

import { ArrowUpRight, BookOpen, CalendarClock, Clock, ListChecks, Sparkles, TrendingUp, FolderPlus, UserCheck } from 'lucide-react'
import { type TabId, type ScheduleEvent, type CourseProgress, type PendingReview } from '@/lib/mock-data'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useAuth } from '@/lib/auth-context'
import { DailyBriefingCard } from './daily-briefing-card'

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

export function Dashboard({ onNavigate }: DashboardProps) {
  const { user } = useAuth()

  const subjects = user?.subjects || []
  const hasSubjects = subjects.length > 0

  // Gera dados de progresso dinâmicos baseados estritamente nas matérias cadastradas pelo usuário
  const userProgress: CourseProgress[] = subjects.map((sub, idx) => ({
    id: `c-${sub}-${idx}`,
    name: sub,
    color: colorPalette[idx % colorPalette.length],
    progress: Math.min(100, Math.max(10, (idx + 1) * 20)),
    topics: 15,
    reviewed: Math.min(15, (idx + 1) * 3),
  }))

  const overall = hasSubjects
    ? Math.round(userProgress.reduce((acc, c) => acc + c.progress, 0) / userProgress.length)
    : 0

  const userReviews: PendingReview[] = subjects.slice(0, 3).map((sub, idx) => ({
    id: `rev-${sub}-${idx}`,
    subject: sub,
    type: idx % 2 === 0 ? 'flashcards' : 'quiz',
    count: 10 + idx * 5,
    estimatedMinutes: 8 + idx * 4,
  }))

  const upcomingEvents: ScheduleEvent[] = subjects.slice(0, 4).map((sub, idx) => ({
    id: `dash-ev-${idx}`,
    day: idx === 0 ? 'Hoje' : idx === 1 ? 'Amanhã' : 'Em breve',
    date: idx === 0 ? 'Hoje' : 'Amanhã',
    title: idx % 2 === 0 ? `Revisão de flashcards — ${sub}` : `Quiz gerado por IA — ${sub}`,
    subject: sub,
    type: idx % 2 === 0 ? 'flashcards' : 'quiz',
    time: idx % 2 === 0 ? '18:00' : '20:30',
    done: false,
  }))

  return (
    <div className="flex flex-col gap-6">
      {/* Daily Briefing Card - Boas-vindas Inteligente com Streaming SSE */}
      <DailyBriefingCard />

      {/* Banner de Saudação Personalizado */}
      <Card className="overflow-hidden">
        <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-md">
            <Badge variant="default" className="mb-3">
              <Sparkles className="size-3.5" />
              Plano de Estudos Personalizado
            </Badge>
            <h2 className="font-display text-xl font-semibold tracking-tight text-balance">
              Bom te ver, {user?.name || 'Estudante'}. {hasSubjects ? `Você concluiu ${overall}% do plano do semestre.` : 'Bem-vinda ao Estuda Anne!'}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground text-pretty">
              {hasSubjects
                ? `A Anne organizou suas revisões de ${subjects.join(', ')} e ajustou seu cronograma de acordo com suas metas.`
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
                <p className="flex items-center gap-1 font-medium text-[var(--success)]">
                  <TrendingUp className="size-4" /> Em progresso
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

            {/* Revisões de hoje */}
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Revisões sugeridas</CardTitle>
                <Badge variant="warning">{userReviews.length} pendentes</Badge>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {userReviews.map((review) => (
                  <div
                    key={review.id}
                    className="flex flex-col gap-3 rounded-xl border border-border bg-background/60 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          {review.type === 'quiz' ? (
                            <ListChecks className="size-4.5" />
                          ) : (
                            <BookOpen className="size-4.5" />
                          )}
                        </span>
                        <div>
                          <p className="text-sm font-medium leading-tight">{review.subject}</p>
                          <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="size-3" />
                            {review.count} itens · ~{review.estimatedMinutes} min
                          </p>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={review.type === 'quiz' ? 'default' : 'secondary'}
                      className="w-full"
                      onClick={() => onNavigate(review.type === 'quiz' ? 'quiz' : 'flashcards')}
                    >
                      {review.type === 'quiz' ? 'Iniciar quiz' : 'Revisar flashcards'}
                    </Button>
                  </div>
                ))}
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
