# Integrações Técnicas do Sistema

Data de referência: 2026-02-25  
Escopo: `apps/web` + banco Supabase + integrações externas

Este documento é técnico (arquitetura, endpoints, variáveis, segurança e comportamento atual).  
Para operação do dia a dia e checklists de painel, usar `docs/integrations/INTEGRATIONS_GUIA_OPERACIONAL.md`.

## Regra de leitura (fonte de verdade)

1. Código atual (`apps/web`, `supabase/migrations`)
2. Configuração real de ambiente/deploy (Vercel, Supabase, Meta, Mercado Pago, Spotify)
3. Este documento

Em conflito com o código, o código vence.

## 1) Supabase (dados + auth do dashboard)

### Uso atual

- Persistência principal do produto (agenda, clientes, atendimento, pagamentos, settings, notificações).
- Auth do dashboard via Supabase (Google OAuth + fallback DEV opcional).
- Controle de acesso por tabela `dashboard_access_users`.
- Reconciliação de pagamentos Mercado Pago e logs/eventos de automação WhatsApp.

### Pontos de auth importantes no app

- Rotas de login/logout/callback em `apps/web/app/auth/*`
- Guards de dashboard em `apps/web/src/modules/auth/*`
- Refresh de sessão SSR via `apps/web/proxy.ts` (Next 16 Proxy), reduzindo re-login frequente

### Arquivos-chave

- `apps/web/lib/supabase/*.ts`
- `apps/web/src/modules/**/repository.ts`
- `apps/web/src/modules/auth/*`
- `apps/web/proxy.ts`
- `supabase/migrations/*.sql`

### Variáveis necessárias

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## 2) Google Maps Platform (endereços / deslocamento)

### Uso atual

- Busca de endereço por texto:
  - `GET /api/address-search`
- Detalhamento por `placeId`:
  - `GET /api/address-details`
- Distância/taxa de deslocamento:
  - `POST /api/displacement-fee`

### Arquivos-chave

- `apps/web/app/api/address-search/route.ts`
- `apps/web/app/api/address-details/route.ts`
- `apps/web/app/api/displacement-fee/route.ts`
- `apps/web/src/shared/displacement/service.ts`
- `apps/web/src/shared/displacement/rules.ts`

### APIs GCP requeridas

- Places API (Autocomplete / Place Details) - obrigatória
- Routes API e/ou Distance Matrix (conforme estratégia/fallback do módulo de deslocamento)

### Variáveis necessárias

- `GOOGLE_MAPS_API_KEY`
- `DISPLACEMENT_ORIGIN_ADDRESS` (opcional; fallback/default em código)

### Failover implementado

- Em falha do Google, `/api/displacement-fee` retorna taxa mínima provisória (`source: "fallback_minimum"`) para não quebrar o fluxo público.

---

## 3) Mercado Pago (Checkout Transparente via Orders API)

### Decisão técnica obrigatória (anti-confusão)

- Modelo oficial do projeto: `Checkout Transparente`
- Implementação adotada: `Orders API` + webhook interno
- `Checkout Pro` está fora de escopo e não deve ser usado neste repo
- Quando a doc do MP citar `Checkout API (Orders)`, neste projeto isso representa o fluxo do checkout transparente

### Uso atual

- Criação de cobrança (Pix/cartão) no fluxo público e atendimento
- Reconciliação assíncrona por webhook:
  - `POST /api/mercadopago/webhook`
- Healthcheck/handshake operacional:
  - `GET /api/mercadopago/webhook`
- Eventos tratados:
  - `payment`
  - `order`

### Estratégia de atualização de status (atual)

- Fonte principal de confirmação: webhook Mercado Pago (`payment`/`order`)
- O fluxo Pix também pode usar sincronização complementar por consulta à Orders API no checkout/modal para reduzir atraso visual de atualização de status

### Arquivos-chave

