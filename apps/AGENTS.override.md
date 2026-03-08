# AGENTS.override.md (apps)

Escopo: tudo em `apps/*`.

## Diretriz

1. Cada app pode ter regras proprias; usar override local quando existir.
2. Nao assumir que todos apps compartilham o mesmo runtime/config.
3. Mudancas em app devem preservar contratos de workspace (scripts, build, lint, types).

## Regras

1. Se alterar scripts de app, validar impacto no root (`turbo`/`pnpm`).
2. Nao acoplar logica de dominio de um app em outro sem camada compartilhada.
3. Se criar novo app, adicionar:
   - scripts minimos (dev/build/lint/check-types/test quando aplicavel)
   - documentacao de setup
   - estrategia de env.
