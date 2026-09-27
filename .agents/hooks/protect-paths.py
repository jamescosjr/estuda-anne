#!/usr/bin/env python3
"""
protect-paths.py — Catraca PreToolUse para Antigravity
Bloqueia edição de .env, lockfiles, baselines e arquivos gerados em tempo real.
Contrato Antigravity: stdout deve ser JSON {"decision": "deny" | "allow", "reason": "..."}
"""
import sys
import json
import re

def main():
    try:
        raw_input = sys.stdin.read()
        if not raw_input.strip():
            # Fail-closed
            print(json.dumps({"decision": "deny", "reason": "Entrada vazia no hook (fail-closed)"}))
            sys.exit(0)

        payload = json.loads(raw_input)
        tool_call = payload.get("toolCall", {})
        args = tool_call.get("args", {})
        target_file = args.get("TargetFile", "")

        # Padrões protegidos
        protected_patterns = [
            r"(^|/)\.env(\..+)?$",
            r"(^|/)secrets(/.*)?$",
            r"(^|/)docs/generated(/.*)?$",
            r"\.snap$",
            r"\.verified\.txt$",
            r"(^|/)pnpm-lock\.yaml$"
        ]

        for pattern in protected_patterns:
            if re.search(pattern, target_file):
                reason = (
                    f"BLOQUEADO (harness Estuda Anne): '{target_file}' é arquivo protegido "
                    "(.env, segredo, lockfile, baseline de teste ou artefato gerado). "
                    "Alteração proibida para o agente — veja AGENTS.md (seção Never)."
                )
                print(json.dumps({"decision": "deny", "reason": reason}))
                return

        print(json.dumps({"decision": "allow"}))

    except Exception as e:
        # Em caso de erro interno, fail-closed
        print(json.dumps({"decision": "deny", "reason": f"Erro interno no hook de proteção: {str(e)}"}))

if __name__ == "__main__":
    main()
