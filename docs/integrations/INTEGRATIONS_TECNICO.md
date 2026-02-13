# Integrações Técnicas do Sistema

Data de referência: 2026-02-12  
Escopo: `apps/web` + banco Supabase + integrações externas.

Este documento é técnico (arquitetura, endpoints, variáveis e segurança).  
Para operação do dia a dia, usar `docs/integrations/INTEGRATIONS_GUIA_OPERACIONAL.md`.

## 1) Supabase
### Uso atual
- Persistência principal (clientes, agenda, atendimento, pagamentos, settings).
- RPCs de agendamento:
  - `public.create_public_appointment(...)`
  - `public.create_internal_appointment(...)`
- Reconciliação de pagamento via webhook (updates em `appointment_payments` e `appointments`).

### Arquivos-chave
- `apps/web/lib/supabase/*.ts`
- `apps/web/src/modules/**/repository.ts`
- `supabase/migrations/*.sql`

### Variáveis necessárias
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Migrations relevantes
- `20260211130000_add_payment_metadata.sql`
- `20260212100000_displacement_fee_rules.sql`
- `20260212113000_normalize_client_phone_uniqueness.sql`

---

## 2) Google Maps Platform
### Uso atual
- Busca de endereço por texto:
  - `POST /api/address-search`
- Detalhamento de endereço por `placeId`:
  - `POST /api/address-details`
- Distância e taxa de deslocamento:
  - `POST /api/displacement-fee`

### Arquivos-chave
- `apps/web/app/api/address-search/route.ts`
- `apps/web/app/api/address-details/route.ts`
- `apps/web/app/api/displacement-fee/route.ts`
- `apps/web/src/shared/displacement/service.ts`
- `apps/web/src/shared/displacement/rules.ts`

### APIs GCP requeridas
- `Routes API` (obrigatória)
- `Distance Matrix API` (fallback/compatibilidade)

### Variáveis necessárias
- `GOOGLE_MAPS_API_KEY`
- `DISPLACEMENT_ORIGIN_ADDRESS` (opcional; default em código)

### Failover implementado
- Em falha com Google, `/api/displacement-fee` retorna taxa mínima provisória (`source: "fallback_minimum"`), sem quebrar o fluxo público.

---

## 3) Mercado Pago (Checkout Transparente)
### Decisão técnica obrigatória (anti-confusão)
- Modelo oficial deste projeto: `Checkout Transparente`.
- Implementação adotada: `Orders API` para criar cobrança + webhook para reconciliação.
- `Checkout Pro` está fora do escopo e não deve ser usado nesta branch.
- Quando a documentação oficial usar o termo `Checkout API (Orders)`, neste projeto isso representa o fluxo de Checkout Transparente.

### Uso atual
- Geração de cobrança Pix/cartão no fluxo público via Orders API:
  - `POST /v1/orders`
- Webhook de confirmação assíncrona:
  - `POST /api/mercadopago/webhook`
- Webhook processa notificações `order` e `payment` (com fallback para `topic` legado).

### Arquivos-chave
- `apps/web/app/(public)/agendar/[slug]/public-actions/payments.ts`
- `apps/web/app/api/mercadopago/webhook/route.ts`
- `apps/web/app/(public)/agendar/[slug]/booking-flow.tsx`

### Variáveis necessárias
- Server:
  - `MERCADOPAGO_ACCESS_TOKEN`
  - `MERCADOPAGO_CLIENT_ID`
  - `MERCADOPAGO_CLIENT_SECRET`
  - `MERCADOPAGO_WEBHOOK_SECRET`
- Client:
  - `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`
- Compatibilidade:
  - `MERCADOPAGO_PUBLIC_KEY` (mantida para leitura server-side quando aplicável)

### Segurança
- Validação HMAC da assinatura (`x-signature`) usando:
  - `data.id` (query)
  - `x-request-id` (header)
  - `ts` (header `x-signature`)
- Sem assinatura válida: `401`.
- Em preview (`VERCEL_ENV=preview`), notificações sandbox (`live_mode=false`) podem ser aceitas para diagnóstico controlado.

---

## 4) WhatsApp (mensageria assistida)
### Uso atual
- Deep links `wa.me`.
- Compartilhamento de voucher via Web Share API + fallback para link.

### Limitações
- Anexo automático depende de suporte do app/device.
- Não substitui API oficial de envio.

---

## 5) Domínios e ambientes
### Estratégia atual
- App interno: `app.corpoealmahumanizado.com.br`
- Público: `public.corpoealmahumanizado.com.br`
- Preview fixo: `dev.public.corpoealmahumanizado.com.br`

### Observação de webhook por ambiente
- Produção:
  - usar callback sem bypass: `https://public.corpoealmahumanizado.com.br/api/mercadopago/webhook`
  - endpoint deve responder sem autenticação extra para chamada server-to-server.
- Preview/Dev:
  - se o domínio estiver protegido por Vercel Authentication, usar callback com bypass por query:
    - `https://dev.public.corpoealmahumanizado.com.br/api/mercadopago/webhook?x-vercel-protection-bypass=<VERCEL_AUTOMATION_BYPASS_SECRET>`
  - motivo: webhook do MP não permite envio customizado do header de bypass; na prática o query param resolve o acesso em ambiente protegido.
  - sempre validar no painel do MP (simulação `payment` e `order`) com resposta `200/201`.

### Estratégia de variáveis
- Production: credenciais live (MP + Supabase prod).
- Preview: credenciais de teste.
- Local: `.env.local` com chaves de sandbox.
- Slug publico canonico (todos os ambientes): `estudio-corpo-alma`.

### Teste de Pix em desenvolvimento (sandbox)
- No modelo `Checkout Transparente` com `Orders API`, o teste de Pix em sandbox não é compra real no checkout.
- A validação oficial de Pix em dev é por request de teste no endpoint `POST /v1/orders` com payload predefinido.
- Referência oficial: `https://www.mercadopago.com/developers/pt/docs/checkout-api-orders/integration-test/pix`.
- Para cartão, o fluxo E2E completo continua via checkout com cartão de teste.

---

## 6) Checklist técnico de go-live
1. Qualidade
```powershell
pnpm lint
pnpm build
```
2. Banco
- Migrations aplicadas em target environment.
3. Infra externa
- GCP APIs habilitadas e billing ativo.
- Webhook MP configurado para URL do ambiente correto.
 - Produção: endpoint do webhook respondendo `200` sem bloqueio de autenticação.
 - Preview protegido: callback com `x-vercel-protection-bypass` e simulação MP respondendo `200/201`.
4. Segurança
- `MERCADOPAGO_WEBHOOK_SECRET` configurada e testada.
5. Teste ponta a ponta
- Agendar público.
- Gerar cartão (E2E em sandbox) e Pix (teste via API de Orders em sandbox).
- Receber webhook.
- Atualizar `appointment_payments` e `appointments.payment_status`.
