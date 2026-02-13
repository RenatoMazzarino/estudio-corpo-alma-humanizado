# Webhook Mercado Pago - Operacional (Vercel)

Data de referência: 2026-02-13

## Objetivo
Evitar perda de notificação de pagamento por erro `404`/`401` no webhook.

## Escopo de integração (obrigatório)
- Modelo Mercado Pago deste projeto: `Checkout Transparente`.
- Implementação: `Orders API` + notificações de webhook (`payment` e `order`).
- `Checkout Pro` não deve ser usado para este fluxo.

## Configuração exata no painel Mercado Pago (dev e prod)
1. URL de produção:
- `https://public.corpoealmahumanizado.com.br/api/mercadopago/webhook`

2. URL de desenvolvimento (preview online):
- `https://dev.public.corpoealmahumanizado.com.br/api/mercadopago/webhook`

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

## Estado validado nesta data
- Callback de produção configurado no MP:
  - `https://public.corpoealmahumanizado.com.br/api/mercadopago/webhook`
- Resultado de teste HTTP em produção:
  - `404` (endpoint indisponível no deploy atual do domínio)
- Callback de preview com proteção Vercel:
  - retornou `401` em simulação MP quando o callback depende de query de bypass.

## Causa prática
1. Produção:
- O domínio de produção está apontando para deploy antigo (sem rota de webhook disponível).

2. Preview protegido:
- O MP envia notificações com query (`?data.id=...&type=...`).
- Quando a URL já depende de query para bypass de proteção, a chamada pode chegar inválida.
- Resultado: autenticação falha e o webhook não entrega.

## Sobre `Protection Bypass for Automation` (Vercel)
- O recurso existe para permitir acesso automático em deployments protegidos.
- Funciona por header `x-vercel-protection-bypass` (recomendado) ou query param com o mesmo nome.
- Em webhook de terceiro (como MP), normalmente não há controle de header; por isso sobra apenas query param na URL.
- Neste projeto, o uso por query no callback do MP já gerou `401` em cenário real e aumentou instabilidade.
- Decisão operacional: para webhook MP, preferir endpoint público sem bloqueio de autenticação.
- Usar bypass apenas como contingência temporária e sempre com simulação validada (`200/201`) antes de produção.

## Regra operacional obrigatória
1. Webhook (produção e preview) deve estar acessível sem autenticação para chamadas server-to-server.
2. Não usar callback MP dependente de query de bypass como solução definitiva.
3. Sempre validar:
- `GET /api/mercadopago/webhook` retorna `200` no domínio do ambiente.
- Simulação de webhook MP retorna `200/201`.

## Checklist de liberação
1. Confirmar domínio correto no projeto Vercel correto.
2. Garantir deploy ativo com rota `/api/mercadopago/webhook`.
3. Configurar callback no painel MP com URL pública do ambiente.
4. Simular webhook `payment` e `order`.
5. Verificar atualização em `appointment_payments` e `appointments.payment_status`.
