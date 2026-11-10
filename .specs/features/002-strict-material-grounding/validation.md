# Ancoragem Estrita no Material Enviado (Strict Material Grounding) — Validation Report

> **Gerado pelo Verifier Independente (`agent-verifier`)** — autor ≠ verificador, contexto limpo.
> **Regra:** "Evidência ou zero" — requisito sem `arquivo:linha` e asserção de teste verificável conta como não coberto.

---

## 1. Summary

- **Overall**: `✓ Ready — PASS`
- **Spec-Anchored Check**: `6/6 critérios validados com arquivo:linha (implementação e teste) e asserção exata`
- **Discrimination Sensor**: `3/3 mutações comportamentais mortas (killed)`
- **Gate Check**: `Build exit 0, Testes exit 0, Architecture Test (ADR-0001) exit 0`

---

## 2. Spec-Anchored Acceptance Criteria (`REQ -> Código -> Teste -> Asserção`)

| Requirement ID | Cláusula EARS da Spec | Implementação (`arquivo:linha`) | Teste (`arquivo:linha`) | Asserção Executável Verificada | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-01** (`RN-STU-005`) | `WHEN o texto extraído de um material ou o resumo/conceitos gerados pela IA forem avaliados THE SYSTEM SHALL verificar se o texto contém indicadores de arquivo corrompido, ilegível, estrutura de bytes alterada, falha de extração ou densidade textual insuficiente IF o corpus ou a análise inicial contiver qualquer indicador de falha de leitura ou binário ilegível THEN THE SYSTEM SHALL recusar o processamento lançando DomainRuleViolation('RN-STU-005', 'corpus_invalido_ou_inseguro')` | `apps/study-engine/src/domain/services/StudyCorpusSanitizer.ts:L178-L193` (`isUnusableStudyCorpus`), `apps/study-engine/src/domain/services/pedagogical-agents/PedagogicalCoordinatorAgent.ts:L62-L69` e `apps/study-engine/src/domain/usecases/ProcessMaterialUseCase.ts:L142-L147` | `apps/study-engine/tests/domain/StudyCorpusSanitizer.test.ts:L107-L123` e `apps/study-engine/tests/domain/ProcessMaterialUseCase.test.ts:L350-L417` | `expect(isUnusableStudyCorpus('Não foi possível ler o arquivo enviado pois o documento encontra-se corrompido ou ilegível, apresentando falha na estrutura de bytes.')).toBe(true)` / `await expect(useCase.execute(...)).rejects.toThrow(/RN-STU-005/)` | `PASS ✓` |
| **REQ-02** (`RN-STU-006`) | `WHEN flashcards ou questões de quiz forem avaliados pelo StudyCorpusSanitizer, agentes especialistas e QualityGateAgent THE SYSTEM SHALL verificar se cada item está ancorado lexicalmente no corpus do material enviado e livre de termos de corrupção de arquivo, estrutura de bytes, cabeçalho binário ou documento ilegível IF qualquer flashcard ou questão abordar corrupção/ilegibilidade de arquivo ou não possuir ancoragem mínima no corpus do material THEN THE SYSTEM SHALL descartar o item e reprovar o lote no QualityGateAgent` | `apps/study-engine/src/domain/services/StudyCorpusSanitizer.ts:L39-L55,L108-L113,L195-L252` (`isDocumentMetaReferencing`, `isGroundedInCorpus`), `apps/study-engine/src/domain/services/pedagogical-agents/QualityGateAgent.ts:L28-L34,L49-L71,L95-L112`, `apps/study-engine/src/domain/services/pedagogical-agents/FlashcardSpecialistAgent.ts:L57-L65` e `apps/study-engine/src/domain/services/pedagogical-agents/QuizSpecialistAgent.ts:L51-L61` | `apps/study-engine/tests/domain/QualityGateAgent.test.ts:L247-L294` e `apps/study-engine/tests/domain/StudyCorpusSanitizer.test.ts:L107-L145` | `expect(isDocumentMetaReferencing(hematologiaCorruptedFront)).toBe(true)` / `expect(isGroundedInCorpus('O que caracteriza um arquivo classificado como corrompido nos Sistemas de Informação Laboratorial (LIS)? ...', hematologiaCorpus, [...])).toBe(false)` / `expect(result.passed).toBe(false)` / `expect(result.reason).toMatch(/ancoragem\|material enviado/i)` | `PASS ✓` |
| **REQ-03** (`RN-STU-007`) | `WHEN o sistema gerar flashcards ou questões de quiz para um material THE SYSTEM SHALL utilizar exclusivamente o texto extraído e os conceitos-chave presentes naquele material específico IF existirem tópicos fracos no perfil adaptativo do estudante que não pertençam ao corpus daquele material ou se o material possuir apenas título/nome da disciplina sem corpus válido THEN THE SYSTEM SHALL excluir os tópicos externos do prompt daquele material e recusar o uso de título ou nome da disciplina como fonte de geração` | `apps/study-engine/src/domain/services/StudyCorpusSanitizer.ts:L254-L265` (`filterTopicsGroundedInCorpus`), `apps/study-engine/src/domain/usecases/GenerateExtraSessionUseCase.ts:L82,L120-L136,L145-L161`, `apps/study-engine/src/domain/services/pedagogical-agents/PedagogicalCoordinatorAgent.ts:L80-L90` e `apps/study-engine/src/domain/services/pedagogical-agents/FlashcardSpecialistAgent.ts:L27,L38-L52,L87-L89` | `apps/study-engine/tests/domain/StudyCorpusSanitizer.test.ts:L147-L159` e `apps/study-engine/tests/domain/GenerateExtraSessionUseCase.test.ts:L295-L356` | `expect(filteredTopics).toHaveLength(1)` / `expect(passedFocusTopics.map((t: any) => t.topic)).toEqual(['eritropoiese medular'])` / `expect(passedOptions.keyConcepts).toEqual(['eritropoiese', 'eritropoietina', 'reticulócitos'])` / `expect(result.flashcards[0].tags).toContain('Hematologia I')` | `PASS ✓` |
| **REQ-04** | `WHEN o GeminiFlashAdapter construir prompts para resumo, flashcards ou questões de quiz THE SYSTEM SHALL instruir explicitamente o modelo a extrair informações única e exclusivamente do texto fornecido, proibindo o uso de conhecimento externo não presente no material e proibindo teorizar sobre arquivos corrompidos, estrutura de bytes ou cabeçalhos de arquivo` | `apps/study-engine/src/infrastructure/ai/GeminiFlashAdapter.ts:L245-L249,L276-L280,L392-L396,L430-L434,L494-L495,L577-L581,L619-L623,L646-L648,L690,L857` | `apps/study-engine/tests/infrastructure/GeminiFlashAdapter.test.ts:L214-L256` | `expect(promptText).toContain('FONTE ÚNICA E EXCLUSIVA (GROUNDING ESTRITO)')` / `expect(promptText).toContain('PROIBIDO usar conhecimento externo')` / `expect(cards).toHaveLength(1)` / `expect(cards[0].front).toContain('Dijkstra')` | `PASS ✓` |
| **REQ-05** | `WHEN GetDueFlashcardsUseCase ou GetQuizSessionUseCase buscar itens para revisão ou sessão de estudo THE SYSTEM SHALL filtrar e excluir flashcards e questões cujo enunciado ou resposta viole isPedagogicallyOffTopic ou isDocumentMetaReferencing (incluindo menções a arquivo corrompido, ilegível ou estrutura de bytes)` | `apps/study-engine/src/domain/usecases/GetDueFlashcardsUseCase.ts:L53-L63,L74-L79`, `apps/study-engine/src/domain/usecases/GetQuizSessionUseCase.ts:L44-L50` e `apps/study-engine/src/domain/usecases/GenerateExtraSessionUseCase.ts:L174-L181,L195-L200` | `apps/study-engine/tests/domain/GetDueFlashcardsUseCase.test.ts:L156-L193` e `apps/study-engine/tests/domain/GetQuizSessionUseCase.test.ts:L71-L113` | `expect(result.cards).toHaveLength(1)` / `expect(result.cards.some((c) => c.front.includes('corrompido') \|\| c.back.includes('estrutura de bytes'))).toBe(false)` / `expect(result.questions).toHaveLength(1)` / `expect(result.questions.some((q) => q.prompt.includes('corrompido'))).toBe(false)` | `PASS ✓` |
| **REQ-06** | `THE SYSTEM SHALL CONTINUE TO gerar e retornar normalmente flashcards, quizzes e resumos para materiais acadêmicos legítimos (incluindo Hematologia, Direito, Cálculo, etc.) mantendo intactos os contratos HTTP existentes` | `apps/study-engine/src/domain/usecases/ProcessMaterialUseCase.ts:L70-L167`, `apps/study-engine/src/domain/usecases/GenerateExtraSessionUseCase.ts:L67-L236`, `apps/study-engine/src/domain/usecases/GetDueFlashcardsUseCase.ts:L34-L85` e `apps/study-engine/src/domain/usecases/GetQuizSessionUseCase.ts:L37-L81` | `apps/study-engine/tests/domain/ProcessMaterialUseCase.test.ts:L13-L96`, `apps/study-engine/tests/domain/QualityGateAgent.test.ts:L9-L44`, `apps/study-engine/tests/domain/GenerateExtraSessionUseCase.test.ts:L41-L293`, `apps/study-engine/tests/domain/GetDueFlashcardsUseCase.test.ts:L6-L154` e `apps/study-engine/tests/domain/GetQuizSessionUseCase.test.ts:L7-L69` | `expect(result.status).toBe('READY')` / `expect(result.generatedFlashcardsCount).toBe(1)` / `expect(result.passed).toBe(true)` / `expect(result.score).toBe(100)` | `PASS ✓` |

