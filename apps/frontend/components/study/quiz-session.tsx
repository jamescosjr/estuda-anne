'use client'

import { useState, useEffect } from 'react'
import { HelpCircle, Sparkles, BookOpen, Loader2 } from 'lucide-react'
import { type QuizQuestion } from '@/lib/mock-data'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { QuizCard } from './quiz-card'
import { useAuth } from '@/lib/auth-context'
import { getApiUrl } from '@/lib/api-config'
import { fetchJson, shuffleInPlace } from '@/lib/http'

const SEEN_QUIZ_KEY = 'estuda-anne.quiz.seen-ids'

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
    {
      prompt: 'Qual é a integral definida de f(x) = 2x no intervalo de x = 0 a x = 3?',
      options: [
        { id: 'a', text: '9' },
        { id: 'b', text: '6' },
        { id: 'c', text: '18' },
        { id: 'd', text: '12' },
      ],
      correctId: 'a',
      explanation: 'A primitiva de 2x é x². Avaliando no limite superior (3² = 9) e inferior (0² = 0), a resposta é 9 - 0 = 9.',
    },
    {
      prompt: 'Pelo Teorema do Valor Médio, se f é contínua em [a,b] e derivável em (a,b), o que se garante sobre a derivada f\'(c)?',
      options: [
        { id: 'a', text: 'Existe c ∈ (a,b) tal que f\'(c) = (f(b) - f(a)) / (b - a).' },
        { id: 'b', text: 'f\'(c) = 0 obrigatoriamente para todo c.' },
        { id: 'c', text: 'A derivada f\'(c) deve ser estritamente positiva.' },
        { id: 'd', text: 'f(c) é sempre igual a zero no ponto médio.' },
      ],
      correctId: 'a',
      explanation: 'O Teorema do Valor Médio garante a existência de ao menos um ponto c cuja reta tangente é paralela à reta secante que une os extremos.',
    },
    {
      prompt: 'Qual é o limite lim_{x → 0} (sin(x) / x)?',
      options: [
        { id: 'a', text: '1' },
        { id: 'b', text: '0' },
        { id: 'c', text: 'Infinito (∞)' },
        { id: 'd', text: 'Indeterminado' },
      ],
      correctId: 'a',
      explanation: 'Trata-se de um limite fundamental do cálculo, demonstrável geometricamente pelo Teorema do Confronto (Sanduíche).',
    },
    {
      prompt: 'Qual é a regra da cadeia para a derivada da função composta h(x) = f(g(x))?',
      options: [
        { id: 'a', text: 'h\'(x) = f\'(g(x)) · g\'(x)' },
        { id: 'b', text: 'h\'(x) = f\'(x) + g\'(x)' },
        { id: 'c', text: 'h\'(x) = f\'(x) · g\'(x)' },
        { id: 'd', text: 'h\'(x) = f(g\'(x))' },
      ],
      correctId: 'a',
      explanation: 'A Regra da Cadeia estabelece que a derivada de f(g(x)) é o produto da derivada da função externa f\' avaliada em g(x) pela derivada da interna g\'(x).',
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
    {
      prompt: 'Onde ocorre o Ciclo de Krebs (Ciclo do Ácido Cítrico) na célula eucariótica?',
      options: [
        { id: 'a', text: 'Na matriz mitocondrial.' },
        { id: 'b', text: 'No citoplasma / citossol.' },
        { id: 'c', text: 'No lúmen do retículo endoplasmático.' },
        { id: 'd', text: 'No espaço intermembranas.' },
      ],
      correctId: 'a',
      explanation: 'As enzimas do Ciclo de Krebs estão situadas solúveis na matriz mitocondrial (com exceção da succinato desidrogenase).',
    },
    {
      prompt: 'Qual é o papel primário das enzimas no metabolismo bioquímico?',
      options: [
        { id: 'a', text: 'Acelerar reações diminuindo a energia de ativação sem alterar o equilíbrio.' },
        { id: 'b', text: 'Fornecer energia térmica para quebrar ligações covalentes.' },
        { id: 'c', text: 'Aumentar a variação de energia livre de Gibbs (ΔG).' },
        { id: 'd', text: 'Consumir reagentes irreversivelmente durante o processo.' },
      ],
      correctId: 'a',
      explanation: 'Enzimas são catalisadores biológicos que aumentam a velocidade das reações reduzindo a energia do estado de transição.',
    },
    {
      prompt: 'O que caracteriza a estrutura terciária de uma proteína?',
      options: [
        { id: 'a', text: 'O enovelamento tridimensional completo de uma única cadeia polipeptídica.' },
        { id: 'b', text: 'A sequência linear exata de aminoácidos unidos por ligações peptídicas.' },
        { id: 'c', text: 'A associação de duas ou mais subunidades polipeptídicas separadas.' },
        { id: 'd', text: 'Os arranjos locais em alfa-hélice e folha-beta.' },
      ],
      correctId: 'a',
      explanation: 'A estrutura terciária envolve interações hydrophobic, pontes de dissulfeto, ligações iônicas e pontes de H entre cadeias R.',
    },
    {
      prompt: 'Qual molécula atua como aceitadora final de elétrons na cadeia de transporte de elétrons aeróbica?',
      options: [
        { id: 'a', text: 'Oxigênio molecular (O₂).' },
        { id: 'b', text: 'Dióxido de carbono (CO₂).' },
        { id: 'c', text: 'NADH.' },
        { id: 'd', text: 'Glicose.' },
      ],
      correctId: 'a',
      explanation: 'O O₂ recebe os elétrons finais no Complexo IV e combina-se com prótons H⁺ para formar água (H₂O).',
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
    {
      prompt: 'Qual estrutura de dados opera sob o princípio LIFO (Last In, First Out)?',
      options: [
        { id: 'a', text: 'Pilha (Stack)' },
        { id: 'b', text: 'Fila (Queue)' },
        { id: 'c', text: 'Lista Encadeada (LinkedList)' },
        { id: 'd', text: 'Tabela Hash (HashTable)' },
      ],
      correctId: 'a',
      explanation: 'Na Pilha (Stack), o último elemento inserido (push) é obrigatoriamente o primeiro a ser removido (pop).',
    },
    {
      prompt: 'Qual é o desempenho assintótico médio do algoritmo de ordenação QuickSort?',
      options: [
        { id: 'a', text: 'O(n log n)' },
        { id: 'b', text: 'O(n²)' },
        { id: 'c', text: 'O(n)' },
        { id: 'd', text: 'O(log n)' },
      ],
      correctId: 'a',
      explanation: 'O QuickSort possui complexidade média O(n log n) usando a estratégia de divisão e conquista com pivô.',
    },
    {
      prompt: 'Em uma Tabela Hash, qual mecanismo é comumente utilizado para resolver colisões?',
      options: [
        { id: 'a', text: 'Encadeamento separado (Chaining) ou Endereçamento Aberto.' },
        { id: 'b', text: 'Ordenação prévia por MergeSort.' },
        { id: 'c', text: 'Remoção do elemento anterior.' },
        { id: 'd', text: 'Inversão da chave de busca.' },
      ],
      correctId: 'a',
      explanation: 'Colisões na Tabela Hash são resolvidas via listas encadeadas (chaining) no mesmo bucket ou por sondagem linear/quadrática.',
    },
    {
      prompt: 'O que diferencia uma Árvore Binária de Busca (BST) de uma árvore binária comum?',
      options: [
        { id: 'a', text: 'Valores à esquerda do nó são menores e à direita são maiores que a chave do nó.' },
        { id: 'b', text: 'Todos os nós folha devem estar estritamente no mesmo nível.' },
        { id: 'c', text: 'Cada nó só pode ter no máximo um nó filho.' },
        { id: 'd', text: 'Os elementos são armazenados em ordem cronológica de inserção.' },
      ],
      correctId: 'a',
      explanation: 'A propriedade fundamental da BST exige que subárvores esquerdas contenham chaves menores e subárvores direitas chaves maiores.',
    },
  ],
}

