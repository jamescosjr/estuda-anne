'use client'

import { useEffect, useState } from 'react'
import { Sparkles, Bot, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getApiUrl } from '@/lib/api-config'
import { useAuth } from '@/lib/auth-context'

export function DailyBriefingCard() {
  const { user } = useAuth()
  const [briefingText, setBriefingText] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isDone, setIsDone] = useState<boolean>(false)

  const studentId = user?.id || 'anne-student-1'
  const studentName = user?.name || 'Anne'

  const fetchBriefingStream = async () => {
    setIsLoading(true)
    setIsDone(false)
    setBriefingText('')

    try {
      const baseUrl = getApiUrl()
      const url = `${baseUrl}/api/daily-briefing?studentId=${encodeURIComponent(studentId)}&name=${encodeURIComponent(studentName)}`

      const response = await fetch(url)
      if (!response.ok || !response.body) {
        throw new Error('Falha ao conectar no stream de briefing')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let accumulated = ''

      setIsLoading(false)

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        const chunkText = decoder.decode(value, { stream: true })
        const lines = chunkText.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim()
            if (dataStr === '[DONE]') {
              setIsDone(true)
              break
            }
            try {
              const parsed = JSON.parse(dataStr)
              if (parsed.chunk) {
                accumulated += parsed.chunk
                setBriefingText(accumulated)
              }
            } catch {
              // Ignorar linhas parciais
            }
          }
        }
      }
    } catch {
      setBriefingText(`Oi ${studentName}, bom dia! Seu ambiente de estudos está pronto. Foque nas revisões espaçadas de hoje para otimizar sua retenção!`)
    } finally {
      setIsLoading(false)
      setIsDone(true)
    }
  }

  useEffect(() => {
    fetchBriefingStream()
    // eslint-disable-next-deps
  }, [studentId, studentName])

  return (
    <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-r from-primary/10 via-background to-secondary/10 shadow-sm backdrop-blur-md">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-inner">
            <Bot className="size-5 animate-pulse" />
          </div>

          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="gap-1.5 px-2.5 py-0.5 text-xs font-semibold">
                <Sparkles className="size-3.5 text-amber-400" />
                Boas-vindas Inteligente
              </Badge>

              {isDone && (
                <span className="text-[11px] text-muted-foreground animate-fade-in">
                  • Atualizado agora
                </span>
              )}
            </div>

            {isLoading ? (
              <div className="space-y-2 py-1">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground animate-pulse">
                  <span className="inline-block size-2 rounded-full bg-primary animate-ping" />
                  Preparando seu ambiente de estudos...
                </div>
                <div className="h-4 w-3/4 rounded bg-muted/60 animate-pulse" />
                <div className="h-4 w-1/2 rounded bg-muted/40 animate-pulse" />
              </div>
            ) : (
              <p className="text-sm font-medium leading-relaxed text-foreground text-pretty">
                {briefingText}
                {!isDone && (
                  <span className="inline-block ml-1 h-4 w-1.5 animate-pulse bg-primary rounded-full align-middle" />
                )}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end shrink-0 pt-2 sm:pt-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchBriefingStream}
            disabled={isLoading || !isDone}
            className="rounded-xl gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            title="Atualizar Briefing Diário"
          >
            <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden xs:inline">Atualizar</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
