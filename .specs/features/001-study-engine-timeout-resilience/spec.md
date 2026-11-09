# Resiliência contra Timeouts e Bloqueio de Event Loop no Study Engine & BFF — Specification

- **Card / Issue**: `FIX-001 (Incidente HeadersTimeoutError 19:03–19:04)`
- **Tier de Risco**: `Médio`
- **Tamanho (Auto-Sizing)**: `Large` (cruza `apps/study-engine`, `apps/bff`, `apps/auth` e `apps/metrics` sem alterar contratos públicos HTTP)
- **Serviço Dono do Contrato**: `apps/study-engine` e `apps/bff`

---

## 1. Objetivo

Eliminar o congelamento do Event Loop e o travamento por conexões TCP ociosas ("sockets zumbis") que causam `HeadersTimeoutError` no BFF ao consultar, criar/processar e deletar materiais no `study-engine`, além de corrigir o erro `404 Not Found` na criação de Context Cache do Gemini (`models/gemini-1.5-flash-001`).

### Escopo (DoR)
- **Dentro do Escopo**:
  1. **`DocumentTextExtractor`** (`apps/study-engine/src/infrastructure/extraction/DocumentTextExtractor.ts`): Eliminar regexes com *catastrophic backtracking* sobre binário bruto de PDF e impor limites seguros de tamanho/iterações na extração de streams para nunca bloquear o Event Loop do Node.js.
  2. **`MongoConnection`** (`apps/study-engine`, `apps/auth`, `apps/metrics`): Configurar `maxIdleTimeMS: 30000`, `socketTimeoutMS: 30000` e `connectTimeoutMS: 10000` no pool do `MongoClient` para reciclar conexões ociosas automaticamente e falhar rápido em caso de socket morto.
  3. **`GeminiFlashAdapter`** (`apps/study-engine/src/infrastructure/ai/GeminiFlashAdapter.ts`): Substituir o modelo depreciado `models/gemini-1.5-flash-001` no `createContextCache` pelo modelo ativo configurado no adaptador.
  4. **`studyRoutes` no BFF** (`apps/bff/src/application/routes/studyRoutes.ts`): Adicionar `AbortSignal.timeout` explícito nas chamadas `fetch` de materiais (`GET /materials`, `GET /materials/:id`, `DELETE /materials/:id`, `POST /materials` e `POST /materials/:id/process`) para evitar retenção indefinida até o `HeadersTimeoutError` do Undici.
- **Sistemas Afetados**: `apps/study-engine`, `apps/bff`, `apps/auth`, `apps/metrics`.
- **Caminhos Prováveis**:
  - `apps/study-engine/src/infrastructure/extraction/DocumentTextExtractor.ts`
  - `apps/study-engine/src/infrastructure/persistence/mongo/MongoConnection.ts`
  - `apps/auth/src/infrastructure/persistence/mongo/MongoConnection.ts`
  - `apps/metrics/src/infrastructure/persistence/mongo/MongoConnection.ts`
  - `apps/study-engine/src/infrastructure/ai/GeminiFlashAdapter.ts`
  - `apps/bff/src/application/routes/studyRoutes.ts`
- **Nunca Modificar (Fronteira)**:
  - Não alterar contratos HTTP de entrada/saída entre `frontend` ↔ `bff` ↔ `study-engine`.
  - Não importar `infrastructure` ou `application` dentro de `src/domain/` (ADR-0001).
  - Não editar `.env*`, `pnpm-lock.yaml` ou `docs/generated/*`.
- **Como Validar com o PO / Usuária**:
  - Suite determinística de testes cobrindo payloads PDF binários densos/malformados em `< 200ms`, asserções de configuração de pool do `MongoClient`, modelo atualizado no `createContextCache` e `AbortSignal.timeout` nas rotas de materiais do BFF (`pnpm build && pnpm test`).

---

## 2. Critérios de Aceite (Sintaxe EARS & Requirement IDs)

