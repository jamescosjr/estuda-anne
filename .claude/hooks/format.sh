#!/usr/bin/env bash
# format.sh — Formatação automática no pós-edição (PostToolUse)
# Reduz ruído de formatação e previne divergências de diff.

set -o pipefail

input=$(cat)
file_path=$(python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(data.get('tool_input', {}).get('file_path', ''))
except Exception:
    sys.exit(0)
" <<< "$input" 2>/dev/null)

if [ -n "$file_path" ] && [ -f "$file_path" ]; then
  case "$file_path" in
    *.ts|*.tsx|*.js|*.jsx|*.json|*.md)
      npx prettier --write "$file_path" 2>/dev/null || true
      ;;
  esac
fi

exit 0
