# T6 — Revisão Final e Prompt de Execução na VPS (`backend-reviewer` + `frontend-reviewer`)

- **Status:** `[x] Especificado / Pronto para VPS`
- **Ambiente Alvo:** VPS `/srv/estuda-anne`

## 1. Checklist de Revisão Independente (`backend-reviewer` + `frontend-reviewer`)
- [ ] **Segurança de Logs (`T2`):** `auth.middleware.ts` registra `reason` (`missing_authorization_header`, `malformed_authorization_header`, `token_expired`, `invalid_token`) e `code` nos logs estruturados **sem jamais logar o token JWT ou o header `Authorization` bruto**.
- [ ] **Propagação de Contrato (`T0`/`T2`/`T4`):** O retorno `401` com `{ message, code, reason }` chega íntegro do serviço `Auth` -> `BFF` -> `route.ts` -> `auth-context.tsx`.
- [ ] **Saneamento de Sessão (`T4`):** `auth-context.tsx` valida o JWT via `isJwtValid(token)` na hidratação inicial (limpando sessões antigas/demo sem token ou expiradas) e trata `401` em `updateProfile` executando `logout()` e exibindo mensagem clara ao adicionar matéria no perfil.
- [ ] **Infraestrutura de Logs (`T1`):** `docker-compose.yml` contém `driver: "json-file"` com `max-size: "10m"` e `max-file: "3"` em todos os serviços, e a leitura direta de `/var/lib/docker/containers/*/*-json.log` foi documentada e validada.
- [ ] **Gates de Qualidade (`T3`/`T5`):** `lint`, `typecheck`, `test` (backend) e `lint`, `typecheck`, `build` (frontend) executados com resultados reais registrados em `PLANO_ESTEIRA_AGENTS.md`.
- [ ] **Invariantes de Produção:** Nenhum arquivo `.env`, segredo ou banco de dados foi modificado ou exposto; nenhum commit ou restart destrutivo foi feito sem aprovação.

## 2. Formato Obrigatório do Relatório Final do `agent-coordinator`
Ao concluir `T0`–`T6` na VPS, o `agent-coordinator` deve apresentar ao usuário:
1. **Objetivo cumprido** (resolução do bloqueio de leitura de logs + diagnóstico seguro de `401` + correção da sessão/perfil ao adicionar matéria).
2. **Arquivos alterados por pacote/serviço** (`docker-compose.yml`, `auth.middleware.ts`, testes de auth, `auth-context.tsx`, `route.ts`).
3. **Comandos executados e resultados reais** (leitura direta dos `*-json.log`, `lint`, `typecheck`, `test`, `build`).
4. **Ações manuais pendentes** (ex.: comando seguro para aplicar a rotação de logs nos containers quando houver janela de manutenção).
