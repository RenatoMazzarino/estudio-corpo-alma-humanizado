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

## Regra de maturidade (V1 final de producao)

1. Este escopo nao aceita entrega em mentalidade MVP ou "so para funcionar".
2. Toda mudanca deve mirar padrao de producao: robustez, modularizacao, observabilidade e manutencao previsivel.
3. Nao introduzir gambiarra, duplicacao oportunista, fallback sem governanca ou acoplamento oculto.
4. Solucoes devem incluir:
   - tratamento de erro explicito
   - contratos claros de entrada/saida
   - testes proporcionais ao risco
   - documentacao operacional quando houver impacto de runtime
5. Em conflito entre velocidade e qualidade estrutural, priorizar qualidade estrutural e registrar tradeoff.

