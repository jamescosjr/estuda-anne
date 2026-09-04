'use client'

import { ArrowUpRight, BookOpen, CalendarClock, Clock, ListChecks, Sparkles, TrendingUp } from 'lucide-react'
import {
  courseProgress,
  pendingReviews,
  scheduleEvents,
  type TabId,
} from '@/lib/mock-data'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

const eventTypeLabels: Record<string, string> = {
  quiz: 'Quiz',
  flashcards: 'Flashcards',
  leitura: 'Leitura',
  resumo: 'Resumo',
}

interface DashboardProps {
  onNavigate: (tab: TabId) => void
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const overall = Math.round(
    courseProgress.reduce((acc, c) => acc + c.progress, 0) / courseProgress.length,
  )
  const upcoming = scheduleEvents.slice(0, 4)

  return (
    <div className="flex flex-col gap-6">
      {/* Greeting + summary strip */}
      <Card className="overflow-hidden">
        <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-md">
            <Badge variant="default" className="mb-3">
              <Sparkles className="size-3.5" />
              Plano da IA atualizado
            </Badge>
            <h2 className="font-display text-xl font-semibold tracking-tight text-balance">
              Bom te ver, Ana. Você concluiu {overall}% do semestre.
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground text-pretty">
              A Anne organizou 3 revisões para hoje e ajustou seu cronograma com base no seu
              desempenho recente. Continue no ritmo para chegar preparada nas provas.
            </p>
          </div>
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
                <TrendingUp className="size-4" /> +8% na semana
              </p>
              <p className="mt-1 text-muted-foreground">4 disciplinas ativas</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Semester progress */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Progresso do semestre</CardTitle>
            <span className="text-xs text-muted-foreground">por disciplina</span>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {courseProgress.map((course) => (
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

        {/* Pending reviews */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Revisões de hoje</CardTitle>
            <Badge variant="warning">{pendingReviews.length} pendentes</Badge>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {pendingReviews.map((review) => (
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

      {/* Upcoming schedule */}
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
          {upcoming.map((event) => (
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
    </div>
  )
}