- `apps/web/app/api/mercadopago/webhook/route.ts`
- `apps/web/app/(public)/agendar/[slug]/public-actions/payments.ts`
- `apps/web/src/modules/payments/mercadopago-orders.ts`
- `apps/web/app/(dashboard)/atendimento/[id]/components/attendance-payment-modal.tsx`

### Variáveis necessárias

- `MERCADOPAGO_ACCESS_TOKEN`
- `MERCADOPAGO_PUBLIC_KEY`
- `MERCADOPAGO_WEBHOOK_SECRET`

### Segurança (webhook)

- Validação HMAC da assinatura `x-signature`
- Uso de `x-request-id`, `ts`, `data.id`/`id` para montar manifesto de validação
- Sem assinatura válida: `401`

### Efeitos de webhook (resumo)

- Upsert em `appointment_payments`
- Atualização de `appointments.payment_status`
- Registro em `appointment_events` (`payment_webhook`)

---

## 4) WhatsApp (manual + automação Meta Cloud API em coexistência)

### Objetivo arquitetural atual

- A automação **coexiste** com o fluxo manual (não substitui o manual).
- O envio manual por WhatsApp continua disponível.
- A automação opera por fila + processador + webhook + painel operacional `Mensagens`.

### Funcionalidades implementadas (repo atual)

- Fila de jobs de automação (`notification_jobs`)
- Processador de jobs de WhatsApp
- Meta Cloud API como provider (`meta_cloud`)
- Webhook Meta:
  - `GET /api/whatsapp/meta/webhook` (verify)
  - `POST /api/whatsapp/meta/webhook` (events `messages`)
- Status reais no painel:
  - `sent`, `delivered`, `read`, `failed`
- Cron endpoint para lembretes 24h:
  - `GET /api/cron/whatsapp-reminders` (Bearer `CRON_SECRET`)
- Endpoint interno de processamento:
  - `GET|POST /api/internal/notifications/whatsapp/process` (Bearer `WHATSAPP_AUTOMATION_PROCESSOR_SECRET`)

### Templates automáticos usados (estado atual)

- Aviso de agendamento (`appointment_created`):
  - biblioteca oficial local com 12 variações:
    - estúdio/domicílio
    - com sinal pago / pago integral / pagamento no atendimento
    - com flora / sem oi flora
  - arquivo canônico:
    - `apps/web/src/modules/notifications/whatsapp-template-library.ts`
  - regras de seleção:
    - `apps/web/src/modules/notifications/whatsapp-created-template-rules.ts`
- Lembrete 24h (`appointment_reminder`):
  - `confirmacao_de_agendamento_24h` (resolvido por tenant settings)

### Fluxos automáticos implementados

- `appointment_created` (template)
- `appointment_reminder` (template, processado por cron/scheduler)
- `appointment_canceled` (mensagem livre/session, apenas com janela 24h aberta e checkbox marcado no cancelamento)

### Regras importantes de operação (atuais)

- Pode rodar em modo seguro (teste) com destinatário forçado:
  - `WHATSAPP_AUTOMATION_META_TEST_RECIPIENT`
- Em DEV e até em PROD (piloto), é válido manter envio apontado para número de teste
- O template de `appointment_created` agora é escolhido por regra de negócio com base em:
  - local do atendimento (`is_home_visit`)
  - estado financeiro do agendamento (total vs pago)
  - preferência de intro (`com_flora`/`sem_oi_flora`)
- Regra de apresentação da Flora:
  - primeira automação para a cliente: `com_flora`
  - após apresentação prévia: `sem_oi_flora`
  - reapresenta `com_flora` após 180 dias sem automação enviada
- Se a variante preferida estiver `in_review`, o sistema tenta fallback para a variante oposta do mesmo cenário.
- Se não houver template ativo para aquele cenário, o envio falha com erro explícito e auditável.
- Janela 24h (regra atual) para cancelamento automático:
  - inferida por inbound correlacionado ao agendamento nas últimas 24h

