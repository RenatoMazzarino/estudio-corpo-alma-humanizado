# Template de AGENTS.override.md

```md
# AGENTS.override.md (<caminho>)

Escopo: <responsabilidade local>

## Objetivo

1. <objetivo 1>
2. <objetivo 2>

## Regras

1. <regra local 1>
2. <regra local 2>

## Aplica / Nao aplica

1. Aplica: <...>
2. Nao aplica: <...>

## Checklist minimo de validacao

1. <teste/check 1>
2. <teste/check 2>

## Risco de regressao

1. <risco 1>
2. <risco 2>

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
```
