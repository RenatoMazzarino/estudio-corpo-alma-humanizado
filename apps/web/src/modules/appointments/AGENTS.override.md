# AGENTS.override.md (appointments)

Escopo: `apps/web/src/modules/appointments`.

## Responsabilidade

1. Regras de agendamento publico e interno.
2. Persistencia e transicoes de status de agendamento.
3. Vinculo com regras de pagamento/comunicacao quando aplicavel.

## Regras

1. Nao quebrar criacao de agendamento publico (`/agendar/[slug]`).
2. Nao quebrar criacao/edicao interna em `novo`/agenda.
3. Mudou regra de status? Revisar impacto em atendimento, pagamentos e mensagens.

## Qualidade

1. Cobrir helpers e parsers com teste unitario em mudancas de regra.
2. Se alterar contrato com `notifications` ou `payments`, validar fluxo ponta a ponta.
