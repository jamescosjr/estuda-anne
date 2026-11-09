# T1 — Observabilidade e Destravamento de Logs Docker (`/observability-lgtm`)

- **Status:** `[x] Especificado / Pronto para VPS`
- **Ambiente Alvo:** VPS `/srv/estuda-anne`
- **Escopo:** Infraestrutura Docker (`json-file` logging driver), containers `estuda-anne-*` (`bff`, `auth`, `frontend`, `nginx`, `mongo`, `study-engine`, `metrics`).

## Diagnóstico Confirmado
- Todos os containers utilizam o driver `json-file`.
- Os arquivos `/var/lib/docker/containers/<id>/<id>-json.log` são legíveis diretamente no filesystem do host, mas o comando `docker logs` bloqueia no daemon do Docker em alguns containers.
- Os arquivos de log de `nginx` e `frontend` estão vazios (`0 bytes`), enquanto `bff`, `mongo`, `auth`, `study-engine` e `metrics` possuem logs gravados.

## Ações Obrigatórias e Implementação de Referência na VPS

### 1. Script de Leitura Direta dos Logs (`*-json.log`) sem bloquear no `docker logs`
Execute diretamente no host da VPS para inspecionar os últimos eventos e buscar falhas `401` sem acionar a API de logs do daemon:

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "=== 1. Mapeamento de Containers e Tamanhos dos Arquivos *-json.log ==="
for c in $(docker ps --filter 'name=estuda-anne' --format '{{.Names}}'); do
  log_path=$(docker inspect --format '{{.LogPath}}' "$c")
  echo "------------------------------------------------------------"
  echo "Container: $c"
  ls -lh "$log_path" || true
  echo "--- Últimas 15 linhas de $c ---"
  tail -n 15 "$log_path" || true
done

echo ""
echo "=== 2. Filtro Direto de Eventos de Auth / 401 (Auth & BFF) ==="
for svc in auth bff; do
  cid=$(docker ps --filter "name=estuda-anne.*${svc}" -q | head -n 1)
  if [ -n "$cid" ]; then
    lpath=$(docker inspect --format '{{.LogPath}}' "$cid")
    echo ">>> Buscando 401 / auth_rejected / profile em $svc ($lpath):"
    grep -Ei "401|unauthorized|auth_rejected|profile|expired|bearer" "$lpath" | tail -n 30 || echo "Nenhuma ocorrência recente encontrada."
  fi
done
```

### 2. Configuração de Rotação de Logs no `docker-compose.yml`
No arquivo `/srv/estuda-anne/docker-compose.yml` (ou compose de produção equivalente), adicionar YAML anchor `x-logging` no topo e referenciar em todos os serviços (`nginx`, `frontend`, `bff`, `auth`, `study-engine`, `metrics`, `mongo`):

```yaml
x-logging: &default-logging
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"

services:
  nginx:
    # ... configuração existente ...
    logging: *default-logging

  frontend:
    # ... configuração existente ...
    logging: *default-logging

  bff:
    # ... configuração existente ...
    logging: *default-logging

  auth:
    # ... configuração existente ...
    logging: *default-logging

  study-engine:
    # ... configuração existente ...
    logging: *default-logging

  metrics:
    # ... configuração existente ...
    logging: *default-logging

  mongo:
    # ... configuração existente ...
    logging: *default-logging
```

### 3. Verificação de `nginx` e `frontend` com `0 bytes` de log
- **Nginx:** Verificar se na imagem/configuração (`/etc/nginx/nginx.conf` ou `conf.d/default.conf`) os logs apontam para `/dev/stdout` e `/dev/stderr` (ou symlinks padrão da imagem oficial):
  ```nginx
  access_log /dev/stdout;
  error_log  /dev/stderr warn;
  ```
- **Frontend:** Verificar se o script de inicialização no `Dockerfile` ou `docker-compose.yml` executa o processo Node/Next em foreground sem redirecionar `>/dev/null 2>&1`.

## Critério de Aceite
- Comandos de leitura direta executados na VPS sem travar o terminal.
- `docker-compose.yml` atualizado com `max-size: "10m"` e `max-file: "3"` em todos os serviços, validado via `docker compose config -q`.
- Nenhuma variável `.env` ou segredo alterado.
