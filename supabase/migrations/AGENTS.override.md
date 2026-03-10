# AGENTS.override.md (supabase/migrations)

Escopo: migrations SQL.

## Regras obrigatorias

1. Criar nova migration para cada mudanca de schema/regra.
2. Nao editar migration antiga que ja foi aplicada em ambiente compartilhado.
3. Nomear migration com timestamp + objetivo claro.
4. Evitar SQL ambiguo sem `schema`/`search_path` quando aplicavel.

## Checklist SQL obrigatorio

1. Usar `IF EXISTS`/`IF NOT EXISTS` quando a operacao permitir.
2. Declarar impacto em RLS e policies afetadas.
3. Declarar impacto em indices/performance.
4. Declarar plano de rollback ou estrategia de reversao segura.

## Robustez

1. Pensar em compatibilidade de leitura/escrita durante rollout.
2. Evitar operacoes destrutivas sem plano de reversao.
3. Revisar impacto em RLS, indices e RPCs.

## Quando documentar

1. Mudou regra de negocio persistida? atualizar docs canonicas.
2. Mudou API indiretamente por schema? atualizar `docs/apis/API_GUIDE.md`.

## Regra de maturidade (V1 final de producao)

1. Este escopo nao aceita entrega em mentalidade MVP ou "so para funcionar".
2. Toda mudanca deve mirar padrao de producao: robustez, modularizacao,
   observabilidade e manutencao previsivel.
3. Nao introduzir gambiarra, duplicacao oportunista, fallback sem governanca ou
   acoplamento oculto.
4. Solucoes devem incluir:
   - tratamento de erro explicito
   - contratos claros de entrada/saida
   - testes proporcionais ao risco
   - documentacao operacional quando houver impacto de runtime
5. Em conflito entre velocidade e qualidade estrutural, priorizar qualidade
   estrutural e registrar tradeoff.
