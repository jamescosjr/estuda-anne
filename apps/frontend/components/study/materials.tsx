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
  Trash2,
} from 'lucide-react'
import { type UploadItem } from '@/lib/mock-data'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UploadZone } from './upload-zone'
import { getApiUrl } from '@/lib/api-config'
import { useAuth } from '@/lib/auth-context'

function mapMaterialStatus(status?: string): UploadItem['status'] {
  if (status === 'READY' || status === 'PROCESSED' || status === 'DONE') return 'done'
  if (status === 'FAILED') return 'failed'
  return 'processing'
}

function mapFormatToKind(format?: string): UploadItem['kind'] {
  const value = (format || '').toUpperCase()
  if (value === 'PPT' || value === 'PPTX') return 'PPTX'
  if (value === 'VIDEO' || value === 'MP4') return 'MP4'
  if (value === 'AUDIO' || value === 'MP3') return 'MP3'
  return 'PDF'
}

function mapBackendMaterial(m: any): UploadItem {
  const status = mapMaterialStatus(m.status)
  return {
    id: m.id,
    name: m.title,
    subject: m.subject || m.tags?.[0] || 'Geral',
    kind: mapFormatToKind(m.format),
    size: `${Math.round(((m.fileSizeBytes || 1048576) / 1024 / 1024) * 10) / 10} MB`,
    status,
    detail:
      status === 'done'
        ? 'Processado e indexado no RAG com IA'
        : status === 'failed'
          ? m.errorMessage || 'Falha no processamento'
          : 'Processando com IA…',
  }
}

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

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function Materials() {
  const { user } = useAuth()
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const userSubjects = user?.subjects && user.subjects.length > 0
    ? user.subjects
    : ['Cálculo I', 'Bioquímica', 'Algoritmos e Estruturas de Dados']
  const [selectedSubject, setSelectedSubject] = useState<string>(userSubjects[0] || 'Geral')
  const bffUrl = getApiUrl()

  const studentId = user?.id || 'guest-student'
  const storageKey = `estuda_anne_materials_${studentId}`

  useEffect(() => {
    // Carrega materiais persistidos no localStorage do usuário
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
          if (Array.isArray(list)) {
            const mapped: UploadItem[] = list.map(mapBackendMaterial)
            setUploads(mapped)
            localStorage.setItem(storageKey, JSON.stringify(mapped))
          }
        }
      } catch (err) {
        console.warn('Erro ao carregar materiais do backend:', err)
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

  async function handleDelete(id: string) {
    try {
      await fetch(`${bffUrl}/api/materials/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
    } catch (err) {
      console.warn('Erro ao deletar material no servidor:', err)
    }
    const updated = uploads.filter((item) => item.id !== id)
    saveItems(updated)
  }

  async function handleFiles(files: File[]) {
    if (!files || files.length === 0) return

    // 1. Cria itens iniciais com status 'processing' e adiciona IMEDIATAMENTE ao estado
    const newItems: UploadItem[] = files.map((file, i) => {
      const ext = file.name.split('.').pop()?.toUpperCase() || 'PDF'
      const kind: UploadItem['kind'] =
        ext === 'PDF' || ext === 'PPTX' || ext === 'MP4' || ext === 'MP3' ? ext : 'PDF'
      const sizeMb = (file.size / 1024 / 1024).toFixed(1)

      return {
        id: `mat-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
        name: file.name,
        subject: selectedSubject,
        kind,
        size: `${sizeMb === '0.0' ? '0.5' : sizeMb} MB`,
        status: 'processing',
        detail: 'Enviando e analisando com Gemini 3.6 Flash…',
      }
    })

    // Atualiza estado local e salva imediatamente para a UI refletir os 3 arquivos
    setUploads((prev) => {
      const updated = [...newItems, ...prev]
      saveItems(updated)
      return updated
    })

    // 2. Processa cada arquivo enviando para a API do BFF
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const itemMeta = newItems[i]

      let fileContent = ''
      let fileBase64 = ''
      try {
        if (file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
          fileContent = await file.text()
        } else {
          fileBase64 = await fileToBase64(file)
        }
      } catch {
        fileContent = ''
      }

      try {
        const res = await fetch(`${bffUrl}/api/materials/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId,
            title: file.name,
            subject: selectedSubject,
            format: itemMeta.kind,
            mimeType: file.type || 'application/pdf',
            content: fileContent.trim().length > 10 ? fileContent : undefined,
            fileBase64: fileBase64 || undefined,
            fileSizeBytes: file.size || 1024,
          }),
        })

        if (res.ok || res.status === 202) {
          const data = await res.json()
          const serverId = data.material?.id || itemMeta.id
          const mappedStatus = mapMaterialStatus(data.status || data.material?.status)

          setUploads((prev) => {
            const updated = prev.map((item) =>
              item.id === itemMeta.id
                ? {
                    ...item,
                    id: serverId,
                    subject: data.material?.subject || selectedSubject,
                    status: mappedStatus,
                    detail: mappedStatus === 'done' ? 'Processado com IA' : mappedStatus === 'failed' ? (data.message || 'Falha no processamento') : 'Processando com IA…',
                  }
                : item,
            )
            saveItems(updated)
            return updated
          })

          if (mappedStatus === 'processing') {
            for (let attempt = 0; attempt < 24; attempt += 1) {
              await sleep(1500)
              try {
                const pollRes = await fetch(`${bffUrl}/api/materials/${encodeURIComponent(serverId)}`)
                if (!pollRes.ok) continue
                const polled = mapBackendMaterial(await pollRes.json())
                setUploads((prev) => {
                  const updated = prev.map((item) => (item.id === serverId || item.id === itemMeta.id ? { ...item, ...polled, id: serverId } : item))
                  saveItems(updated)
                  return updated
                })
                if (polled.status !== 'processing') break
              } catch {
                break
              }
            }
          }
        } else {
          const data = await res.json().catch(() => ({}))
          const serverId = data.material?.id
          setUploads((prev) => {
            const updated = prev.map((item) =>
              item.id === itemMeta.id
                ? {
                    ...item,
                    id: serverId || item.id,
                    status: 'failed' as const,
                    detail: data.message || 'Falha ao enviar ou processar o material',
                  }
                : item,
            )
            saveItems(updated)
            return updated
          })
        }
      } catch {
        setUploads((prev) => {
          const updated = prev.map((item) =>
            item.id === itemMeta.id
              ? {
                  ...item,
                  status: 'failed' as const,
                  detail: 'Falha de conexão ao enviar o material',
                }
              : item,
          )
          saveItems(updated)
          return updated
        })
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <UploadZone
        subjects={userSubjects}
        selectedSubject={selectedSubject}
        onSubjectChange={setSelectedSubject}
        onFiles={handleFiles}
      />

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
                Envie suas apostilas (PDF), apresentações (PPTX) ou gravações de aulas (MP3/MP4) na zona acima. O assistente pedagógico gerará quizzes e flashcards automaticamente para você!
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
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium leading-tight">{item.name}</p>
                      {item.subject && (
                        <Badge variant="neutral" className="text-[10px] py-0 px-1.5 shrink-0">
                          {item.subject}
                        </Badge>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.kind} · {item.size} — {item.detail}
                    </p>
                  </div>
                  <StatusBadge status={item.status} />
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    title="Remover material"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}
