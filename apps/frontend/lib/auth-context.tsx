'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { getApiUrl } from '@/lib/api-config'

export interface ExamDateItem {
  id: string
  subject: string
  title: string
  date: string
}

export interface User {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'STUDENT'
  course?: string
  period?: string
  periodStartDate?: string
  periodEndDate?: string
  examDates?: ExamDateItem[]
  subjects?: string[]
  studyGoalMinutes?: number
  isProfileComplete?: boolean
}

interface AuthContextType {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, passwordText: string) => Promise<{ success: boolean; error?: string }>
  loginAsDemo: (role: 'ADMIN' | 'STUDENT') => void
  updateProfile: (profileData: {
    name?: string
    course?: string
    period?: string
    periodStartDate?: string
    periodEndDate?: string
    examDates?: ExamDateItem[]
    subjects?: string[]
    studyGoalMinutes?: number
  }) => Promise<{ success: boolean; error?: string }>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const STORAGE_KEY_USER = 'estuda_anne_user'
const STORAGE_KEY_TOKEN = 'estuda_anne_token'

export const DEMO_STUDENT: User = {
  id: 'student-demo-id',
  name: 'Ana Nogueira',
  email: 'ana.nogueira@estudante.ufmg.br',
  role: 'STUDENT',
  course: '',
  period: '',
  periodStartDate: '',
  periodEndDate: '',
  examDates: [],
  subjects: [],
  studyGoalMinutes: 45,
  isProfileComplete: false,
}

export const DEMO_ADMIN: User = {
  id: 'admin-demo-id',
  name: 'James (Admin Master)',
  email: 'admin@estuda-anne.com',
  role: 'ADMIN',
  course: 'Gestão da Plataforma',
  period: 'Administrador Master',
  periodStartDate: '',
  periodEndDate: '',
  examDates: [],
  subjects: [],
  studyGoalMinutes: 60,
  isProfileComplete: true,
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(STORAGE_KEY_USER)
      const storedToken = localStorage.getItem(STORAGE_KEY_TOKEN)
      if (storedUser && storedToken) {
        setUser(JSON.parse(storedUser))
        setToken(storedToken)
      } else {
        setUser(null)
        setToken(null)
      }
    } catch {
      setUser(null)
      setToken(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  function saveAuthSession(userData: User, jwtToken: string) {
    setUser(userData)
    setToken(jwtToken)
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(userData))
    localStorage.setItem(STORAGE_KEY_TOKEN, jwtToken)
  }

  async function login(email: string, passwordText: string): Promise<{ success: boolean; error?: string }> {
    try {
      const bffUrl = getApiUrl()
      const response = await fetch(`${bffUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: passwordText }),
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: data.message || 'Falha ao autenticar. Verifique seu e-mail e senha.',
        }
      }

      const userRole: 'ADMIN' | 'STUDENT' = data.user?.role === 'ADMIN' ? 'ADMIN' : 'STUDENT'
      const userData: User = {
        id: data.user.id,
        name: data.user.name || (userRole === 'ADMIN' ? 'Admin Master' : 'Estudante'),
        email: data.user.email,
        role: userRole,
        course: data.user.course || (userRole === 'ADMIN' ? 'Gestão da Plataforma' : ''),
        period: data.user.period || (userRole === 'ADMIN' ? 'Administrador Master' : ''),
        periodStartDate: data.user.periodStartDate || '',
        periodEndDate: data.user.periodEndDate || '',
        examDates: data.user.examDates || [],
        subjects: data.user.subjects || [],
        studyGoalMinutes: data.user.studyGoalMinutes || 45,
        isProfileComplete: userRole === 'ADMIN' ? true : Boolean(data.user.course && data.user.period),
      }

      saveAuthSession(userData, data.token)
      return { success: true }
    } catch (err: any) {
      console.error('Erro de autenticação no BFF:', err)
      return {
        success: false,
        error: 'Não foi possível conectar ao servidor de autenticação. Tente novamente mais tarde.',
      }
    }
  }

  async function updateProfile(profileData: {
    name?: string
    course?: string
    period?: string
    periodStartDate?: string
    periodEndDate?: string
    examDates?: ExamDateItem[]
    subjects?: string[]
    studyGoalMinutes?: number
  }): Promise<{ success: boolean; error?: string }> {
    if (!user) return { success: false, error: 'Usuário não autenticado' }

    const updatedUser: User = {
      ...user,
      name: profileData.name !== undefined ? profileData.name : user.name,
      course: profileData.course !== undefined ? profileData.course : user.course,
      period: profileData.period !== undefined ? profileData.period : user.period,
      periodStartDate: profileData.periodStartDate !== undefined ? profileData.periodStartDate : user.periodStartDate,
      periodEndDate: profileData.periodEndDate !== undefined ? profileData.periodEndDate : user.periodEndDate,
      examDates: profileData.examDates !== undefined ? profileData.examDates : user.examDates,
      subjects: profileData.subjects !== undefined ? profileData.subjects : user.subjects,
      studyGoalMinutes: profileData.studyGoalMinutes !== undefined ? profileData.studyGoalMinutes : user.studyGoalMinutes,
      isProfileComplete: Boolean(
        (profileData.course !== undefined ? profileData.course : user.course) &&
        (profileData.period !== undefined ? profileData.period : user.period)
      ),
    }

    try {
      const bffUrl = getApiUrl()
      await fetch(`${bffUrl}/api/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(profileData),
      })
    } catch (err) {
      console.warn('Atualizando estado local de perfil (modo offline/demo):', err)
    }

    saveAuthSession(updatedUser, token || 'demo-token')
    return { success: true }
  }

  function loginAsDemo(role: 'ADMIN' | 'STUDENT') {
    if (role === 'ADMIN') {
      saveAuthSession(DEMO_ADMIN, 'demo-token-admin')
    } else {
      saveAuthSession(DEMO_STUDENT, 'demo-token-student')
    }
  }

  function logout() {
    setUser(null)
    setToken(null)
    localStorage.removeItem(STORAGE_KEY_USER)
    localStorage.removeItem(STORAGE_KEY_TOKEN)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        loginAsDemo,
        updateProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider')
  }
  return context
}
