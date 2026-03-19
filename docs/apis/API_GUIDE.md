# Guia de APIs Internas (`apps/web/app/api`)

Data de referência: 2026-02-25  
Escopo: rotas do App Router em `apps/web/app/api/**/route.ts`

## Regra de leitura (importante)

- Fonte de verdade: código das rotas (`route.ts`) + envs do ambiente.
- Este guia documenta o estado atual do repo e o comportamento esperado em
  runtime.
- Em conflito entre este arquivo e o código, o código vence.

## Visão geral das rotas

### Públicas / semi-públicas (sem sessão de dashboard)

- `GET /api/address-search`
- `GET /api/address-details`
- `GET /api/cep`
- `POST /api/displacement-fee`
- `GET|POST /api/mercadopago/webhook`
- `GET|POST /api/whatsapp/meta/webhook`

### Protegidas por segredo (Bearer)

- `GET /api/cron/whatsapp-reminders` (`Authorization: Bearer <CRON_SECRET>`)
- `GET /api/cron/event-dispatcher` (`Authorization: Bearer <CRON_SECRET>`)
- `GET /api/internal/events/dispatch`
  (`Authorization: Bearer <EVENT_DISPATCHER_SECRET>`)
- `POST /api/internal/events/dispatch`
  (`Authorization: Bearer <EVENT_DISPATCHER_SECRET>`)
- `GET /api/internal/notifications/whatsapp/process`
  (`Authorization: Bearer <WHATSAPP_AUTOMATION_PROCESSOR_SECRET>`)
- `POST /api/internal/notifications/whatsapp/process`
  (`Authorization: Bearer <WHATSAPP_AUTOMATION_PROCESSOR_SECRET>`)

### Protegidas por sessão do dashboard (Supabase auth + guard)

- `GET /api/search`
- `GET /api/internal/messages/state`
- `GET /api/internal/tenancy/overview`
- `GET /api/internal/tenancy/memberships`
- `POST /api/internal/tenancy/memberships`
- `GET /api/internal/tenancy/onboarding`
- `POST /api/internal/tenancy/onboarding`
- `GET /api/integrations/spotify/connect`
- `GET /api/integrations/spotify/callback`
- `GET /api/integrations/spotify/player/state`
- `POST /api/integrations/spotify/player/control`
- `GET /api/push/preferences`
- `POST /api/push/preferences`
- `GET /api/push/subscriptions`
- `POST /api/push/subscriptions`
- `DELETE /api/push/subscriptions`
- `POST /api/push/test`

## Borda assíncrona (Supabase Edge Functions)

Além das rotas `app/api`, o repo mantém funções de borda em
`supabase/functions/*` para cenários assíncronos:

- `mercadopago-webhook-proxy`
- `whatsapp-meta-webhook`
- `whatsapp-automation-processor`
- `event-dispatcher`

Essas funções não substituem as rotas `app/api` por padrão; são fronteira
complementar para operação e evolução de arquitetura.

Observação:

- As rotas de Spotify também validam origem/interação same-origin em cenários
  interativos.

## Variáveis de ambiente (por grupo)

### Google Maps / endereços

- `GOOGLE_MAPS_API_KEY` (obrigatória para `address-search`, `address-details` e
  cálculo real de deslocamento)
- `DISPLACEMENT_ORIGIN_ADDRESS` (opcional; usado como origem/fallback em regras
  de deslocamento e também em templates WhatsApp)

Regra canônica atual:

- para operações por tenant, a fonte principal é `tenant_provider_configs`
  (`provider_key = "google_maps"`).
- os endpoints retornam `400` quando não conseguem resolver tenant.
- os endpoints retornam `423` quando o provider do tenant está inconsistente.

### Mercado Pago

- `MERCADOPAGO_ACCESS_TOKEN`
- `MERCADOPAGO_WEBHOOK_SECRET`
- `MERCADOPAGO_PUBLIC_KEY` (usada no checkout/front, não pela rota de webhook)

Regra canônica atual:

- fonte principal por tenant: `tenant_provider_configs` (`provider_key = "mercadopago"`).
- variáveis globais ficam apenas como fallback controlado quando
  `credential_mode = "environment_fallback"`.

### WhatsApp automação / Meta

