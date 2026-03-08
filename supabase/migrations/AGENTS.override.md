# AGENTS.override.md (supabase/migrations)

Escopo: migrations SQL.

## Regras obrigatorias

1. Criar nova migration para cada mudanca de schema/regra.
2. Nao editar migration antiga que ja foi aplicada em ambiente compartilhado.
3. Nomear migration com timestamp + objetivo claro.
4. Evitar SQL ambiguo sem `schema`/`search_path` quando aplicavel.

## Robustez

1. Pensar em compatibilidade de leitura/escrita durante rollout.
2. Evitar operacoes destrutivas sem plano de reversao.
3. Revisar impacto em RLS, indices e RPCs.

## Quando documentar

1. Mudou regra de negocio persistida? atualizar docs canonicas.
2. Mudou API indiretamente por schema? atualizar `docs/apis/API_GUIDE.md`.
