---
paths:
  - "apps/**/src/application/**"
  - "packages/shared/**"
  - "**/contracts/**"
---

# Regra de Contratos e DTOs Públicos (Capítulo 6 - Cercando a IA)

Você está editando camadas de **Contratos Públicos, Rotas HTTP ou DTOs compartilhados**.

1. **Compatível ou Versionado**:
   - Toda alteração em contrato consumido pelo Frontend ou outros serviços deve ser retrocompatível (ex: novos campos opcionais) ou explicitamente versionada (`v1` -> `v2`).
   - Remoção de campo exige período de deprecação documentado.

2. **Expand / Contract**:
   - Para tornar um campo obrigatório no request:
     1. Produtor/Backend aceita com e sem o campo.
     2. Consumidor/Frontend passa a enviar o campo obrigatoriamente.
     3. Produtor/Backend passa a exigir o campo.

3. **Ordem de Alteração**:
   - Ao acrescentar: Contrato/Shared -> Produtor/Backend -> Consumidor/Frontend.
   - NUNCA suba o consumidor antes do backend suportar a alteração.
