'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, RotateCcw, Layers, Sparkles, BookOpen } from 'lucide-react'
import { type FlashcardItem } from '@/lib/mock-data'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Flashcard, type Difficulty } from './flashcard'
import { getApiUrl } from '@/lib/api-config'
import { useAuth } from '@/lib/auth-context'

const academicFlashcardTemplates: Record<string, { front: string; back: string }[]> = {
  'cálculo': [
    {
      front: 'O que representa geometricamente a derivada de uma função f(x) em um ponto x₀?',
      back: 'Representa a inclinação (ou coeficiente angular) da reta tangente ao gráfico da função f(x) no ponto (x₀, f(x₀)).',
    },
    {
      front: 'Qual é o enunciado fundamental do Teorema Fundamental do Cálculo?',
      back: 'Conecta a derivação à integração, estabelecendo que se F é uma primitiva de f contínua em [a,b], então ∫_a^b f(x)dx = F(b) - F(a).',
    },
    {
      front: 'O que é um ponto de inflexão no gráfico de uma função f(x)?',
      back: 'É um ponto onde a concavidade do gráfico muda de sentido (onde a segunda derivada f\'\'(x) troca de sinal ou se anula).',
    },
    {
      front: 'Como a regra de L\'Hôpital é aplicada no cálculo de limites?',
      back: 'Para indeterminações do tipo 0/0 ou ∞/∞, o limite do quociente f(x)/g(x) é igual ao limite do quociente de suas derivadas f\'(x)/g\'(x).',
    },
    {
      front: 'Qual a diferença entre integral definida e integral indefinida?',
      back: 'Integral indefinida representa uma família de funções (primitivas com constante C); a integral definida resulta em um valor numérico que representa área líquida.',
    },
  ],
  'bioquímica': [
    {
      front: 'O que caracteriza a estrutura secundária de uma proteína e quais são seus principais padrões?',
      back: 'Caracteriza-se pelo arranjo espacial local da cadeia polipeptídica mantido por pontes de hidrogênio. Os dois principais padrões são a Alfa-Hélice e a Folha-Beta.',
    },
    {
      front: 'O que é a modulação alostérica em enzimas?',
      back: 'É a regulação da atividade enzimática pela ligação de um efetor em um sítio diferente do sítio ativo (sítio alostérico), alterando a conformação da enzima.',
    },
    {
      front: 'Qual o papel funcional do ATP (Adenosina Trifosfato) no metabolismo?',
      back: 'Atua como a "moeda energética" universal da célula, armazenando energia química em suas ligações anidro de fosfato de alta energia.',
    },
    {
      front: 'Qual a diferença crucial entre fotossíntese e respiração celular?',
      back: 'Fotossíntese sintetiza glicose e O₂ consumindo CO₂, H₂O e luz (anabolismo). Respiração oxidativa degrada glicose e O₂ gerando CO₂, H₂O e ATP (catabolismo).',
    },
    {
      front: 'O que define a desnaturação proteica e quais fatores a provocam?',
      back: 'É a perda da estrutura tridimensional nativa (terciária/secundária) sem quebrar ligações peptídicas, provocada por calor, pH extremo ou reagentes caotrópicos.',
    },
  ],
  'algoritmos': [
    {
      front: 'Qual a principal diferença de funcionamento entre uma estrutura de dados Pilha (Stack) e uma Fila (Queue)?',
      back: 'Pilha opera no sistema LIFO (Last In, First Out — o último a entrar é o primeiro a sair). Fila opera no sistema FIFO (First In, First Out — o primeiro a entrar é o primeiro a sair).',
    },
    {
      front: 'O que define a técnica de programação chamada Divisão e Conquista?',
      back: 'Dividir o problema em subproblemas menores do mesmo tipo, resolvê-los recursivamente e combinar suas soluções para resolver o problema original.',
    },
    {
      front: 'Qual a vantagem da busca em Tabela Hash em relação à busca em Árvore Binária de Busca (BST)?',
      back: 'A Tabela Hash busca em tempo médio constante O(1), enquanto a BST busca em tempo logarítmico O(log n).',
    },
    {
      front: 'Em teoria da computação, o que caracteriza a classe de problemas NP-Completo?',
      back: 'Problemas cuja solução pode ser verificada em tempo polinomial, mas para os quais não se conhece algoritmo polinomial de resolução.',
    },
    {
      front: 'Qual a diferença entre algoritmos gulosos (Greedy) e Programação Dinâmica?',
      back: 'Algoritmos gulosos tomam a escolha ótima local a cada passo sem rever decisões. Programação dinâmica resolve subproblemas sobrepostos armazenando os resultados.',
    },
  ],
}

