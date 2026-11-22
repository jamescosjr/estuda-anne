'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  KeyRound,
  UserPlus,
  Trash2,
  Edit,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Save,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useAuth } from '@/lib/auth-context'
import { getApiUrl } from '@/lib/api-config'

interface StudentUser {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
}

export function AdminStudentsManagement() {
  const { user: authUser, token: globalToken } = useAuth()

  const [token, setToken] = useState<string>('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  const [students, setStudents] = useState<StudentUser[]>([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Paginação e Busca
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit] = useState(5)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // Formulário de novo estudante
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Estado de Edição de estudante (Modal)
  const [editingStudent, setEditingStudent] = useState<StudentUser | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [updating, setUpdating] = useState(false)

  const bffUrl = getApiUrl()

  // Sincroniza token global do AuthContext caso o usuário esteja logado como ADMIN
  useEffect(() => {
    if (globalToken && authUser?.role === 'ADMIN') {
      setToken(globalToken)
      setIsLoggedIn(true)
    }
  }, [globalToken, authUser])

  const fetchStudents = useCallback(
    async (currentPage = page, currentSearch = search, authToken = token) => {
      const activeToken = authToken || globalToken
      if (!activeToken) return

      setLoading(true)
      try {
        const url = new URL(`${bffUrl}/api/users/students`)
        url.searchParams.set('page', String(currentPage))
        url.searchParams.set('limit', String(limit))
        if (currentSearch.trim()) {
          url.searchParams.set('search', currentSearch.trim())
        }

        const res = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${activeToken}` },
        })

        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data)) {
            // Suporte para retorno legado em array simples
            setStudents(data)
            setTotal(data.length)
            setTotalPages(1)
          } else {
            setStudents(data.students || [])
            setTotal(data.total || 0)
            setPage(data.page || 1)
            setTotalPages(data.totalPages || 1)
          }
        } else {
          const err = await res.json()
          setMsg({ type: 'error', text: err.message || 'Falha ao buscar lista de estudantes' })
        }
      } catch {
        setMsg({ type: 'error', text: 'Erro de conexão ao buscar estudantes' })
      } finally {
        setLoading(false)
      }
    },
    [bffUrl, globalToken, limit, page, search, token]
  )

  useEffect(() => {
    if (isLoggedIn || (globalToken && authUser?.role === 'ADMIN')) {
      fetchStudents(page, search)
    }
  }, [fetchStudents, isLoggedIn, page, search, globalToken, authUser])

  async function handleLogin(e?: React.FormEvent) {
    if (e) e.preventDefault()
    setLoading(true)
    setMsg(null)

    try {
      const res = await fetch(`${bffUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      })

      if (res.ok) {
        const data = await res.json()
        setToken(data.token)
        setIsLoggedIn(true)
        setMsg({ type: 'success', text: `Autenticado com sucesso como ${data.user.name} (${data.user.role})` })
        fetchStudents(1, search, data.token)
      } else {
        const err = await res.json()
        setMsg({ type: 'error', text: err.message || 'Falha na autenticação do Admin' })
      }
    } catch {
      setMsg({ type: 'error', text: 'Erro de conexão ao servidor BFF/Auth' })
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateStudent(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !email || !password) return
    const activeToken = token || globalToken
    if (!activeToken) return

    setLoading(true)
    setMsg(null)

    try {
      const res = await fetch(`${bffUrl}/api/users/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`,
        },
        body: JSON.stringify({ name, email, password }),
      })

      if (res.ok) {
        const created = await res.json()
        setMsg({ type: 'success', text: `Estudante ${created.name} cadastrado com sucesso!` })
        setName('')
        setEmail('')
        setPassword('')
        setPage(1)
        fetchStudents(1, search)
      } else {
        const err = await res.json()
        setMsg({ type: 'error', text: err.message || 'Falha ao criar estudante' })
      }
    } catch {
      setMsg({ type: 'error', text: 'Erro ao comunicar com o servidor' })
    } finally {
      setLoading(false)
    }
  }

  function openEditModal(student: StudentUser) {
    setEditingStudent(student)
    setEditName(student.name)
    setEditEmail(student.email)
    setEditPassword('')
  }

  function closeEditModal() {
    setEditingStudent(null)
    setEditName('')
    setEditEmail('')
    setEditPassword('')
  }

  async function handleUpdateStudent(e: React.FormEvent) {
    e.preventDefault()
    if (!editingStudent) return
    const activeToken = token || globalToken
    if (!activeToken) return

    setUpdating(true)
    setMsg(null)

    try {
      const payload: { name?: string; email?: string; password?: string } = {
        name: editName,
        email: editEmail,
      }
      if (editPassword.trim().length > 0) {
        payload.password = editPassword.trim()
      }

      const res = await fetch(`${bffUrl}/api/users/students/${editingStudent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`,
        },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const updated = await res.json()
        setMsg({ type: 'success', text: `Estudante ${updated.name || editName} atualizado com sucesso!` })
        closeEditModal()
        fetchStudents(page, search)
      } else {
        const err = await res.json()
        setMsg({ type: 'error', text: err.message || 'Falha ao atualizar estudante' })
      }
    } catch {
      setMsg({ type: 'error', text: 'Erro ao conectar ao servidor para atualização' })
    } finally {
      setUpdating(false)
    }
  }

  async function handleDeleteStudent(id: string, studentName: string) {
    if (!confirm(`Deseja realmente remover a estudante ${studentName}?`)) return
    const activeToken = token || globalToken
    if (!activeToken) return

    setLoading(true)
    setMsg(null)

    try {
      const res = await fetch(`${bffUrl}/api/users/students/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${activeToken}` },
      })

      if (res.ok) {
        setMsg({ type: 'success', text: `Estudante ${studentName} removido com sucesso` })
        fetchStudents(page, search)
      } else {
        const err = await res.json()
        setMsg({ type: 'error', text: err.message || 'Erro ao remover estudante' })
      }
    } catch {
      setMsg({ type: 'error', text: 'Erro de comunicação ao excluir estudante' })
    } finally {
      setLoading(false)
    }
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value)
    setPage(1)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Card de Autenticação de Admin */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" />
              Sessão Admin (James)
            </CardTitle>
            <CardDescription>
              Apenas o usuário Admin pode criar, buscar, atualizar e excluir estudantes.
            </CardDescription>
          </div>
          {isLoggedIn && (
            <Button variant="outline" size="sm" onClick={() => fetchStudents(page, search)}>
              <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {!isLoggedIn ? (
            <form onSubmit={handleLogin} className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-1">
                <label className="text-xs font-medium text-muted-foreground">E-mail Admin</label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Senha Admin</label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <Button type="submit" disabled={loading}>
                <KeyRound className="size-4" />
                Autenticar Admin
              </Button>
            </form>
          ) : (
            <div className="flex items-center justify-between rounded-xl bg-primary/10 p-3 text-sm text-primary">
              <span className="font-medium">Sessão Admin ativa ({authUser?.name || 'Admin Master'})</span>
              <Button variant="ghost" size="sm" onClick={() => setIsLoggedIn(false)}>
                Sair da sessão
              </Button>
            </div>
          )}

          {msg && (
            <div
              className={`mt-4 flex items-center gap-2 rounded-xl p-3 text-sm ${
                msg.type === 'success'
                  ? 'bg-[var(--success)]/10 text-[var(--success)]'
                  : 'bg-[var(--danger)]/10 text-[var(--danger)]'
              }`}
            >
              {msg.type === 'success' ? <CheckCircle className="size-4 shrink-0" /> : <AlertCircle className="size-4 shrink-0" />}
              <span>{msg.text}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Formulário de Novo Estudante */}
      {isLoggedIn && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="size-5 text-primary" />
              Cadastrar Novo Estudante
            </CardTitle>
            <CardDescription>Crie o acesso de novas alunas para a plataforma Estuda Anne.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateStudent} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Nome da Aluna</label>
                <input
                  type="text"
                  placeholder="Ex: Anne Nogueira"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">E-mail Acadêmico</label>
                <input
                  type="email"
                  placeholder="anne@universidade.edu.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Senha Inicial</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div className="sm:col-span-3 flex justify-end">
                <Button type="submit" disabled={loading}>
                  <UserPlus className="size-4" />
                  Cadastrar Estudante
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Lista de Estudantes Cadastrados com Busca & Paginação */}
      {isLoggedIn && (
        <Card>
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Estudantes Cadastrados ({total})</CardTitle>
              <CardDescription>Gerenciamento e controle de acessos das alunas da plataforma.</CardDescription>
            </div>

            {/* Campo de Busca */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por nome ou e-mail..."
                value={search}
                onChange={handleSearchChange}
                className="w-full rounded-xl border border-border bg-background pl-9 pr-8 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
              {search && (
                <button
                  onClick={() => {
                    setSearch('')
                    setPage(1)
                  }}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {students.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {search ? `Nenhum estudante encontrado para "${search}".` : 'Nenhum estudante cadastrado até o momento.'}
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {students.map((student) => (
                  <div
                    key={student.id}
                    className="flex flex-col gap-2 rounded-xl border border-border p-3.5 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold">{student.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {student.email} · Perfil: <span className="font-medium text-primary">{student.role}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => openEditModal(student)}>
                        <Edit className="size-3.5" />
                        Editar
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-[var(--danger)] hover:bg-[var(--danger)]/10"
                        onClick={() => handleDeleteStudent(student.id, student.name)}
                      >
                        <Trash2 className="size-3.5" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Controles de Paginação */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
                <span>
                  Página <strong className="text-foreground">{page}</strong> de <strong className="text-foreground">{totalPages}</strong> (Total: {total} alunas)
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1 || loading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="size-8 p-0"
                  >
                    <ChevronLeft className="size-4" />
                    <span className="sr-only">Página anterior</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages || loading}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="size-8 p-0"
                  >
                    <ChevronRight className="size-4" />
                    <span className="sr-only">Próxima página</span>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal de Edição de Estudante */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-semibold">Editar Estudante</h3>
              <button onClick={closeEditModal} className="rounded-lg p-1 text-muted-foreground hover:bg-muted">
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateStudent} className="mt-4 flex flex-col gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Nome Completo</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">E-mail Acadêmico</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Nova Senha (Opcional)</label>
                <input
                  type="password"
                  placeholder="Deixe em branco para manter a senha atual"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="mt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={closeEditModal} disabled={updating}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={updating}>
                  <Save className="size-4" />
                  {updating ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
