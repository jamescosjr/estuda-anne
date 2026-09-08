'use client'

import { useAuth } from '@/lib/auth-context'

export function listStudentSubjects(subjects?: string[] | null): string[] {
  return Array.from(new Set((subjects ?? []).map((item) => item.trim()).filter(Boolean)))
}

export function resolveSelectedSubject(subjects: string[], current?: string): string {
  if (current && subjects.includes(current)) return current
  return subjects[0] ?? ''
}

export function resolveSubjectFilter(subjects: string[], current: string): string {
  if (current === 'all') return 'all'
  if (subjects.includes(current)) return current
  return 'all'
}

/** Matérias ativas do perfil autenticado — única fonte para Materiais, Quiz e Flashcards. */
export function useStudentSubjects(): string[] {
  const { user } = useAuth()
  return listStudentSubjects(user?.subjects)
}