function generateAcademicQuizzes(subjects: string[], targetCount = 5, subjectFilter = 'all'): QuizQuestion[] {
  const selectedSubjects = (!subjects || subjects.length === 0)
    ? ['Cálculo I', 'Bioquímica', 'Algoritmos e Estruturas de Dados']
    : (subjectFilter !== 'all' ? [subjectFilter] : subjects)

  const list: QuizQuestion[] = []
  const usedPrompts = new Set<string>()

  // 1. Coleta os templates predefinidos disponíveis para as matérias selecionadas
  for (const sub of selectedSubjects) {
    const lowerSub = sub.toLowerCase()
    const matchKey = Object.keys(subjectQuestionTemplates).find((k) => lowerSub.includes(k))
    if (matchKey && subjectQuestionTemplates[matchKey]) {
      for (const t of subjectQuestionTemplates[matchKey]) {
        if (!usedPrompts.has(t.prompt.toLowerCase())) {
          usedPrompts.add(t.prompt.toLowerCase())
          list.push({
            id: `qz-${sub}-${list.length}`,
            subject: sub,
            prompt: t.prompt,
            options: t.options,
            correctId: t.correctId,
            explanation: t.explanation,
          })
          if (list.length >= targetCount) break
        }
      }
    }
    if (list.length >= targetCount) break
  }

  // 2. Se o número desejado for maior do que os templates estáticos, gera questões com tópicos inéditos e variações ricas
  const extraTopics: Record<string, { prompt: string; options: { id: string; text: string }[]; correctId: string; explanation: string }[]> = {
    'cálculo': [
      {
        prompt: 'Em equações diferenciais ordinárias (EDO) separáveis, qual é a primeira etapa de resolução?',
        options: [
          { id: 'a', text: 'Isolar os termos de y com dy em um lado e de x com dx no outro.' },
          { id: 'b', text: 'Calcular a segunda derivada de ambas as variáveis.' },
          { id: 'c', text: 'Igualar a constante de integração a zero imediatamente.' },
          { id: 'd', text: 'Aplicar a regra da cadeia para derivadas parciais.' },
        ],
        correctId: 'a',
        explanation: 'A separação de variáveis permite integrar f(y)dy = g(x)dx diretamente em ambos os lados.',
      },
      {
        prompt: 'Qual a interpretação física da segunda derivada f\'\'(t) da função posição de uma partícula em relação ao tempo t?',
        options: [
          { id: 'a', text: 'A aceleração instantânea da partícula.' },
          { id: 'b', text: 'A velocidade média do movimento.' },
          { id: 'c', text: 'O deslocamento total percorrido.' },
          { id: 'd', text: 'A energia potencial acumulada.' },
        ],
        correctId: 'a',
        explanation: 'A primeira derivada é a velocidade e a segunda derivada reflete a taxa de variação da velocidade, que é a aceleração.',
      },
    ],
    'bioquímica': [
      {
        prompt: 'Qual é o papel do sistema tampão bicarbonato no sangue humano?',
        options: [
          { id: 'a', text: 'Manter o pH sanguíneo em torno de 7.4 contra variações ácidas e básicas.' },
          { id: 'b', text: 'Transportar glicose para o tecido adiposo.' },
          { id: 'c', text: 'Sintetizar hormônios esteroides no córtex adrenal.' },
          { id: 'd', text: 'Inativar radicais livres de oxigênio.' },
        ],
        correctId: 'a',
        explanation: 'O tampão H₂CO₃/HCO₃⁻ equilibra os níveis de CO₂ e H⁺, estabilizando o pH plasmático fisiológico.',
      },
    ],
    'algoritmos': [
      {
        prompt: 'Em teoria dos grafos, qual a diferença entre o algoritmo BFS (Busca em Largura) e DFS (Busca em Profundidade)?',
        options: [
          { id: 'a', text: 'BFS utiliza Fila (Queue) e explora níveis vizinhos; DFS utiliza Pilha (Stack) ou recursão.' },
          { id: 'b', text: 'BFS é exclusivo para grafos ponderados; DFS apenas para árvores ternárias.' },
          { id: 'c', text: 'DFS encontra obrigatoriamente o caminho mínimo em grafos não ponderados.' },
          { id: 'd', text: 'Ambos possuem complexidades assintóticas distintas sem sobreposição.' },
        ],
        correctId: 'a',
        explanation: 'BFS expande em formato de ondas usando Fila, sendo ideal para menor caminho sem pesos. DFS aprofunda o ramo até a folha usando Pilha.',
      },
    ],
  }

  let fillIdx = 0
  while (list.length < targetCount) {
    const sub = selectedSubjects[fillIdx % selectedSubjects.length]
    const lowerSub = sub.toLowerCase()
    const matchKey = Object.keys(extraTopics).find((k) => lowerSub.includes(k))

    if (matchKey && extraTopics[matchKey] && extraTopics[matchKey].length > 0) {
      const extraList = extraTopics[matchKey]
      const candidate = extraList[fillIdx % extraList.length]
      if (!usedPrompts.has(candidate.prompt.toLowerCase())) {
        usedPrompts.add(candidate.prompt.toLowerCase())
        list.push({
          id: `qz-ext-${sub}-${list.length}`,
          subject: sub,
          prompt: candidate.prompt,
          options: candidate.options,
          correctId: candidate.correctId,
          explanation: candidate.explanation,
        })
      } else {
        // Gera variação estruturada inédita sem repetição
        const uniquePrompt = `[Questão Prática de ${sub} — Tópico ${list.length + 1}] Analise a aplicação de ${sub} na resolução de problemas complexos:`
        if (!usedPrompts.has(uniquePrompt.toLowerCase())) {
          usedPrompts.add(uniquePrompt.toLowerCase())
          list.push({
            id: `qz-gen-${sub}-${list.length}`,
            subject: sub,
            prompt: uniquePrompt,
            options: [
              { id: 'a', text: `Consolidação dos fundamentos analíticos e Teoremas de ${sub}.` },
              { id: 'b', text: `Desconsideração das hipóteses de contiguidade de ${sub}.` },
              { id: 'c', text: `Aplicação restrita a dados estáticos sem validação.` },
              { id: 'd', text: `Redução do tempo de execução sem garantia de convergência.` },
            ],
            correctId: 'a',
            explanation: `A aplicação rigorosa de ${sub} amplia a capacidade analítica e previne falhas conceituais nos exames.`,
          })
        }
      }
    } else {
      const uniquePrompt = `[Questão de Avaliação — ${sub} #${list.length + 1}] Assinale a afirmativa correta sobre os pilares fundamentais de ${sub}:`
      if (!usedPrompts.has(uniquePrompt.toLowerCase())) {
        usedPrompts.add(uniquePrompt.toLowerCase())
        list.push({
          id: `qz-gen-${sub}-${list.length}`,
          subject: sub,
          prompt: uniquePrompt,
          options: [
            { id: 'a', text: `Compreensão profunda das definições e resolução sistemática de exercícios de ${sub}.` },
            { id: 'b', text: `Memorização mecânica sem interpretação dos conceitos centrais.` },
            { id: 'c', text: `Substituição da teoria pela intuição empírica sem prova.` },
            { id: 'd', text: `Nenhuma das proposições acadêmicas se aplica a esta disciplina.` },
          ],
          correctId: 'a',
          explanation: `O aprendizado ativo combinado com resolução de problemas assegura domínio nos exames de ${sub}.`,
        })
      }
    }
    fillIdx++
  }

  return list
}

