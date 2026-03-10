# AGENTS.override.md (docs/reports)

Escopo: relatorios tecnicos e operacionais.

## Objetivo

1. Registrar estado real com rastreabilidade.
2. Evitar conclusao sem evidencias de validacao.

## Regras

1. Relatorio deve separar fato, inferencia e recomendacao.
2. Toda conclusao critica deve citar evidencia (log, teste, query, deploy).
3. Relatorio de auditoria deve indicar pendencias abertas e impacto.

## Checklist minimo de validacao

1. Evidencias referenciadas.
2. Data/hora e ambiente dos achados.
3. Proxima acao recomendada com prioridade.

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