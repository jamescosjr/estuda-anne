'use client'

import { useState, useEffect } from 'react'
import {
  CheckCircle2,
  FileText,
  Film,
  Loader2,
  Music,
  Presentation,
  XCircle,
} from 'lucide-react'
import { recentUploads, type UploadItem } from '@/lib/mock-data'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UploadZone } from './upload-zone'
import { getApiUrl } from '@/lib/api-config'

const kindIcon = {
  PDF: FileText,
  PPTX: Presentation,
  MP4: Film,
  MP3: Music,
} as const

function StatusBadge({ status }: { status: UploadItem['status'] }) {
  if (status === 'processing') {
    return (
      <Badge variant="warning">
        <Loader2 className="size-3 animate-spin" />
        Processando IA…
      </Badge>
    )
  }
  if (status === 'done') {
    return (
      <Badge variant="success">
        <CheckCircle2 className="size-3" />
        Concluído
      </Badge>
    )
  }
  return (
    <Badge variant="danger">
      <XCircle className="size-3" />
      Falha
    </Badge>
  )
}

export function Materials() {
  const [uploads, setUploads] = useState<UploadItem[]>(recentUploads)
  const bffUrl = getApiUrl()

  useEffect(() => {
    async function loadBackendMaterials() {
      try {
        const res = await fetch(`${bffUrl}/api/materials?studentId=anne-student-1`)
        if (res.ok) {
          const list = await res.json()
          if (Array.isArray(list) && list.length > 0) {
            const mapped: UploadItem[] = list.map((m: any) => ({
              id: m.id,
              name: m.title,
              kind: (m.format === 'PPTX' || m.format === 'MP4' || m.format === 'MP3') ? m.format : 'PDF',
              size: `${Math.round((m.fileSizeBytes || 1048576) / 1024 / 1024 * 10) / 10} MB`,
              status: (m.status === 'PROCESSED' || m.status === 'DONE') ? 'done' : m.status === 'FAILED' ? 'failed' : 'processing',
              detail: m.status === 'PROCESSED' ? 'Processado e indexado no RAG com IA' : 'Registrado no MongoDB Atlas',
            }))
            setUploads((prev) => {
              const combined = [...mapped, ...prev.filter(p => !mapped.some(m => m.id === p.id))]
              return combined
            })
          }
        }
      } catch (err) {
        // Degraded mode / fallback to initial state
      }
    }
    loadBackendMaterials()
  }, [bffUrl])

  async function handleFiles(fileNames: string[]) {
    const bffUrl = getApiUrl()

    for (let i = 0; i < fileNames.length; i++) {
      const name = fileNames[i]
      const ext = name.split('.').pop()?.toUpperCase() || 'PDF'
      const kind: UploadItem['kind'] =
        ext === 'PDF' || ext === 'PPTX' || ext === 'MP4' || ext === 'MP3' ? ext : 'PDF'

      const tempId = `new-${Date.now()}-${i}`
      const tempItem: UploadItem = {
        id: tempId,
        name,
        kind,
        size: '1.2 MB',
        status: 'processing',
        detail: 'Enviando ao R2 e analisando no Gemini 3.6 Flash…',
      }

      setUploads((prev) => [tempItem, ...prev])

      try {
        const res = await fetch(`${bffUrl}/api/materials/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: 'anne-student-1',
            title: name,
            format: kind,
            mimeType: 'application/pdf',
            content: `Conteúdo de estudo sobre ${name}. A repetição espaçada e a prática ativa com quizzes garantem alta retenção de tópicos universitários.`,
          }),
        })

        if (res.ok) {
          const data = await res.json()
          const conceptCount = data.processResult?.keyConcepts?.length || 0
          const flashcardCount = data.processResult?.flashcards?.length || 0

          setUploads((prev) =>
            prev.map((item) =>
              item.id === tempId
                ? {
                    ...item,
                    status: 'done',
                    detail: `Concluído: ${flashcardCount} flashcards e ${conceptCount} conceitos gerados via Gemini`,
                  }
                : item,
            ),
          )
        } else {
          setUploads((prev) =>
            prev.map((item) =>
              item.id === tempId
                ? { ...item, status: 'failed', detail: 'Falha na resposta da API' }
                : item,
            ),
          )
        }
      } catch {
        setUploads((prev) =>
          prev.map((item) =>
            item.id === tempId
              ? { ...item, status: 'failed', detail: 'Servidor desconectado (modo offline/mock)' }
              : item,
          ),
        )
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <UploadZone onFiles={handleFiles} />

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Envios recentes</CardTitle>
          <span className="text-xs text-muted-foreground">{uploads.length} arquivos</span>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {uploads.map((item) => {
            const Icon = kindIcon[item.kind]
            return (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-xl border border-border p-3"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium leading-tight">{item.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.kind} · {item.size} — {item.detail}
                  </p>
                </div>
                <StatusBadge status={item.status} />
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
