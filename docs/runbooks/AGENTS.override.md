# AGENTS.override.md (docs/runbooks)

Escopo: guias operacionais de execucao e suporte.

## Objetivo

1. Permitir operacao reproduzivel sem depender de memoria informal.
2. Reduzir tempo de diagnostico e resposta a incidente.

## Regras

1. Runbook deve conter pre-condicao, passos, validacao e rollback.
2. Quando houver segredos, descrever apenas local e nao valor.
3. Passos devem ser testados e datados quando houver mudanca relevante.

## Checklist minimo de validacao

1. Passos executaveis do inicio ao fim.
2. Resultado esperado por etapa.
3. Sessao de troubleshooting com sintomas comuns.

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