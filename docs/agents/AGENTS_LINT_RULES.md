# AGENTS Lint Rules

Status: active Owner: engenharia de plataforma

## Regras verificadas por script

1. Existe `AGENTS.md` na raiz.
2. Todo `AGENTS.override.md` possui titulo padrao.
3. Todo `AGENTS.override.md` possui linha `Escopo:`.
4. Todo `AGENTS.override.md` possui secao `## Regras` (ou
   `## Regras especificas`).
5. Todo `AGENTS.override.md` possui secao
   `## Regra de maturidade (V1 final de producao)`.
6. Mapa de precedencia e gerado em `docs/engineering/AGENTS_PRECEDENCE_MAP.md`.

## Comando

1. `pnpm agents:check`

## Observacoes

1. O lint de agentes valida consistencia estrutural; ele nao substitui revisao
   de conteudo.
2. Em mudanca grande, rodar o check antes e depois para evitar drift.
