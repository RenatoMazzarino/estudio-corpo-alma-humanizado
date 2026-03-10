# AGENTS.override.md (apps/web/src/modules/attendance)

Escopo: regras de negocio do atendimento e fechamento de sessao.

## Objetivo

1. Preservar consistencia entre atendimento, pagamento e historico.
2. Evitar estados inconsistentes no fluxo de conclusao de atendimento.

## Regras

1. Mudanca de status de atendimento deve manter trilha auditavel.
2. Integracao com pagamento deve explicitar estado e erro tecnico tratavel.
3. Nao acoplar regras de atendimento com detalhes de UI.
4. Qualquer alteracao de regra financeira deve refletir no modulo de finance.

## Aplica / Nao aplica

1. Aplica em services/helpers/decisores deste modulo.
2. Nao aplica a componentes sem persistencia de estado.

## Checklist minimo de validacao

1. Testes unitarios para regras de status.
2. Validar fluxo atendimento -> pagamento -> comprovante.
3. Validar mensagens/automacoes dependentes de estado de atendimento.

## Risco de regressao

1. Atendimento finalizado sem pagamento coerente.
2. Duplicacao de cobranca por estado mal sincronizado.
3. Historico inconsistente para auditoria.

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
