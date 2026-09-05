'use client'

import { useState, useEffect } from 'react'
import { HelpCircle, Sparkles, BookOpen } from 'lucide-react'
import { type QuizQuestion } from '@/lib/mock-data'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { QuizCard } from './quiz-card'
import { useAuth } from '@/lib/auth-context'

function generateUserQuizzes(subjects: string[]): QuizQuestion[] {
  if (!subjects || subjects.length === 0) return []

  const list: QuizQuestion[] = []
  subjects.forEach((sub, idx) => {
    list.push({
      id: `qz-${sub}-${idx}-1`,
      subject: sub,
      prompt: `Em relação à disciplina de ${sub}, qual é a abordagem recomendada para fixação de longo prazo segundo os algoritmos da Anne?`,
      options: [
        { id: 'a', text: 'Revisão ativa com repetição espaçada e prática de quizzes.' },
        { id: 'b', text: 'Leitura passiva repetida poucas horas antes do exame.' },
        { id: 'c', text: 'Decoreba de resumos prontos sem autoexplicação.' },
        { id: 'd', text: 'Estudo exclusivo na véspera sem pausas.' },
      ],
      correctId: 'a',
      explanation: `Na matéria de ${sub}, a repetição espaçada com prática ativa reduz a taxa de esquecimento e otimiza sua retenção para as provas do semestre.`,
    })
  })
  return list
}

export function QuizSession() {
  const { user } = useAuth()
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    if (user?.subjects && user.subjects.length > 0) {
      setQuestions(generateUserQuizzes(user.subjects))
    } else {
      setQuestions([])
    }
  }, [user?.subjects])

  if (questions.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col items-center justify-center pt-8">
        <Card className="w-full border-border shadow-sm">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center space-y-4">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <HelpCircle className="size-7" />
            </span>
            <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
              Nenhum Quiz Gerado no Momento
            </h2>
            <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
              Você ainda não possui quizzes ativos. Cadastre suas disciplinas no seu <strong className="text-foreground">Perfil</strong> ou envie uma apostila na <strong className="text-foreground">Central de Materiais</strong> para que a IA gere seus testes automaticamente!
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const total = questions.length
  const question = questions[current]

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <div>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">Quiz — {question.subject}</span>
          <span className="text-muted-foreground">
            {Math.round(((current + 1) / total) * 100)}% concluído
          </span>
        </div>
        <Progress value={((current + 1) / total) * 100} />
      </div>

      <QuizCard
        key={question.id}
        question={question}
        index={current}
        total={total}
        isLast={current === total - 1}
        onNext={() => setCurrent((c) => Math.min(c + 1, total - 1))}
      />
    </div>
  )
}
