# Regras de Negócio — Study Engine (`apps/study-engine`)

> **Fonte de verdade escrita** (Capítulo 5 — *Cercando a IA*).
> O card descreve a mudança; este arquivo descreve o **estado** das regras de negócio.
> Toda regra tem **ID**, sintaxe **EARS**, onde vive no **Código**, qual **Teste** a prova, **Confiança** (`verified` / `inferred`), **Dono** e **Data**.
> O mesmo ID aparece no documento, no código, no teste e na exceção/log (`DomainRuleViolation`).
> *Regra de negócio sem ID é folclore; com ID, é grep.*

---

## Ordem de Avaliação e Pipeline de Negócio
1. `RN-STU-005` (Sanitização e Segurança do Corpus)
2. `RN-STU-007` (Ancoragem Estrita no Material do Usuário e Isolamento de Corpus)
3. `RN-STU-006` (Gate de Qualidade Pedagógica de IA)
4. `RN-STU-001` (Validação de Flashcards)
5. `RN-STU-002` (Espaçamento e Repetição SM-2)
6. `RN-STU-003` (Elegibilidade para Revisão — Due Date)
7. `RN-STU-004` (Encerramento de Semestre e Limpeza LGPD)

---

### RN-STU-001 — Criação e Invariantes de Flashcard
- **EARS**:
  `WHEN uma solicitação de criação de flashcard for processada THE SYSTEM SHALL exigir studentId, materialId, frente (front) e verso (back) não vazios IF qualquer um destes campos estiver ausente ou vazio THEN THE SYSTEM SHALL recusar a criação lançando DomainRuleViolation('RN-STU-001', 'campos_obrigatorios_ausentes') THE SYSTEM SHALL inicializar o flashcard com easeFactor default de 2.5, repetitionIntervalDays 1 e repetitionsCount 0`
- **Código**: `apps/study-engine/src/domain/entities/Flashcard.ts` (método `create`)
- **Teste**: `apps/study-engine/tests/domain/Flashcard.test.ts`
- **Confiança**: `verified` (coberto por 5 testes unitários)
- **Dono**: Time de Domínio / Tech Lead
- **Última revisão**: 2026-09-26

---

### RN-STU-002 — Algoritmo SM-2 de Repetição Espaçada
- **EARS**:
  `WHEN o estudante submete uma nota (grade de 0 a 5) para um flashcard THE SYSTEM SHALL recalcular o Ease Factor (EF) garantindo o piso mínimo de 1.3 WHEN a nota for >= 3 (sucesso) THE SYSTEM SHALL incrementar repetitionsCount e calcular o próximo intervalo em dias (1 dia se primeira repetição, 6 dias se segunda, e intervalo_anterior * EF para as demais) IF a nota for < 3 (lapso/falha) THEN THE SYSTEM SHALL resetar repetitionsCount para 0 e definir o próximo intervalo para 1 dia THE SYSTEM SHALL registrar a revisão no histórico imutável do flashcard`
- **Código**: `apps/study-engine/src/domain/entities/Flashcard.ts` (método `applyReview`), `apps/study-engine/src/domain/usecases/ReviewFlashcardUseCase.ts`
- **Teste**: `apps/study-engine/tests/domain/Flashcard.test.ts`, `apps/study-engine/tests/domain/ReviewFlashcardUseCase.test.ts`
- **Confiança**: `verified` (coberto por múltiplos testes cobrindo limites 0..5, reset e avanço)
- **Dono**: Time Pedagógico / PO
- **Última revisão**: 2026-09-26

---

### RN-STU-003 — Elegibilidade para Revisão Diária (`isDue`)
- **EARS**:
  `WHEN for solicitada a lista de flashcards para estudo THE SYSTEM SHALL retornar apenas flashcards cuja nextReviewDate seja menor ou igual à data/hora de referência IF nextReviewDate for futura THEN THE SYSTEM SHALL excluir o flashcard da sessão ativa`
- **Código**: `apps/study-engine/src/domain/entities/Flashcard.ts` (método `isDue`), `apps/study-engine/src/domain/usecases/GetDueFlashcardsUseCase.ts`
- **Teste**: `apps/study-engine/tests/domain/GetDueFlashcardsUseCase.test.ts`
- **Confiança**: `verified`
- **Dono**: Time de Produto
- **Última revisão**: 2026-09-26

---

### RN-STU-004 — Encerramento de Semestre e Purga de Dados (LGPD)
- **EARS**:
  `WHEN for solicitado o encerramento do semestre letivo de um estudante THE SYSTEM SHALL exigir studentId válido IF studentId for vazio THEN THE SYSTEM SHALL recusar a operação com DomainRuleViolation('RN-STU-004', 'student_id_obrigatorio') WHEN a operação for confirmada THE SYSTEM SHALL purgar em lote os arquivos físicos do storage R2, deletar os embeddings vetoriais associados ao estudante e remover os registros de materiais do banco relacional/documental`
