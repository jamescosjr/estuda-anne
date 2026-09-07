'use client'

import { useRef, useState } from 'react'
import { FileText, FileUp, Film, Image as ImageIcon, Music, Presentation, UploadCloud } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const acceptedTypes = [
  { label: 'PDF', icon: FileText, hint: 'Apostilas e resumos' },
  { label: 'PPTX', icon: Presentation, hint: 'Slides de aula' },
  { label: 'Fotos', icon: ImageIcon, hint: 'Provas e listas (JPG, PNG, WebP)' },
  { label: 'MP4 / MP3', icon: Film, hint: 'Aulas em vídeo e áudio' },
]

interface UploadZoneProps {
  subjects?: string[]
  selectedSubject?: string
  onSubjectChange?: (subject: string) => void
  onFiles?: (files: File[]) => void
}

export function UploadZone({ subjects = [], selectedSubject = 'Geral', onSubjectChange, onFiles }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFiles(list: FileList | null) {
    if (!list || list.length === 0) return
    onFiles?.(Array.from(list))
  }

  return (
    <div>
      {/* Seletor de Matéria para Associação do Material */}
      <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
        <label htmlFor="material-subject-select" className="text-xs font-semibold text-foreground shrink-0">
          Matéria do Material:
        </label>
        <select
          id="material-subject-select"
          value={selectedSubject}
          onChange={(e) => onSubjectChange?.(e.target.value)}
          className="h-8 flex-1 max-w-xs rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {subjects.length === 0 ? (
            <option value="Geral">Geral / Sem Matéria</option>
          ) : (
            subjects.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))
          )}
        </select>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          handleFiles(e.dataTransfer.files)
        }}
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
          dragging
            ? 'border-primary bg-primary/5'
            : 'border-border bg-muted/40 hover:border-primary/50 hover:bg-muted/70',
        )}
      >
        <span
          className={cn(
            'mb-4 flex size-14 items-center justify-center rounded-2xl transition-colors',
            dragging ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary',
          )}
        >
          <UploadCloud className="size-7" />
        </span>
        <p className="font-display text-base font-semibold">
          Arraste e solte seus arquivos ou fotos de provas aqui
        </p>
        <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground text-pretty">
          Ou clique para selecionar. A Anne associará o material à matéria <strong className="text-foreground">{selectedSubject}</strong> e gerará resumos e quizzes.
        </p>
        <Button className="mt-5" size="lg">
          <FileUp />
          Selecionar arquivos para {selectedSubject}
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.pptx,.mp4,.mp3,.jpg,.jpeg,.png,.webp,.txt"
          className="sr-only"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {acceptedTypes.map((type) => {
          const Icon = type.icon
          return (
            <div
              key={type.label}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
            >
              <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Icon className="size-4.5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{type.label}</p>
                <p className="truncate text-xs text-muted-foreground">{type.hint}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
