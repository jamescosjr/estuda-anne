---
paths:
  - "apps/**/src/domain/**"
  - "packages/**/src/domain/**"
---

# Regra de Domínio Puro (enforced-by: ADR-0001)

Você está editando a camada de **Domínio** (`src/domain/`).

1. **Zero Dependência Externa**:
   - NUNCA importe nada de `src/application/` ou `src/infrastructure/`.
   - NUNCA importe frameworks de I/O, bancos de dados ou APIs externas (`fastify`, `mongodb`, `@aws-sdk`, `axios`, etc.).
   - O teste `apps/study-engine/tests/domain/Architecture.test.ts` falha o build se encontrar violações.

2. **Portas e Interfaces**:
   - Qualquer necessidade de I/O, banco ou IA externa deve ser declarada como interface em `src/domain/ports/` e injetada no construtor dos use cases.

3. **Regras de Negócio com ID e EARS**:
   - Toda regra de negócio deve ter ID rastreável registrado em `docs/regras/<servico>.md` (ex: `RN-STU-001`).
   - Violações devem lançar `DomainRuleViolation(ruleId, motivo)`.
   - NUNCA decida código HTTP dentro do domínio — o domínio lança erros de domínio; controllers traduzem para HTTP.
