import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter, Sora } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://estuda-anne.app'),
  title: 'Estuda Anne — Assistente Acadêmica com IA',
  description:
    'SaaS educacional universitário movido a IA com a avatar Anne. Organize materiais, resolva quizzes interativos, revise flashcards e receba orientação pedagógica.',
  icons: {
    icon: '/icon.jpg',
    shortcut: '/anne-shield-icon.jpg',
    apple: '/apple-icon.jpg',
  },
  openGraph: {
    title: 'Estuda Anne — Sua Assistente Acadêmica Inteligente',
    description:
      'Aumente seus rendimentos universitários com auxílio da Anne. Resumos, quizzes, flashcards e mentoria pedagógica adaptativa com IA.',
    url: 'https://estuda-anne.app',
    siteName: 'Estuda Anne',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Estuda Anne — Assistente de Estudos com IA',
      },
    ],
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Estuda Anne — Sua Assistente Acadêmica Inteligente',
    description: 'SaaS de assistência de estudos universitários movido a IA com a Anne.',
    images: ['/og-image.jpg'],
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#1D2A44' },
    { media: '(prefers-color-scheme: dark)', color: '#0F172A' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className={`bg-background ${inter.variable} ${sora.variable}`}>
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
