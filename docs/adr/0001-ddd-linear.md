---
id: ADR-0001
status: accepted
date: 2026-09-26
deciders: agent-architect, coordinator, James
enforced-by: apps/study-engine/tests/domain/Architecture.test.ts
---

# Adotar Arquitetura DDD Linear nos Serviços Backend

## Contexto
O Estuda Anne possui múltiplos serviços de backend (`study-engine`, `bff`, `auth`). O uso intensivo de agentes de código de IA tende a produzir vazamento de responsabilidades (ex: consultas de banco dentro de entidades de domínio, regras de negócio em controllers, ou importação de clientes HTTP/SDKs de nuvem direto nos usecases), degradando a testabilidade e encarecendo a manutenção.

## Decisão
Adotar estritamente a arquitetura **DDD Linear** em 3 camadas unidirecionais com isolamento total do `domain`:
```
src/
├── application/     # HTTP (Controllers, Routes, Middlewares, DTOs). ZERO regra de negócio.
├── domain/          # Entities, Use Cases (Services), Value Objects e Ports (Interfaces). ZERO dependência externa.
└── infrastructure/  # Repositórios concretos (MongoDB), Adapters de IA (Gemini, Whisper), Storage (S3/R2).
```

### Regras de Dependência:
1. `domain` **NUNCA** importa de `application` ou `infrastructure`.
2. `domain` **NUNCA** importa bibliotecas externas de I/O, bancos de dados ou frameworks (ex: `mongodb`, `fastify`, `@aws-sdk`, `express`).
3. Qualquer dependência externa exigida pelo `domain` deve ser declarada como interface em `domain/ports/` e implementada em `infrastructure/`.
4. `application` orquestra a entrada HTTP e chama os use cases do `domain`, nunca executando persistência direta ou chamadas externas de IA.

## Alternativas Rejeitadas
- **Arquitetura em Camadas Tradicional (MVC com Models Anêmicos)** — Rejeitada por acoplar modelos ao banco e permitir vazamento de regras para controllers.
- **Hexagonal/Clean Architecture Completa com Múltiplos Mapeadores Boilerplate** — Rejeitada pelo excesso de arquivos intermediários sem ganho prático para a escala atual do produto.

## Consequências
- **Positivas**:
  - Testes de domínio rodam em milissegundos sem mockar banco de dados real nem subir containers.
  - Regras de negócio protegidas de mudanças de SDK de IA ou banco de dados.
  - O agente de IA tem um mapa de responsabilidades determinístico para gerar novas features.
- **Compromissos**:
  - Exige declaração explícita de portas (interfaces) para repositórios e serviços de IA antes da implementação da infraestrutura.

## Como o Agente Deve Tratar
Ao ver falha no teste de arquitetura (`Architecture.test.ts` acusando violação de ADR-0001):
1. Verifique os imports no arquivo em `src/domain/`.
2. Se houver import de `application` ou `infrastructure`, **REMOVA IMEDIATAMENTE**.
3. Se o caso de uso precisa de persistência ou chamada externa, defina uma interface em `src/domain/ports/` e receba-a via injeção no construtor.
4. Implemente a classe concreta em `src/infrastructure/`.
