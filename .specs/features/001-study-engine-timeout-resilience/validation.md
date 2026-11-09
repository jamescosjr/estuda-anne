# Resiliência contra Timeouts e Bloqueio de Event Loop no Study Engine & BFF — Validation Report

> **Gerado pelo Verifier Independente (`agent-verifier`)** — autor ≠ verificador, contexto limpo.
> **Regra:** "Evidência ou zero" — requisito sem arquivo:linha e asserção de teste verificável conta como não coberto.

---

## 1. Summary

- **Overall**: `✓ Ready — PASS`
- **Spec-Anchored Check**: `6/6 critérios validados com arquivo:linha e asserção exata`
- **Discrimination Sensor**: `3/3 mutações comportamentais mortas (killed)`
- **Gate Check**: `Build exit 0, Testes exit 0`

---

## 2. Spec-Anchored Acceptance Criteria

| Requirement ID | Cláusula EARS da Spec | Arquivo de Teste:Linha | Asserção Verificada | Status |
| :--- | :--- | :--- | :--- | :--- |
| **REQ-01** | `WHEN um arquivo PDF for processado pelo DocumentTextExtractor THE SYSTEM SHALL extrair strings literais (Tj e TJ) usando varredura linear limitada sem expressões regulares sujeitas a backtracking exponencial sobre bytes binários brutos` | `apps/study-engine/tests/infrastructure/DocumentTextExtractor.test.ts:L10-L20` | `expect(extracted).toContain('Arquitetura Hexagonal e DDD')` / `expect(extracted).toContain('com (Portas)')` | `PASS ✓` |
| **REQ-02** | `IF um buffer de PDF contiver streams compactados ou binários extensos THEN THE SYSTEM SHALL limitar a inspeção de streams e o tamanho processado de forma determinística concluindo a extração em menos de 500ms sem bloquear o Event Loop` | `apps/study-engine/tests/infrastructure/DocumentTextExtractor.test.ts:L22-L49` | `expect(elapsedMs).toBeLessThan(500)` / `expect(result).toContain('Conceito extraido com seguranca')` / `expect(emptyStreamResult).toBe('')` | `PASS ✓` |
| **REQ-03** | `WHEN o MongoConnection inicializar o MongoClient nos serviços (study-engine, auth e metrics) THE SYSTEM SHALL configurar maxIdleTimeMS: 30000, socketTimeoutMS: 30000 e connectTimeoutMS: 10000 além de serverSelectionTimeoutMS: 15000` | `apps/study-engine/tests/infrastructure/MongoConnection.test.ts:L45-L60` | `expect(mongoClientInstances[0].options).toEqual({ maxPoolSize: 10, minPoolSize: 1, serverSelectionTimeoutMS: 15000, maxIdleTimeMS: 30000, socketTimeoutMS: 30000, connectTimeoutMS: 10000 })` | `PASS ✓` |
| **REQ-04** | `WHEN o GeminiFlashAdapter criar um cache de contexto via GoogleAICacheManager THE SYSTEM SHALL utilizar o modelo ativo 'models/gemini-3.6-flash' (ou variável configurada) em vez do modelo depreciado 'models/gemini-1.5-flash-001'` | `apps/study-engine/tests/infrastructure/GeminiFlashAdapter.test.ts:L258-L286` e `apps/study-engine/tests/domain/ProcessMaterialUseCase.test.ts:L241-L348` | `expect(createCacheSpy).toHaveBeenCalledWith(expect.objectContaining({ model: 'models/gemini-3.6-flash', ttlSeconds: 600 }))` / `expect(handle?.cache?.model).toBe('models/gemini-3.6-flash')` | `PASS ✓` |
| **REQ-05** | `WHEN o BFF realizar chamadas HTTP ao Study Engine nas rotas de listagem, consulta por ID, criação, processamento assíncrono e exclusão de materiais THE SYSTEM SHALL aplicar AbortSignal.timeout explícito em cada requisição fetch IF o Study Engine exceder o limite de tempo THEN THE SYSTEM SHALL registrar o erro estruturado e responder imediatamente sem aguardar HeadersTimeoutError padrão do Undici` | `apps/bff/tests/studyRoutes.materials-timeout.test.ts:L17-L111` | `expect(fetchCalls).toHaveLength(5)` / `expect(call.init?.signal).toBeInstanceOf(AbortSignal)` / `expect(listRes.statusCode).toBe(503)` / `expect(deleteRes.statusCode).toBe(500)` | `PASS ✓` |
| **REQ-06** | `THE SYSTEM SHALL CONTINUE TO extrair texto válido de documentos PDF, DOCX, PPTX e TXT legítimos e preservar integralmente os contratos públicos de resposta do BFF e do Study Engine` | `apps/study-engine/tests/infrastructure/DocumentTextExtractor.test.ts:L51-L142` e `apps/bff/tests/studyRoutes.materials-timeout.test.ts:L50-L79` | `expect(extractTextFromPptxBuffer(pptx)).toContain('Redes Neurais e Transformers')` / `expect(extractTextFromDocxBuffer(docx)).toContain('verbe etre')` / `expect(uploadRes.statusCode).toBe(202)` | `PASS ✓` |

---

## 3. Discrimination Sensor (Mutações Comportamentais)

> O Verifier injeta pequenas alterações no código novo (inverte condição, apaga retorno, altera constantes) para provar que a suíte fica vermelha (mata a mutação).

| Mutação | Arquivo:Linha | Descrição da Mutação | Testes que Falharam (Killed?) |
| :--- | :--- | :--- | :--- |
| **A** | `apps/study-engine/src/infrastructure/extraction/DocumentTextExtractor.ts:L95` | Retornar `[]` precocemente em `extractPdfLiteralStrings` quando `operator === 'Tj'` | `✓ Killed — 5 testes falharam em DocumentTextExtractor.test.ts (incluindo REQ_01 na L16 e REQ_02 na L47)` |
| **B** | `apps/study-engine/src/infrastructure/persistence/mongo/MongoConnection.ts:L36` | Alterar `maxIdleTimeMS: 30000` para `maxIdleTimeMS: 0` nas opções do `MongoClient` | `✓ Killed — 1 teste falhou em MongoConnection.test.ts:L51 (Expected maxIdleTimeMS: 30000, Received: 0)` |
| **C** | `apps/bff/src/application/routes/studyRoutes.ts:L87` | Remover `signal: AbortSignal.timeout(15000)` de `deleteMaterialHandler` | `✓ Killed — 1 teste falhou em studyRoutes.materials-timeout.test.ts:L82 (expected undefined to be an instance of AbortSignal)` |

**Resultado do Sensor**: `3/3 killed - PASS ✓`

---

## 4. Gate Check

- **Comando do Gate**: `pnpm build && pnpm test`
- **Exit Code**: `0`
- **Integridade dos Testes**: Nenhum teste legado foi removido, pulado (`skip`) ou enfraquecido (`26 passed` test files / `89 passed` tests em `@estuda-anne/study-engine`, `6/6` pacotes com build e test verdes).
- **Delta de Testes**: `+7 novos testes adicionados` (`REQ_01`, `REQ_02`, `REQ_06` em `DocumentTextExtractor.test.ts`, `REQ_03` em `MongoConnection.test.ts`, `REQ_04` em `GeminiFlashAdapter.test.ts` e 2 testes `REQ_05` em `studyRoutes.materials-timeout.test.ts`).

---

## 5. Parecer e Próximos Passos
- **Veredito**: `APROVADO para PR`
- **Notas para Revisão**: PR draft pode ser promovido para revisão do `agent-cleancode` e aprovação humana.
