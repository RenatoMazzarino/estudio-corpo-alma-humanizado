# AGENTS.override.md (apps/web/app/(dashboard)/novo)

Escopo: criacao de novo agendamento pelo dashboard.

## Objetivo

1. Garantir montagem correta de agendamento com validacao completa.
2. Evitar inconsistencias entre servico, local, horario e pagamento.

## Regras

1. Validacao de etapa deve ser centralizada e deterministica.
2. Nao persistir agendamento parcial sem status explicito.
3. Integração com automacao deve disparar somente apos confirmacao de persistencia.

## Checklist minimo de validacao

1. Testar criacao de agendamento em estudio e domicilio.
2. Testar cenarios de pagamento (integral, sinal, no atendimento).
3. Testar enfileiramento de notificacao apos criacao.

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