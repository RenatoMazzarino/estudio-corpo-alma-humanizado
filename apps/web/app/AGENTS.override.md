# AGENTS.override.md (apps/web/app)

Escopo: rotas e paginas App Router.

## Regras de rota

1. Cada rota deve manter responsabilidade clara (UI, API ou auth).
2. Nao duplicar regra de dominio aqui se ela ja existe em `src/modules/*`.
3. Evitar side effects ocultos em componentes de pagina.

## Seguranca

1. Endpoint sensivel deve validar auth/sessao/segredo conforme tipo.
2. Nao expor segredos em `NEXT_PUBLIC_*`.

## Validacao

1. Rodar ao menos:
   - `pnpm --filter web lint`
   - `pnpm --filter web check-types`
   - `pnpm --filter web build`
