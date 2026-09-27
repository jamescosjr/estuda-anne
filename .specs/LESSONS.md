# Lições Aprendidas do Processo (LESSONS.md)

> **Arquivo Gerado pelo Processo (Casa GERADO — Ninguém edita à mão)**
> Registra desvios de processo, armadilhas identificadas e sinais de falsos-verdes para alimentar o circuito de auto-ajuste e as reuniões de evolução do harness.

---

### L-001 — Nunca julgar um gate apenas pelo executor de testes sem compilação de tipos
- **Sinal**: `gate_falso_verde`
- **Recorrência**: 1
- **Escopo**: `tooling/build`
- **Evidência**: Vitest com `isolatedModules` ou sem `tsc --noEmit` deixa passar erros de tipagem em runtime.
- **Remédio Aplicado**: O comando do gate canônico é sempre composto: `pnpm build && pnpm test`. Adicionado a `AGENTS.md` (seção Gotchas).
- **Última observação**: 2026-09-26

---

### L-002 — Falha de acesso ou ausência de sinal não é evidência de ausência de dados
- **Sinal**: `leitura_cega`
- **Recorrência**: 1
- **Escopo**: `observability/audit`
- **Evidência**: Consultas em logs que retornam vazio por falta de permissão ou filtro de janela incorreto não significam que o evento não ocorreu.
- **Remédio Aplicado**: Toda conclusão negativa deve declarar como procurou e qual janela foi usada. Registrado em `docs/debug-prod.md`.
- **Última observação**: 2026-09-26
