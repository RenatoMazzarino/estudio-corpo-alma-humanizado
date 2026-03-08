# AGENTS.override.md (vercel)

Escopo: `vercel/*`.

## Objetivo

1. Manter estrategia de env por ambiente clara e reproduzivel.

## Regras

1. Em `vercel/env-import`, versionar apenas `.example` sem segredos.
2. Arquivos reais de segredo ficam em `.vercel/env-import` (fora do Git).
3. Mudou pacote de env requerido:
   - atualizar templates
   - validar com `pnpm vercel:env:audit`
   - refletir mudanca em docs operacionais.

## Ambientes

1. Development: uso local.
2. Preview: homologacao de branch.
3. Production: `main`.
