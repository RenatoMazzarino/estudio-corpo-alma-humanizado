# AGENTS.override.md (docs/plans)

Escopo: documentos de plano de implementacao.

## Objetivo

1. Garantir que plano seja executavel e verificavel.
2. Evitar plano abstrato sem criterio de conclusao.

## Regras

1. Todo plano deve conter fases, criterios de validacao e go/no-go.
2. Plano deve explicitar dependencias, riscos e rollback.
3. Plano com impacto operacional deve apontar runbook relacionado.

## Checklist minimo de validacao

1. Fases com entregavel objetivo.
2. Testes e metrica de aceite por fase.
3. Estrategia de rollout e reversao.

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
