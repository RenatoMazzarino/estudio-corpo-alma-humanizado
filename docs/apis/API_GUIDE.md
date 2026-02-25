# Guia de APIs Internas (`apps/web/app/api`)

Data de referência: 2026-02-25  
Escopo: rotas do App Router em `apps/web/app/api/**/route.ts`

## Regra de leitura (importante)

- Fonte de verdade: código das rotas (`route.ts`) + envs do ambiente.
- Este guia documenta o estado atual do repo e o comportamento esperado em runtime.
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
- `POST /api/internal/notifications/whatsapp/process` (`Authorization: Bearer <WHATSAPP_AUTOMATION_PROCESSOR_SECRET>`)

### Protegidas por sessão do dashboard (Supabase auth + guard)

- `GET /api/search`
- `GET /api/integrations/spotify/connect`
- `GET /api/integrations/spotify/callback`
- `GET /api/integrations/spotify/player/state`
- `POST /api/integrations/spotify/player/control`

Observação:
- As rotas de Spotify também validam origem/interação same-origin em cenários interativos.

## Variáveis de ambiente (por grupo)

### Google Maps / endereços

- `GOOGLE_MAPS_API_KEY` (obrigatória para `address-search`, `address-details` e cálculo real de deslocamento)
- `DISPLACEMENT_ORIGIN_ADDRESS` (opcional; usado como origem/fallback em regras de deslocamento e também em templates WhatsApp)

### Mercado Pago

- `MERCADOPAGO_ACCESS_TOKEN`
- `MERCADOPAGO_WEBHOOK_SECRET`
- `MERCADOPAGO_PUBLIC_KEY` (usada no checkout/front, não pela rota de webhook)

### WhatsApp automação / Meta

- `CRON_SECRET`
- `WHATSAPP_AUTOMATION_PROCESSOR_SECRET`
- `WHATSAPP_AUTOMATION_META_WEBHOOK_VERIFY_TOKEN`
- `WHATSAPP_AUTOMATION_META_APP_SECRET` (opcional, mas recomendado; se ausente a assinatura do webhook Meta não é exigida)

### Spotify

- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `SPOTIFY_REDIRECT_URI` (opcional; se ausente, o app resolve a callback pelo origin atual)

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

Respostas:
- `200`: `[]` (query curta) ou array de `{ id, placeId, label }`
- `500`: API key ausente
- `4xx/5xx`: repassa status do provedor (com payload `[]`)

Observações:
- A rota é `GET`, mas faz `POST` para o endpoint do Google internamente.

### `GET /api/address-details`

Função:
- Resolve detalhes de um `placeId` em endereço estruturado.

Query params:
- `placeId` (obrigatório)

Respostas:
- `200`: `{ label, cep, logradouro, numero, bairro, cidade, estado }`
- `400`: `placeId` inválido/ausente
- `500`: API key ausente
- `4xx/5xx`: falha do provedor Google

Observações:
- Faz normalização de estado para UF (`SP`, `RJ`, etc.).

### `POST /api/displacement-fee`

Função:
- Calcula taxa de deslocamento para atendimento domiciliar.

Payload JSON:
- `{ cep?, logradouro?, numero?, complemento?, bairro?, cidade?, estado? }`

Respostas:
- `200` (sucesso Google):
  - `{ distanceKm, fee, rule, source: "google_maps" }`
- `200` (fallback seguro):
  - `{ distanceKm, fee, rule, source: "fallback_minimum", warning, details }`
- `400`:
  - payload inválido / JSON inválido

Observação:
- Em falha do Google, a rota retorna taxa mínima provisória para não interromper o fluxo público.

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
- `500` erro de configuração (`MERCADOPAGO_ACCESS_TOKEN`/`MERCADOPAGO_WEBHOOK_SECRET`) ou erro de persistência

Efeitos no banco:
- Upsert em `appointment_payments`
- Recalcula e atualiza `appointments.payment_status`
- Registra evento em `appointment_events` (`payment_webhook`)

Observações:
- A rota consulta `v1/orders/{id}` e/ou `v1/payments/{id}` no Mercado Pago para hidratar status/metadata reais.
- O projeto usa **Orders API** como implementação do checkout transparente (não usar Checkout Pro).

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
- Recebe eventos `messages` do WhatsApp Cloud API e atualiza status/replies da automação.

Header relevante:
- `x-hub-signature-256`

Validação:
- Se `WHATSAPP_AUTOMATION_META_APP_SECRET` estiver configurado, a assinatura é obrigatória e validada (`HMAC-SHA256`).
- Se o `APP_SECRET` não estiver configurado, a rota aceita o payload sem validação de assinatura (comportamento atual do código).

Respostas:
- `200`: resultado de processamento (`processMetaCloudWebhookEvents`)
- `400`: JSON inválido
- `401`: assinatura inválida
- `500`: erro de processamento

### `GET /api/internal/notifications/whatsapp/process`

Função:
- Endpoint interno de diagnóstico/configuração da automação WhatsApp.

Proteção:
- Não exige segredo atualmente para `GET` (retorna apenas config/runtime resumido).
- Tratar como endpoint interno de operação, não para exposição pública.

Resposta:
- `200` com `{ ok, automation, dispatchEnabled }`

### `POST /api/internal/notifications/whatsapp/process`

Função:
- Processa jobs pendentes da fila de automação WhatsApp manualmente/sob demanda.

Proteção:
- `Authorization: Bearer <WHATSAPP_AUTOMATION_PROCESSOR_SECRET>`

Comportamento:
- Se `WHATSAPP_AUTOMATION_PROCESSOR_SECRET` não estiver configurado, retorna `503`.

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
- No projeto atual, a frequência alta é executada por GitHub Actions (Vercel Hobby não cobre cron frequente).

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
- Se `SPOTIFY_CLIENT_ID` ausente, redireciona para `/configuracoes?spotify=missing_client_id`
- Se sem auth/origem inválida, redireciona para login do dashboard

### `GET /api/integrations/spotify/callback`

Função:
- Recebe callback OAuth, valida `state`, troca `code` por token e persiste conexão nas settings.

Proteção:
- Requer sessão/autorização do dashboard.

Comportamento:
- Valida cookie `spotify_oauth_state`
- Persiste tokens/conta em `settings`
- Redireciona para `returnTo` (cookie) com query `spotify=connected|error|state_invalid`

### `GET /api/integrations/spotify/player/state`

Função:
- Consulta estado do player Spotify para o módulo de atendimento/configurações.

Proteção:
- Requer sessão/autorização do dashboard + request same-origin interativo.

Resposta:
- `200` com `ok: true|false` e payload de estado do player
- `401` quando sessão expirada/sem acesso (retorna `loginRequired` + `loginUrl`)

Observação:
- Mesmo erros operacionais do Spotify retornam `200` com `ok: false` e mensagem amigável para UI.

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
- `GET /api/internal/notifications/whatsapp/process` (diagnóstico interno)
- `POST /api/internal/notifications/whatsapp/process` com `Authorization: Bearer <WHATSAPP_AUTOMATION_PROCESSOR_SECRET>`

