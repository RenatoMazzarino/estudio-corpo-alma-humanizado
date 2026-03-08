# AGENTS.override.md (apps/web/app/(dashboard))

Escopo: telas autenticadas do estudio.

## Contrato funcional

1. Manter fluxo operacional do estudio estavel:
   - agenda
   - atendimento
   - clientes
   - configuracoes
   - mensagens
2. Qualquer mudanca com impacto em operacao deve explicitar risco e rollback.

## Regras

1. Preservar guards de auth do dashboard.
2. Evitar regressao de UX em fluxo de alta frequencia (agenda/atendimento).
3. Manter consistencia visual com `AppShell` e `ModulePage`.

## Validacao recomendada

1. Testes unitarios afetados.
2. Fluxo manual rapido:
   - abrir agenda
   - abrir detalhe de atendimento
   - validar acoes de pagamento/mensagem no escopo alterado.