---

## 3. Discrimination Sensor (Mutações Comportamentais)

> O Verifier injeta pequenas alterações comportamentais no código novo (uma por vez), roda a suíte de testes (`pnpm --filter @estuda-anne/study-engine test`), comprova que a suíte falha (mata a mutação) e reverte imediatamente.

| Mutação | Arquivo:Linha | Descrição da Mutação | Testes que Falharam (Killed?) | Status de Reversão |
| :--- | :--- | :--- | :--- | :--- |
| **Mutação 1** | `apps/study-engine/src/domain/services/StudyCorpusSanitizer.ts:L200` | Forçar `isGroundedInCorpus` a retornar `true` incondicionalmente no início da função | `✓ Killed (Exit 1) — 3 testes falharam: StudyCorpusSanitizer.test.ts:144 (expected true to be false), QualityGateAgent.test.ts:292 (expected true to be false), GenerateExtraSessionUseCase.test.ts:351 (expected [3 items] to equal ['eritropoiese medular'])` | Revertida e verificada |
| **Mutação 2** | `apps/study-engine/src/domain/services/StudyCorpusSanitizer.ts:L185-L191` | Remover detecção regex de `dados binários brutos / corrompido ou ilegível / não foi possível ler o arquivo / falha na estrutura de bytes` em `isUnusableStudyCorpus` | `✓ Killed (Exit 1) — 2 testes falharam em StudyCorpusSanitizer.test.ts:L103 (expected true to be false) e StudyCorpusSanitizer.test.ts:L122 (RN_STU_005_WHEN_corpus_or_card_mentions_corrupted_or_unreadable_file_bytes_SHALL_reject_as_unusable_and_off_topic: expected false to be true)` | Revertida e verificada |
| **Mutação 3** | `apps/study-engine/src/domain/usecases/GetDueFlashcardsUseCase.ts:L55-L58` | Remover filtros `!isDocumentMetaReferencing` e `!isPedagogicallyOffTopic` de `isCleanCard` na leitura de flashcards devidos | `✓ Killed (Exit 1) — 1 teste falhou em GetDueFlashcardsUseCase.test.ts:L188 (RN_STU_007_WHEN_fetching_due_flashcards_SHALL_filter_out_corrupted_file_or_meta_referencing_cards_from_bank: expected length 1, received 2)` | Revertida e verificada |

