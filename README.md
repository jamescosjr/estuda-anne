# 🎓 Estuda Anne — SaaS Educacional Impulsionado por IA

> **SaaS educacional focado em estudantes universitárias que buscam autonomia, agilidade e estudo autônomo de baixo custo.**

[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Turborepo](https://img.shields.io/badge/Turborepo-Monorepo-EF4444?style=for-the-badge&logo=turborepo&logoColor=white)](https://turbo.build/repo)
[![pnpm](https://img.shields.io/badge/pnpm-v9.15-F69220?style=for-the-badge&logo=pnpm&logoColor=white)](https://pnpm.io/)
[![Docker](https://img.shields.io/badge/Docker-Containers-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Gemini AI](https://img.shields.io/badge/Google_Gemini-AI_Engine-8E75B2?style=for-the-badge&logo=google-gemini&logoColor=white)](https://deepmind.google/technologies/gemini/)

---

## 📌 Visão Geral do Projeto

O **Estuda Anne** foi projetado para transformar o ciclo de aprendizado universitário através do uso inteligente de IA generativa e metodologias comprovadas de retenção (como repetição espaçada, resumos dinâmicos, geração autônoma de quizzes e flashcards). 

O projeto adota uma arquitetura em **Monorepo distribuído** com microsserviços orientados a **DDD Linear (Domain-Driven Design)**, garantindo desacoplamento, testabilidade e alta escalabilidade com custo computacional otimizado.

---

## 🏗️ Arquitetura do Monorepo & Serviços

O projeto utiliza **Turborepo** e **pnpm Workspaces** para gerenciar as aplicações e pacotes compartilhados:

```text
estuda-anne/
├── apps/
│   ├── frontend/         # Interface Web Responsiva (Next.js 15, React, Tailwind CSS)
│   ├── bff/              # Backend For Frontend (Agrega chamadas da UI para microsserviços)
│   ├── study-engine/     # Motor Core de IA (Geração de resumos, quizzes, flashcards, R2 Storage)
│   └── auth/             # Serviço de Autenticação, Usuários e Gestão de Sessões JWT
├── packages/
│   └── shared/           # Tipos TypeScript compartilhados, DTOs e Utilitários comuns
├── nginx/                # Proxy Reverso com terminação SSL/TLS e roteamento
├── .agents/              # Governança e Especificações da Equipe de Agentes de IA
├── docker-compose.yml    # Orquestração de Containers para Desenvolvimento e Produção
└── turbo.json            # Configurações de Pipelines de Build e Cache do Turborepo
```

### 📐 Padrão DDD Linear Obrigatório (`apps/bff` e `apps/study-engine`)

Cada serviço de backend é estruturado de forma estrita em 3 camadas de responsabilidade:

```text
src/
├── application/     # HTTP (Controllers, Rotas, Middlewares). ZERO regra de negócio.
├── domain/          # Entidades, Casos de Uso (Services) e Ports/Interfaces. ZERO dependência externa.
└── infrastructure/  # MongoDB, Clientes de IA (Gemini/Whisper), Cloudflare R2, Repositórios Concretos.
```

---

## 🤖 Governança de IA & Sistema de Agentes

O desenvolvimento e manutenção do projeto são guiados por uma equipe de **agentes autônomos especificados em `.agents/`**, sob liderança do agente **Coordinator**:

| Agente | Papel | Responsabilidade Principal |
| :--- | :--- | :--- |
| **Coordinator** | Gerente de Projeto | Orquestra tarefas, valida arquitetura e mantém o foco nas necessidades da estudante (Anne). |
| **agent-po** | Product Owner | Refina histórias de usuário e fatia entregas em requisitos claros de negócio. |
| **agent-architect** | Arquiteto de Software | Garante aderência estrita ao DDD Linear, isolamento do Domain e Schemas de banco performáticos. |
| **agent-qa** | Engenheiro de Qualidade | Aplica TDD estrito: constrói suítes de testes unitários e de integração antes de qualquer implementação. |
| **agent-backend** | Dev Node.js / TypeScript | Implementa Use Cases guiados por contratos e validações rigorosas de domínio. |
| **agent-frontend** | Dev React / Next.js | Constrói a experiência do usuário com interfaces responsivas, fluidas e acessíveis. |
| **agent-ux-journey** | UX Specialist | Valida a jornada completa da estudante em Desktop e Mobile (upload ➔ feedback ➔ estudo). |
| **agent-Anne** | Testes E2E (Playwright) | Personifica a estudante real executando testes end-to-end automatizados em múltiplos viewports. |
| **agent-cleancode** | Revisor de Código | Garante padrões SOLID, DRY, KISS, tipagem estrita e ausência de code smells. |
| **agent-observability-lgtm** | Engenheiro SRE | Instrumenta logs estruturados, métricas e resiliência em chamadas externas de IA. |

---

## 🛠️ Tecnologias Utilizadas

### Core & Frameworks
- **Linguagem**: TypeScript 5.7+ / Node.js 20+
- **Monorepo Manager**: Turborepo & pnpm 9.15+
- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend Framework**: Node.js com Express e arquitetura desacoplada DDD

### Infraestrutura & Dados
- **Banco de Dados**: MongoDB 7.0 (via Mongoose)
- **Armazenamento de Arquivos**: Cloudflare R2 (S3 Compatible Storage API)
- **Engine de IA**: Google Gemini API SDK
- **Proxy & Roteamento**: Nginx Alpine
- **Containerização**: Docker & Docker Compose

---

## 🚀 Como Executar o Projeto

### 📋 Pré-requisitos

Certifique-se de possuir instalado em sua máquina:
- **Node.js** >= `20.0.0`
- **pnpm** >= `9.15.0` (`npm install -g pnpm`)
- **Docker** e **Docker Compose**

### 1️⃣ Clonar o Repositório & Instalar Dependências

```bash
git clone https://github.com/jamescosjr/estuda-anne.git
cd estuda-anne
pnpm install
```

### 2️⃣ Configurar Variáveis de Ambiente

Crie o arquivo `.env` na raiz baseado no modelo fornecido:

```bash
cp .env.example .env
```

Preencha suas credenciais locais e chaves da API (ex: `GEMINI_API_KEY`, `CLOUDFLARE_R2_*`).

### 3️⃣ Iniciar Serviços via Docker (Banco de Dados e Infraestrutura)

```bash
docker compose up -d mongodb
```

Ou suba a infraestrutura completa em containers:

```bash
docker compose up -d
```

### 4️⃣ Executar em Modo de Desenvolvimento

Para rodar todos os microsserviços simultaneamente com Hot-Reload via Turborepo:

```bash
pnpm dev
```

As aplicações estarão disponíveis em:
- **Frontend**: `http://localhost:3000`
- **BFF (Backend For Frontend)**: `http://localhost:3001`
- **Study Engine**: `http://localhost:3002`
- **Auth Service**: `http://localhost:3005`

---

## 🧪 Testes e Qualidade de Código

O repositório impõe execução contínua de testes automatizados e linting:

```bash
# Executar suíte completa de testes no monorepo
pnpm test

# Executar linter em todos os pacotes
pnpm lint

# Limpar caches de build do Turbo
pnpm clean
```

---

## 🔄 Pipeline de CI/CD (GitHub Actions & Deploy)

O projeto conta com integração e entrega contínuas configuradas em `.github/workflows/ci-cd.yml`:

1. **Integracão Contínua (CI)**:
   - Disparada em push e PRs para as branches `main` e `develop`.
   - Executa instalação estrita de dependências (`pnpm install --frozen-lockfile`), suíte de testes (`pnpm test`) e validação de build (`pnpm build`).

2. **Entrega Contínua (CD)**:
   - Disparada automaticamente no merge/push na branch `main`.
   - Conecta via SSH à VPS de produção, atualiza o código fonte, re-executa o `docker compose up -d --build` e realiza prune preventivo.

---

## 📄 Licença

Este projeto é desenvolvido para fins educacionais e comerciais sob a licença proprietária de **Estuda Anne**. Todos os direitos reservados.
