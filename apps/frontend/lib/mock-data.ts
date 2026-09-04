export type TabId = 'dashboard' | 'materials' | 'quiz' | 'flashcards' | 'schedule' | 'profile' | 'admin'

export type UploadStatus = 'processing' | 'done' | 'failed'

export interface CourseProgress {
  id: string
  name: string
  color: string
  progress: number
  topics: number
  reviewed: number
}

export interface PendingReview {
  id: string
  subject: string
  type: 'quiz' | 'flashcards'
  count: number
  estimatedMinutes: number
}

export interface ScheduleEvent {
  id: string
  day: string
  date: string
  title: string
  subject: string
  type: 'quiz' | 'flashcards' | 'leitura' | 'resumo'
  time: string
  done: boolean
}

export interface UploadItem {
  id: string
  name: string
  kind: 'PDF' | 'PPTX' | 'MP4' | 'MP3'
  size: string
  status: UploadStatus
  detail: string
}

export interface QuizQuestion {
  id: string
  subject: string
  prompt: string
  options: { id: string; text: string }[]
  correctId: string
  explanation: string
}

export interface FlashcardItem {
  id: string
  subject: string
  front: string
  back: string
}

export const courseProgress: CourseProgress[] = [
  { id: 'c1', name: 'Anatomia Humana', color: 'bg-chart-1', progress: 72, topics: 24, reviewed: 17 },
  { id: 'c2', name: 'Bioquímica', color: 'bg-chart-2', progress: 54, topics: 18, reviewed: 10 },
  { id: 'c3', name: 'Farmacologia', color: 'bg-chart-3', progress: 38, topics: 20, reviewed: 8 },
  { id: 'c4', name: 'Fisiologia', color: 'bg-chart-4', progress: 61, topics: 16, reviewed: 10 },
]

export const pendingReviews: PendingReview[] = [
  { id: 'r1', subject: 'Anatomia Humana', type: 'flashcards', count: 24, estimatedMinutes: 12 },
  { id: 'r2', subject: 'Bioquímica', type: 'quiz', count: 10, estimatedMinutes: 15 },
  { id: 'r3', subject: 'Fisiologia', type: 'flashcards', count: 15, estimatedMinutes: 8 },
]

export const scheduleEvents: ScheduleEvent[] = [
  { id: 'e1', day: 'Hoje', date: '3 set', title: 'Revisão de flashcards — Sistema nervoso', subject: 'Anatomia Humana', type: 'flashcards', time: '18:00', done: false },
  { id: 'e2', day: 'Hoje', date: '3 set', title: 'Quiz gerado por IA — Metabolismo', subject: 'Bioquímica', type: 'quiz', time: '20:30', done: false },
  { id: 'e3', day: 'Amanhã', date: '4 set', title: 'Leitura guiada — Potencial de ação', subject: 'Fisiologia', type: 'leitura', time: '09:00', done: false },
  { id: 'e4', day: 'Amanhã', date: '4 set', title: 'Resumo automático — Anti-inflamatórios', subject: 'Farmacologia', type: 'resumo', time: '14:00', done: false },
  { id: 'e5', day: 'Sex', date: '5 set', title: 'Quiz de fixação — Ossos do crânio', subject: 'Anatomia Humana', type: 'quiz', time: '10:00', done: false },
  { id: 'e6', day: 'Sáb', date: '6 set', title: 'Revisão espaçada — Enzimas', subject: 'Bioquímica', type: 'flashcards', time: '16:00', done: false },
]

export const recentUploads: UploadItem[] = [
  { id: 'u1', name: 'Aula 08 — Sistema Nervoso Central.pdf', kind: 'PDF', size: '4,2 MB', status: 'done', detail: '32 flashcards e 12 questões gerados' },
  { id: 'u2', name: 'Metabolismo de Carboidratos.pptx', kind: 'PPTX', size: '9,7 MB', status: 'processing', detail: 'Extraindo tópicos e resumindo slides…' },
  { id: 'u3', name: 'Videoaula — Potencial de Ação.mp4', kind: 'MP4', size: '212 MB', status: 'processing', detail: 'Transcrevendo áudio (68%)' },
  { id: 'u4', name: 'Podcast — Farmacocinética.mp3', kind: 'MP3', size: '38 MB', status: 'done', detail: 'Resumo e 18 flashcards gerados' },
  { id: 'u5', name: 'Resumo digitalizado.pdf', kind: 'PDF', size: '1,1 MB', status: 'failed', detail: 'Arquivo protegido por senha — reenvie sem proteção' },
]

export const quizQuestions: QuizQuestion[] = [
  {
    id: 'q1',
    subject: 'Anatomia Humana',
    prompt: 'Qual estrutura é responsável por conectar os dois hemisférios cerebrais, permitindo a comunicação entre eles?',
    options: [
      { id: 'a', text: 'Cerebelo' },
      { id: 'b', text: 'Corpo caloso' },
      { id: 'c', text: 'Tálamo' },
      { id: 'd', text: 'Bulbo raquidiano' },
    ],
    correctId: 'b',
    explanation:
      'O corpo caloso é o maior feixe de fibras nervosas do cérebro e conecta os hemisférios direito e esquerdo, permitindo a troca de informações entre eles. O tálamo atua como estação de retransmissão sensorial, e o cerebelo coordena movimento e equilíbrio.',
  },
  {
    id: 'q2',
    subject: 'Bioquímica',
    prompt: 'Durante a glicólise, qual é o produto final líquido de moléculas de ATP a partir de uma molécula de glicose?',
    options: [
      { id: 'a', text: '38 ATP' },
      { id: 'b', text: '4 ATP' },
      { id: 'c', text: '2 ATP' },
      { id: 'd', text: '0 ATP' },
    ],
    correctId: 'c',
    explanation:
      'A glicólise consome 2 ATP na fase de investimento e produz 4 ATP na fase de rendimento, resultando em um saldo líquido de 2 ATP por molécula de glicose, além de 2 NADH e 2 piruvatos.',
  },
]

export const flashcards: FlashcardItem[] = [
  {
    id: 'f1',
    subject: 'Anatomia Humana',
    front: 'Quais são as três meninges que envolvem o sistema nervoso central, da mais externa para a mais interna?',
    back: 'Dura-máter (mais externa e resistente), aracnoide-máter (intermediária, com aspecto de teia) e pia-máter (mais interna, aderida ao tecido nervoso).',
  },
  {
    id: 'f2',
    subject: 'Bioquímica',
    front: 'O que é o efeito Bohr e qual sua importância fisiológica?',
    back: 'É a redução da afinidade da hemoglobina pelo oxigênio quando há aumento de CO₂ e queda do pH. Favorece a liberação de O₂ nos tecidos metabolicamente ativos.',
  },
  {
    id: 'f3',
    subject: 'Fisiologia',
    front: 'Defina período refratário absoluto no potencial de ação.',
    back: 'Intervalo em que a membrana não consegue gerar um novo potencial de ação independentemente da intensidade do estímulo, pois os canais de sódio estão inativados.',
  },
]