- `CRON_SECRET`
- `WHATSAPP_AUTOMATION_PROCESSOR_SECRET`
- `WHATSAPP_PROFILE`
- `WHATSAPP_AUTOMATION_RECIPIENT_MODE`
- `WHATSAPP_AUTOMATION_PROVIDER`
- `WHATSAPP_AUTOMATION_META_ACCESS_TOKEN`
- `WHATSAPP_AUTOMATION_META_PHONE_NUMBER_ID`
- `WHATSAPP_AUTOMATION_META_TEST_RECIPIENT`
- `WHATSAPP_AUTOMATION_META_API_VERSION`
- `WHATSAPP_AUTOMATION_META_WEBHOOK_VERIFY_TOKEN`
- `WHATSAPP_AUTOMATION_META_APP_SECRET` (opcional, mas recomendado; se ausente a
  assinatura do webhook Meta não é exigida)
- `WHATSAPP_AUTOMATION_FLORA_HISTORY_SINCE` (opcional; baseline de histórico
  para regra `com_flora/sem_oi_flora`)
- `EVENT_DISPATCHER_SECRET` (segredo dedicado para o dispatcher de eventos,
  recomendado)
- `FF_REALTIME_PATCH_MODE`
- `FF_EDGE_DISPATCHER_V2`
- `FF_PUSH_NOTIFICATIONS`
- `FF_LOADING_SYSTEM_V2`
- `FF_CANARY_PERCENT`

### Push (OneSignal)

- `NEXT_PUBLIC_ONESIGNAL_APP_ID`
- `NEXT_PUBLIC_ONESIGNAL_SAFARI_WEB_ID`
- `ONESIGNAL_REST_API_KEY`

Regra canônica atual:

- fonte principal por tenant: `tenant_provider_configs` (`provider_key = "onesignal"`).
- variáveis globais ficam apenas como fallback controlado quando
  `credential_mode = "environment_fallback"`.

Padrão oficial atual:

- profile-first + recipient mode.

Observação:

- nomes/idiomas de templates da Meta são configurados por tenant no banco
  (`settings`), não por env.
- `appointment_created` usa matriz de 12 templates com seleção por cenário
  (local + financeiro + intro), definida no backend.
- `appointment_reminder` usa matriz de 4 templates com seleção por cenário
  (estúdio/domicílio + pago integral/saldo pendente), definida no backend.
- para tratar todos os clientes como "primeira mensagem" em uma nova fase,
  configure `WHATSAPP_AUTOMATION_FLORA_HISTORY_SINCE` com a data/hora de
  go-live.

### Spotify

- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `SPOTIFY_REDIRECT_URI` (opcional; se ausente, o app resolve a callback pelo
  origin atual)

## Endpoints (detalhamento)

## 1) Endereços / busca / cálculo

### `GET /api/search`

Função:

- Busca agendamentos e clientes para uso interno do dashboard.

Proteção:

- Requer sessão/autorização do dashboard.
- Sem acesso, retorna `401` com payload contendo `loginRequired` e `loginUrl`.

Query params:

- `q` (mínimo 3 caracteres)
- `limit` (1 a 20, padrão `5`)

Resposta (`200`):

- `{ appointments, clients }`

Resposta sem auth (`401`):

- `{ appointments: [], clients: [], loginRequired: true, loginUrl }`

Observações:

- Busca agendamentos em janela aproximada de `-365/+365` dias.
- Pesquisa de clientes por nome via Supabase.

### `GET /api/cep`

Função:

- Consulta CEP via BrasilAPI.

Query params:

- `cep` (aceita máscara; rota normaliza para 8 dígitos)

Respostas:

- `200`: JSON da BrasilAPI
- `400`: CEP inválido
- `404`: CEP não encontrado

### `GET /api/address-search`

Função:

- Autocomplete de endereço via Google Places API (New).

Query params:

- `q` (mínimo 3 caracteres)
- `tenantId` (opcional; UUID)
- `tenantSlug` (opcional)

Respostas:

- `200`: `[]` (query curta) ou array de `{ id, placeId, label }`
- `400`: tenant não resolvido
- `423`: provider Google Maps não configurado para o tenant
- `4xx/5xx`: repassa status do provedor (com payload `[]`)

Observações:

- A rota é `GET`, mas faz `POST` para o endpoint do Google internamente.

### `GET /api/address-details`

Função:

