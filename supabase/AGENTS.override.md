# AGENTS.override.md (supabase)

Escopo: `supabase/*`.

## Estrutura

1. `migrations`: evolucao de schema e regras SQL.
2. `functions`: edge functions de borda/proxy.

## Regras gerais

1. Tratar migrations como historico append-only.
2. Qualquer mudanca em function deve preservar contrato de forwarding/auth.
3. Nao assumir ambiente local como equivalente automatico de producao.

## Validacao recomendada

1. Migration: revisar impacto e dependencias.
2. Functions: `deno check` das funcoes alteradas.
