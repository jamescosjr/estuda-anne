# Ancoragem Estrita no Material Enviado (Strict Material Grounding) — Tasks

> **Regra do método:** Cada tarefa é uma unidade atômica (1 tarefa = 1 teste red -> green -> gate -> commit atômico ≤ 400 linhas).
> O comando do gate é o que decide se a tarefa terminou, não a autoavaliação do agente.

---

### T1: Sanitização de Erros de Arquivo/Corrupção e Ancoragem Lexical (`StudyCorpusSanitizer` + `docs/regras/study-engine.md`)
- **What**:
  - Atualizar `docs/regras/study-engine.md` documentando `RN-STU-007` (Ancoragem Estrita e Isolamento por Material) e os incrementos de `RN-STU-005` e `RN-STU-006`.
  - Em `StudyCorpusSanitizer.ts`:
    - Expandir `isDocumentMetaReferencing`, `isPedagogicallyOffTopic` e `isUnusableStudyCorpus` para detectar alucinações sobre arquivo corrompido, ilegível, estrutura de bytes alterada, cabeçalho de arquivo ininterpretável, falha de leitura/extração de dados e mistura de erro de arquivo com matéria acadêmica (incluindo o caso exato da imagem de Hematologia I).
    - Implementar `isGroundedInCorpus(itemText: string, corpusText: string, keyConcepts?: readonly string[]): boolean` e `filterTopicsGroundedInCorpus(topics: Array<{ topic: string; priorityWeight: number }>, corpusText: string, keyConcepts?: readonly string[])`.
  - Criar testes `RN_STU_005_*` e `RN_STU_007_*` em `apps/study-engine/tests/domain/StudyCorpusSanitizer.test.ts`.
- **Where**:
  - `docs/regras/study-engine.md`
  - `apps/study-engine/src/domain/services/StudyCorpusSanitizer.ts`
  - `apps/study-engine/tests/domain/StudyCorpusSanitizer.test.ts`
- **Depends on**: `nenhuma`
- **Requirement**: `REQ-01`, `REQ-02`, `REQ-03`
- **Done when**:
  - [x] Testes unitários `RN_STU_005_*` e `RN_STU_007_*` criados (Red -> Green) e passando
  - [x] Quick gate passa: `pnpm --filter @estuda-anne/study-engine test tests/domain/StudyCorpusSanitizer.test.ts` exit 0
- **Status**: `Done`

---

### T2: Verificação de Grounding e Isolamento nos Agentes Pedagógicos (`QualityGateAgent`, `PedagogicalCoordinatorAgent`, `FlashcardSpecialistAgent`, `QuizSpecialistAgent`, `ProcessMaterialUseCase`)
- **What**:
  - Em `QualityGateAgent.ts`: validar `isPedagogicallyOffTopic(fc.front) || isPedagogicallyOffTopic(fc.back)` e, quando `sourceCorpus` for informado, validar `isGroundedInCorpus` para flashcards e questões de quiz (`RN-STU-006` / `RN-STU-007`).
  - Em `FlashcardSpecialistAgent.ts` e `QuizSpecialistAgent.ts`: filtrar cards/questões gerados com `isGroundedInCorpus` contra `rawText` e `keyConcepts`; receber `subjectTag` separado de `keyConcepts` para que o nome da matéria (`Hematologia I`) vá para `tags` do card mas **não** seja injetado no prompt da IA como conceito do texto se não estiver no corpus.
  - Em `PedagogicalCoordinatorAgent.ts` e `ProcessMaterialUseCase.ts`: se o corpus ou o `analysis.summary` contiver indicadores de `isUnusableStudyCorpus` / `isDocumentMetaReferencing` / arquivo ilegível, lançar `DomainRuleViolation('RN-STU-005', 'corpus_invalido_ou_inseguro')`. Passar `studyText` ao `qualityGateAgent.evaluateQuality`.
  - Criar testes `RN_STU_006_*` e `RN_STU_007_*` em `QualityGateAgent.test.ts` e `ProcessMaterialUseCase.test.ts`.
- **Where**:
  - `apps/study-engine/src/domain/services/pedagogical-agents/QualityGateAgent.ts`
  - `apps/study-engine/src/domain/services/pedagogical-agents/FlashcardSpecialistAgent.ts`
  - `apps/study-engine/src/domain/services/pedagogical-agents/QuizSpecialistAgent.ts`
  - `apps/study-engine/src/domain/services/pedagogical-agents/PedagogicalCoordinatorAgent.ts`
  - `apps/study-engine/src/domain/usecases/ProcessMaterialUseCase.ts`
  - `apps/study-engine/tests/domain/QualityGateAgent.test.ts`
  - `apps/study-engine/tests/domain/ProcessMaterialUseCase.test.ts`