- Resolve detalhes de um `placeId` em endereço estruturado.

Query params:

- `placeId` (obrigatório)
- `tenantId` (opcional; UUID)
- `tenantSlug` (opcional)

Respostas:

- `200`: `{ label, cep, logradouro, numero, bairro, cidade, estado }`
- `400`: `placeId` inválido/ausente
- `400`: tenant não resolvido
- `423`: provider Google Maps não configurado para o tenant
- `4xx/5xx`: falha do provedor Google

Observações:

- Faz normalização de estado para UF (`SP`, `RJ`, etc.).

### `POST /api/displacement-fee`

Função:

- Calcula taxa de deslocamento para atendimento domiciliar.

Payload JSON:

- `{
  cep?, logradouro?, numero?, complemento?, bairro?, cidade?, estado?,
  tenantId?, tenantSlug?
  }`

Respostas:

- `200` (sucesso Google):
  - `{ distanceKm, fee, rule, source: "google_maps" }`
- `200` (fallback seguro):
  - `{ distanceKm, fee, rule, source: "fallback_minimum", warning, details }`
- `400`:
  - payload inválido / JSON inválido / tenant não resolvido
- `423`:
  - provider Google Maps inconsistente para o tenant

Observação:

- Em falha do Google, a rota retorna taxa mínima provisória para não interromper
  o fluxo público.
- Em falha de configuração de provider por tenant, a rota falha com `423`
  (fail-safe), sem fallback silencioso.

## 2) Mercado Pago (Orders API + webhook)

### `POST /api/mercadopago/webhook`

Função:

- Recebe notificações do Mercado Pago e reconcilia pagamentos no banco.

Eventos suportados:

- `payment`
- `order`

Compatibilidade:

- Também lê `topic` legado para resolver tipo da notificação.

Headers relevantes:

- `x-signature` (obrigatório; HMAC validado)
- `x-request-id` (usado na montagem do manifesto de assinatura)

Query params / payload usados:

- `type` ou `topic`
- `data.id` (ou `id`)

Respostas principais:

- `200` `{ ok: true }` (processado)
- `200` `{ ok: true, skipped: ... }` (ignorado por tipo/id/lookup)
- `401` assinatura inválida
- `500` erro de configuração
  (`tenant_provider_configs` sem credencial válida) ou erro de
  persistência

Efeitos no banco:

- Upsert em `appointment_payments`
- Recalcula e atualiza `appointments.payment_status`
- Registra evento em `appointment_events` (`payment_webhook`)

Observações:

- A rota consulta `v1/orders/{id}` e/ou `v1/payments/{id}` no Mercado Pago para
  hidratar status/metadata reais.
- Assinatura e tokens são resolvidos por candidatos ativos em
  `tenant_provider_configs`, com fallback ordenado por `tenant_id` quando
  possível.
- O projeto usa **Orders API** como implementação do checkout transparente (não
  usar Checkout Pro).

### `GET /api/mercadopago/webhook`

Função:

- Healthcheck/handshake operacional (Mercado Pago pode testar a URL com `GET`).

Resposta:

- `200` `{ ok: true, paymentId }`

## 3) WhatsApp / Meta Cloud API (webhook + processamento)

### `GET /api/whatsapp/meta/webhook`

Função:

- Verificação do webhook da Meta (`hub.challenge`).

Query params esperados:

- `hub.mode`
- `hub.verify_token`
- `hub.challenge`

Respostas:

- `200` (texto puro com `hub.challenge`) quando validado
- `403` falha na verificação
- `503` verify token não configurado

### `POST /api/whatsapp/meta/webhook`

Função:

- Recebe eventos do WhatsApp Cloud API e atualiza status/replies da automação.
- Também sincroniza o catálogo de templates quando recebe campos de template
  (status/qualidade/categoria/componentes).

Header relevante:

- `x-hub-signature-256`

Validação:

- Se `WHATSAPP_AUTOMATION_META_APP_SECRET` estiver configurado, a assinatura é
  obrigatória e validada (`HMAC-SHA256`).
- Se o `APP_SECRET` não estiver configurado, a rota aceita o payload sem
  validação de assinatura (comportamento atual do código).

Respostas:

- `200`: resultado de processamento (`processMetaCloudWebhookEvents`)
- `400`: JSON inválido
- `401`: assinatura inválida
- `500`: erro de processamento

