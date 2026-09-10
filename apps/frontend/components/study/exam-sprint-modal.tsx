'use client'

import { useState } from 'react'
import { Calendar, Sparkles, Target, Zap, CheckSquare, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/auth-context'
import { getApiUrl } from '@/lib/api-config'

interface ExamSprintModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function ExamSprintModal({ open, onOpenChange, onSuccess }: ExamSprintModalProps) {
  const { user } = useAuth()
  const subjects = user?.subjects || []

  const [selectedSubject, setSelectedSubject] = useState<string>(subjects[0] || '')
  const [customSubject, setCustomSubject] = useState<string>('')
  const [examDate, setExamDate] = useState<string>('')
  const [entireSubject, setEntireSubject] = useState<boolean>(true)
  const [topicsText, setTopicsText] = useState<string>('')
  const [intensity, setIntensity] = useState<'intensivo' | 'revisao' | 'do_zero'>('intensivo')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  if (!open) return null

  const finalSubject = selectedSubject === 'custom' ? customSubject : selectedSubject

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id || !finalSubject || !examDate) {
      alert('Por favor preencha a disciplina e a data da prova.')
      return
    }

    setIsSubmitting(true)
    const bffUrl = getApiUrl()

    try {
      const topics = entireSubject
        ? []
        : topicsText.split(',').map((t) => t.trim()).filter(Boolean)

      const response = await fetch(`${bffUrl}/api/study/schedule/exam-sprint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: user.id,
          subject: finalSubject,
          examDate,
          topics,
          entireSubject,
          intensity,
        }),
      })

      if (response.ok) {
        onSuccess()
        onOpenChange(false)
      } else {
        const errData = await response.json().catch(() => ({ message: 'Erro ao criar sprint de prova' }))
        alert(errData.message || 'Falha ao criar sprint de prova')
      }
    } catch {
      alert('Erro de conexão ao criar sprint de prova.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl z-10 space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <Badge variant="default" className="gap-1.5 px-2.5 py-0.5 text-xs font-semibold mb-1">
              <Sparkles className="size-3.5 text-amber-400" />
              Preparatório para Prova Específica
            </Badge>
            <h3 className="text-xl font-display font-semibold text-foreground">Criar Sprint para Prova</h3>
            <p className="text-xs text-muted-foreground">
              Foque seus estudos na data exata da sua avaliação com uma rotina personalizada de revisão.
            </p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Seleção de Matéria */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Disciplina / Matéria da Prova</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
            >
              {subjects.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
              <option value="custom">+ Outra disciplina específica</option>
            </select>
            {selectedSubject === 'custom' && (
              <input
                type="text"
                placeholder="Nome da disciplina (ex: Cálculo I, Direito Constitucional)"
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                className="w-full h-10 mt-2 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              />
            )}
          </div>

          {/* Data da Prova */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Calendar className="size-3.5 text-primary" /> Data da Prova
            </label>
            <input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              required
              className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
            />
          </div>

          {/* Opção de Conteúdo */}
          <div className="space-y-3 rounded-xl border border-border p-3.5 bg-muted/20">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 cursor-pointer">
                <CheckSquare className="size-4 text-primary" /> Marcar Matéria Inteira
              </label>
              <input
                type="checkbox"
                checked={entireSubject}
                onChange={(e) => setEntireSubject(e.target.checked)}
                className="size-4 rounded accent-primary cursor-pointer"
              />
            </div>
            {!entireSubject && (
              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] text-muted-foreground">
                  Tópicos específicos (separados por vírgula):
                </label>
                <input
                  type="text"
                  placeholder="ex: Matrizes, Determinantes, Autovalores"
                  value={topicsText}
                  onChange={(e) => setTopicsText(e.target.value)}
                  className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                />
              </div>
            )}
          </div>

          {/* Intensidade */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Zap className="size-3.5 text-amber-500" /> Intensidade dos Estudos
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'intensivo', label: 'Intensivo', mins: '60 min/dia' },
                { id: 'revisao', label: 'Revisão Rápida', mins: '30 min/dia' },
                { id: 'do_zero', label: 'Estudo do Zero', mins: '90 min/dia' },
              ].map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setIntensity(item.id as any)}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                    intensity === item.id
                      ? 'border-primary bg-primary/10 font-semibold text-primary'
                      : 'border-border bg-background hover:bg-muted/50 text-muted-foreground'
                  }`}
                >
                  <span className="text-xs">{item.label}</span>
                  <span className="text-[10px] opacity-75">{item.mins}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Botões */}
          <div className="flex items-center justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="rounded-xl text-xs gap-1.5">
              <Target className="size-4" />
              {isSubmitting ? 'Gerando Sprint...' : 'Gerar Sprint da Prova'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
