# Resiliência contra Timeouts e Bloqueio de Event Loop no Study Engine & BFF — Tasks

> **Regra do método:** Cada tarefa é uma unidade atômica (1 tarefa = 1 teste red -> green -> gate -> commit atômico ≤ 400 linhas).
> O comando do gate é o que decide se a tarefa terminou, não a autoavaliação do agente.

---

### T1: Extração Linear de PDF sem Backtracking e Limite de Streams no `DocumentTextExtractor`
- **What**:
  - Substituir as regexes `/\((?:\\.|[^\\)]){2,}\)\s*Tj/g` e `/\[((?:\\.|[^\]])*)\]\s*TJ/g` em `extractPdfLiteralStrings` por varredura linear segura com limite de comprimento por literal/array, evitando *catastrophic backtracking* em buffers binários densos.
  - Limitar a quantidade e o tamanho de streams inspecionados em `extractTextFromPdfStreams` e `extractTextFromPdfBuffer` para que PDFs grandes/binários terminem sempre em `< 500ms` sem bloquear o Event Loop, preservando a extração de PDFs válidos.
  - Criar teste determinístico em `apps/study-engine/tests/infrastructure/DocumentTextExtractor.test.ts` validando extração de PDF válido (`Tj`/`TJ`) e tempo `< 500ms` em buffer binário adversário/malformado com milhares de `(` e `[` sem fechamento.
- **Where**:
  - `apps/study-engine/src/infrastructure/extraction/DocumentTextExtractor.ts`
  - `apps/study-engine/tests/infrastructure/DocumentTextExtractor.test.ts`
- **Depends on**: `nenhuma`
- **Requirement**: `REQ-01`, `REQ-02`, `REQ-06`
- **Done when**:
  - [x] Teste unitário associado criado (Red -> Green) e passando
  - [x] Quick gate passa: `pnpm --filter @estuda-anne/study-engine test tests/infrastructure/DocumentTextExtractor.test.ts` exit 0
- **Status**: `Done`

---

### T2: Reciclagem de Conexões Ociosas e Timeouts no `MongoConnection` (`study-engine`, `auth`, `metrics`)
- **What**:
  - Configurar `maxIdleTimeMS: 30000`, `socketTimeoutMS: 30000` e `connectTimeoutMS: 10000` (mantendo `maxPoolSize: 10`, `minPoolSize: 1`, `serverSelectionTimeoutMS: 15000`) nas opções do `MongoClient` em `study-engine`, `auth` e `metrics`.
  - Criar/atualizar teste unitário em `apps/study-engine/tests/infrastructure/MongoConnection.test.ts` verificando que `MongoClient` é instanciado com `maxIdleTimeMS: 30000`, `socketTimeoutMS: 30000`, `connectTimeoutMS: 10000` e `serverSelectionTimeoutMS: 15000`.
- **Where**:
  - `apps/study-engine/src/infrastructure/persistence/mongo/MongoConnection.ts`
  - `apps/auth/src/infrastructure/persistence/mongo/MongoConnection.ts`
  - `apps/metrics/src/infrastructure/persistence/mongo/MongoConnection.ts`
  - `apps/study-engine/tests/infrastructure/MongoConnection.test.ts`
- **Depends on**: `T1`
- **Requirement**: `REQ-03`
- **Done when**:
  - [x] Teste unitário associado criado e passando
  - [x] Quick gate passa: `pnpm --filter @estuda-anne/study-engine test tests/infrastructure/MongoConnection.test.ts` exit 0
- **Status**: `Done`

---

### T3: Atualização do Modelo no Context Cache do `GeminiFlashAdapter`
- **What**:
  - Atualizar `GeminiFlashAdapter.createContextCache` (`apps/study-engine/src/infrastructure/ai/GeminiFlashAdapter.ts:146`) de `'models/gemini-1.5-flash-001'` para `'models/gemini-3.6-flash'`.
  - Atualizar os testes correspondentes em `apps/study-engine/tests/infrastructure/GeminiFlashAdapter.test.ts` e `apps/study-engine/tests/domain/ProcessMaterialUseCase.test.ts` para refletir o modelo `'models/gemini-3.6-flash'`.
- **Where**:
  - `apps/study-engine/src/infrastructure/ai/GeminiFlashAdapter.ts`
  - `apps/study-engine/tests/infrastructure/GeminiFlashAdapter.test.ts`
  - `apps/study-engine/tests/domain/ProcessMaterialUseCase.test.ts`
- **Depends on**: `T2`
- **Requirement**: `REQ-04`, `REQ-06`
- **Done when**:
  - [x] Testes unitários atualizados e passando
  - [x] Quick gate passa: `pnpm --filter @estuda-anne/study-engine test tests/infrastructure/GeminiFlashAdapter.test.ts` exit 0
- **Status**: `Done`

---

### T4: `AbortSignal.timeout(15000)` nas Rotas de Materiais do BFF (`studyRoutes.ts`)
- **What**:
  - Adicionar `signal: AbortSignal.timeout(15000)` nas chamadas `fetch` de materiais em `apps/bff/src/application/routes/studyRoutes.ts`:
    - `GET /materials` e `/api/materials` (`getMaterialsHandler`)
    - `DELETE /materials/:id` e `/api/materials/:id` (`deleteMaterialHandler`)
    - `GET /materials/:id` e `/api/materials/:id` (`getMaterialByIdHandler`)
    - `POST /api/materials/upload` (chamadas `POST /materials` e `POST /materials/:id/process`)
  - Criar/atualizar testes em `apps/bff/tests/` verificando que as chamadas `fetch` das rotas de materiais enviam `signal` de timeout e tratam falhas de timeout sem quebrar o contrato.
- **Where**:
  - `apps/bff/src/application/routes/studyRoutes.ts`
  - `apps/bff/tests/studyRoutes.materials-timeout.test.ts`
- **Depends on**: `T3`
- **Requirement**: `REQ-05`, `REQ-06`
- **Done when**:
  - [x] Teste de integração das rotas de materiais criado e passando
  - [x] Gate completo do monorepo passa: `pnpm build && pnpm test` exit 0
- **Status**: `Done`

---

## Gate Humano 2 — Aprovação do "Como"
- **Aprovado por**: `James (Tech Lead / Arquiteto)`
- **Data**: `2026-11-09`
- **Decisão**: APROVADO para Execução.

