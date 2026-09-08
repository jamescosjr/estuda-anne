'use client'

import { useState } from 'react'
import { Plus, Trash2, Sparkles, Check, BookOpen, User, GraduationCap, Calendar, Clock, Upload, FileText, Loader2, CalendarDays } from 'lucide-react'
import { useAuth, ExamDateItem } from '@/lib/auth-context'
import { getApiUrl } from '@/lib/api-config'
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
  const [periodStartDate, setPeriodStartDate] = useState(user?.periodStartDate || '')
  const [periodEndDate, setPeriodEndDate] = useState(user?.periodEndDate || '')
  const [examDates, setExamDates] = useState<ExamDateItem[]>(user?.examDates || [])
  const [studyGoalMinutes, setStudyGoalMinutes] = useState<number>(user?.studyGoalMinutes || 45)
  const [subjects, setSubjects] = useState<string[]>(user?.subjects || [])

  // Formulário de Nova Matéria
  const [newSubject, setNewSubject] = useState('')

  // Formulário de Nova Prova / Exame
  const [examSubject, setExamSubject] = useState('')
  const [examTitle, setExamTitle] = useState('')
  const [examDate, setExamDate] = useState('')

  // Estados de Upload / Análise Inteligente de Cronograma
  const [isAnalyzingFile, setIsAnalyzingFile] = useState(false)
  const [fileAnalysisMessage, setFileAnalysisMessage] = useState<string | null>(null)

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

  function handleAddExam(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (!examTitle.trim() || !examDate.trim()) {
      alert('Informe a descrição da prova e a data.')
      return
    }
    const item: ExamDateItem = {
      id: `exam-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      subject: examSubject.trim() || (subjects[0] || 'Geral'),
      title: examTitle.trim(),
      date: examDate.trim(),
    }
    setExamDates([...examDates, item])
    setExamTitle('')
    setExamDate('')
  }

  function handleRemoveExam(id: string) {
    setExamDates(examDates.filter((ex) => ex.id !== id))
  }

  // Analisador Multimodal de Imagem / Arquivo de Cronograma
  async function handleScheduleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setIsAnalyzingFile(true)
    setFileAnalysisMessage('Enviando e analisando cronograma com Gemini 3.6 Flash...')

    try {
      const reader = new FileReader()
      reader.onload = async () => {
        const resultStr = reader.result as string
        const base64Content = resultStr.split(',')[1] || ''

        const bffUrl = getApiUrl()
        const res = await fetch(`${bffUrl}/api/study/schedule/analyze-file`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: user?.id,
            fileName: file.name,
            mimeType: file.type || 'image/png',
            fileBase64: base64Content,
          }),
        })

        if (res.ok) {
          const data = await res.json()
          if (data.periodStartDate) setPeriodStartDate(data.periodStartDate)
          if (data.periodEndDate) setPeriodEndDate(data.periodEndDate)
          if (Array.isArray(data.subjects) && data.subjects.length > 0) {
            setSubjects((prev) => Array.from(new Set([...prev, ...data.subjects])))
          }
          if (Array.isArray(data.examDates) && data.examDates.length > 0) {
            setExamDates((prev) => [...prev, ...data.examDates])
          }
          setFileAnalysisMessage('✨ Cronograma analisado! As matérias e datas foram identificadas pela IA.')
        } else {
          setFileAnalysisMessage('Não foi possível ler todos os dados automaticamente. Preencha os campos abaixo.')
        }
        setIsAnalyzingFile(false)
      }
      reader.readAsDataURL(file)
    } catch (err) {
      console.error('Erro no upload de cronograma:', err)
      setFileAnalysisMessage('Erro de conexão ao analisar o arquivo. Você pode preencher manualmente.')
      setIsAnalyzingFile(false)
    }
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
      const profileResult = await updateProfile({
        name,
        course,
        period,
        periodStartDate,
        periodEndDate,
        examDates,
        subjects,
        studyGoalMinutes,
      })

      if (!profileResult.success) {
        alert(profileResult.error || 'Não foi possível salvar o perfil.')
        return
      }

      if (!user?.id) {
        alert('Perfil salvo, mas não foi possível gerar o cronograma: sessão sem usuário.')
        return
      }

      const bffUrl = getApiUrl()
      const scheduleRes = await fetch(`${bffUrl}/api/study/schedule/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: user.id,
          title: `Cronograma — ${course}`,
          subjects,
          periodStartDate: periodStartDate || undefined,
          periodEndDate: periodEndDate || undefined,
          examDates: examDates.filter((exam) => Boolean(exam.date)),
          dailyStudyMinutesTarget: studyGoalMinutes || 45,
        }),
      })

      if (!scheduleRes.ok) {
        alert('Perfil salvo, mas o cronograma não foi persistido. Tente salvar de novo em instantes.')
        return
      }

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
      {/* Banner de Boas-vindas / Alerta de Perfil */}
      {!user?.isProfileComplete && (
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <Sparkles className="size-6 animate-pulse" />
            </div>
            <div className="space-y-1">
              <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
                Monte seu Perfil e Período de Estudos com a Anne
              </h2>
              <p className="text-sm text-muted-foreground">
                Cadastre suas matérias, datas de provas e período estudado. A Anne gerará seu cronograma de revisão espaçada personalizado!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Card de Importação Inteligente de Cronograma por Foto/Arquivo */}
      <Card className="border-primary/30 bg-primary/5 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-primary">
            <Sparkles className="size-5" />
            Importar Cronograma por Imagem ou Arquivo (IA Multimodal)
          </CardTitle>
          <CardDescription>
            Envie uma foto da sua grade de aulas, ementa ou calendário acadêmico (PNG, JPG, WebP ou PDF). O Gemini 3.6 Flash extrairá as matérias, provas e período automaticamente!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <label className="flex-1 flex items-center justify-center gap-2 cursor-pointer rounded-xl border border-dashed border-primary/40 bg-background/80 hover:bg-background p-3 text-sm font-medium transition-colors">
              <Upload className="size-4 text-primary" />
              <span>{isAnalyzingFile ? 'Analisando arquivo...' : 'Escolher foto ou documento do cronograma'}</span>
              <input
                type="file"
                accept="image/*,.pdf,.txt"
                className="hidden"
                disabled={isAnalyzingFile}
                onChange={handleScheduleFileUpload}
              />
            </label>
          </div>
          {isAnalyzingFile && (
            <div className="flex items-center gap-2 text-xs font-medium text-primary animate-pulse">
              <Loader2 className="size-4 animate-spin" />
              {fileAnalysisMessage}
            </div>
          )}
          {fileAnalysisMessage && !isAnalyzingFile && (
            <p className="text-xs font-medium text-foreground bg-background/60 p-2.5 rounded-lg border border-border">
              {fileAnalysisMessage}
            </p>
          )}
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-3">
        {/* Coluna Principal — Dados Acadêmicos, Período e Provas */}
        <div className="md:col-span-2 space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <GraduationCap className="size-5 text-primary" />
                Dados Pessoais e Acadêmicos
              </CardTitle>
              <CardDescription>
                Informe seu curso, período e datas do semestre de estudo.
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

              {/* Datas de Início e Fim do Período Estudado */}
              <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-border/60">
                <div>
                  <label htmlFor="periodStartDate" className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                    Data de Início do Período
                  </label>
                  <div className="relative">
                    <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <input
                      id="periodStartDate"
                      type="date"
                      value={periodStartDate}
                      onChange={(e) => setPeriodStartDate(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background py-2.5 pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="periodEndDate" className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                    Data de Término do Período
                  </label>
                  <div className="relative">
                    <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <input
                      id="periodEndDate"
                      type="date"
                      value={periodEndDate}
                      onChange={(e) => setPeriodEndDate(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background py-2.5 pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Matérias do Semestre */}
              <div className="pt-2 border-t border-border/60">
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
                    <span className="text-xs text-muted-foreground italic">Nenhuma matéria adicionada ainda. Adicione ou importe via foto/arquivo acima.</span>
                  ) : (
                    subjects.map((sub) => (
                      <Badge
                        key={sub}
                        variant="neutral"
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

          {/* Card de Provas e Avaliações por Matéria */}
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <CalendarDays className="size-5 text-primary" />
                Datas de Provas e Avaliações
              </CardTitle>
              <CardDescription>
                Cadastre suas P1, P2, exames finais ou trabalhos para intensificar os estudos antes de cada prova.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Matéria</label>
                  <select
                    value={examSubject}
                    onChange={(e) => setExamSubject(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {subjects.length === 0 ? (
                      <option value="Geral">Geral / Sem Matéria</option>
                    ) : (
                      subjects.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Título da Prova</label>
                  <input
                    type="text"
                    value={examTitle}
                    onChange={(e) => setExamTitle(e.target.value)}
                    placeholder="Ex: Prova P1"
                    className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Data da Prova</label>
                  <input
                    type="date"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
              </div>
              <Button type="button" onClick={handleAddExam} variant="secondary" className="w-full rounded-xl gap-1.5 text-xs font-semibold">
                <Plus className="size-3.5" />
                Adicionar Prova ao Período
              </Button>

              <div className="space-y-2 pt-2">
                {examDates.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic text-center py-3 rounded-xl border border-dashed border-border">
                    Nenhuma prova cadastrada para este período.
                  </p>
                ) : (
                  examDates.map((ex) => (
                    <div key={ex.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3 text-xs">
                      <div>
                        <p className="font-semibold text-foreground">{ex.title} — <span className="text-primary">{ex.subject}</span></p>
                        <p className="text-muted-foreground font-medium">Data: {ex.date}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveExam(ex.id)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        title="Remover prova"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

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
                <p className="font-semibold text-foreground">Como a Anne ajusta seu cronograma?</p>
                <p>
                  A IA correlaciona o início e fim do seu período, as datas de provas cadastradas e suas matérias para intensificar os quizzes e flashcards próximo aos exames.
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
                Cronograma Atualizado!
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