function readSeenQuizIds(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.sessionStorage.getItem(SEEN_QUIZ_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

function rememberSeenQuizIds(ids: string[]) {
  if (typeof window === 'undefined') return
  const seen = readSeenQuizIds()
  ids.forEach((id) => seen.add(id))
  window.sessionStorage.setItem(SEEN_QUIZ_KEY, JSON.stringify([...seen]))
}

function pickUnseenQuestions(pool: QuizQuestion[], count: number): QuizQuestion[] {
  const seen = readSeenQuizIds()
  const unseen = shuffleInPlace(pool.filter((q) => !seen.has(q.id)))
  const rest = shuffleInPlace(pool.filter((q) => seen.has(q.id)))
  const selected = [...unseen, ...rest].slice(0, Math.min(count, pool.length))
  rememberSeenQuizIds(selected.map((q) => q.id))
  return selected
}

function randomizeQuestionOptions(q: QuizQuestion): QuizQuestion {
  if (!q.options || q.options.length <= 1) return q;

  const correctOptionText = q.options.find((o) => o.id === q.correctId)?.text;
  if (!correctOptionText) return q;

  const shuffledTextList = [...q.options.map((o) => o.text)];
  shuffleInPlace(shuffledTextList);

  const optionIds = ['a', 'b', 'c', 'd', 'e'];
  const newOptions = shuffledTextList.map((text, idx) => ({
    id: optionIds[idx] || String(idx),
    text,
  }));

  const newCorrectOption = newOptions.find((o) => o.text === correctOptionText);

  return {
    ...q,
    options: newOptions,
    correctId: newCorrectOption ? newCorrectOption.id : 'a',
  };
}

function mapApiQuestion(question: any, subject: string, isNew = false): QuizQuestion {
  return {
    id: question.id,
    subject: question.subject || subject || 'Quiz',
    prompt: question.prompt,
    options: (question.options || []).map((text: string, optionIdx: number) => ({
      id: String(optionIdx),
      text,
    })),
    correctId: String(question.correctAnswerIndex ?? 0),
    explanation: question.explanation || '',
    isNew,
  }
}

const DEFAULT_SUBJECTS = ['Cálculo I', 'Bioquímica', 'Algoritmos e Estruturas de Dados']

export function QuizSession() {
  const { user } = useAuth()
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [questionPool, setQuestionPool] = useState<QuizQuestion[]>([])
  const [usingDemo, setUsingDemo] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [adaptiveHint, setAdaptiveHint] = useState<string | null>(null)
  const [sessionMeta, setSessionMeta] = useState<{ generated: number; mixed: number } | null>(null)
  const [current, setCurrent] = useState(0)
  const [targetCount, setTargetCount] = useState<number>(5)
  const [subjectFilter, setSubjectFilter] = useState<string>('all')

  const userSubjectsKey = user?.subjects?.join(',') || ''
  const availableSubjects = user?.subjects && user.subjects.length > 0
    ? user.subjects
    : DEFAULT_SUBJECTS

  useEffect(() => {
    async function loadQuizzes() {
      setLoadError(null)
      const studentId = user?.id || 'guest-student'
      const topic = subjectFilter !== 'all' ? subjectFilter : undefined
      try {
        const params = new URLSearchParams({
          studentId,
          count: String(targetCount),
        })
        if (topic) params.set('topic', topic)
        const { ok, data } = await fetchJson<{
          questions?: any[]
          adaptiveHint?: string
          bankCount?: number
        }>(`${getApiUrl()}/api/quizzes/session?${params.toString()}`)

        if (ok && Array.isArray(data?.questions) && data.questions.length > 0) {
          const mapped = data.questions.map((question) => mapApiQuestion(question, question.subject, false))
          setUsingDemo(false)
          setQuestionPool(mapped)
          setQuestions(mapped.map(randomizeQuestionOptions))
          setAdaptiveHint(data.adaptiveHint || null)
          setSessionMeta({ generated: 0, mixed: data.bankCount ?? mapped.length })
          setCurrent(0)
          rememberSeenQuizIds(mapped.map((q) => q.id))
          return
        }
        if (!ok) {
          setLoadError('Não foi possível montar o quiz agora. Tente de novo em instantes.')
        }
      } catch {
        setLoadError('Não foi possível montar o quiz agora. Tente de novo em instantes.')
      }
      setUsingDemo(true)
      setQuestionPool([])
      setAdaptiveHint(null)
      setSessionMeta(null)
      const rawAcademic = generateAcademicQuizzes(availableSubjects, targetCount, subjectFilter)
      setQuestions(rawAcademic.map(randomizeQuestionOptions))
      setCurrent(0)
    }
    loadQuizzes()
  }, [userSubjectsKey, targetCount, subjectFilter, user?.id])

  async function handleStartExtraSession() {
    setCurrent(0)
    setLoadError(null)
    setGenerating(true)

    try {
      const { ok, data } = await fetchJson<{
        questions?: any[]
        quiz?: any
        newQuestionIds?: string[]
        generatedCount?: number
        mixedBankCount?: number
        adaptiveHint?: string
        message?: string
      }>(`${getApiUrl()}/api/quizzes/extra-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: user?.id || 'guest-student',
          topic: subjectFilter !== 'all' ? subjectFilter : undefined,
          count: targetCount,
          excludeIds: [...readSeenQuizIds()],
        }),
      })

      const payloadQuestions = data?.questions?.length ? data.questions : data?.quiz?.questions
      if (ok && Array.isArray(payloadQuestions) && payloadQuestions.length > 0) {
        const newIds = new Set(data?.newQuestionIds || [])
        const mapped = payloadQuestions.map((q: any) =>
          mapApiQuestion(q, q.subject || data?.quiz?.title || 'Quiz Extra', newIds.has(q.id)),
        )
        setQuestionPool(mapped)
        setQuestions(mapped.map(randomizeQuestionOptions))
        setUsingDemo(false)
        setAdaptiveHint(data?.adaptiveHint || null)
        setSessionMeta({
          generated: data?.generatedCount ?? mapped.filter((q) => q.isNew).length,
          mixed: data?.mixedBankCount ?? 0,
        })
        rememberSeenQuizIds(mapped.map((q) => q.id))
        return
      }

      setLoadError(data?.message || 'Não foi possível gerar um lote novo agora. Tente novamente.')
    } catch {
      setLoadError('Falha ao gerar a sessão extra. Verifique a conexão e tente de novo.')
    } finally {
      setGenerating(false)
    }
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
              <p className="text-sm font-semibold text-foreground">Sessão extra adaptativa</p>
              <p className="text-xs text-muted-foreground">Lê o acervo no banco, prioriza tópicos fracos e só gera o que faltar</p>
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
              disabled={generating}
              className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors flex items-center gap-1.5 disabled:opacity-60"
            >
              {generating ? <Loader2 className="size-3.5 animate-spin" /> : <BookOpen className="size-3.5" />}
              {generating ? 'Gerando lote...' : 'Gerar Sessão Extra'}
            </button>
          </div>
        </CardContent>
      </Card>

      {sessionMeta && !usingDemo && (
        <p className="text-xs text-muted-foreground">
          Lote ativo: {sessionMeta.generated} questão(ões) novas
          {sessionMeta.mixed > 0 ? ` misturadas com ${sessionMeta.mixed} do acervo` : ' do acervo persistido'}.
        </p>
      )}

      {adaptiveHint && !usingDemo && (
        <p className="text-xs text-foreground/80 rounded-lg border border-border bg-muted/40 px-3 py-2">
          {adaptiveHint}
        </p>
      )}

      {loadError && (
        <p className="text-xs text-destructive">{loadError}</p>
      )}

      {usingDemo && (
        <p className="text-xs text-muted-foreground">
          Demonstração: estas questões não vieram do seu material. Envie arquivos em Materiais para gerar quizzes persistidos.
        </p>
      )}

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
