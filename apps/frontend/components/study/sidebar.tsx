'use client'

import {
  BookOpen,
  CalendarClock,
  GraduationCap,
  LayoutDashboard,
  Layers,
  ListChecks,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  UserCog,
} from 'lucide-react'
import type { TabId } from '@/lib/mock-data'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-context'

interface NavItem {
  id: TabId
  label: string
  icon: React.ElementType
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Visão geral', icon: LayoutDashboard },
  { id: 'materials', label: 'Materiais', icon: Layers },
  { id: 'quiz', label: 'Quizzes', icon: ListChecks },
  { id: 'flashcards', label: 'Flashcards', icon: BookOpen },
  { id: 'schedule', label: 'Cronograma', icon: CalendarClock },
  { id: 'profile', label: 'Meu Perfil', icon: UserCog },
  { id: 'admin', label: 'Gestão Admin', icon: ShieldCheck },
]

interface SidebarProps {
  active: TabId
  onSelect: (id: TabId) => void
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ active, onSelect, collapsed, onToggle }: SidebarProps) {
  const { user, logout } = useAuth()

  const filteredNavItems = navItems.filter((item) => {
    if (item.id === 'admin') {
      return user?.role === 'ADMIN'
    }
    return true
  })

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'AN'

  return (
    <aside
      className={cn(
        'flex h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-300',
        collapsed ? 'w-[74px]' : 'w-64',
      )}
    >
      <div className="flex h-16 items-center gap-2.5 px-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
          <GraduationCap className="size-5" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-semibold leading-tight">Estuda Anne</p>
            <p className="truncate text-xs text-muted-foreground">Assistente de estudos</p>
          </div>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
        {filteredNavItems.map((item) => {
          const Icon = item.icon
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              aria-current={isActive ? 'page' : undefined}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                collapsed && 'justify-center px-0',
                isActive
                  ? 'bg-sidebar-primary/12 text-sidebar-primary'
                  : 'text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              )}
            >
              <Icon className="size-5 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          )
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3 space-y-1">
        {!collapsed && user && (
          <div
            onClick={() => onSelect('profile')}
            className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-1.5 bg-sidebar-accent/50 hover:bg-sidebar-accent transition-colors"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
              {userInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {user.role === 'ADMIN'
                  ? 'Admin Master'
                  : user.course
                  ? `${user.course}${user.period ? ` · ${user.period}` : ''}`
                  : 'Perfil Incompleto'}
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-1">
          <Button
            variant="ghost"
            onClick={onToggle}
            className={cn('flex-1', collapsed ? 'justify-center px-0' : 'justify-start')}
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
            {!collapsed && <span>Recolher</span>}
          </Button>

          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              title="Sair da conta"
            >
              <LogOut className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </aside>
  )
}