**Resultado do Sensor**: `3/3 killed - PASS ✓`

---

## 4. Gate Check Determinístico e Teste de Arquitetura

- **Comando do Gate Completo**: `PATH="/tmp/bin:$PATH" pnpm build && PATH="/tmp/bin:$PATH" pnpm test`
- **Comando do Teste de Arquitetura (ADR-0001)**: `PATH="/tmp/bin:$PATH" pnpm --filter @estuda-anne/study-engine test tests/domain/Architecture.test.ts`
- **Exit Code**: `0`
- **Integridade dos Testes**: Nenhum teste pré-existente foi removido, ignorado (`skip`) ou enfraquecido.
- **Cobertura Executada**: `6/6` pacotes do monorepo compilados (`tsc` / `next build`) e testados com sucesso (`26 passed` test files / `98 passed` tests em `@estuda-anne/study-engine`).

### Output Real do Gate Completo e Arquitetura

```text
> estuda-anne@1.0.0 build /home/james/Documentos/estuda-anne
> turbo build

• turbo 2.10.12
• Packages in scope: @estuda-anne/auth, @estuda-anne/bff, @estuda-anne/frontend, @estuda-anne/metrics, @estuda-anne/shared, @estuda-anne/study-engine
• Running build in 6 packages

 Tasks:    6 successful, 6 total
Cached:    6 cached, 6 total
  Time:    21ms >>> FULL TURBO

> estuda-anne@1.0.0 test /home/james/Documentos/estuda-anne
> turbo test

• turbo 2.10.12
• Packages in scope: @estuda-anne/auth, @estuda-anne/bff, @estuda-anne/frontend, @estuda-anne/metrics, @estuda-anne/shared, @estuda-anne/study-engine
• Running test in 6 packages

@estuda-anne/study-engine:test:  Test Files  26 passed (26)
@estuda-anne/study-engine:test:       Tests  98 passed (98)
@estuda-anne/study-engine:test:    Duration  2.10s

 Tasks:    6 successful, 6 total
Cached:    6 cached, 6 total
  Time:    19ms >>> FULL TURBO

> @estuda-anne/study-engine@1.0.0 test /home/james/Documentos/estuda-anne/apps/study-engine
> vitest run tests/domain/Architecture.test.ts

 ✓ tests/domain/Architecture.test.ts (1 test) 8ms
   ✓ Arquitetura DDD Linear (enforced-by: docs/adr/0001-ddd-linear.md) > ADR-0001: src/domain não depende de application nem de infrastructure 7ms

 Test Files  1 passed (1)
      Tests  1 passed (1)
```

---

## 5. Parecer e Próximos Passos
- **Veredito**: `APROVADO para PR (Overall: PASS)`
- **Notas para Revisão**: Todos os 6 requisitos EARS (`REQ-01` a `REQ-06`) e regras `RN-STU-005`, `RN-STU-006` e `RN-STU-007` estão ancorados em código e testes determinísticos. As 3 mutações comportamentais foram mortas pela suíte e revertidas, e a fronteira arquitetural `ADR-0001` permanece íntegra.
