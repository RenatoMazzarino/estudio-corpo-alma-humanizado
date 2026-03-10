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
