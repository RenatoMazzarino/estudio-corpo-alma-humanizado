# AGENTS Changelog

Status: active Owner: engenharia de plataforma

## 2026-03-22

1. Adicionado contrato visual V2 no `AGENTS.md` raiz para o escopo do
   dashboard.
2. Atualizados overrides de `apps/web/app/(dashboard)` e
   `apps/web/app/(dashboard)/novo` com referencia obrigatoria ao padrao visual
   V2.
3. Incluida referencia canonica ao documento
   `docs/ui-system/v2-component-surface-standards.md` para reduzir divergencia
   visual entre header/card/modal/accordion.

## 2026-03-18

1. Habilitado `multi_agent` no `.codex/config.toml` do repo.
2. Adicionada politica canônica de subagentes no `AGENTS.md` raiz.
3. Formalizada governanca do que pode e do que nao pode ser versionado sobre
   subagentes e trusted project.
4. Adicionada regra de proposta obrigatoria ao usuario antes de criar,
   alterar ou remover governanca de agentes/subagentes.

## 2026-03-10

1. Expandida governanca de agentes para padrao de producao.
2. Incluidos overrides novos por modulo e por integracao critica.
3. Adicionados overrides para `.github`, `.github/workflows` e `.vscode`.
4. Criado script de consistencia e geracao de mapa de precedencia.

## Convencao de novos registros

1. Data no formato `YYYY-MM-DD`.
2. Lista objetiva de alteracoes.
3. Sem segredo ou detalhe sensivel.
