# Plano de Coordenação e Execução da Esteira (`estuda-anne`)

> **Ponto de Entrada:** `agent-coordinator`  
> **Ambiente Alvo:** `/srv/estuda-anne` (Monorepo + Containers Docker na VPS)  
> **Objetivo:** Resolver de ponta a ponta (1) o bloqueio de leitura do `docker logs` e ausência de motivos de erro nos logs de autenticação e (2) o erro `401 Unauthorized` ao adicionar matéria no perfil da usuária (`updateProfile`).

---

## 1. Mapa de Situação dos Agentes (Single Source of Truth)

Todo agente acionado pelo coordenador **deve ler esta tabela antes de iniciar** e **atualizar a coluna `Status VPS` e `Evidência`** ao finalizar sua etapa em `/srv/estuda-anne`.

| ID | Etapa da Esteira | Agente / Skill | Repositório / Escopo | Arquivos Alvo | EspecificaçãoDetalhada | Status Prep | Status VPS | Gate / Evidência Obrigatória |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **T0** | Alinhamento de Contrato e Risco | `agent-coordinator` + `/agent-architect` | Cross-stack (`Auth` ↔ `BFF` ↔ `Frontend`) | `auth.middleware.ts`, `route.ts`, `auth-context.tsx` | Este documento (Seção 3) | `[x] Pronto` | `[ ] Pendente` | Definição do payload de erro 401 (`code`/`reason`/`message`) sem quebra de contrato |
| **T1** | Destravamento e Rotação de Logs Docker | `/observability-lgtm` | Infra / Containers (`/srv/estuda-anne`) | `docker-compose.yml` (ou manifesto equivalente) | `tasks/T1-observabilidade-docker-logs.md` | `[x] Pronto` | `[ ] Pendente` | Leitura direta dos `*-json.log` validada + política `max-size: "10m"` / `max-file: "3"` aplicada |
| **T2** | Observabilidade Segura de 401 no Auth | `backend-engineer` + `/agent-dev-backend` + `/observability-lgtm` | Backend (`Auth` / `BFF`) | `auth.middleware.ts`, `authRoutes.ts` | `tasks/T2-T3-backend-auth-middleware.md` | `[x] Pronto` | `[ ] Pendente` | Logs estruturados registrando o motivo do 401 (`missing_authorization_header`, `malformed_authorization_header`, `token_expired`, `invalid_token`) **sem** expor o token |
| **T3** | Validação e Gate de Backend | `backend-quality` + `/agent-qa` | Backend (`Auth` / `BFF`) | Testes unitários do middleware de Auth | `tasks/T2-T3-backend-auth-middleware.md` | `[x] Pronto` | `[ ] Pendente` | Execução real de `lint`, `typecheck`, `test` / `gate` do backend passando |
| **T4** | Saneamento de Sessão e Tratamento de 401 no Perfil | `frontend-engineer` + `/frontend-dev` | Frontend (`apps/frontend`) | `auth-context.tsx`, `route.ts` | `tasks/T4-T5-frontend-auth-context.md` | `[x] Pronto` | `[ ] Pendente` | Hidratação rejeita sessão sem token/expirada (`isJwtValid`); `updateProfile` trata `401` limpando sessão inválida e orientando novo login |
| **T5** | Validação e Gate de Frontend | `frontend-quality` + `/frontend-qa` | Frontend (`apps/frontend`) | `apps/frontend` | `tasks/T4-T5-frontend-auth-context.md` | `[x] Pronto` | `[ ] Pendente` | Execução real de `lint`, `typecheck` e `build` em `apps/frontend` |
| **T6** | Revisão Final Cross-Stack | `backend-reviewer` (`/agent-verifier`) + `frontend-reviewer` (`/frontend-review`) | Cross-stack | Todos os arquivos alterados em T1–T4 | `tasks/T6-revisao-e-prompt-vps.md` | `[x] Pronto` | `[ ] Pendente` | Resumo executivo de entrega no padrão do `agent-coordinator` |

---

## 2. Contexto Técnico Confirmado (Inspeção Prévia)

