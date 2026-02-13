# Webhook Mercado Pago - Operacional (Vercel)

Data de referência: 2026-02-13

## Objetivo
Evitar perda de notificação de pagamento por erro `404`/`401` no webhook.

## Escopo de integração (obrigatório)
- Modelo Mercado Pago deste projeto: `Checkout Transparente`.
- Implementação: `Orders API` + notificações de webhook (`payment` e `order`).
- `Checkout Pro` não deve ser usado para este fluxo.

## Configuração exata no painel Mercado Pago (produção)
1. URL de produção:
- `https://public.corpoealmahumanizado.com.br/api/mercadopago/webhook`

3. Eventos que devem ficar selecionados:
- `Pagamentos`
- `Order (Mercado Pago)`

4. Eventos que devem ficar desmarcados para este projeto:
- Vinculação de aplicações
- Alertas de fraude
- Reclamações
- Card Updater
- Contestações
- Envios (Mercado Pago)
- Outros eventos
- Planos e assinaturas
- Integrações Point
- Delivery (proximity marketplace)
- Wallet Connect
- Pedidos comerciais
- Self Service

## Causa prática
1. Produção:
- Qualquer `404/401` indica problema de domínio/deploy/proteção no endpoint real da rota.
- Necessário validar o domínio final após cada deploy.
2. Produção
- Usar callback sem bypass.
- Garantir endpoint público para chamadas server-to-server.
- Manter validação de assinatura (`x-signature`) ativa no backend.

## Regra operacional obrigatória
1. Produção: webhook acessível sem autenticação extra.
2. Sempre validar:
- `GET /api/mercadopago/webhook` retorna `200` no domínio do ambiente.
- Simulação de webhook MP retorna `200/201`.

## Checklist de liberação
1. Confirmar domínio correto no projeto Vercel correto.
2. Garantir deploy ativo com rota `/api/mercadopago/webhook`.
3. Configurar callback no painel MP com URL correta do ambiente.
4. Simular webhook `payment` e `order`.
5. Verificar atualização em `appointment_payments` e `appointments.payment_status`.