- **Depends on**: `T1`
- **Requirement**: `REQ-01`, `REQ-02`, `REQ-03`, `REQ-06`
- **Done when**:
  - [x] Testes unitários criados e passando
  - [x] Quick gate passa: `pnpm --filter @estuda-anne/study-engine test tests/domain/QualityGateAgent.test.ts tests/domain/ProcessMaterialUseCase.test.ts` exit 0
- **Status**: `Done`

---

### T3: Isolamento de Tópicos por Material e Saneamento nas Sessões (`GenerateExtraSessionUseCase`, `GetDueFlashcardsUseCase`, `GetQuizSessionUseCase`)
- **What**:
  - Em `GenerateExtraSessionUseCase.ts`:
    - Remover fallback `|| material.title` (usar apenas `material.rawContent || material.summary`).
    - Filtrar `focusTopics` por material usando `filterTopicsGroundedInCorpus(focusTopics, materialCorpus, material.keyConcepts)` para impedir que tópicos de outras disciplinas contaminem o prompt daquele material.
    - Passar `material.keyConcepts` (sem `material.subject`) para o prompt da IA e `material.subject` apenas como tag.
    - Filtrar `scopedPool` e `bankQuestions` removendo itens que violem `isPedagogicallyOffTopic` ou `isDocumentMetaReferencing`.
  - Em `GetDueFlashcardsUseCase.ts` e `GetQuizSessionUseCase.ts`:
    - Filtrar flashcards (frente e verso) e questões de quiz (enunciado e opções) com `!isPedagogicallyOffTopic(...) && !isDocumentMetaReferencing(...)`, eliminando imediatamente cards contaminados já persistidos no banco.
  - Atualizar e adicionar testes em `GetDueFlashcardsUseCase.test.ts`, `GetQuizSessionUseCase.test.ts` e `GenerateExtraSessionUseCase.test.ts`.
- **Where**:
  - `apps/study-engine/src/domain/usecases/GenerateExtraSessionUseCase.ts`
  - `apps/study-engine/src/domain/usecases/GetDueFlashcardsUseCase.ts`
  - `apps/study-engine/src/domain/usecases/GetQuizSessionUseCase.ts`
  - `apps/study-engine/tests/domain/GetDueFlashcardsUseCase.test.ts`
  - `apps/study-engine/tests/domain/GetQuizSessionUseCase.test.ts`
  - `apps/study-engine/tests/domain/GenerateExtraSessionUseCase.test.ts`
- **Depends on**: `T2`
- **Requirement**: `REQ-03`, `REQ-05`, `REQ-06`
- **Done when**:
  - [x] Testes unitários criados e passando
  - [x] Quick gate passa: `pnpm --filter @estuda-anne/study-engine test tests/domain/GetDueFlashcardsUseCase.test.ts tests/domain/GetQuizSessionUseCase.test.ts tests/domain/GenerateExtraSessionUseCase.test.ts` exit 0
- **Status**: `Done`

---

### T4: Regras de Grounding Estrito nos Prompts do `GeminiFlashAdapter`
- **What**:
  - Em `GeminiFlashAdapter.ts`:
    - Adicionar cláusula obrigatória `FONTE ÚNICA E EXCLUSIVA (GROUNDING ESTRITO)` em `extractConceptsAndSummary`, `generateFlashcards` e `generateQuizQuestions` exigindo que 100% dos fatos, perguntas e respostas sejam extraídos única e exclusivamente do texto fornecido pelo usuário, proibindo uso de conhecimento externo e proibindo inventar perguntas sobre arquivo corrompido, bytes, cabeçalhos ou ilegibilidade.
    - Remover a instrução da linha 617 que incentivava perguntas teóricas sobre "assinatura binária / cabeçalho de arquivo".
    - Em `extractTextFromMultimodalDocument`: instruir o modelo a retornar string vazia `""` caso o arquivo/imagem esteja ilegível ou sem texto acadêmico, nunca gerando texto descritivo sobre falha de leitura ou corrupção de bytes.
  - Adicionar teste em `apps/study-engine/tests/infrastructure/GeminiFlashAdapter.test.ts` validando as instruções de grounding estrito e o bloqueio de cards de arquivo corrompido.
- **Where**:
  - `apps/study-engine/src/infrastructure/ai/GeminiFlashAdapter.ts`
  - `apps/study-engine/tests/infrastructure/GeminiFlashAdapter.test.ts`
- **Depends on**: `T3`
- **Requirement**: `REQ-04`, `REQ-06`
- **Done when**:
  - [x] Testes de infraestrutura do adaptador criados e passando
  - [x] Gate completo do monorepo passa: `pnpm build && pnpm test` exit 0
- **Status**: `Done`

---

## Gate Humano 2 — Aprovação do "Como"
- **Aprovado por**: `James (Tech Lead / Arquiteto)`
- **Data**: `2026-11-10`
- **Decisão**: APROVADO para Execução.

