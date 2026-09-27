@AGENTS.md

## Configuração do Claude Code — Estuda Anne
- **Permissões**: Gerenciadas por `.claude/settings.json` (deny em `.env*` e push force).
- **Hooks Ativos**:
  - `PreToolUse`: `.claude/hooks/protect-paths.sh` e `.claude/hooks/guard-bash.sh`
  - `PostToolUse`: `.claude/hooks/format.sh`
- **Plan Mode**: Obrigatório para qualquer alteração que toque ≥ 3 arquivos.
- **Context Management**: Mantenha o contexto canônico < 10% da janela. Em tarefas longas, limpe com `/clear`.
- **Regras por Caminho**: Carregadas automaticamente via `.claude/rules/*.md`.
