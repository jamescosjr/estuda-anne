'use client'

import { useState } from 'react'
import {
  MessageSquare,
  Send,
  Sparkles,
  Bot,
  User,
  BookOpen,
  HelpCircle,
  Lightbulb,
  CheckCircle2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useAuth } from '@/lib/auth-context'
import { getApiUrl } from '@/lib/api-config'

interface QAItem {
  id: string
  question: string
  answer: string
  subject: string
  createdAt: Date
  suggestedNextQuestions?: string[]
}

const quickSuggestions = [
  'Como estruturar uma rotina de estudos em blocos curtos?',
  'Qual a melhor estratégia de estudo ativo para retenção em provas?',
  'Pode me explicar a diferença entre revisão espaçada e teste prático?',
  'Como lidar com ansiedade e foco na semana de exames?',
]

export function TiraDuvidas() {
  const { user } = useAuth()
  const subjects = user?.subjects || []

  const [question, setQuestion] = useState<string>('')
  const [selectedSubject, setSelectedSubject] = useState<string>(subjects[0] || 'Geral')
  const [qaList, setQaList] = useState<QAItem[]>([])
  const [isAsking, setIsAsking] = useState<boolean>(false)

  const handleAsk = async (textToAsk?: string) => {
    const queryText = textToAsk || question
    if (!queryText || !queryText.trim()) return

    setIsAsking(true)
    const bffUrl = getApiUrl()

    const tempId = `qa-${Date.now()}`

    try {
      const response = await fetch(`${bffUrl}/api/study/ask-anne`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: user?.id || 'anne-student-1',
          studentName: user?.name || 'Estudante',
          question: queryText,
          subject: selectedSubject,
        }),
      })

      let data: any
      if (response.ok) {
        data = await response.json()
      } else {
        data = {
          answer: `Oi ${user?.name || 'Estudante'}! Não foi possível processar sua pergunta no momento. Tente novamente em alguns segundos.`,
          subject: selectedSubject,
          createdAt: new Date(),
        }
      }

      const newItem: QAItem = {
        id: tempId,
        question: queryText,
        answer: data.answer,
        subject: data.subject || selectedSubject,
        createdAt: new Date(data.createdAt || Date.now()),
        suggestedNextQuestions: data.suggestedNextQuestions || [],
      }

      setQaList((prev) => [newItem, ...prev])
      setQuestion('')
    } catch {
      const fallbackItem: QAItem = {
        id: tempId,
        question: queryText,
        answer: `Oi ${user?.name || 'Estudante'}! Ocorreu um erro de conexão, mas você pode tentar perguntar novamente em instantes.`,
        subject: selectedSubject,
        createdAt: new Date(),
      }
      setQaList((prev) => [fallbackItem, ...prev])
    } finally {
      setIsAsking(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Banner Principal */}
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-r from-primary/10 via-background to-secondary/10 shadow-sm">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-primary/30 bg-background shadow-md">
              <img src="/anne-welcome.jpg" alt="Anne Avatar" className="size-full object-cover" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="gap-1.5 px-2.5 py-0.5 text-xs font-semibold">
                  <Sparkles className="size-3.5 text-amber-400" />
                  Tira-Dúvidas AI com a Anne
                </Badge>
              </div>
              <h2 className="font-display text-xl font-semibold tracking-tight">
                Perguntas & Respostas Acadêmicas
              </h2>
              <p className="text-xs text-muted-foreground max-w-xl">
                Faça qualquer pergunta por escrito sobre suas matérias, conceitos de aula ou métodos de estudo e receba explicações didáticas personalizadas da Anne.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Formulário de Pergunta */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="size-5 text-primary" />
                <CardTitle className="text-base font-semibold">Fazer uma Pergunta</CardTitle>
              </div>
              {subjects.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground hidden sm:inline">Disciplina:</span>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="h-8 rounded-xl border border-input bg-background px-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                  >
                    <option value="Geral">Geral / Método de Estudo</option>
                    {subjects.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <CardDescription className="text-xs">
              Digite sua dúvida detalhadamente. A Anne analisará o contexto da disciplina para te explicar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <textarea
              placeholder="ex: Me explique a diferença entre testes de regressão e testes de integração de forma simples com exemplos práticos..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={4}
              className="w-full rounded-2xl border border-input bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground resize-none"
            />

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {question.length > 0 ? `${question.length} caracteres` : 'Pergunte em linguagem natural'}
              </span>
              <Button
                onClick={() => handleAsk()}
                disabled={isAsking || !question.trim()}
                className="rounded-xl gap-2 text-xs"
              >
                <Send className="size-3.5" />
                {isAsking ? 'Anne está digitando...' : 'Enviar Pergunta'}
              </Button>
            </div>

            {/* Sugestões Rápidas */}
            <div className="pt-3 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2.5">
                <Lightbulb className="size-3.5 text-amber-500" /> Sugestões para perguntar:
              </p>
              <div className="flex flex-wrap gap-2">
                {quickSuggestions.map((sug, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setQuestion(sug)
                      handleAsk(sug)
                    }}
                    className="text-left text-xs bg-muted/60 hover:bg-muted text-foreground rounded-xl px-3 py-1.5 transition-colors border border-border/40"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Informações / Dicas */}
        <Card className="h-fit">
          <CardHeader>
            <div className="flex items-center gap-2">
              <HelpCircle className="size-4 text-primary" />
              <CardTitle className="text-sm font-semibold">Como funciona o Tira-Dúvidas?</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-muted-foreground leading-relaxed">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="size-4 text-[var(--success)] shrink-0 mt-0.5" />
              <p>
                <strong className="text-foreground">Respostas Didáticas:</strong> A Anne explica conceitos acadêmicos complexos com analogias simples e divisão em passos.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="size-4 text-[var(--success)] shrink-0 mt-0.5" />
              <p>
                <strong className="text-foreground">Foco na Retenção:</strong> Cada resposta inclui uma pergunta provocativa no final para testar seu aprendizado ativo.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="size-4 text-[var(--success)] shrink-0 mt-0.5" />
              <p>
                <strong className="text-foreground">Contexto da Disciplina:</strong> Selecione a matéria desejada no topo do formulário para respostas mais precisas.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Histórico de Respostas */}
      {qaList.length > 0 && (
        <div className="space-y-4 mt-2">
          <h3 className="font-display text-base font-semibold flex items-center gap-2">
            <BookOpen className="size-4 text-primary" />
            Respostas da Anne ({qaList.length})
          </h3>
          {qaList.map((item) => (
            <Card key={item.id} className="overflow-hidden border-border/80 shadow-sm">
              <CardHeader className="bg-muted/40 pb-3">
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="outline" className="text-[11px] gap-1">
                    <User className="size-3 text-muted-foreground" /> Pergunta · {item.subject}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">
                    {item.createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <CardTitle className="text-sm font-medium text-foreground">
                  "{item.question}"
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                    <Bot className="size-4" />
                  </div>
                  <div className="space-y-2 flex-1">
                    <div className="prose prose-sm dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed whitespace-pre-line text-foreground">
                      {item.answer}
                    </div>

                    {item.suggestedNextQuestions && item.suggestedNextQuestions.length > 0 && (
                      <div className="pt-3 border-t border-border mt-3">
                        <p className="text-[11px] font-semibold text-muted-foreground mb-2">
                          Próximos passos sugeridos pela Anne:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {item.suggestedNextQuestions.map((q, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setQuestion(q)
                                handleAsk(q)
                              }}
                              className="text-left text-[11px] bg-primary/5 hover:bg-primary/15 text-primary rounded-lg px-2.5 py-1 transition-colors border border-primary/20"
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
