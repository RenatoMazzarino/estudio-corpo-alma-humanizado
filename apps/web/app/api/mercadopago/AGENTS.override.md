# AGENTS.override.md (apps/web/app/api/mercadopago)

Escopo: endpoints de integracao Mercado Pago.

## Objetivo

1. Garantir contrato robusto com checkout e webhook.
2. Evitar pagamento duplicado e perda de sincronizacao de status.

## Regras

1. Webhook deve ser idempotente por chave de evento.
2. Assinatura/segredo deve ser validado antes de processar payload.
3. Timeout/retry devem ser explicitos nos clients externos.
4. Erro operacional deve registrar correlation id sem expor segredo.

## Checklist minimo de validacao

1. Testar pagamento criado e conciliado.
2. Testar webhook repetido (idempotencia).
3. Testar falha de assinatura invalida.

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