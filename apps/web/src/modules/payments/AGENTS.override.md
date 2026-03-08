# AGENTS.override.md (payments)

Escopo: `apps/web/src/modules/payments`.

## Responsabilidade

1. Checkout publico e interno.
2. Integracao com Mercado Pago Orders API.
3. Regras de status financeiro e reconciliacao via webhook.

## Regras criticas

1. Manter estrategia oficial: Checkout Transparente (Orders API + webhook).
2. Nao substituir por Checkout Pro neste repo.
3. Webhook precisa permanecer idempotente e auditavel.
4. Nao quebrar vinculo entre pagamento e:
   - comprovante (`/comprovante/*`)
   - voucher (`/voucher/*`)
   - checkout publico (`/pagamento/*`).

## Qualidade

1. Mudou parser/regra de status financeiro: atualizar testes de helpers.
2. Validar fluxo pix/cartao no escopo alterado.
