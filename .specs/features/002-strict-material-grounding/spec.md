# Ancoragem Estrita no Material Enviado (Strict Material Grounding) — Specification

- **Card / Issue**: `FIX-002 (Grounding Estrito e Isolamento de Corpus por Material — RN-STU-005 / RN-STU-006 / RN-STU-007)`
- **Tier de Risco**: `Complex` (Comportamento central de IA, sanitização de corpus e qualidade pedagógica)
- **Tamanho (Auto-Sizing)**: `Medium` (Isolado em `apps/study-engine` e documentação canônica `docs/regras/study-engine.md`)
- **Serviço Dono do Contrato**: `apps/study-engine`

---

## 1. Objetivo

Garantir que **100% do conteúdo de estudo gerado pela IA (resumos, conceitos-chave, flashcards e quizzes) venha única e exclusivamente do material enviado pelo usuário**, impedindo:
1. Que falhas de extração/leitura de PDF/DOCX ("arquivo corrompido", "ilegível", "estrutura de bytes alterada", "cabeçalho binário") virem perguntas híbridas com o nome da disciplina (ex.: *"arquivo corrompido ou ilegível em Sistemas de Informação Laboratorial em hematologia"*).
2. Que o nome da matéria (`material.subject` / `material.title`) ou tópicos fracos de **outras matérias** (`focusTopics` globais do `StudentAdaptiveProfile`) contaminem a geração de um material específico ou sirvam de fallback quando o texto extraído é inválido.
3. Que flashcards ou questões de quiz sem ancoragem lexical real (grounding) no texto extraído do documento passem pelo `QualityGateAgent` ou sejam exibidos nas sessões de estudo (`GetDueFlashcardsUseCase`, `GetQuizSessionUseCase`, `GenerateExtraSessionUseCase`).

### Escopo (DoR)
- **Dentro do Escopo**:
  1. **`StudyCorpusSanitizer`** (`apps/study-engine/src/domain/services/StudyCorpusSanitizer.ts`):
     - Expandir `isUnusableStudyCorpus`, `isDocumentMetaReferencing` e `isPedagogicallyOffTopic` para detectar e barrar textos/perguntas que mencionem corrupção de arquivo, ilegibilidade, bytes brutos, cabeçalho/stream corrompido, falha de decodificação/OCR ou mensagens de recusa da IA ("não foi possível ler o arquivo", "arquivo corrompido ou ilegível", "estrutura de bytes", etc.).
     - Criar função determinística `isGroundedInCorpus(itemText: string, corpusText: string, keyConcepts?: readonly string[]): boolean` que verifica se os termos significativos do flashcard/questão possuem ancoragem lexical real no corpus do material enviado.
  2. **`QualityGateAgent` & Agentes Especialistas** (`QualityGateAgent.ts`, `FlashcardSpecialistAgent.ts`, `QuizSpecialistAgent.ts`, `PedagogicalCoordinatorAgent.ts`):
     - Remover a injeção de `material.subject` na lista de `keyConcepts` enviados ao prompt de geração (`PedagogicalCoordinatorAgent.ts` e `GenerateExtraSessionUseCase.ts`) — `material.subject` continua sendo usado apenas como tag de organização do card persistido, nunca como tema para a IA inventar conteúdo fora do texto.
     - Validar ancoragem (`isGroundedInCorpus`) e ausência de alucinação de corrupção/estrutura de arquivo no `FlashcardSpecialistAgent`, `QuizSpecialistAgent` e `QualityGateAgent`.
  3. **`ProcessMaterialUseCase`** (`apps/study-engine/src/domain/usecases/ProcessMaterialUseCase.ts`):
     - Quando o corpus extraído for inutilizável ou o resumo/conceitos retornados pela IA indicarem arquivo ilegível/corrompido/binário, rejeitar imediatamente com `DomainRuleViolation('RN-STU-005', 'corpus_invalido_ou_inseguro')` e marcar o material como `FAILED`.
  4. **Isolamento de Tópicos por Material no `GenerateExtraSessionUseCase`** (`apps/study-engine/src/domain/usecases/GenerateExtraSessionUseCase.ts`):
     - Nunca usar `|| material.title` como fallback de corpus (exigir `material.rawContent` ou `material.summary` válido).
     - Filtrar `focusTopics` do perfil adaptativo para enviar ao prompt de cada material **apenas** os tópicos que realmente pertencem ao corpus/conceitos daquele material específico, evitando contaminação cruzada entre disciplinas.
  5. **Prompts de Grounding Estrito no `GeminiFlashAdapter`** (`apps/study-engine/src/infrastructure/ai/GeminiFlashAdapter.ts`):
     - Adicionar regra explícita de **GROUNDING ESTRITO (FONTE ÚNICA)** em `extractConceptsAndSummary`, `generateFlashcards` e `generateQuizQuestions`: proibir terminantemente uso de conhecimento externo ao texto fornecido e proibir teorizar sobre estrutura de arquivo, bytes, cabeçalhos ou corrupção de dados.
  6. **Filtro de Saneamento na Leitura de Sessões** (`GetDueFlashcardsUseCase.ts`, `GetQuizSessionUseCase.ts`, `GenerateExtraSessionUseCase.ts`):
     - Filtrar em tempo de leitura (`GetDueFlashcardsUseCase` e `GetQuizSessionUseCase`) quaisquer flashcards ou questões já persistidos no banco que sejam detectados por `isPedagogicallyOffTopic` / `isDocumentMetaReferencing` (incluindo o card contaminado de "arquivo corrompido ou ilegível" / "estrutura de bytes") ou cujo material associado tenha corpus inválido.
  7. **Documentação Canônica de Regras** (`docs/regras/study-engine.md`):
     - Atualizar `RN-STU-005` e `RN-STU-006` e registrar `RN-STU-007` (Ancoragem Estrita no Material do Usuário e Isolamento de Corpus).
