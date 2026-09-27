#!/usr/bin/env python3
"""
guard-bash.py — Catraca PreToolUse para Antigravity
Bloqueia comandos de destruição de histórico, bypass de verificações e comandos catastróficos.
Contrato Antigravity: stdout deve ser JSON {"decision": "deny" | "allow", "reason": "..."}
"""
import sys
import json
import re

def main():
    try:
        raw_input = sys.stdin.read()
        if not raw_input.strip():
            print(json.dumps({"decision": "deny", "reason": "Entrada vazia no hook guard-bash (fail-closed)"}))
            sys.exit(0)

        payload = json.loads(raw_input)
        tool_call = payload.get("toolCall", {})
        args = tool_call.get("args", {})
        command_line = args.get("CommandLine", "")

        forbidden_patterns = [
            (r"git\s+push.*(--force|-f\b)", "Push forçado destrói o histórico compartilhado do repositório."),
            (r"--no-verify\b", "--no-verify pula hooks e checagens obrigatórias de integridade."),
            (r"git\s+reset\s+--hard", "Descarte irreversível de alterações de código não commitadas."),
            (r"rm\s+-rf\s+(/|~|\$HOME)", "Comando de exclusão destrutiva do sistema."),
            (r"(npm|pnpm|yarn)\s+publish", "Publicação de pacotes requer intervenção e aprovação humana explícita.")
        ]

        for pattern, explanation in forbidden_patterns:
            if re.search(pattern, command_line):
                reason = (
                    f"BLOQUEADO (harness Estuda Anne): Comando perigoso interceptado ('{command_line}'). "
                    f"Motivo: {explanation} — consulte AGENTS.md (seção Never)."
                )
                print(json.dumps({"decision": "deny", "reason": reason}))
                return

        print(json.dumps({"decision": "allow"}))

    except Exception as e:
        print(json.dumps({"decision": "deny", "reason": f"Erro interno no hook guard-bash: {str(e)}"}))

if __name__ == "__main__":
    main()
