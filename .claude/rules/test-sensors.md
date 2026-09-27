---
paths:
  - "**/*.test.ts"
  - "**/tests/**"
---

# Regra de Testes como Sensores (Capítulo 7 - Cercando a IA)

Você está editando arquivos de **Testes**.

1. **Teste é Sensor**:
   - Cada teste deve medir uma única coisa clara e ter nome expressivo.
   - Testes de regra de negócio devem conter o ID da regra e a cláusula no nome:
     `it('RN_STU_001_WHEN_..._SHALL_...', ...)`
   - Isso permite ao desenvolvedor e ao agente executar filtros rápidos: `pnpm test -t 'RN_STU_'`.

2. **Proibição de Enfraquecimento**:
   - NUNCA remova um teste que falhou para "resolver" uma task.
   - NUNCA diminua asserções nem transforme asserções estritas em genéricas.
   - O gate de testes é o sensor externo determinístico que decide se a task terminou.
