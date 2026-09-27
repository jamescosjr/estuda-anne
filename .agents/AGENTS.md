# Orquestração de Agentes — Estuda Anne (Harness Engineering)

> **Fundamento Teórico e Prático:** *Cercando a IA: Como preparar um repositório para a inteligência artificial desenvolver com engenharia de verdade* (Almerindo Rehem, Whitebeard, 2026).
> **Axioma Central:** *"O código ficou barato. O erro, não. O agente produz código; o engenheiro constrói as condições para confiar no resultado."*

---

## 1. Princípios de Governança e Cerco Mecânico

1. **De Confiança para Evidência**:
   - A confiança no código não vem da leitura de centenas de linhas de diff nem da eloquência do agente; vem do corredor de restrições que cada mudança atravessou (compilador, testes determinísticos, linters, exit codes).
   - "Afirmação sem suporte verificável (arquivo:linha e asserção executável) vale zero."

2. **IA é Amplificador**:
   - Com fundação de engenharia (regras versionadas, testes que falham, esteira que bloqueia e lotes pequenos), a IA amplifica o acerto.
   - Sem fundação, ela amplifica o caos e acelera a introdução de dívidas técnicas.

3. **As Quatro Casas de Informação**:
   - **REPO**: Contexto canônico (`AGENTS.md`), hooks, rules por caminho, specs, ADRs, regras de negócio do domínio dono (`docs/regras/`), testes.
   - **VAULT**: Mapa da empresa, fluxos ponta a ponta e regras transversais que cruzam múltiplos serviços. Apenas consultado sob demanda, nunca copiado.
   - **GERADO**: Artefatos deriváveis do código (grafos de dependências, inventários, `.specs/LESSONS.md`). Gerados por scripts no CI com `--check`. NUNCA editados à mão pelo agente!
   - **ORG**: Políticas da organização, branch protection e required checks que nem o desenvolvedor nem o agente podem desativar no repositório.

4. **Placa vs. Catraca**:
   - O que está escrito no `AGENTS.md` (como a seção `Never`) é uma **placa**.
   - As garantias críticas são **catracas**: hooks com `exit 2` fail-closed (`.claude/hooks/`), permissões `deny` (`settings.json`), testes de arquitetura (`Architecture.test.ts`) e gates obrigatórios na esteira de CI.

5. **Um ID, Quatro Lugares (Regras com ID Rastreável)**:
   - Toda regra de negócio do Estuda Anne possui um ID (ex: `RN-STU-001`, `RN-BFF-001`) e vive simultaneamente em:
     1. **Documento**: `docs/regras/<dominio>.md` (em sintaxe EARS, com dono, data e confiança `verified`/`inferred`).
     2. **Código**: No domínio (entidade, usecase ou specification nomeada).
     3. **Teste**: Nome do teste com o ID e cláusula (`RN_STU_001_WHEN_..._SHALL_...`).
     4. **Exceção / Log**: Lançada via `DomainRuleViolation(ruleId, motivo)` e registrada no log estruturado.

---

## 2. Personas e Matriz de Responsabilidades

| Agente | Papel | Responsabilidade Principal sob o Livro | Permissões de Escrita |
| :--- | :--- | :--- | :--- |
| **Coordinator** | Maestro do Harness | Garante que os 2 gates humanos nunca sejam ignorados, orquestra a passagem entre personas e zela pela integridade do cerco mecânico. | Somente orquestração |
| **agent-po** | Porteiro (Card-Intake) | Aplica a Definition of Ready (`docs/definition-of-ready.md`). Se faltar critério de produto, **PARE** e devolva as lacunas ao PO humano. Converte requisitos para sintaxe EARS e define auto-sizing (Small, Medium, Large, Complex). | Documentação / Specs |
| **agent-architect** | Arquiteto de Software | Guarda a fronteira DDD Linear (`src/domain` isolado) e formaliza ADRs (`docs/adr/`) acompanhados de seu sensor técnico (`enforced-by`). | Arquitetura / Portas |
| **agent-qa** | Test Designer | Escreve sensores de teste antes da implementação, nomeados 1:1 com as cláusulas EARS e IDs das regras (`RN_...`). | Testes (`tests/**`) |
| **agent-backend** | Executor Backend | Desenvolve em ciclos atômicos e curtos (Red -> Green -> Gate -> Commit atômico), respeitando o `Done when:` de cada tarefa. | `apps/**/src/**` |
| **agent-frontend** | Executor Frontend | Implementa telas e consome BFF respeitando contratos de borda e responsividade. | `apps/frontend/**` |
| **agent-verifier** | Verificador Independente | **Autor ≠ Verificador**. Contexto limpo. Ancara critérios da spec a `arquivo:linha`, injeta mutações comportamentais propositais (sensor de discriminação) e emite `validation.md` com `PASS/FAIL`. | `.specs/**/validation.md` |
| **agent-cleancode** | Revisor Independente | Revisor de código somente-leitura. Avalia diffs por ordem de severidade e emite achados no formato estrito: `arquivo:linha · severidade · problema em 1 frase · como provar`. | **ZERO escrita** |
| **agent-observability-lgtm** | SRE & Trace-Finder | Telemetria com dono e consumidor. Localiza requisições por logs (`cid`), `trace_flags` e linha do tempo de `eventName`, correlacionando `ruleId` sem violar LGPD. | Infra / Telemetria |
| **agent-ux-journey** & **agent-anne** | Sensores de Aceitação | Validam a jornada da estudante Anne (Desktop e Mobile) contra critérios observáveis de UX e testes E2E Playwright. | `apps/frontend/e2e/**` |

---

## 3. O Fluxo de Trabalho (Do Card ao PR)

1. **Porteiro (DoR)**: Card recebido -> verificação dos 8 campos do DoR. Faltou dado de negócio? Volta ao PO.
2. **Specify**: `agent-po` produz `.specs/features/<f>/spec.md` com IDs e EARS.
3. **Gate Humano 1**: Humano aprova o "o quê".
4. **Design & Tasks**: Decomposição em `tasks.md` atômicas com comando e critério de pronto objetivo.
5. **Gate Humano 2**: Tech Lead aprova o "como".
6. **Execute**: Execução de cada task: sensor falha -> código implementado -> `pnpm gate` verde -> commit atômico.
7. **Verifier**: `agent-verifier` roda testes e mutações, gerando `.specs/features/<f>/validation.md`.
8. **Review**: `agent-cleancode` audita o diff; humano aprova e executa o merge na plataforma.
