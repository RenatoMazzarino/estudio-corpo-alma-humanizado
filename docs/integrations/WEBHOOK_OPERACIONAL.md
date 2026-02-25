# Webhook Mercado Pago - Operacional (Vercel)

Data de referência: 2026-02-25

## Objetivo

Evitar perda de notificação de pagamento por erro de URL/domínio, autenticação indevida no endpoint ou assinatura inválida.

## Escopo de integração (obrigatório)

- Modelo Mercado Pago deste projeto: `Checkout Transparente`
- Implementação técnica: `Orders API` + webhook interno
- Eventos usados no sistema:
  - `payment`
  - `order`
- `Checkout Pro` não deve ser usado neste fluxo

## URLs corretas por ambiente

### Produção

- `https://public.corpoealmahumanizado.com.br/api/mercadopago/webhook`

### DEV (público)

- `https://dev.public.corpoealmahumanizado.com.br/api/mercadopago/webhook`

## Configuração no painel Mercado Pago (produção)

1. URL de callback:
- `https://public.corpoealmahumanizado.com.br/api/mercadopago/webhook`

2. Eventos que devem ficar selecionados:
- `Pagamentos`
- `Order (Mercado Pago)`

3. Eventos que devem ficar desmarcados neste projeto:
- categorias não utilizadas (fraude, reclamações, planos/assinaturas, Point, delivery etc.) para reduzir ruído

## Regras operacionais obrigatórias

1. O endpoint webhook deve ser público (server-to-server), sem autenticação extra.
2. A validação de assinatura `x-signature` no backend deve permanecer ativa.
3. Sempre validar domínio/commit corretos do deploy antes de testar.

## Healthcheck e testes rápidos

### Healthcheck do endpoint

O endpoint aceita `GET` para teste operacional:

- `GET /api/mercadopago/webhook` -> `200` com `{ ok: true, paymentId }`

### Teste de painel / simulação

1. Validar `GET` no domínio do ambiente
2. Simular webhook `payment` no painel MP
3. Simular webhook `order` no painel MP
4. Confirmar respostas `200/201`
5. Confirmar atualização no banco/app

## Causa prática dos erros mais comuns

### `404`

- domínio errado
- deploy antigo/commit errado
- rota indisponível no ambiente testado

### `401`

- assinatura inválida (`MERCADOPAGO_WEBHOOK_SECRET`)
- secret configurado no ambiente errado
- callback apontando para outro projeto/ambiente

## Checklist de liberação (produção)

1. Confirmar deploy ativo no domínio correto
2. Confirmar `GET /api/mercadopago/webhook` retorna `200`
3. Configurar callback no painel MP com URL de produção
4. Selecionar somente `payment` + `order`
5. Configurar `MERCADOPAGO_WEBHOOK_SECRET` na Vercel Production
6. Simular `payment` e `order`
7. Verificar atualização em:
- `appointment_payments`
- `appointments.payment_status`