- **Código**: `apps/study-engine/src/domain/usecases/CloseSemesterUseCase.ts`
- **Teste**: `apps/study-engine/tests/domain/CloseSemesterUseCase.test.ts`
- **Confiança**: `verified`
- **Dono**: Segurança & Privacidade / PO
- **Última revisão**: 2026-09-26

---

### RN-STU-005 — Sanitização e Filtragem de Corpus de Estudo
- **EARS**:
  `WHEN o texto de um material de estudo for extraído ou analisado THE SYSTEM SHALL higienizar caracteres de controle e sequências de prompt injection IF o texto ou a análise inicial contiver tentativas de jailbreak, payloads maliciosos, indicadores de arquivo corrompido ou ilegível, estrutura de bytes alterada, falha de extração ou tamanho inferior ao limiar mínimo THEN THE SYSTEM SHALL rejeitar o processamento com DomainRuleViolation('RN-STU-005', 'corpus_invalido_ou_inseguro') THE SYSTEM SHALL CONTINUE TO preservar a semântica didática do conteúdo acadêmico genuíno`
- **Código**: `apps/study-engine/src/domain/services/StudyCorpusSanitizer.ts`, `apps/study-engine/src/domain/usecases/ProcessMaterialUseCase.ts`, `apps/study-engine/src/domain/services/pedagogical-agents/PedagogicalCoordinatorAgent.ts`
- **Teste**: `apps/study-engine/tests/domain/StudyCorpusSanitizer.test.ts`, `apps/study-engine/tests/domain/ProcessMaterialUseCase.test.ts`
- **Confiança**: `verified`
- **Dono**: Segurança / Engenheiro de IA
- **Última revisão**: 2026-11-10

---

### RN-STU-006 — Gate de Qualidade Pedagógica e Resiliência da IA
- **EARS**:
  `WHEN o modelo de IA gerar itens de estudo (quizzes, flashcards ou cronograma) THE SYSTEM SHALL submeter o payload ao QualityGateAgent IF o payload contiver alucinações estruturais, menções a arquivo corrompido ou ilegível, estrutura de bytes, menos de 4 alternativas por questão, resposta correta inconsistente ou falta de ancoragem lexical no corpus do material THEN THE SYSTEM SHALL rejeitar o output e executar circuito autônomo de retry com instrução corretiva até o limite de 3 tentativas`
- **Código**: `apps/study-engine/src/domain/services/pedagogical-agents/QualityGateAgent.ts`, `apps/study-engine/src/infrastructure/ai/GeminiFlashAdapter.ts`
- **Teste**: `apps/study-engine/tests/domain/QualityGateAgent.test.ts`, `apps/study-engine/tests/infrastructure/GeminiFlashAdapter.test.ts`
- **Confiança**: `verified`
- **Dono**: Coordinator / QA
- **Última revisão**: 2026-11-10

---

### RN-STU-007 — Ancoragem Estrita no Material Enviado e Isolamento de Corpus por Disciplina
- **EARS**:
  `WHEN o sistema gerar ou servir flashcards e questões de quiz THE SYSTEM SHALL extrair conceitos, perguntas e respostas exclusivamente do corpus válido do material enviado pelo estudante sem injetar o nome da disciplina como conceito-chave para geração e sem misturar tópicos fracos de outras matérias IF um item gerado ou persistido não possuir ancoragem lexical mínima no corpus do material ou contiver mistura de falha de arquivo/bytes com a disciplina THEN THE SYSTEM SHALL descartar o item na geração e filtrá-lo nas sessões de estudo`
- **Código**: `apps/study-engine/src/domain/services/StudyCorpusSanitizer.ts`, `apps/study-engine/src/domain/services/pedagogical-agents/FlashcardSpecialistAgent.ts`, `apps/study-engine/src/domain/services/pedagogical-agents/QuizSpecialistAgent.ts`, `apps/study-engine/src/domain/usecases/GenerateExtraSessionUseCase.ts`, `apps/study-engine/src/domain/usecases/GetDueFlashcardsUseCase.ts`, `apps/study-engine/src/domain/usecases/GetQuizSessionUseCase.ts`
- **Teste**: `apps/study-engine/tests/domain/StudyCorpusSanitizer.test.ts`, `apps/study-engine/tests/domain/QualityGateAgent.test.ts`, `apps/study-engine/tests/domain/GenerateExtraSessionUseCase.test.ts`, `apps/study-engine/tests/domain/GetDueFlashcardsUseCase.test.ts`, `apps/study-engine/tests/domain/GetQuizSessionUseCase.test.ts`
- **Confiança**: `verified`
- **Dono**: Time Pedagógico / PO
- **Última revisão**: 2026-11-10
