'use client'

import React, { useState } from 'react'
import { GraduationCap, ShieldCheck, UserCheck, Lock, Mail, ArrowRight, Sparkles, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function LoginScreen() {
  const { login } = useAuth()
  const [selectedRole, setSelectedRole] = useState<'STUDENT' | 'ADMIN'>('STUDENT')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMessage(null)
    if (!email || !password) {
      setErrorMessage('Por favor, preencha o e-mail e a senha.')
      return
    }

    setIsSubmitting(true)
    const result = await login(email, password)
    setIsSubmitting(false)

    if (!result.success && result.error) {
      setErrorMessage(result.error)
    }
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background px-4 py-12 sm:px-6 lg:px-8">
      {/* Background ambient lighting effects */}
      <div className="pointer-events-none absolute -top-40 -left-40 size-96 rounded-full bg-primary/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 size-96 rounded-full bg-chart-1/10 blur-[120px]" />

      <div className="relative z-10 w-full max-w-md space-y-6">
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25 ring-8 ring-primary/10 transition-transform duration-300 hover:scale-105">
            <GraduationCap className="size-8" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Estuda Anne
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Assistente de Estudos Inteligente com IA
          </p>
        </div>

        {/* Card Form */}
        <div className="rounded-2xl border border-border/60 bg-card/80 p-6 sm:p-8 shadow-xl backdrop-blur-xl transition-all">
          {/* Role Selection Tabs */}
          <div className="mb-6 grid grid-cols-2 gap-1.5 rounded-xl bg-muted/60 p-1">
            <button
              type="button"
              onClick={() => setSelectedRole('STUDENT')}
              className={cn(
                'flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition-all duration-200 sm:text-sm',
                selectedRole === 'STUDENT'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <UserCheck className="size-4" />
              <span>Estudante</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedRole('ADMIN')}
              className={cn(
                'flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition-all duration-200 sm:text-sm',
                selectedRole === 'ADMIN'
                  ? 'bg-background text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <ShieldCheck className="size-4" />
              <span>Admin Master</span>
            </button>
          </div>

          {/* Subtitle explaining current profile */}
          <div className="mb-5 rounded-lg border border-border/40 bg-muted/30 p-3 text-xs text-muted-foreground flex items-start gap-2">
            <Sparkles className="size-4 shrink-0 text-primary mt-0.5" />
            <div>
              {selectedRole === 'STUDENT' ? (
                <span>
                  <strong>Acesso Estudante:</strong> Monte planos de estudos, responda quizzes, revise flashcards e envie novos materiais.
                </span>
              ) : (
                <span>
                  <strong>Acesso Admin Master (James):</strong> Gerencie alunas cadastradas, permissões e monitore métricas da plataforma.
                </span>
              )}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-foreground/80 mb-1.5">
                E-mail de Acesso
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                  <Mail className="size-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={selectedRole === 'ADMIN' ? 'admin@estuda-anne.com' : 'estudante@universidade.edu.br'}
                  className="w-full rounded-xl border border-input bg-background/50 pl-9 pr-3 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground/80 mb-1.5">
                Senha
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                  <Lock className="size-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-input bg-background/50 pl-9 pr-11 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold shadow-md transition-all hover:shadow-lg"
            >
              {isSubmitting ? 'Autenticando...' : 'Entrar na Plataforma'}
              <ArrowRight className="size-4" />
            </Button>
          </form>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-muted-foreground">
          Estuda Anne — Plataforma Universitária de Aprendizagem &copy; 2026
        </p>
      </div>
    </div>
  )
}