function generateAcademicFlashcards(subjects: string[], targetCount = 5, subjectFilter = 'all'): FlashcardItem[] {
  const selectedSubjects = (!subjects || subjects.length === 0)
    ? ['Cálculo I', 'Bioquímica', 'Algoritmos e Estruturas de Dados']
    : (subjectFilter !== 'all' ? [subjectFilter] : subjects)

  const list: FlashcardItem[] = []
  const usedFronts = new Set<string>()

  // 1. Coleta cartões dos templates predefinidos
  for (const sub of selectedSubjects) {
    const lowerSub = sub.toLowerCase()
    const matchKey = Object.keys(academicFlashcardTemplates).find((k) => lowerSub.includes(k))
    if (matchKey && academicFlashcardTemplates[matchKey]) {
      for (const t of academicFlashcardTemplates[matchKey]) {
        if (!usedFronts.has(t.front.toLowerCase())) {
          usedFronts.add(t.front.toLowerCase())
          list.push({
            id: `fc-${sub}-${list.length}`,
            subject: sub,
            front: t.front,
            back: t.back,
          })
          if (list.length >= targetCount) break
        }
      }
    }
    if (list.length >= targetCount) break
  }

  // 2. Se a quantidade solicitada for superior aos templates estáticos, gera cartões conceituais inéditos sem repetição
  let fillIdx = 0
  while (list.length < targetCount) {
    const sub = selectedSubjects[fillIdx % selectedSubjects.length]
    const cardNum = list.length + 1
    const uniqueFront = `[Card de Revisão — ${sub} #${cardNum}] Quais são as aplicações práticas essenciais de ${sub} no aprendizado universitário?`

    if (!usedFronts.has(uniqueFront.toLowerCase())) {
      usedFronts.add(uniqueFront.toLowerCase())
      list.push({
        id: `fc-gen-${sub}-${list.length}`,
        subject: sub,
        front: uniqueFront,
        back: `A disciplina de ${sub} desenvolve o raciocínio analítico para resolução de problemas e consolidação de competências técnicas requeridas nos exames.`,
      })
    }
    fillIdx++
  }

  return list
}

const DEFAULT_SUBJECTS = ['Cálculo I', 'Bioquímica', 'Algoritmos e Estruturas de Dados']

export function ReviewSession() {
  const { user } = useAuth()
  const [cards, setCards] = useState<FlashcardItem[]>([])
  const [current, setCurrent] = useState(0)
  const [done, setDone] = useState(false)
  const [targetCount, setTargetCount] = useState<number>(5)
  const [subjectFilter, setSubjectFilter] = useState<string>('all')
  const bffUrl = getApiUrl()

  const studentId = user?.id || 'guest-student'
  const userSubjectsKey = user?.subjects?.join(',') || ''
  const availableSubjects = user?.subjects && user.subjects.length > 0
    ? user.subjects
    : DEFAULT_SUBJECTS

  useEffect(() => {
    async function loadDueCards() {
      try {
        const res = await fetch(`${bffUrl}/api/flashcards/due?studentId=${encodeURIComponent(studentId)}`)
        if (res.ok) {
          const list = await res.json()
          if (Array.isArray(list) && list.length > 0) {
            const mapped: FlashcardItem[] = list.map((fc: any) => ({
              id: fc.id,
              subject: fc.topic || 'Conceito Geral',
              front: fc.front,
              back: fc.back,
            }))
            setCards(mapped)
            return
          }
        }
      } catch (err) {
        // Fallback local
      }

      setCards(generateAcademicFlashcards(availableSubjects, targetCount, subjectFilter))
    }

    loadDueCards()
  }, [bffUrl, studentId, userSubjectsKey, targetCount, subjectFilter])

  function handleStartExtraSession() {
    setCards(generateAcademicFlashcards(availableSubjects, targetCount, subjectFilter))
    setCurrent(0)
    setDone(false)
  }

  async function handleGrade(difficulty: Difficulty) {
    const card = cards[current]
    const ratingMap: Record<Difficulty, number> = {
      easy: 5,
      medium: 3,
      hard: 1,
    }

    try {
      await fetch(`${bffUrl}/api/flashcards/${card.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: ratingMap[difficulty] }),
      })
    } catch {
      // Ignora falhas de conexão em modo offline
    }

    if (current === cards.length - 1) {
      setDone(true)
    } else {
      setCurrent((c) => c + 1)
    }
  }

  function restart() {
    setCurrent(0)
    setDone(false)
  }

  const total = cards.length

  if (done) {
    return (
      <div className="mx-auto w-full max-w-xl flex flex-col gap-5">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-[var(--success)]/12 text-[var(--success)]">
              <CheckCircle2 className="size-7" />
            </span>
            <h2 className="font-display text-xl font-semibold tracking-tight">
              Revisão concluída!
            </h2>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground text-pretty">
              Você revisou {total} flashcards. A Anne reagendou cada card conforme sua dificuldade e
              atualizou seu progresso no cronograma.
            </p>
            <Button onClick={restart} variant="secondary">
              <RotateCcw />
              Revisar novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      {/* Toolbar Sob Demanda (Estudo Extra) */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">Flashcards Extra — Fora do Horário</p>
              <p className="text-xs text-muted-foreground">Escolha a quantidade de cartões e a matéria para praticar</p>
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
              <option value={5}>5 Flashcards</option>
              <option value={10}>10 Flashcards</option>
              <option value={15}>15 Flashcards</option>
              <option value={20}>20 Flashcards</option>
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

      {total > 0 && cards[current] && (
        <>
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium">Revisão espaçada — {cards[current].subject}</span>
              <span className="text-muted-foreground">
                Card {current + 1} de {total}
              </span>
            </div>
            <Progress value={((current + 1) / total) * 100} />
          </div>

          <Flashcard key={cards[current].id} card={cards[current]} onGrade={handleGrade} />
        </>
      )}
    </div>
  )
}
