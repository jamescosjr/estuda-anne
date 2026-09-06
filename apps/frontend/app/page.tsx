'use client'

import { useState, useEffect } from 'react'
import { Menu, X, LogOut, ShieldCheck, UserCheck } from 'lucide-react'
import type { TabId } from '@/lib/mock-data'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Sidebar } from '@/components/study/sidebar'
import { ThemeToggle } from '@/components/study/theme-toggle'
import { Dashboard } from '@/components/study/dashboard'
import { Materials } from '@/components/study/materials'
import { QuizSession } from '@/components/study/quiz-session'
import { ReviewSession } from '@/components/study/review-session'
import { Schedule } from '@/components/study/schedule'
import { ProfileScreen } from '@/components/study/profile-screen'
import { AdminStudentsManagement } from '@/components/study/admin-students-management'
import { AuthProvider, useAuth } from '@/lib/auth-context'
import { LoginScreen } from '@/components/auth/login-screen'

const pageMeta: Record<TabId, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Visão geral',
    subtitle: 'Seu resumo de estudos e o que a Anne planejou para você.',
  },
  materials: {
    title: 'Central de materiais',
    subtitle: 'Envie apostilas, slides, vídeos e áudios para a IA processar.',
  },
  quiz: {
    title: 'Estudo ativo',
    subtitle: 'Responda questões geradas pela IA e receba feedback imediato.',
  },
  flashcards: {
    title: 'Revisão de flashcards',
    subtitle: 'Repetição espaçada para fixar o conteúdo no longo prazo.',
  },
  schedule: {
    title: 'Cronograma e configurações',
    subtitle: 'Acompanhe seu plano de estudos e ajuste suas notificações.',
  },
  profile: {
    title: 'Meu perfil e matérias',
    subtitle: 'Configure seu curso, período, matérias e disponibilidade para a IA montar seu cronograma.',
  },
  admin: {
    title: 'Painel de Gestão Admin (James)',
    subtitle: 'Gerencie alunas e acessos da plataforma com perfil Administrador Master.',
  },
}

function MainAppShell() {
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const [activeTab, setActiveTab] = useState<TabId>('dashboard')
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Restaurar aba persistida no F5 / reload a partir de window.location.hash ou localStorage
  useEffect(() => {
    function syncTabFromUrl() {
      if (typeof window === 'undefined') return
      const hash = window.location.hash.replace('#', '') as TabId
      const stored = localStorage.getItem('estuda_anne_active_tab') as TabId
      const validTabs: TabId[] = ['dashboard', 'materials', 'quiz', 'flashcards', 'schedule', 'profile', 'admin']

      if (hash && validTabs.includes(hash)) {
        setActiveTab(hash)
      } else if (stored && validTabs.includes(stored)) {
        setActiveTab(stored)
      }
    }

    syncTabFromUrl()
    window.addEventListener('hashchange', syncTabFromUrl)
    return () => window.removeEventListener('hashchange', syncTabFromUrl)
  }, [])

  // Proteção de rota e redirecionamento de onboarding de perfil
  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      if (!user.isProfileComplete || !user.course) {
        setActiveTab('profile')
      } else if (activeTab === 'admin') {
        setActiveTab('dashboard')
      }
    }
  }, [user, activeTab])

  if (isLoading) {
    return (
      <div className="flex h-svh w-full items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-medium text-muted-foreground">Carregando Estuda Anne...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginScreen />
  }

  const meta = pageMeta[activeTab]

  function handleSelect(tab: TabId) {
    if (tab === 'admin' && user?.role !== 'ADMIN') {
      return
    }
    setActiveTab(tab)
    if (typeof window !== 'undefined') {
      localStorage.setItem('estuda_anne_active_tab', tab)
      window.location.hash = tab
    }
    setMobileOpen(false)
  }

  return (
    <div className="flex h-svh overflow-hidden bg-background text-foreground">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar
          active={activeTab}
          onSelect={handleSelect}
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
        />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0">
            <Sidebar
              active={activeTab}
              onSelect={handleSelect}
              collapsed={false}
              onToggle={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-background/80 px-4 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu"
            >
              {mobileOpen ? <X /> : <Menu />}
            </Button>
            <div className="min-w-0">
              <h1 className="truncate font-display text-lg font-semibold leading-tight tracking-tight">
                {meta.title}
              </h1>
              <p className="hidden truncate text-sm text-muted-foreground sm:block">
                {meta.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <div className="hidden items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs sm:flex">
                {user.role === 'ADMIN' ? (
                  <span className="flex items-center gap-1 font-semibold text-primary">
                    <ShieldCheck className="size-3.5" />
                    Admin
                  </span>
                ) : (
                  <span className="flex items-center gap-1 font-medium text-muted-foreground">
                    <UserCheck className="size-3.5" />
                    Estudante
                  </span>
                )}
                <span className="text-border">|</span>
                <span className="truncate max-w-[140px] font-medium text-foreground">{user.name}</span>
              </div>
            )}

            <ThemeToggle />

            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="hidden gap-1.5 rounded-xl text-xs sm:flex"
            >
              <LogOut className="size-3.5" />
              Sair
            </Button>
          </div>
        </header>

        <main
          className={cn(
            'flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8',
            (activeTab === 'quiz' || activeTab === 'flashcards') && 'flex items-start justify-center',
          )}
        >
          <div className="mx-auto w-full max-w-6xl">
            {activeTab === 'dashboard' && <Dashboard onNavigate={handleSelect} />}
            {activeTab === 'materials' && <Materials />}
            {activeTab === 'quiz' && <QuizSession />}
            {activeTab === 'flashcards' && <ReviewSession />}
            {activeTab === 'schedule' && <Schedule onNavigateToProfile={() => handleSelect('profile')} />}
            {activeTab === 'profile' && <ProfileScreen onSaveAndGenerateSchedule={() => handleSelect('schedule')} />}
            {activeTab === 'admin' && user?.role === 'ADMIN' && <AdminStudentsManagement />}
          </div>
        </main>
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <AuthProvider>
      <MainAppShell />
    </AuthProvider>
  )
}

