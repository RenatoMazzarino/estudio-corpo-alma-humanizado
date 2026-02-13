# Webhook Mercado Pago - Operacional (Vercel)

Data de referência: 2026-02-13

## Objetivo
Evitar perda de notificação de pagamento por erro `404`/`401` no webhook.

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