1. **Cadeia da Requisição com Falha (`401 Unauthorized` ao adicionar matéria no perfil):**
   - `Browser (auth-context.tsx -> updateProfile)` ➔ `Frontend Route Proxy (172.16.1.7 - route.ts L1:160)` ➔ `BFF (172.16.1.6)` ➔ `Auth Service (authRoutes.ts L1:120 / auth.middleware.ts L1:120)`.
   - O proxy (`route.ts`) e o `BFF` preservam e encaminham corretamente o header `Authorization`.
   - O `auth.middleware.ts` retorna `401` quando:
     1. O header `Authorization` está ausente (`missing_authorization_header`);
     2. O header não inicia com `Bearer ` ou o token após `Bearer ` é vazio (`malformed_authorization_header`);
     3. O JWT está expirado (`token_expired`) ou com assinatura/formato inválido (`invalid_token`).
   - No `auth-context.tsx` (`L140:290`), o cliente só envia `Authorization: Bearer <token>` se houver `token` na sessão armazenada. Sessões antigas/demonstração (com objeto `user` salvo no storage, mas sem `token` válido) ou tokens expirados mantêm a usuária visualmente "logada", mas falham com `401` ao salvar matéria no perfil (`updateProfile`).

2. **Bloqueio no `docker logs`:**
   - Todos os containers utilizam o driver `json-file`.
   - Os arquivos `/var/lib/docker/containers/<id>/<id>-json.log` existem e possuem dados para **BFF, Mongo, Auth, Study Engine e Metrics** (enquanto **Nginx e Frontend** estão com log vazio `0 bytes`).
   - O endpoint `docker logs` bloqueia no daemon em alguns containers, exigindo leitura direta dos arquivos `*-json.log` para diagnóstico imediato e configuração de rotação (`max-size: "10m"` / `max-file: "3"`) no `docker-compose.yml` para evitar bloqueio do daemon.

---

## 3. Contrato Cross-Stack (`T0` — Especificado pelo `agent-coordinator`)

O retorno HTTP `401` emitido pelo `auth.middleware.ts` (e repassado intacto pelo `BFF` e pelo `route.ts` até o `auth-context.tsx`) segue o contrato padronizado abaixo:

```json
{
  "message": "Sua sessão expirou. Faça login novamente.",
  "code": "TOKEN_EXPIRED",
  "reason": "token_expired"
}
```

| `reason` (Log interno + JSON) | `code` (JSON 401) | Condição de Disparo | Ação no Frontend (`auth-context.tsx`) |
| :--- | :--- | :--- | :--- |
| `missing_authorization_header` | `MISSING_AUTH_HEADER` | `!authHeader` ou string vazia | Limpar sessão (`logout()`) e solicitar novo login |
| `malformed_authorization_header` | `MALFORMED_AUTH_HEADER` | Não começa com `Bearer ` ou token vazio | Limpar sessão (`logout()`) e solicitar novo login |
| `token_expired` | `TOKEN_EXPIRED` | `jwt.verify` lança `TokenExpiredError` | Limpar sessão (`logout()`) e avisar que a sessão expirou |
| `invalid_token` | `INVALID_TOKEN` | `jwt.verify` lança `JsonWebTokenError` / outro | Limpar sessão (`logout()`) e solicitar novo login |

> **Invariante de Segurança:** Nenhum log de `Auth`, `BFF` ou `Frontend` pode imprimir o valor de `Authorization` ou a string do JWT.

---

## 4. Detalhamento das Tarefas e Referências de Código

As implementações de referência completas para cada etapa estão consolidadas nos arquivos de `tasks/`:

