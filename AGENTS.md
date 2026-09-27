# Estuda Anne — Contexto Canônico do Repositório

Contexto canônico lido por qualquer agente de IA (Antigravity, Claude Code, Cursor, Copilot).
Só fatos que o agente não adivinha: comandos com custo, gotchas, regras da casa e matriz de testes.
Menos de 150 linhas. Detalhes arquiteturais em `docs/architecture.md`.

## Comandos com Custo
- **Gate Completo**: `pnpm build && pnpm test` (≈ 4 s; SEMPRE obrigatório antes de entregar qualquer PR)
- **Compilação de Tipos**: `pnpm build` (≈ 1.5 s; turbo + tsc em todos os apps)
- **Testes Rápidos de Regra**: `pnpm --filter @estuda-anne/study-engine test -t 'RN_'` (≈ 0.8 s; use durante iteração)
- **Teste de Arquitetura**: `pnpm --filter @estuda-anne/study-engine test tests/domain/Architecture.test.ts` (≈ 0.3 s; valida ADR-0001)
- **Rodar Local (Dev)**: `pnpm dev` (Fastify no port 3001/3002, Next.js no 3000)
- **Formatar**: `npx prettier --write <arquivo>` (hook roda automaticamente no arquivo tocado)

## Definição de Pronto (Baseada em Evidência)
Build sem erro + testes verdes + contrato sem quebra + `.specs/features/<f>/validation.md` com PASS gerado por Verifier independente + output real colado no PR. Sem evidência executável, não está pronto.

## Gotchas (O que o agente não adivinha)
- `vitest run` não valida tipagem do monorepo; "testes verdes" ≠ "build verde" — gate canônico = `pnpm build && pnpm test`.
- `domain` é puro (ADR-0001): NUNCA importe `application`, `infrastructure`, `mongodb`, `fastify` ou `@aws-sdk` em `src/domain/`.
- Regra de Negócio: toda recusa de negócio no domínio deve lançar `DomainRuleViolation(ruleId, motivo)` com ID rastreável.
- Observabilidade: nunca use `console.log` solto; use logger estruturado contendo `cid` (correlationId) e `ruleId` em descartes.
- Privacidade LGPD: NUNCA imprima nos logs e-mails, documentos de estudantes ou tokens JWT desmascarados.
- Respostas de IA: todo output gerado por Gemini/Whisper deve passar pelo `StudyCorpusSanitizer` e `QualityGateAgent`.

## Onde Estão as Regras (Endereços Exatos)
- **Regras de Negócio**: `docs/regras/` (`study-engine.md`, `bff.md`) — formato EARS com IDs `RN-STU-*`.
- **Decisões de Arquitetura**: `docs/adr/` (com `enforced-by` e instruções ao agente).
- **Prontidão de Tarefa (DoR)**: `docs/definition-of-ready.md` (o agente para se faltar campo do PO).
- **Specs, Tasks e Validação**: `.specs/features/` (fluxo spec-driven com 2 gates humanos e verifier).
- **Produção e Rastreabilidade**: `docs/debug-prod.md` (coordenadas de logs, traces e primeiro movimento por sintoma).
- **Arquitetura Técnica**: `docs/architecture.md` (detalhes das camadas DDD Linear).

## Processo (Spec-Driven com 2 Gates Humanos)
1. **Entrada via DoR**: `agent-po` aplica `docs/definition-of-ready.md`. Se faltar critério do PO, PARE; não invente.
2. **Specify**: Cria `.specs/features/<f>/spec.md` com critérios em sintaxe EARS e IDs `REQ-01..N`.
3. **Gate Humano 1 (O Quê)**: Humano aprova a especificação antes do código.
4. **Design & Tasks**: Decomposição em tarefas atômicas em `tasks.md` com `Done when:` em comandos.
5. **Gate Humano 2 (Como)**: Humano aprova o plano de tarefas.
6. **Execute**: 1 task = 1 teste (Red) -> implementação (Green) -> Gate -> 1 commit atômico (PR ≤ 400 linhas).
7. **Verifier Independente**: `agent-verifier` (autor ≠ verificador) roda mutações, ancora critérios em `arquivo:linha` e emite `validation.md`.

## Testes (Matriz de Cobertura por Camada)
| Camada | Tipo | Expectativa | Local | Comando |
| :--- | :--- | :--- | :--- | :--- |
| **Domain** | unit | 1:1 com regra EARS, edge cases, nomes `RN_<DOM>_<N>_*` | `apps/*/tests/domain/` | `pnpm test -t 'RN_'` |
| **Application** | integration | Handlers, DTOs, validação de payload, injeção de correlationId | `apps/*/tests/application/` | `pnpm test` |
| **Arquitetura** | arch-test | Isolamento do domínio sem imports proibidos (ADR-0001) | `apps/*/tests/domain/Architecture.test.ts` | `pnpm test -t 'ADR-'` |
| **E2E / Anne** | e2e multi-device | Jornada da aluna Desktop e Mobile (Playwright) | `apps/frontend/e2e/` | `pnpm --filter @estuda-anne/frontend test:e2e` |
| **Contratos** | contract | DTOs e Schemas compartilhados sem quebras de compatibilidade | `packages/shared/` | `pnpm build` |

## Never (A Placa que Vira Catraca)
- NUNCA editar `.env*`, `pnpm-lock.yaml`, `docs/generated/*` ou snapshots de teste sem autorização humana expressa (hook bloqueia com exit 2).
- NUNCA executar `git push --force`, `git push -f`, `git reset --hard` ou `--no-verify` (hook bloqueia com exit 2).
- NUNCA remover ou enfraquecer testes para fazer o gate passar.
- NUNCA importar `infrastructure` ou `application` a partir de `domain` para resolver erro de build.
- NUNCA inventar critérios de produto ou decisões de negócio quando o card for omisso: registre `[NEEDS CLARIFICATION]` e pare.
