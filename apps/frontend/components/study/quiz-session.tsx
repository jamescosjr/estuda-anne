'use client'

import { useState, useEffect } from 'react'
import { HelpCircle, Sparkles, BookOpen } from 'lucide-react'
import { type QuizQuestion } from '@/lib/mock-data'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { QuizCard } from './quiz-card'
import { useAuth } from '@/lib/auth-context'

const subjectQuestionTemplates: Record<string, { prompt: string; options: { id: string; text: string }[]; correctId: string; explanation: string }[]> = {
  'cálculo': [
    {
      prompt: 'Qual é a derivada da função f(x) = x³ - 4x + 7 em relação a x?',
      options: [
        { id: 'a', text: 'f\'(x) = 3x² - 4' },
        { id: 'b', text: 'f\'(x) = 3x² - 4x' },
        { id: 'c', text: 'f\'(x) = x² - 4' },
        { id: 'd', text: 'f\'(x) = 3x - 4' },
      ],
      correctId: 'a',
      explanation: 'Pela regra do tombo (dxⁿ/dx = n·xⁿ⁻¹), a derivada de x³ é 3x², a derivada de -4x é -4, e a constante 7 é zero.',
    },
  ],
  'bioquímica': [
    {
      prompt: 'Em relação ao metabolismo celular, qual é a principal função da via da glicólise?',
      options: [
        { id: 'a', text: 'Quebrar a glicose em duas moléculas de piruvato com saldo de ATP e NADH.' },
        { id: 'b', text: 'Sintetizar glicogênio a partir da frutose.' },
        { id: 'c', text: 'Transportar ácidos graxos para a matriz mitocondrial.' },
        { id: 'd', text: 'Excretar amônia sob a forma de ureia.' },
      ],
      correctId: 'a',
      explanation: 'A glicólise ocorre no citossol e degrada 1 glicose em 2 piruvatos, obtendo saldo líquido de 2 ATP e 2 NADH.',
    },
  ],
  'algoritmos': [
    {
      prompt: 'Qual é a complexidade de tempo no pior caso para o algoritmo de busca binária em um vetor ordenado?',
      options: [
        { id: 'a', text: 'O(log n)' },
        { id: 'b', text: 'O(n)' },
        { id: 'c', text: 'O(n log n)' },
        { id: 'd', text: 'O(1)' },
      ],
      correctId: 'a',
      explanation: 'A busca binária divide o espaço de busca pela metade a cada passo, resultando em complexidade logarítmica O(log n).',
    },
  ],
}

function generateAcademicQuizzes(subjects: string[]): QuizQuestion[] {
  if (!subjects || subjects.length === 0) return []

  const list: QuizQuestion[] = []
  subjects.forEach((sub, idx) => {
    const lowerSub = sub.toLowerCase()
    const matchKey = Object.keys(subjectQuestionTemplates).find((k) => lowerSub.includes(k))

    if (matchKey && subjectQuestionTemplates[matchKey][0]) {
      const template = subjectQuestionTemplates[matchKey][0]
      list.push({
        id: `qz-${sub}-${idx}`,
        subject: sub,
        prompt: template.prompt,
        options: template.options,
        correctId: template.correctId,
        explanation: template.explanation,
      })
    } else {
      list.push({
        id: `qz-gen-${sub}-${idx}`,
        subject: sub,
        prompt: `Sobre os fundamentos acadêmicos da disciplina de ${sub}, assinale a alternativa com a proposição teórica correta:`,
        options: [
          { id: 'a', text: `Os conceitos fundamentais de ${sub} estabelecem modelos analíticos para solução de problemas práticos.` },
          { id: 'b', text: `A disciplina aborda apenas definições empíricas sem aplicação de métodos formais.` },
          { id: 'c', text: `As hipóteses teóricas de ${sub} dependem exclusivamente de aproximações intuitivas.` },
          { id: 'd', text: `Não há correlação entre as teorias de ${sub} e os testes do semestre.` },
        ],
        correctId: 'a',
        explanation: `Na disciplina de ${sub}, a compreensão dos modelos teóricos e práticos consolida a base conceitual exigida nas avaliações universitárias.`,
      })
    }
  })
  return list
}

export function QuizSession() {
  const { user } = useAuth()
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    if (user?.subjects && user.subjects.length > 0) {
      setQuestions(generateAcademicQuizzes(user.subjects))
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