Campos recomendados na assinatura do webhook Meta:

- `messages`
- `message_template_status_update`
- `message_template_quality_update`
- `template_category_update`
- `message_template_components_update`

### `GET /api/internal/notifications/whatsapp/process`

Função:

- Endpoint interno de diagnóstico/configuração da automação WhatsApp.

Proteção:

- `Authorization: Bearer <WHATSAPP_AUTOMATION_PROCESSOR_SECRET>`.
- sem bearer válido, retorna `401`.
- se o secret não estiver configurado, retorna `503`.

Resposta:

- `200` com `{ ok, automation, dispatchEnabled }`

### `POST /api/internal/notifications/whatsapp/process`

Função:

- Processa jobs pendentes da fila de automação WhatsApp manualmente/sob demanda.

Proteção:

- `Authorization: Bearer <WHATSAPP_AUTOMATION_PROCESSOR_SECRET>`

Comportamento:

- Se `WHATSAPP_AUTOMATION_PROCESSOR_SECRET` não estiver configurado, retorna
  `503`.

Payload opcional:

- `limit?: number`
- `appointmentId?: string`
- `jobId?: string`
- `type?: "appointment_created" | "appointment_canceled" | "appointment_reminder"`

Respostas:

- `200` `{ ok: true, summary }`
- `401` unauthorized
- `503` secret ausente
- `500` erro de processamento

### `GET /api/cron/whatsapp-reminders`

Função:

- Processa lembretes automáticos (`appointment_reminder`) via cron/scheduler.

Proteção:

- `Authorization: Bearer <CRON_SECRET>`

Respostas:

- `200` `{ ok: true, summary }`
- `401` unauthorized
- `500` erro (retorna também `automation` para diagnóstico)

Observação:

- No projeto atual, a frequência alta é executada por GitHub Actions (Vercel
  Hobby não cobre cron frequente).

### `GET /api/cron/event-dispatcher`

Função:

- Processa o outbox de eventos (`notification_event_outbox`) e dispara
  integrações assíncronas (push e trilha operacional).

Proteção:

- `Authorization: Bearer <CRON_SECRET>`

Respostas:

- `200` `{ ok: true, summary }`
- `401` unauthorized
- `500` erro de processamento

### `GET /api/internal/events/dispatch`

Função:

- Healthcheck do dispatcher interno de eventos.

Proteção:

- `Authorization: Bearer <EVENT_DISPATCHER_SECRET>`
- fallback temporário para `WHATSAPP_AUTOMATION_PROCESSOR_SECRET` quando
  `EVENT_DISPATCHER_SECRET` não estiver definido.

Resposta:

- `200` com flags e estado de disponibilidade

### `POST /api/internal/events/dispatch`

Função:

- Processa lote do outbox com retry/DLQ.

Proteção:

- `Authorization: Bearer <EVENT_DISPATCHER_SECRET>`

Payload opcional:

- `{ limit?: number }`

Respostas:

- `200` `{ ok: true, summary }`
- `401` unauthorized
- `503` secret ausente
- `500` erro de processamento

## 3.1) Push e estado do módulo Mensagens

### `GET /api/internal/messages/state`

Função:

- Retorna snapshot serializado da tela Mensagens (fila, histórico e catálogo de
  templates) para atualização realtime client-side.

Proteção:

- Sessão dashboard.

### `GET|POST /api/push/preferences`

Função:

- Consulta e atualiza preferências de push por tipo de evento para a usuária
  logada.

Proteção:

- Sessão dashboard.

### `GET|POST|DELETE /api/push/subscriptions`

Função:

- `GET`: lista inscrições ativas do usuário logado (saúde da inscrição).
- `POST`: registra/atualiza inscrição OneSignal Web Push do dispositivo atual.
- `DELETE`: desativa inscrição OneSignal Web Push.

Proteção:

- Sessão dashboard.

### `POST /api/push/test`

Função:

- Dispara push de teste para o usuário logado (external id da sessão) para
  validar inscrição OneSignal.

Proteção:

- Sessão dashboard.

Regras:

- Retorna `409` se não existir inscrição ativa em `push_subscriptions` para o
  usuário.
- Registra tentativa em `push_delivery_attempts` com
  `event_type = "push.test.manual"`.

## 3.2) Governança operacional de tenant (white-label)