- **Sistemas Afetados**: `apps/study-engine`, `docs/regras/study-engine.md`.
- **Caminhos Prováveis**:
  - `docs/regras/study-engine.md`
  - `apps/study-engine/src/domain/services/StudyCorpusSanitizer.ts`
  - `apps/study-engine/src/domain/services/pedagogical-agents/QualityGateAgent.ts`
  - `apps/study-engine/src/domain/services/pedagogical-agents/PedagogicalCoordinatorAgent.ts`
  - `apps/study-engine/src/domain/services/pedagogical-agents/FlashcardSpecialistAgent.ts`
  - `apps/study-engine/src/domain/services/pedagogical-agents/QuizSpecialistAgent.ts`
  - `apps/study-engine/src/domain/usecases/ProcessMaterialUseCase.ts`
  - `apps/study-engine/src/domain/usecases/GenerateExtraSessionUseCase.ts`
  - `apps/study-engine/src/domain/usecases/GetDueFlashcardsUseCase.ts`
  - `apps/study-engine/src/domain/usecases/GetQuizSessionUseCase.ts`
  - `apps/study-engine/src/infrastructure/ai/GeminiFlashAdapter.ts`
- **Nunca Modificar (Fronteira)**:
  - Não quebrar os contratos HTTP de entrada/saída entre `frontend` ↔ `bff` ↔ `study-engine`.
  - Não importar `infrastructure` ou `application` em `src/domain/` (ADR-0001).
  - Não editar `.env*`, `pnpm-lock.yaml` ou `docs/generated/*`.
- **Como Validar com o PO / Usuária**:
  - Testes unitários determinísticos (`RN_STU_005_*`, `RN_STU_006_*`, `RN_STU_007_*`) provando que o card real da imagem (*"O que caracteriza um arquivo de dados biomédicos classificado como corrompido ou ilegível nos Sistemas de Informação Laboratorial (LIS) em hematologia?"*) e variações são bloqueados na geração, reprovados no `QualityGateAgent` e filtrados nas filas de estudo, além do gate completo `pnpm build && pnpm test`.

---

## 2. Critérios de Aceite (Sintaxe EARS & Requirement IDs)

- **REQ-01 (`RN-STU-005` — Rejeição de Corpus Corrompido, Ilegível ou com Alucinação de Falha de Leitura)**:
  `WHEN o texto extraído de um material ou o resumo/conceitos gerados pela IA forem avaliados THE SYSTEM SHALL verificar se o texto contém indicadores de arquivo corrompido, ilegível, estrutura de bytes alterada, falha de extração ou densidade textual insuficiente IF o corpus ou a análise inicial contiver qualquer indicador de falha de leitura ou binário ilegível THEN THE SYSTEM SHALL recusar o processamento lançando DomainRuleViolation('RN-STU-005', 'corpus_invalido_ou_inseguro')`
- **REQ-02 (`RN-STU-006` — Bloqueio de Meta-Referências de Corrupção/Bytes e Verificação de Grounding no QualityGateAgent)**:
  `WHEN flashcards ou questões de quiz forem avaliados pelo StudyCorpusSanitizer, agentes especialistas e QualityGateAgent THE SYSTEM SHALL verificar se cada item está ancorado lexicalmente no corpus do material enviado e livre de termos de corrupção de arquivo, estrutura de bytes, cabeçalho binário ou documento ilegível IF qualquer flashcard ou questão abordar corrupção/ilegibilidade de arquivo ou não possuir ancoragem mínima no corpus do material THEN THE SYSTEM SHALL descartar o item e reprovar o lote no QualityGateAgent`
