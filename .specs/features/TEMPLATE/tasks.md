# <Título da Feature> Tasks

> **Regra do método:** Cada tarefa é uma unidade atômica (1 tarefa = 1 teste red -> green -> commit atômico ≤ 400 linhas).
> O comando do gate é o que decide se a tarefa terminou, não a autoavaliação do agente.

---

### T1: <Nome da Tarefa 1>
- **What**: <Descrição precisa da implementação e teste 1:1 associado>
- **Where**: `<caminhos dos arquivos de código e teste>`
- **Depends on**: `<nenhuma | T(n-1)>`
- **Requirement**: `REQ-01`
- **Done when**:
  - [ ] Teste unitário associado criado e passando
  - [ ] Quick gate passa: `pnpm --filter <servico> test -t '<ID_TESTE>' exit 0`
- **Status**: `Todo`

---

### T2: <Nome da Tarefa 2>
- **What**: <Descrição precisa>
- **Where**: `<caminhos>`
- **Depends on**: `T1`
- **Requirement**: `REQ-02`
- **Done when**:
  - [ ] Gate do serviço passa: `pnpm --filter <servico> test exit 0`
- **Status**: `Todo`

---

## Gate Humano 2 — Aprovação do "Como"
- **Aprovado por**: `<Tech Lead / Arquiteto>`
- **Data**: `YYYY-MM-DD`
- **Decisão**: APROVADO para Execução.
