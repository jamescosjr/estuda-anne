'use client'

import { useState } from 'react'
import { ThumbsUp, ThumbsDown, Sparkles, Check } from 'lucide-react'
import { getApiUrl } from '@/lib/api-config'
import { useAuth } from '@/lib/auth-context'

interface AIFeedbackButtonProps {
  targetType: 'quiz' | 'flashcard' | 'material' | 'schedule'
  targetId: string
  subject?: string
}

export function AIFeedbackButton({ targetType, targetId, subject }: AIFeedbackButtonProps) {
  const { user } = useAuth()
  const [feedbackSent, setFeedbackSent] = useState<'POSITIVE' | 'NEGATIVE' | null>(null)
  const [showOptions, setShowOptions] = useState(false)
  const bffUrl = getApiUrl()

  const studentId = user?.id || 'guest-student'

  async function sendFeedback(rating: 'POSITIVE' | 'NEGATIVE', reasonTag?: string) {
    setFeedbackSent(rating)
    setShowOptions(false)

    try {
      await fetch(`${bffUrl}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          targetType,
          targetId,
          subject,
          rating,
          reasonTag: reasonTag || (rating === 'POSITIVE' ? 'GREAT_EXPLANATION' : 'OUT_OF_CONTEXT'),
        }),
      })
    } catch {
      // Ignora erros de envio em offline
    }
  }

  if (feedbackSent) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-[var(--success)] bg-[var(--success)]/10 px-2.5 py-1 rounded-full border border-[var(--success)]/30 animate-in fade-in duration-200">
        <Check className="size-3.5" />
        <span>Feedback registrado! A Anne usará para auto-ajustar seu aprendizado.</span>
      </div>
    )
  }

  return (
    <div className="relative inline-flex flex-col items-start gap-1">
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 p-1.5 px-3 rounded-xl border border-border">
        <span className="flex items-center gap-1 font-medium text-foreground">
          <Sparkles className="size-3.5 text-primary" />
          Avalie este conteúdo:
        </span>

        <button
          type="button"
          onClick={() => sendFeedback('POSITIVE')}
          className="flex items-center gap-1 hover:text-primary transition-colors p-1 rounded-lg hover:bg-primary/10"
          title="Conteúdo excelente e relevante"
        >
          <ThumbsUp className="size-3.5" />
          <span className="hidden sm:inline">Excelente</span>
        </button>

        <span className="text-border">|</span>

        <button
          type="button"
          onClick={() => setShowOptions(true)}
          className="flex items-center gap-1 hover:text-destructive transition-colors p-1 rounded-lg hover:bg-destructive/10"
          title="Fora do contexto ou precisa de ajustes"
        >
          <ThumbsDown className="size-3.5" />
          <span className="hidden sm:inline">Fora do contexto</span>
        </button>
      </div>

      {showOptions && (
        <div className="absolute right-0 top-10 z-20 w-64 rounded-xl border border-border bg-popover p-3 shadow-lg flex flex-col gap-1.5 animate-in zoom-in-95 duration-150">
          <p className="text-xs font-semibold text-popover-foreground mb-1">Como a IA deve se ajustar?</p>
          <button
            type="button"
            onClick={() => sendFeedback('NEGATIVE', 'OUT_OF_CONTEXT')}
            className="text-left text-xs p-1.5 rounded-lg hover:bg-muted text-foreground transition-colors"
          >
            🎯 Conteúdo fora do escopo da prova
          </button>
          <button
            type="button"
            onClick={() => sendFeedback('NEGATIVE', 'TOO_HARD')}
            className="text-left text-xs p-1.5 rounded-lg hover:bg-muted text-foreground transition-colors"
          >
            🧠 Explicação muito complexa / difícil
          </button>
          <button
            type="button"
            onClick={() => sendFeedback('NEGATIVE', 'TOO_EASY')}
            className="text-left text-xs p-1.5 rounded-lg hover:bg-muted text-foreground transition-colors"
          >
            ⚡ Questão/Card muito fácil
          </button>
          <button
            type="button"
            onClick={() => setShowOptions(false)}
            className="text-center text-[10px] text-muted-foreground mt-1 underline hover:text-foreground"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  )
}
