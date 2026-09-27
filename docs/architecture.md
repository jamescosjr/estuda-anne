# Arquitetura Técnica — Estuda Anne

> **Fonte:** Documentação de referência de camadas (Casa REPO).
> **Padrão:** DDD Linear (Domain-Driven Design Linear) em Monorepo (pnpm + Turborepo).

---

## 1. Topologia do Monorepo

```
estuda-anne/
├── apps/
│   ├── auth/           # Microserviço de autenticação e sessão de estudantes
│   ├── bff/            # Backend For Frontend (Fastify): agregação, CORS e injeção de correlationId
│   ├── frontend/       # Aplicação web do estudante (Next.js + Tailwind CSS)
│   ├── metrics/        # Serviço de telemetria e agregação de métricas
│   └── study-engine/   # Núcleo de IA pedagógica, agendamento de estudos e flashcards (DDD Linear)
├── packages/
│   └── shared/         # Tipos compartilhados, constantes e DTOs de contrato
└── docs/               # Documentação viva de engenharia (regras, ADRs, DoR, debug-prod)
```

---

## 2. Camadas do DDD Linear (`study-engine` e `bff`)

```
src/
├── application/     # HTTP, Controllers, Rotas, Middlewares, DTOs de entrada/saída. ZERO regra de negócio.
├── domain/          # Entidades, Agregados, Use Cases, Value Objects e Ports (Interfaces). ZERO I/O ou banco.
└── infrastructure/  # Repositórios MongoDB, Adapters Gemini/Whisper, Storage R2/S3, Telemetria.
```

### Regras Estritas de Dependência
1. `domain` é 100% isolado de I/O externo. NUNCA importa `application` nem `infrastructure`.
2. Qualquer dependência externa exigida pelo `domain` deve ser uma porta (interface) em `src/domain/ports/`.
3. `infrastructure` implementa as portas declaradas no `domain`.
4. `application` orquestra a requisição HTTP e despacha para os use cases de `domain`.
