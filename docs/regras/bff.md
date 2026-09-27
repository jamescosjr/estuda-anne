# Regras de Negócio — Backend For Frontend (`apps/bff`)

> **Fonte de verdade escrita** (Capítulo 5 — *Cercando a IA*).
> Regras operacionais e de agregação do BFF.
> Toda regra tem **ID**, sintaxe **EARS**, **Código**, **Teste**, **Confiança** (`verified` / `inferred`), **Dono** e **Data**.

---

### RN-BFF-001 — Propagação Obrigatória de Correlation ID (`cid`)
- **EARS**:
  `WHEN uma requisição HTTP for recebida no BFF THE SYSTEM SHALL capturar o cabeçalho 'x-correlation-id' IF o cabeçalho estiver ausente THEN THE SYSTEM SHALL gerar um UUID v4 novo THE SYSTEM SHALL injetar o correlationId no request context, propagá-lo para os serviços downstream (study-engine, auth) e devolvê-lo no cabeçalho de resposta HTTP`
- **Código**: `apps/bff/src/index.ts` (hook `onRequest`)
- **Teste**: `apps/bff/tests/`
- **Confiança**: `verified`
- **Dono**: Observabilidade / Tech Lead
- **Última revisão**: 2026-09-26

---

### RN-BFF-002 — Validação e Sanitização de Origem (CORS)
- **EARS**:
  `WHEN uma requisição cross-origin for recebida THE SYSTEM SHALL validar a origem contra a allowlist configurada (domínio oficial de produção e localhost de desenvolvimento) IF a origem não pertencer à allowlist THEN THE SYSTEM SHALL rejeitar a requisição com erro de CORS imediato`
- **Código**: `apps/bff/src/index.ts`
- **Teste**: `apps/bff/tests/`
- **Confiança**: `verified`
- **Dono**: Segurança / Tech Lead
- **Última revisão**: 2026-09-26
