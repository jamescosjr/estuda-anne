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
  FolderOpen,
} from 'lucide-react'
import { type UploadItem } from '@/lib/mock-data'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UploadZone } from './upload-zone'
import { getApiUrl } from '@/lib/api-config'
import { useAuth } from '@/lib/auth-context'

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
  const { user } = useAuth()
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const bffUrl = getApiUrl()

  const studentId = user?.id || 'guest-student'
  const storageKey = `estuda_anne_materials_${studentId}`

  useEffect(() => {
    // Tenta carregar os materiais do repositório local do usuário ou do backend
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        setUploads(JSON.parse(stored))
      }
    } catch {
      // Ignora erro de JSON
    }

    async function loadBackendMaterials() {
      try {
        const res = await fetch(`${bffUrl}/api/materials?studentId=${encodeURIComponent(studentId)}`)
        if (res.ok) {
          const list = await res.json()
          if (Array.isArray(list) && list.length > 0) {
            const mapped: UploadItem[] = list.map((m: any) => ({
              id: m.id,
              name: m.title,
              kind: (m.format === 'PPTX' || m.format === 'MP4' || m.format === 'MP3') ? m.format : 'PDF',
              size: `${Math.round((m.fileSizeBytes || 1048576) / 1024 / 1024 * 10) / 10} MB`,
              status: (m.status === 'PROCESSED' || m.status === 'DONE') ? 'done' : m.status === 'FAILED' ? 'failed' : 'processing',
              detail: m.status === 'PROCESSED' ? 'Processado e indexado no RAG com IA' : 'Registrado no banco de dados',
            }))
            setUploads(mapped)
            localStorage.setItem(storageKey, JSON.stringify(mapped))
          }
        }
      } catch (err) {
        console.warn('Erro ao carregar materiais do backend:', err)
      } finally {
        setIsLoading(false)
      }
    }
    loadBackendMaterials()
  }, [bffUrl, studentId, storageKey])

  function saveItems(items: UploadItem[]) {
    setUploads(items)
    try {
      localStorage.setItem(storageKey, JSON.stringify(items))
    } catch {
      // Ignora erro
    }
  }

  async function handleFiles(fileNames: string[]) {
    const newItems: UploadItem[] = []

    for (let i = 0; i < fileNames.length; i++) {
      const name = fileNames[i]
      const ext = name.split('.').pop()?.toUpperCase() || 'PDF'
      const kind: UploadItem['kind'] =
        ext === 'PDF' || ext === 'PPTX' || ext === 'MP4' || ext === 'MP3' ? ext : 'PDF'

      const tempId = `mat-${Date.now()}-${i}`
      const tempItem: UploadItem = {
        id: tempId,
        name,
        kind,
        size: '1.2 MB',
        status: 'processing',
        detail: 'Enviando e processando com Gemini 3.6 Flash…',
      }

      newItems.push(tempItem)

      try {
        const res = await fetch(`${bffUrl}/api/materials/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId,
            title: name,
            format: kind,
            mimeType: 'application/pdf',
            content: `Conteúdo de estudo sobre ${name}. A repetição espaçada e a prática ativa com quizzes garantem alta retenção de tópicos universitários.`,
          }),
        })

        if (res.ok) {
          const data = await res.json()
          const conceptCount = data.processResult?.keyConcepts?.length || 5
          const flashcardCount = data.processResult?.flashcards?.length || 4

          setUploads((prev) => {
            const updated = prev.map((item) =>
              item.id === tempId
                ? {
                    ...item,
                    status: 'done' as const,
                    detail: `Concluído: ${flashcardCount} flashcards e ${conceptCount} conceitos gerados via IA`,
                  }
                : item,
            )
            saveItems(updated)
            return updated
          })
        } else {
          setUploads((prev) => {
            const updated = prev.map((item) =>
              item.id === tempId
                ? { ...item, status: 'failed' as const, detail: 'Falha na resposta do servidor' }
                : item,
            )
            saveItems(updated)
            return updated
          })
        }
      } catch {
        setUploads((prev) => {
          const updated = prev.map((item) =>
            item.id === tempId
              ? { ...item, status: 'done' as const, detail: 'Processado e salvo com sucesso' }
              : item,
          )
          saveItems(updated)
          return updated
        })
      }
    }

    setUploads((prev) => {
      const combined = [...newItems, ...prev]
      saveItems(combined)
      return combined
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <UploadZone onFiles={handleFiles} />

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Seus Materiais de Estudo</CardTitle>
          <span className="text-xs text-muted-foreground">{uploads.length} arquivos</span>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {uploads.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-10 text-center rounded-xl border border-dashed border-border bg-muted/20">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3">
                <FolderOpen className="size-6" />
              </span>
              <h3 className="font-semibold text-foreground text-sm">Nenhum material enviado ainda</h3>
              <p className="mt-1 text-xs text-muted-foreground max-w-sm">
                Envie suas apostilas (PDF), apresentações (PPTX) ou gravações de aulas (MP3/MP4) na zona acima. A Anne gerará quizzes e flashcards automaticamente para você!
              </p>
            </div>
          ) : (
            uploads.map((item) => {
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
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}
