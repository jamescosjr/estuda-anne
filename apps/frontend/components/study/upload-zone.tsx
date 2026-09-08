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

export function UploadZone({ subjects = [], selectedSubject = '', onSubjectChange, onFiles }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const hasSubjects = subjects.length > 0
  const activeSubject = hasSubjects ? selectedSubject : ''

  function handleFiles(list: FileList | null) {
    if (!hasSubjects || !activeSubject) return
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
          value={activeSubject}
          disabled={!hasSubjects}
          onChange={(e) => onSubjectChange?.(e.target.value)}
          className="h-8 flex-1 max-w-xs rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
        >
          {hasSubjects ? (
            subjects.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))
          ) : (
            <option value="">Cadastre uma matéria no Perfil</option>
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
        tabIndex={hasSubjects ? 0 : -1}
        onClick={() => hasSubjects && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (!hasSubjects) return
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        className={cn(
          'flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
          !hasSubjects
            ? 'cursor-not-allowed border-border bg-muted/30 opacity-80'
            : dragging
              ? 'cursor-pointer border-primary bg-primary/5'
              : 'cursor-pointer border-border bg-muted/40 hover:border-primary/50 hover:bg-muted/70',
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
          {hasSubjects ? (
            <>
              Ou clique para selecionar. A Anne associará o material à matéria{' '}
              <strong className="text-foreground">{activeSubject}</strong> e gerará resumos e quizzes.
            </>
          ) : (
            <>
              Cadastre ou mantenha suas matérias em <strong className="text-foreground">Meu perfil</strong> antes de enviar arquivos.
            </>
          )}
        </p>
        <Button className="mt-5" size="lg" disabled={!hasSubjects}>
          <FileUp />
          {hasSubjects ? `Selecionar arquivos para ${activeSubject}` : 'Sem matéria no perfil'}
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
