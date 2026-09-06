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

function generateAcademicQuizzes(subjects: string[], targetCount = 5, subjectFilter = 'all'): QuizQuestion[] {
  const selectedSubjects = (!subjects || subjects.length === 0)
    ? ['Cálculo I', 'Bioquímica', 'Algoritmos e Estruturas de Dados']
    : (subjectFilter !== 'all' ? [subjectFilter] : subjects)

  const list: QuizQuestion[] = []
  let idx = 0

  while (list.length < targetCount) {
    const sub = selectedSubjects[idx % selectedSubjects.length]
    const lowerSub = sub.toLowerCase()
    const matchKey = Object.keys(subjectQuestionTemplates).find((k) => lowerSub.includes(k))
    const itemNum = Math.floor(list.length / selectedSubjects.length) + 1

    if (matchKey && subjectQuestionTemplates[matchKey][0] && itemNum === 1) {
      const template = subjectQuestionTemplates[matchKey][0]
      list.push({
        id: `qz-${sub}-${list.length}`,
        subject: sub,
        prompt: template.prompt,
        options: template.options,
        correctId: template.correctId,
        explanation: template.explanation,
      })
    } else {
      list.push({
        id: `qz-gen-${sub}-${list.length}`,
        subject: sub,
        prompt: `[Questão Extra ${list.length + 1} / ${targetCount}] Sobre os tópicos avançados de ${sub}, analise as afirmativas:`,
        options: [
          { id: 'a', text: `A aplicação rigorosa das propriedades de ${sub} garante eficiência em exames práticos.` },
          { id: 'b', text: `Os teoremas fundamentais de ${sub} são aplicáveis apenas a casos particulares sem generalização.` },
          { id: 'c', text: `Não é possível derivar modelos preditivos a partir dos axiomas de ${sub}.` },
          { id: 'd', text: `Todas as proposições acima estão incorretas.` },
        ],
        correctId: 'a',
        explanation: `A resolução sistemática dos conceitos de ${sub} fortalece o aprendizado ativo e a retenção em avaliações universitárias.`,
      })
    }
    idx++
  }

  return list
}

const DEFAULT_SUBJECTS = ['Cálculo I', 'Bioquímica', 'Algoritmos e Estruturas de Dados']

export function QuizSession() {
  const { user } = useAuth()
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [current, setCurrent] = useState(0)
  const [targetCount, setTargetCount] = useState<number>(5)
  const [subjectFilter, setSubjectFilter] = useState<string>('all')

  const userSubjectsKey = user?.subjects?.join(',') || ''
  const availableSubjects = user?.subjects && user.subjects.length > 0
    ? user.subjects
    : DEFAULT_SUBJECTS

  useEffect(() => {
    setQuestions(generateAcademicQuizzes(availableSubjects, targetCount, subjectFilter))
    setCurrent(0)
  }, [userSubjectsKey, targetCount, subjectFilter])

  function handleStartExtraSession() {
    setQuestions(generateAcademicQuizzes(availableSubjects, targetCount, subjectFilter))
    setCurrent(0)
  }

  const total = questions.length
  const question = questions[current]

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      {/* Control Toolbar: Estudo Sob Demanda (Fora do Horário) */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">Estudo Extra — Fora do Horário</p>
              <p className="text-xs text-muted-foreground">Escolha a quantidade de questões e matéria para treinar livremente</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="h-8 rounded-lg border border-border bg-background text-xs px-2.5 py-1 text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">Todas as Matérias</option>
              {availableSubjects.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select
              value={targetCount}
              onChange={(e) => setTargetCount(Number(e.target.value))}
              className="h-8 rounded-lg border border-border bg-background text-xs px-2.5 py-1 text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value={5}>5 Questões</option>
              <option value={10}>10 Questões</option>
              <option value={15}>15 Questões</option>
              <option value={20}>20 Questões</option>
            </select>

            <button
              type="button"
              onClick={handleStartExtraSession}
              className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors flex items-center gap-1.5"
            >
              <BookOpen className="size-3.5" />
              Gerar Sessão Extra
            </button>
          </div>
        </CardContent>
      </Card>

      {total > 0 && question && (
        <>
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium">Quiz ({current + 1} de {total}) — {question.subject}</span>
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
        </>
      )}
    </div>
  )
}
