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
- sem proteção Vercel:
  - `https://dev.public.corpoealmahumanizado.com.br/api/mercadopago/webhook`
- com Vercel Authentication ativa:
  - `https://dev.public.corpoealmahumanizado.com.br/api/mercadopago/webhook?x-vercel-protection-bypass=<VERCEL_AUTOMATION_BYPASS_SECRET>`

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
- Simulação no painel do MP para `payment` em dev: `200 - OK`.
- Simulação no painel do MP para `order` em dev: `200 - OK`.
- Conclusão prática: callback de dev com bypass por query funcionou no painel do MP.

## Causa prática
1. Produção:
- Qualquer `404/401` indica problema de domínio/deploy/proteção no endpoint real da rota.
- Necessário validar o domínio final após cada deploy.

2. Preview protegido:
- Sem bypass, o MP recebe `401` porque webhook é chamada server-to-server e não faz login na Vercel.
- Com bypass correto no callback, o webhook consegue acessar o endpoint protegido.

## Sobre `Protection Bypass for Automation` (Vercel)
- O recurso existe para permitir acesso automático em deployments protegidos.
- Funciona por header `x-vercel-protection-bypass` (recomendado) ou query param com o mesmo nome.
- Em webhook de terceiro (como MP), normalmente não há controle de header; por isso sobra apenas query param na URL.
- Em dev protegido, o bypass por query é o caminho operacional para webhook do MP.
- Em produção, o recomendado é não depender de bypass e manter webhook público com assinatura válida no backend.

## Decisão prática por ambiente (sem ambiguidade)
1. Dev (preview online)
- Se houver Vercel Authentication ativa, usar callback com `?x-vercel-protection-bypass=<secret>`.
- Confirmar simulação `payment` e `order` no painel MP com retorno `200/201`.

2. Produção
- Usar callback sem bypass.
- Garantir endpoint público para chamadas server-to-server.
- Manter validação de assinatura (`x-signature`) ativa no backend.

## Regra operacional obrigatória
1. Produção: webhook acessível sem autenticação extra.
2. Dev protegido: callback com bypass por query é permitido e esperado.
3. Sempre validar:
- `GET /api/mercadopago/webhook` retorna `200` no domínio do ambiente.
- Simulação de webhook MP retorna `200/201`.

## Checklist de liberação
1. Confirmar domínio correto no projeto Vercel correto.
2. Garantir deploy ativo com rota `/api/mercadopago/webhook`.
3. Configurar callback no painel MP com URL correta do ambiente (em dev protegido, incluir bypass por query).
4. Simular webhook `payment` e `order`.
5. Verificar atualização em `appointment_payments` e `appointments.payment_status`.