### `GET /api/internal/tenancy/overview`

Função:

- Retorna snapshot operacional do tenant atual para operação white-label:
  runtime, providers, health checks, alertas, memberships, onboarding, auditoria
  e uso/custo de integrações.

Proteção:

- Sessão dashboard.
- Permissão `whitelabel:read` por papel.

### `GET /api/internal/tenancy/memberships`

Função:

- Lista memberships do tenant com status derivado (`pending|active|suspended`).

Proteção:

- Sessão dashboard.
- Permissão `whitelabel:read`.

### `POST /api/internal/tenancy/memberships`

Função:

- Opera governança de memberships por tenant:
  - `bootstrap_owner`
  - `update_role`
  - `update_status`

Proteção:

- Sessão dashboard.
- Permissão `whitelabel:manage`.

### `GET /api/internal/tenancy/onboarding`

Função:

- Lista histórico de runs/steps do onboarding do tenant.

Proteção:

- Sessão dashboard.
- Permissão `whitelabel:read`.

### `POST /api/internal/tenancy/onboarding`

Função:

- Executa ações de onboarding:
  - `start`
  - `step`
  - `activate` (ativa tenant após checks de owner + providers)

Proteção:

- Sessão dashboard.
- Permissão `whitelabel:manage`.

## 4) Spotify (OAuth + player)

### `GET /api/integrations/spotify/connect`

Função:

- Inicia OAuth com Spotify (dashboard > configurações).

Proteção:

- Requer sessão/autorização do dashboard.
- Requer request same-origin interativo.

Comportamento:

- Redireciona para `https://accounts.spotify.com/authorize`
- Cria cookies temporários:
  - `spotify_oauth_state`
  - `spotify_oauth_return_to`

Fallbacks:

- Se `SPOTIFY_CLIENT_ID` ausente, redireciona para
  `/configuracoes?spotify=missing_client_id`
- Se sem auth/origem inválida, redireciona para login do dashboard

### `GET /api/integrations/spotify/callback`

Função:

- Recebe callback OAuth, valida `state`, troca `code` por token e persiste
  conexão nas settings.

Proteção:

- Requer sessão/autorização do dashboard.

Comportamento:

- Valida cookie `spotify_oauth_state`
- Persiste tokens/conta em `settings`
- Redireciona para `returnTo` (cookie) com query
  `spotify=connected|error|state_invalid`

### `GET /api/integrations/spotify/player/state`

Função:

- Consulta estado do player Spotify para o módulo de atendimento/configurações.

Proteção:

- Requer sessão/autorização do dashboard + request same-origin interativo.

Resposta:

- `200` com `ok: true|false` e payload de estado do player
- `401` quando sessão expirada/sem acesso (retorna `loginRequired` + `loginUrl`)

Observação:

- Mesmo erros operacionais do Spotify retornam `200` com `ok: false` e mensagem
  amigável para UI.

### `POST /api/integrations/spotify/player/control`

Função:

- Executa ação de player (`play`, `pause`, `next`, `previous`).

Proteção:

- Requer sessão/autorização do dashboard + request same-origin interativo.

Payload JSON:

- `{ action: "play" | "pause" | "next" | "previous" }`

Respostas:

- `200` com estado atualizado (ou erro amigável para UI)
- `400` payload inválido / ação inválida
- `401` sem sessão/autorização

## Testes rápidos (exemplos)

### Públicas

- `GET /api/cep?cep=01311000`
- `GET /api/address-search?q=Rua%20das%20Acacias%20120%20Sao%20Paulo`
- `GET /api/address-details?placeId=PLACE_ID_AQUI`
- `POST /api/displacement-fee` (JSON com endereço)
- `GET /api/mercadopago/webhook`

### Internas / protegidas (exigem auth/segredo)

- `GET /api/search?q=renato&limit=5` (sessão dashboard)
- `GET /api/cron/whatsapp-reminders` com `Authorization: Bearer <CRON_SECRET>`
- `GET /api/internal/notifications/whatsapp/process` com
  `Authorization: Bearer <WHATSAPP_AUTOMATION_PROCESSOR_SECRET>`
- `POST /api/internal/notifications/whatsapp/process` com
  `Authorization: Bearer <WHATSAPP_AUTOMATION_PROCESSOR_SECRET>`
