#!/usr/bin/env bash
# guard-bash.sh — Catraca 1: Bloqueia comandos destrutivos e atalhos perigosos de shell
# Baseado em "Cercando a IA" (Almerindo Rehem, Whitebeard, 2026), Capítulo 4.
# Evento: PreToolUse (Bash). Fail-closed: nega em caso de dúvida/erro.

set -o pipefail

input=$(cat)
if [ -z "$input" ]; then
  echo "BLOQUEADO (harness Estuda Anne): Entrada vazia no hook guard-bash (fail-closed)" >&2
  exit 2
fi

cmd=$(python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(data.get('tool_input', {}).get('command', ''))
except Exception:
    sys.exit(1)
" <<< "$input" 2>/dev/null)

if [ $? -ne 0 ]; then
  echo "BLOQUEADO (harness Estuda Anne): Falha ao ler comando no guard-bash (fail-closed)" >&2
  exit 2
fi

why=""

case "$cmd" in
  *"git push"*"--force"*|*"git push"*" -f"*)
    why="Push forçado destrói histórico compartilhado da equipe."
    ;;
  *"--no-verify"*)
    why="--no-verify pula as verificações de lint e validação de commits."
    ;;
  *"git reset --hard"*)
    why="Descarte irreversível de alterações de código não commitadas."
    ;;
  *"rm -rf /"*|*"rm -rf ~"*|*"rm -rf \$HOME"*)
    why="Comando de exclusão destrutiva e catastrófica."
    ;;
  *"npm publish"*|*"pnpm publish"*)
    why="Publicação de pacotes requer intervenção e aprovação humana."
    ;;
esac

if [ -n "$why" ]; then
  echo "BLOQUEADO (harness Estuda Anne): Comando proibido interceptado ('$cmd'). Motivo: $why — veja AGENTS.md (seção Never)." >&2
  exit 2
fi

exit 0