### Arquivos-chave

- `apps/web/src/modules/notifications/automation-config.ts`
- `apps/web/src/modules/notifications/whatsapp-automation-runtime.ts`
- `apps/web/src/modules/notifications/tenant-whatsapp-settings.ts`
- `apps/web/src/modules/notifications/repository.ts`
- `apps/web/app/api/whatsapp/meta/webhook/route.ts`
- `apps/web/app/api/cron/whatsapp-reminders/route.ts`
- `apps/web/app/api/internal/notifications/whatsapp/process/route.ts`
- `apps/web/app/(dashboard)/mensagens/page.tsx`

### Variáveis principais (WhatsApp automação)

#### Core / fila / processador

- `WHATSAPP_AUTOMATION_PROFILE` (`development_safe` | `preview_safe` | `preview_real_test` | `production_live`)
- `WHATSAPP_AUTOMATION_RECIPIENT_MODE` (`test_recipient` | `customer`)
- `WHATSAPP_AUTOMATION_PROVIDER` (`none` | `meta_cloud`)
- `WHATSAPP_AUTOMATION_AUTO_DISPATCH_ON_QUEUE`
- `WHATSAPP_AUTOMATION_PROCESSOR_SECRET`
- `WHATSAPP_AUTOMATION_BATCH_LIMIT`
- `WHATSAPP_AUTOMATION_MAX_RETRIES`
- `WHATSAPP_AUTOMATION_RETRY_BASE_DELAY_SECONDS`

#### Meta Cloud API (envio)

- `WHATSAPP_AUTOMATION_META_ACCESS_TOKEN`
- `WHATSAPP_AUTOMATION_META_PHONE_NUMBER_ID`
- `WHATSAPP_AUTOMATION_META_TEST_RECIPIENT`
- `WHATSAPP_AUTOMATION_META_API_VERSION`
- `WHATSAPP_AUTOMATION_FLORA_HISTORY_SINCE` (opcional; baseline para considerar histórico da regra de intro Flora)

Compatibilidade legada:
- `WHATSAPP_AUTOMATION_GLOBAL_ENABLED`
- `WHATSAPP_AUTOMATION_FORCE_DRY_RUN`
- `WHATSAPP_AUTOMATION_META_FORCE_TEST_RECIPIENT`

Essas flags antigas continuam aceitas para transição, mas o padrão oficial agora é profile-first.

Semântica do baseline:
- histórico de automação anterior ao timestamp informado em `WHATSAPP_AUTOMATION_FLORA_HISTORY_SINCE` não é considerado.
- isso permite "reset lógico" da apresentação da Flora sem apagar dados históricos do banco.

#### Templates (canônico no banco)

Os nomes/idiomas de template agora são resolvidos por tenant na tabela `settings`:
- `whatsapp_template_created_name`
- `whatsapp_template_created_language`
- `whatsapp_template_reminder_name`
- `whatsapp_template_reminder_language`
- `whatsapp_automation_enabled`
- `whatsapp_studio_location_line`

Nota sobre `notification_templates`:
- a tabela existe por legado do desenho genérico de notificações, mas não é fonte ativa do WhatsApp atual.
- no fluxo Meta atual, a seleção de template vem da biblioteca local + settings do tenant.
- portanto, `notification_templates` vazia é comportamento esperado neste estágio.

#### Webhook / assinatura

- `WHATSAPP_AUTOMATION_META_WEBHOOK_VERIFY_TOKEN`
- `WHATSAPP_AUTOMATION_META_APP_SECRET`

#### Localização (fallback de operação)

- `DISPLACEMENT_ORIGIN_ADDRESS` (fallback de linha de estúdio quando setting não estiver preenchida)

---

## 5) Spotify (OAuth + estado/controle de player)

### Uso atual