- **REQ-03 (`RN-STU-007` — Isolamento Estrito do Corpus sem Injeção de Título/Disciplina ou Tópicos de Outras Matérias)**:
  `WHEN o sistema gerar flashcards ou questões de quiz para um material THE SYSTEM SHALL utilizar exclusivamente o texto extraído e os conceitos-chave presentes naquele material específico IF existirem tópicos fracos no perfil adaptativo do estudante que não pertençam ao corpus daquele material ou se o material possuir apenas título/nome da disciplina sem corpus válido THEN THE SYSTEM SHALL excluir os tópicos externos do prompt daquele material e recusar o uso de título ou nome da disciplina como fonte de geração`
- **REQ-04 (Instrução de Grounding Estrito no Adaptador de IA)**:
  `WHEN o GeminiFlashAdapter construir prompts para resumo, flashcards ou questões de quiz THE SYSTEM SHALL instruir explicitamente o modelo a extrair informações única e exclusivamente do texto fornecido, proibindo o uso de conhecimento externo não presente no material e proibindo teorizar sobre arquivos corrompidos, estrutura de bytes ou cabeçalhos de arquivo`
- **REQ-05 (Saneamento em Tempo de Leitura nas Sessões de Estudo)**:
  `WHEN GetDueFlashcardsUseCase ou GetQuizSessionUseCase buscar itens para revisão ou sessão de estudo THE SYSTEM SHALL filtrar e excluir flashcards e questões cujo enunciado ou resposta viole isPedagogicallyOffTopic ou isDocumentMetaReferencing (incluindo menções a arquivo corrompido, ilegível ou estrutura de bytes)`
- **REQ-06 (Preservação de Funcionalidade e Contratos)**:
  `THE SYSTEM SHALL CONTINUE TO gerar e retornar normalmente flashcards, quizzes e resumos para materiais acadêmicos legítimos (incluindo Hematologia, Direito, Cálculo, etc.) mantendo intactos os contratos HTTP existentes`

---

## 3. Fora de Escopo (Out of Scope)

| Item | Motivo |
| :--- | :--- |
| Migração de banco de dados destrutiva em produção via script manual | O filtro determinístico em `GetDueFlashcardsUseCase`, `GetQuizSessionUseCase` e `GenerateExtraSessionUseCase` sanea imediatamente a exibição para a aluna sem risco de perda acidental de dados. |
| Alterações de layout no `apps/frontend` | O problema ocorre na camada de domínio e adaptador de IA do `study-engine`. |

---

## 4. Premissas e Questões Abertas (Assumptions & Open Questions)

| Premissa / Decisão | Default Escolhido | Racional | Confirmado? |
| :--- | :--- | :--- | :--- |
| Regra de Grounding Estrito (`RN-STU-005` / `RN-STU-007`) | Recusar processamento com `DomainRuleViolation('RN-STU-005', 'corpus_invalido_ou_inseguro')` quando o corpus ou a análise indicar falha de leitura/arquivo ilegível. | Confirmado pelo PO. | `y - PO` |
| Isolamento por Material | Não injetar `material.subject` como conceito-chave para geração da IA (apenas como `tag` de catálogo após gerar) e filtrar `focusTopics` para só passar tópicos presentes no corpus do material. | Confirmado pelo PO. | `y - PO` |
| Verificação de Grounding Lexical (`isGroundedInCorpus`) | Exigir que pelo menos 1 termo significativo da frente+verso do card (ou enunciado+resposta correta do quiz) exista no corpus/conceitos do material (quando o corpus tiver ≥ 40 caracteres). | Evita alucinações fora do texto sem rejeitar paráfrases legítimas que preservam os conceitos-chave do material. | `y - PO` |
| Saneamento de Cards Persistidos | Filtrar `isPedagogicallyOffTopic` e `isDocumentMetaReferencing` tanto na frente quanto no verso em `GetDueFlashcardsUseCase` e `GetQuizSessionUseCase`. | Remove imediatamente da tela da usuária o card da imagem e similares. | `y - PO` |

---

## 5. Gate Humano 1 — Aprovação do "O Quê"
- **Aprovado por**: `James (PO / Tech Lead)`
- **Data**: `2026-11-10`
- **Decisão**: APROVADO para Design & Tasks.