1. **[tasks/T1-observabilidade-docker-logs.md](file:///home/james/Documentos/estuda-anne/tasks/T1-observabilidade-docker-logs.md):**
   - Script bash de leitura direta de `/var/lib/docker/containers/<id>/<id>-json.log` via `docker inspect --format '{{.LogPath}}'` (evitando o travamento do `docker logs`).
   - Bloco YAML `x-logging` (`driver: "json-file"`, `max-size: "10m"`, `max-file: "3"`) para todos os serviços do `docker-compose.yml`.
   - Verificação de `stdout`/`stderr` para `nginx` e `frontend`.
2. **[tasks/T2-T3-backend-auth-middleware.md](file:///home/james/Documentos/estuda-anne/tasks/T2-T3-backend-auth-middleware.md):**
   - Implementação TypeScript completa de `auth.middleware.ts` diferenciando `missing_authorization_header`, `malformed_authorization_header`, `token_expired` e `invalid_token` com log JSON estruturado sem vazar o token.
   - Suíte completa de testes unitários (`auth.middleware.spec.ts` / `test.ts`) cobrindo os 4 motivos de `401` + caso de sucesso `next()`.
3. **[tasks/T4-T5-frontend-auth-context.md](file:///home/james/Documentos/estuda-anne/tasks/T4-T5-frontend-auth-context.md):**
   - Helper `isJwtValid(token)` com decodificação segura de Base64URL e checagem de `exp`.
   - Saneamento no `useEffect` de hidratação do `auth-context.tsx` para limpar sessões sem token ou com JWT expirado.
   - Guarda preventiva e interceptação explícita de `401` em `updateProfile` ao adicionar matéria no perfil.
4. **[tasks/T6-revisao-e-prompt-vps.md](file:///home/james/Documentos/estuda-anne/tasks/T6-revisao-e-prompt-vps.md):**
   - Checklist de auditoria de segurança (`backend-reviewer` + `frontend-reviewer`) e template de entrega final do `agent-coordinator`.

---

## 5. Diário de Execução dos Agentes (Log de Progresso)

- **Preparação Local (`agent-coordinator`):** `[x] Concluída` — Contrato `T0` especificado e arquivos `tasks/T1` a `tasks/T6` enriquecidos com código TypeScript/React, testes unitários e configuração Docker Compose exatos.
- **T0 (`agent-coordinator` / `/agent-architect` na VPS):** _Aguardando execução em `/srv/estuda-anne`_
- **T1 (`/observability-lgtm` na VPS):** _Aguardando execução em `/srv/estuda-anne`_
- **T2 (`backend-engineer` na VPS):** _Aguardando execução em `/srv/estuda-anne`_
- **T3 (`backend-quality` na VPS):** _Aguardando execução em `/srv/estuda-anne`_
- **T4 (`frontend-engineer` na VPS):** _Aguardando execução em `/srv/estuda-anne`_
- **T5 (`frontend-quality` na VPS):** _Aguardando execução em `/srv/estuda-anne`_
- **T6 (`backend-reviewer` / `frontend-reviewer` na VPS):** _Aguardando execução em `/srv/estuda-anne`_

---

## 6. Comando Rápido para Criar Este Arquivo na VPS (Opcional)

Caso queira materializar o plano diretamente em `/srv/estuda-anne/PLANO_ESTEIRA_AGENTS.md` no terminal da VPS antes de iniciar o CLI, basta colar:

```bash
cat << 'EOF' > /srv/estuda-anne/PLANO_ESTEIRA_AGENTS.md
# Plano de Coordenação e Execução da Esteira (estuda-anne)

- T0: Contrato 401 padronizado ({ message, code, reason }) entre Auth -> BFF -> Frontend route.ts -> auth-context.tsx
- T1: Leitura direta de /var/lib/docker/containers/*/*-json.log + rotação json-file (max-size: "10m", max-file: "3") no docker-compose.yml
- T2: auth.middleware.ts logando reason (missing_authorization_header, malformed_authorization_header, token_expired, invalid_token) sem expor o JWT
- T3: Testes unitários do auth.middleware.ts + lint, typecheck e test no Backend
- T4: Helper isJwtValid(token) + saneamento na hidratação da sessão + tratamento explícito de 401 no updateProfile em auth-context.tsx
- T5: lint, typecheck e build em apps/frontend
- T6: Revisão final de segurança (sem vazamento de token, sem alterar .env, sem commits automáticos)
EOF
```

---

## 7. Prompt Mestre Auto-Contido para o Agente CLI na VPS (`/srv/estuda-anne`)

Copie e cole o bloco abaixo diretamente no agente CLI (Claude Code / Codex / Gemini CLI) rodando em `/srv/estuda-anne`:

```markdown
Atue como `agent-coordinator` operando sobre `/srv/estuda-anne`.
Antes de editar qualquer arquivo, leia `AGENTS.md` / `CLAUDE.md` na raiz `/srv/estuda-anne` e em `/srv/estuda-anne/apps/frontend`.
Se `/srv/estuda-anne/PLANO_ESTEIRA_AGENTS.md` não existir, crie-o no início da execução com a tabela de status das tarefas `T0` a `T6` e atualize-o a cada etapa concluída.

### Contexto Confirmado
1. **Fluxo do erro `401 Unauthorized` ao adicionar matéria no perfil (`updateProfile`):**
   - Cadeia: `Browser (auth-context.tsx L140:290)` -> `Frontend Route Proxy (172.16.1.7 - route.ts L1:160)` -> `BFF (172.16.1.6)` -> `Auth (authRoutes.ts L1:120 / auth.middleware.ts L1:120)`.
   - O `route.ts` e o `BFF` preservam o header `Authorization`.
   - O `auth.middleware.ts` retorna `401` quando o header está ausente, não começa com `Bearer `, ou o JWT é inválido/expirado, mas hoje não loga a razão da recusa.
   - No `auth-context.tsx`, `updateProfile` só envia `Authorization: Bearer <token>` se houver `token` na sessão armazenada; sessões antigas/demo (com `user` salvo, mas sem `token` válido) ou tokens expirados mantêm a usuária logada na UI e falham com `401` ao salvar matéria no perfil.
2. **Problema do `docker logs`:**
   - Todos os containers usam driver `json-file` (`/var/lib/docker/containers/<id>/<id>-json.log`), mas `docker logs` bloqueia no daemon em alguns containers.
   - `bff`, `mongo`, `auth`, `study-engine` e `metrics` têm dados nos arquivos `*-json.log`; `nginx` e `frontend` estão com `0 bytes`.

---

### Execute a Esteira na Ordem Abaixo (Atualizando `PLANO_ESTEIRA_AGENTS.md` a cada etapa)

#### Etapa T1 — Observabilidade e Destravamento de Logs (`/observability-lgtm`)
1. **Não use `docker logs`.** Inspecione os logs recentes de `auth` e `bff` lendo diretamente os arquivos `*-json.log`:
   ```bash
   for c in $(docker ps --filter 'name=estuda-anne' --format '{{.Names}}'); do
     log_path=$(docker inspect --format '{{.LogPath}}' "$c")
     echo "=== $c ($log_path) ==="
     ls -lh "$log_path"
     tail -n 20 "$log_path"
   done
   ```
2. No `docker-compose.yml` (ou compose equivalente em `/srv/estuda-anne`), configure rotação de logs no driver `json-file` para todos os serviços (`max-size: "10m"`, `max-file: "3"`). Valide com `docker compose config -q`.
3. Verifique a configuração do `nginx` e `frontend` quanto ao redirecionamento de logs para `stdout`/`stderr`. **Não reinicie containers em produção nem altere `.env` sem permissão.**

#### Etapa T2 — Backend: Diagnóstico Seguro de `401` em `auth.middleware.ts` (`backend-engineer` + `/agent-dev-backend`)
1. Localize `auth.middleware.ts` (e `authRoutes.ts`) no serviço de `Auth`.
2. Atualize o middleware para logar um evento estruturado (`event: "auth_rejected"`, `status: 401`, `reason`, `code`, `method: req.method`, `path: req.originalUrl`) **sem jamais logar o token JWT ou o header `Authorization` bruto**:
   - Header ausente (`!authHeader` ou vazio):
     - Log `reason: "missing_authorization_header"`, `code: "MISSING_AUTH_HEADER"`
     - Retornar `401` com `{ message: "Token de autenticação ausente. Faça login novamente.", code: "MISSING_AUTH_HEADER", reason: "missing_authorization_header" }`
   - Header malformado (`!authHeader.startsWith("Bearer ")` ou token vazio após `Bearer `):
     - Log `reason: "malformed_authorization_header"`, `code: "MALFORMED_AUTH_HEADER"`
     - Retornar `401` com `{ message: "Formato de autorização inválido. Esperado Bearer token.", code: "MALFORMED_AUTH_HEADER", reason: "malformed_authorization_header" }`
   - Erro no `jwt.verify(token, secret)`:
     - Se `err.name === "TokenExpiredError"`:
       - Log `reason: "token_expired"`, `code: "TOKEN_EXPIRED"`, `expiredAt`
       - Retornar `401` com `{ message: "Sua sessão expirou. Faça login novamente.", code: "TOKEN_EXPIRED", reason: "token_expired" }`
     - Outros erros (`JsonWebTokenError`, `NotBeforeError`, etc.):
       - Log `reason: "invalid_token"`, `code: "INVALID_TOKEN"`, `errorName: err.name`
       - Retornar `401` com `{ message: "Token de autenticação inválido. Faça login novamente.", code: "INVALID_TOKEN", reason: "invalid_token" }`
3. Confirme que o `BFF` e o `route.ts` repassam o status `401` e o JSON ao cliente sem sobrescrevê-lo.

#### Etapa T3 — Gate de Qualidade Backend (`backend-quality` + `/agent-qa`)
1. Crie ou atualize os testes unitários do `auth.middleware.ts` cobrindo os 4 motivos de `401` (`MISSING_AUTH_HEADER`, `MALFORMED_AUTH_HEADER`, `TOKEN_EXPIRED`, `INVALID_TOKEN`), garantindo nos asserts que o token não aparece no log, além do cenário de sucesso `next()`.
2. Execute `lint`, `typecheck` e `test` no serviço `Auth` (e `BFF`, se alterado) e registre o resultado real em `PLANO_ESTEIRA_AGENTS.md`.

#### Etapa T4 — Frontend: Saneamento de Sessão e Tratamento de `401` no Perfil (`frontend-engineer` + `/frontend-dev`)
1. Em `apps/frontend` (`auth-context.tsx` L140:290):
   - Implemente o helper `isJwtValid(token: string | null | undefined): token is string` que valida se o token tem 3 partes separadas por `.`, decodifica o payload Base64URL com segurança e verifica se `exp` (quando numérico) é maior que `Math.floor(Date.now() / 1000) + 5`.
   - Na hidratação inicial da sessão (`useEffect` que lê do `localStorage`): se houver `user` salvo mas `!isJwtValid(token)`, limpe imediatamente as chaves de sessão/token do storage e defina `user = null` / `token = null` para eliminar sessões fantasmas/demo sem token ou expiradas.
   - Em `updateProfile`:
     - Antes do `fetch`: valide `isJwtValid(activeToken)`. Se inválido/ausente, execute `logout()` (limpando estado e storage) e lance erro amigável: `"Sua sessão expirou ou é inválida. Faça login novamente para adicionar matérias ao perfil."`
     - Após o `fetch`: se `response.status === 401`, execute `logout()` para limpar a sessão inválida e lance mensagem clara orientando a usuária a fazer login novamente.
2. Verifique em `route.ts` (proxy de `users/profile`) se o header `Authorization` e o retorno `401` do BFF são preservados integralmente.

#### Etapa T5 — Gate de Qualidade Frontend (`frontend-quality` + `/frontend-qa`)
1. Execute `lint`, `typecheck` e `build` em `/srv/estuda-anne/apps/frontend`.
2. Registre os comandos executados e resultados reais em `PLANO_ESTEIRA_AGENTS.md`.

#### Etapa T6 — Revisão Final e Relatório (`backend-reviewer` + `frontend-reviewer` -> `agent-coordinator`)
1. Audite o `git diff` garantindo que:
   - Nenhum token ou segredo é logado;
   - Nenhum arquivo `.env` foi modificado;
   - Nenhum commit foi criado sem autorização.
2. Entregue o resumo final contendo: objetivo cumprido, arquivos alterados por pacote, comandos executados com resultados reais e comandos manuais sugeridos para aplicar o rebuild/restart quando autorizado.
```