- Integração no dashboard (configurações / atendimento) para conectar conta Spotify
- Consulta de estado do player e controle (`play`, `pause`, `next`, `previous`)
- Persistência de tokens/estado nas settings do tenant da sessão atual

### Rotas internas

- `GET /api/integrations/spotify/connect`
- `GET /api/integrations/spotify/callback`
- `GET /api/integrations/spotify/player/state`
- `POST /api/integrations/spotify/player/control`

### Proteções

- Sessão/autorização do dashboard
- Guard de origem same-origin para requests interativos

### Variáveis necessárias

- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `SPOTIFY_REDIRECT_URI` (opcional; se ausente resolve dinamicamente)

### Variáveis opcionais (playlist padrão)

- `NEXT_PUBLIC_ATTENDANCE_SPOTIFY_PLAYLIST_URL`

### Arquivos-chave

- `apps/web/src/modules/integrations/spotify/server.ts`
- `apps/web/src/modules/integrations/spotify/http-guards.ts`
- `apps/web/app/api/integrations/spotify/*`

---

## 6) Domínios, ambientes e cron/scheduler

### Domínios (estratégia atual)

- App interno (dashboard): `app.corpoealmahumanizado.com.br`
- Público (cliente final): `public.corpoealmahumanizado.com.br`
- DEV público (piloto/testes): `dev.public.corpoealmahumanizado.com.br`

### Webhooks por ambiente

#### Mercado Pago

- DEV:
  - `https://dev.public.corpoealmahumanizado.com.br/api/mercadopago/webhook`
- PROD:
  - `https://public.corpoealmahumanizado.com.br/api/mercadopago/webhook`

Regras:
- endpoint público (server-to-server)
- sem autenticação extra
- assinatura HMAC ativa

#### Meta WhatsApp Cloud API

- Callback configurado no app:
  - `GET|POST /api/whatsapp/meta/webhook`
- Recomendado validar assinatura (`WHATSAPP_AUTOMATION_META_APP_SECRET`) nos ambientes ativos

### Cron / scheduler (WhatsApp reminder 24h)

- Vercel Hobby: cron frequente não é suficiente para o lembrete 24h
- Solução atual:
  - endpoint no app (`/api/cron/whatsapp-reminders`)
  - scheduler via GitHub Actions (`.github/workflows/whatsapp-reminders-cron.yml`) a cada 5 minutos

GitHub Actions (estado atual):
- Job DEV ativo no cron
- Job PROD protegido por variável `WHATSAPP_CRON_ENABLE_PROD == 'true'`
- Autenticação por Bearer secret (`WHATSAPP_CRON_DEV_SECRET` / `WHATSAPP_CRON_PROD_SECRET`)

---

## 7) Checklist técnico de go-live (integrações)

1. Qualidade
```powershell
pnpm lint
pnpm build
```

2. Banco
- Migrations aplicadas no ambiente alvo

3. Mercado Pago
- `MERCADOPAGO_ACCESS_TOKEN` live no ambiente correto
- `MERCADOPAGO_WEBHOOK_SECRET` configurado
- Webhook configurado no painel MP com eventos `payment` + `order`
- Healthcheck `GET /api/mercadopago/webhook` retornando `200`

4. WhatsApp/Meta (piloto/produção)
- `WHATSAPP_AUTOMATION_META_ACCESS_TOKEN`
- `WHATSAPP_AUTOMATION_META_PHONE_NUMBER_ID`
- `WHATSAPP_AUTOMATION_META_WEBHOOK_VERIFY_TOKEN`
- `WHATSAPP_AUTOMATION_META_APP_SECRET` (recomendado/esperado)
- webhook Meta verificado no domínio correto
- `messages` assinados / recebidos
- `CRON_SECRET` configurado (se reminders automáticos ligados)

5. Spotify (se habilitado)
- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `SPOTIFY_REDIRECT_URI` conferido (ou callback dinâmica validada)
