#!/usr/bin/env bash
# protect-paths.sh — Catraca 1: Bloqueia escrita em caminhos sensíveis e baselines
# Baseado em "Cercando a IA" (Almerindo Rehem, Whitebeard, 2026), Capítulos 4 e 15.
# Evento: PreToolUse (Edit|Write|NotebookEdit). Fail-closed: nega em caso de dúvida/erro.

set -o pipefail

# Fail-closed se python3 ou jq não conseguirem processar stdin
input=$(cat)
if [ -z "$input" ]; then
  echo "BLOQUEADO (harness Estuda Anne): Entrada vazia no hook de proteção (fail-closed)" >&2
  exit 2
fi

# Extrai o caminho do arquivo do input JSON
file_path=$(python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(data.get('tool_input', {}).get('file_path', ''))
except Exception:
    sys.exit(1)
" <<< "$input" 2>/dev/null)

if [ $? -ne 0 ] || [ -z "$file_path" ]; then
  echo "BLOQUEADO (harness Estuda Anne): Não foi possível extrair file_path com segurança (fail-closed)" >&2
  exit 2
fi

f="/$file_path"

case "$f" in
  */.env|*/.env.*|*/secrets/*|*/docs/generated/*|*.snap|*.verified.txt|*/pnpm-lock.yaml)
    echo "BLOQUEADO (harness Estuda Anne): '$file_path' é arquivo de segredo (.env), lockfile, artefato gerado ou baseline de teste aprovado por humano. Alteração proibida para o agente — veja AGENTS.md (seção Never)." >&2
    exit 2
    ;;
  *)
    # Caminho liberado
    exit 0
    ;;
esac
