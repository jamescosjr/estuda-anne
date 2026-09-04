'use client'

import { useState } from 'react'
import { Plus, Trash2, Sparkles, Check, BookOpen, User, GraduationCap, Calendar, Clock } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface ProfileScreenProps {
  onSaveAndGenerateSchedule?: () => void
}

export function ProfileScreen({ onSaveAndGenerateSchedule }: ProfileScreenProps) {
  const { user, updateProfile } = useAuth()

  const [name, setName] = useState(user?.name || '')
  const [course, setCourse] = useState(user?.course || '')
  const [period, setPeriod] = useState(user?.period || '')
  const [studyGoalMinutes, setStudyGoalMinutes] = useState<number>(user?.studyGoalMinutes || 45)
  const [subjects, setSubjects] = useState<string[]>(
    user?.subjects && user.subjects.length > 0
      ? user.subjects
      : ['Algoritmos e Estrutura de Dados', 'Cálculo I', 'Engenharia de Software']
  )
  const [newSubject, setNewSubject] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState(false)

  function handleAddSubject(e?: React.FormEvent) {
    if (e) e.preventDefault()
    const trimmed = newSubject.trim()
    if (trimmed && !subjects.includes(trimmed)) {
      setSubjects([...subjects, trimmed])
      setNewSubject('')
    }
  }

  function handleRemoveSubject(subjectToRemove: string) {
    setSubjects(subjects.filter((s) => s !== subjectToRemove))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!course.trim() || !period.trim()) {
      alert('Por favor, informe seu Curso e Período para continuar.')
      return
    }

    setIsSaving(true)
    setSuccessMessage(false)

    try {
      await updateProfile({
        name,
        course,
        period,
        subjects,
        studyGoalMinutes,
      })

      // Requisitar geração de cronograma no BFF
      const bffUrl = process.env.NEXT_PUBLIC_BFF_URL || 'http://localhost:3001'
      await fetch(`${bffUrl}/api/study/schedule/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: user?.id || 'anne-student-1',
          title: `Cronograma — ${course}`,
          subjects,
          dailyStudyMinutesTarget: studyGoalMinutes,
        }),
      })

      setSuccessMessage(true)
      setTimeout(() => {
        if (onSaveAndGenerateSchedule) {
          onSaveAndGenerateSchedule()
        }
      }, 800)
    } catch (err) {
      console.error('Erro ao salvar perfil e gerar cronograma:', err)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Banner de Boas-vindas / Alerta de Perfil Incompleto */}
      {!user?.isProfileComplete && (
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <Sparkles className="size-6 animate-pulse" />
            </div>
            <div className="space-y-1">
              <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
                Monte seu Perfil de Estudos com a Anne
              </h2>
              <p className="text-sm text-muted-foreground">
                Para evitar dados aleatórios no seu cronograma, preencha seu curso, período e as matérias do semestre. A Anne criará seu plano personalizado automaticamente!
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-3">
        {/* Coluna Principal — Dados Acadêmicos & Pessoais */}
        <Card className="md:col-span-2 border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <GraduationCap className="size-5 text-primary" />
              Dados Pessoais e Acadêmicos
            </CardTitle>
            <CardDescription>
              Informe seu curso e período atual para identificarmos suas demandas acadêmicas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                Seu Nome Completo
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Ana Nogueira"
                  className="w-full rounded-xl border border-input bg-background py-2.5 pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="course" className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                  Curso Universitário *
                </label>
                <div className="relative">
                  <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <input
                    id="course"
                    type="text"
                    required
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    placeholder="Ex: Engenharia de Software"
                    className="w-full rounded-xl border border-input bg-background py-2.5 pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="period" className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                  Período / Semestre *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <input
                    id="period"
                    type="text"
                    required
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    placeholder="Ex: 3º Período"
                    className="w-full rounded-xl border border-input bg-background py-2.5 pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
              </div>
            </div>

            {/* Matérias do Semestre */}
            <div className="pt-2">
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                Matérias do Semestre
              </label>
              <p className="text-xs text-muted-foreground mb-3">
                Adicione as disciplinas que você está cursando neste semestre.
              </p>

              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="Nome da disciplina (ex: Cálculo I)"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddSubject()
                    }
                  }}
                  className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
                <Button type="button" onClick={() => handleAddSubject()} variant="secondary" className="gap-1 rounded-xl">
                  <Plus className="size-4" />
                  Adicionar
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 min-h-[48px] rounded-xl border border-dashed border-border p-3">
                {subjects.length === 0 ? (
                  <span className="text-xs text-muted-foreground italic">Nenhuma matéria adicionada ainda.</span>
                ) : (
                  subjects.map((sub) => (
                    <Badge
                      key={sub}
                      variant="outline"
                      className="flex items-center gap-1.5 bg-muted/50 py-1.5 pl-3 pr-2 text-xs font-medium rounded-lg"
                    >
                      {sub}
                      <button
                        type="button"
                        onClick={() => handleRemoveSubject(sub)}
                        className="rounded-full p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        title="Remover matéria"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </Badge>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Coluna Lateral — Meta de Estudos & Ação */}
        <div className="flex flex-col gap-6">
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Clock className="size-5 text-primary" />
                Rotina de Estudos
              </CardTitle>
              <CardDescription>
                Defina sua meta diária de dedicação aos estudos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Meta Diária de Estudo
                </label>
                <select
                  value={studyGoalMinutes}
                  onChange={(e) => setStudyGoalMinutes(Number(e.target.value))}
                  className="w-full rounded-xl border border-input bg-background p-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value={30}>30 minutos / dia</option>
                  <option value={45}>45 minutos / dia (Recomendado)</option>
                  <option value={60}>60 minutos / dia (1h)</option>
                  <option value={90}>90 minutos / dia (1h 30m)</option>
                  <option value={120}>120 minutos / dia (2h)</option>
                </select>
              </div>

              <div className="rounded-xl bg-muted/40 p-3.5 text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">Como a Anne monta seu cronograma?</p>
                <p>
                  A IA distribui flashcards, resumos e leituras das suas matérias cadastradas ao longo dos dias, mantendo o ritmo sem sobrecarregar sua rotina.
                </p>
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            disabled={isSaving}
            className="w-full h-12 rounded-xl text-sm font-semibold gap-2 shadow-lg shadow-primary/25 transition-all hover:scale-[1.01]"
          >
            {successMessage ? (
              <>
                <Check className="size-5 text-success" />
                Cronograma Gerado!
              </>
            ) : isSaving ? (
              <>
                <div className="size-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                Gerando Cronograma com IA...
              </>
            ) : (
              <>
                <Sparkles className="size-5" />
                Salvar & Gerar Cronograma com IA
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
