# Guia Operacional de Integrações

Data de referência: 2026-02-12  
Escopo: operação diária e suporte das integrações usadas pelo produto.

Este guia é para uso prático (produto, suporte e operação).  
Para detalhes técnicos de endpoint/arquitetura, usar `docs/integrations/INTEGRATIONS_TECNICO.md`.

## 1) Mapa rápido

1. Supabase
- Função: banco principal, RPCs de agendamento, settings e dados de clientes.
- Criticidade: alta.

2. Google Maps Platform
- Função: busca de endereço e cálculo de distância/taxa de deslocamento.
- Criticidade: alta no fluxo de domicílio.

3. Mercado Pago (Checkout Transparente)
- Função: geração de cobrança (Pix/cartão), webhook e confirmação de pagamento.
- Criticidade: alta.
- Regra fixa: este projeto usa somente Checkout Transparente.
- Fora de escopo: Checkout Pro.
- Eventos de webhook usados no sistema: `payment` e `order` (somente).

4. WhatsApp
- Função: mensagens assistidas (deep link e compartilhamento de voucher).
- Criticidade: média (não bloqueia criação de agendamento).

## 2) Ambientes e domínios

1. Produção
- App interno: `https://app.corpoealmahumanizado.com.br`
- Público: `https://public.corpoealmahumanizado.com.br`

## 3) Variáveis críticas por integração

1. Supabase
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

2. Google Maps
- `GOOGLE_MAPS_API_KEY`
- `DISPLACEMENT_ORIGIN_ADDRESS` (opcional)

3. Mercado Pago
- `MERCADOPAGO_ACCESS_TOKEN`
- `MERCADOPAGO_PUBLIC_KEY`
- `MERCADOPAGO_WEBHOOK_SECRET`

4. App
- `APP_TIMEZONE=America/Sao_Paulo`

## 3.1) Regra de nomenclatura (Mercado Pago)

- Modelo oficial do projeto: `Checkout Transparente` (Pix/cartão + webhook).
- Implementação técnica atual: `Orders API` + endpoint interno `/api/mercadopago/webhook`.
- Em parte da doc do Mercado Pago pode aparecer o nome `Checkout API (Orders)`.
- Para este repositorio, tratar `Checkout API (Orders)` como o mesmo fluxo do Checkout Transparente.
- `Checkout Pro` nao deve ser configurado nem usado neste projeto.

## 4) Checklist de configuração (produção)

1. Produção (Vercel Production)
- Credenciais MP de produção.
- Webhook MP apontando para:
`https://public.corpoealmahumanizado.com.br/api/mercadopago/webhook`
- Eventos selecionados no painel MP:
  - `Pagamentos`
  - `Order (Mercado Pago)`
- O endpoint precisa responder sem bloqueio de autenticação (teste rápido com `GET` retornando `200`).
- Segredo do webhook em `MERCADOPAGO_WEBHOOK_SECRET`.
- Supabase de produção.

## 5) Fluxo operacional do pagamento (resumo)

1. Cliente escolhe serviço e endereço.
2. Sistema calcula taxa de deslocamento (quando domicílio).
3. Sistema gera cobrança no Mercado Pago.
4. Cliente paga (Pix/cartão).
5. Mercado Pago chama webhook.
6. Webhook valida assinatura e atualiza status no banco.
7. UI reflete pagamento em agenda/modal/recibo.

## 6) Rotina de validação antes de deploy

1. Qualidade de código
```powershell
pnpm lint
pnpm build
```

2. Banco
```powershell
pnpm supabase migration up        # local
pnpm supabase db push             # remoto linkado
```

3. Smoke test funcional
- Agendamento público com cartão.
- Geração de Pix no fluxo público.
- Recebimento de webhook.
- Status financeiro atualizado.
- Voucher abre e exporta imagem.

## 7) Troubleshooting rápido

1. `POST /api/displacement-fee 422`
- Verificar se `GOOGLE_MAPS_API_KEY` está definida.
- Verificar se APIs do GCP estão habilitadas (Routes e/ou Distance Matrix).

2. Webhook 401
- Verificar `MERCADOPAGO_WEBHOOK_SECRET` no ambiente correto.
- Verificar URL configurada no painel MP para produção.

3. Pix gerado, mas status não atualiza
- Verificar logs da rota `/api/mercadopago/webhook`.
- Confirmar assinatura válida no header.
- Confirmar disponibilidade pública do endpoint em produção.

4. Cliente duplicado por telefone
- Aplicar migration de normalização e unicidade:
`20260212113000_normalize_client_phone_uniqueness.sql`

## 8) Regra operacional importante

- Não misturar credenciais entre aplicações/projetos.
- Sempre validar ambiente ativo antes de processar pagamento.
- Não habilitar tópicos extras de webhook no MP sem necessidade real (gera ruído e risco operacional).
