# AGENTS.override.md (scripts)

Escopo: `scripts/*`.

## Diretriz

1. Scripts devem ser reexecutaveis e previsiveis.
2. Evitar side effects irreversiveis sem confirmacao explicita.

## Regras

1. Nao embutir segredo em script versionado.
2. Preferir mensagens claras de erro/resultado.
3. Se script alterar estado externo (deploy/env), documentar pre-condicoes.

## Scripts criticos atuais

1. `scripts/codex/check-skills-readiness.ps1`
2. `scripts/codex/load-gh-token.ps1`
3. `scripts/codex/vercel-env-audit.ps1`