- **REQ-01 (Extração de PDF sem Backtracking ou Bloqueio de Event Loop)**:
  `WHEN um arquivo PDF for processado pelo DocumentTextExtractor THE SYSTEM SHALL extrair strings literais (Tj e TJ) usando varredura linear limitada sem expressões regulares sujeitas a backtracking exponencial sobre bytes binários brutos`
- **REQ-02 (Limite de Segurança em Streams de PDF)**:
  `IF um buffer de PDF contiver streams compactados ou binários extensos THEN THE SYSTEM SHALL limitar a inspeção de streams e o tamanho processado de forma determinística concluindo a extração em menos de 500ms sem bloquear o Event Loop`
- **REQ-03 (Reciclagem de Conexões Ociosas e Timeouts no MongoDB)**:
  `WHEN o MongoConnection inicializar o MongoClient nos serviços (study-engine, auth e metrics) THE SYSTEM SHALL configurar maxIdleTimeMS: 30000, socketTimeoutMS: 30000 e connectTimeoutMS: 10000 além de serverSelectionTimeoutMS: 15000`
- **REQ-04 (Atualização do Modelo no Context Cache do Gemini)**:
  `WHEN o GeminiFlashAdapter criar um cache de contexto via GoogleAICacheManager THE SYSTEM SHALL utilizar o modelo ativo 'models/gemini-3.6-flash' (ou variável configurada) em vez do modelo depreciado 'models/gemini-1.5-flash-001'`
- **REQ-05 (Timeouts Explícitos nas Rotas de Materiais do BFF)**:
  `WHEN o BFF realizar chamadas HTTP ao Study Engine nas rotas de listagem, consulta por ID, criação, processamento assíncrono e exclusão de materiais THE SYSTEM SHALL aplicar AbortSignal.timeout explícito em cada requisição fetch IF o Study Engine exceder o limite de tempo THEN THE SYSTEM SHALL registrar o erro estruturado e responder imediatamente sem aguardar HeadersTimeoutError padrão do Undici`
- **REQ-06 (Preservação de Contratos e Extração Legítima)**:
  `THE SYSTEM SHALL CONTINUE TO extrair texto válido de documentos PDF, DOCX, PPTX e TXT legítimos e preservar integralmente os contratos públicos de resposta do BFF e do Study Engine`

---

## 3. Fora de Escopo (Out of Scope)

| Item | Motivo |
| :--- | :--- |
| Migração do `InMemoryJobQueueAdapter` para fila externa (BullMQ / Redis / RabbitMQ) | Requer nova infraestrutura/container no `docker-compose.yml` e pertence a card arquitetural próprio. |
| Alteração na interface visual de upload (`apps/frontend`) | O contrato HTTP do BFF será preservado; a correção ocorre no backend. |
| Alteração em regras pedagógicas de geração de Flashcards/Quizzes (`RN-STU-001` a `RN-STU-006`) | Nenhuma regra pedagógica de domínio será modificada neste bugfix de resiliência. |

---

## 4. Premissas e Questões Abertas (Assumptions & Open Questions)

| Premissa / Decisão | Default Escolhido | Racional | Confirmado? |
| :--- | :--- | :--- | :--- |
| Modelo no `createContextCache` (`GeminiFlashAdapter.ts:146`) | `'models/gemini-3.6-flash'` (alinhado com as demais linhas `286, 445, 632, 756, 823, 931` do `GeminiFlashAdapter.ts`) | Mantém consistência com o restante do adaptador e com os testes existentes do repositório. | `y - PO` |
| Timeout das rotas de materiais no BFF (`studyRoutes.ts`) | `15000` ms (15s) para `GET /materials`, `GET /materials/:id`, `DELETE /materials/:id`, `POST /materials` e `POST /materials/:id/process` | Como o `/process` opera com `async: true` (`202 Accepted`), 15s é folgado para operações normais e falha rápido antes do timeout de gateway/Undici. | `y - PO` |

---

## 5. Gate Humano 1 — Aprovação do "O Quê"
- **Aprovado por**: `James (PO / Tech Lead)`
- **Data**: `2026-11-09`
- **Decisão**: APROVADO para Design & Tasks.

