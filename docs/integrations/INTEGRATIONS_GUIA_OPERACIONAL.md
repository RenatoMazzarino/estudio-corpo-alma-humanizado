# Guia Operacional de Integrações

Data de referência: 2026-02-25  
Escopo: operação diária, suporte e checklist de produção/piloto das integrações do produto

Este guia é operacional (painéis, validações, troubleshooting e rotina).  
Para arquitetura técnica, endpoints e envs detalhadas, usar `docs/integrations/INTEGRATIONS_TECNICO.md`.

## 1) Mapa rápido (o que impacta operação)

1. Supabase
- Função: banco principal, auth do dashboard, settings, notificações e persistência operacional
- Criticidade: alta

2. Google Maps Platform
- Função: autocomplete de endereço + detalhamento + cálculo de taxa de deslocamento
- Criticidade: alta no fluxo de domicílio

3. Mercado Pago (Checkout Transparente via Orders API)
- Função: cobrança Pix/cartão + webhook + reconciliação de pagamento
- Criticidade: alta
- Regra fixa: este projeto usa `Checkout Transparente` com `Orders API`
- Fora de escopo: `Checkout Pro`
- Eventos de webhook usados: `payment` e `order`

4. WhatsApp (manual + automação Meta Cloud API)
- Função: comunicação com cliente (manual + automática)
- Criticidade: média/alta (automação melhora operação, mas fluxo manual continua coexistindo)
- Painel operacional: `Mensagens`

5. Spotify (dashboard)
- Função: conexão de conta e controle do player no atendimento/configurações
- Criticidade: baixa/média (não bloqueia agendamento/pagamento)

## 2) Ambientes e domínios (operação)

### Produção

- App interno: `https://app.corpoealmahumanizado.com.br`
- Público: `https://public.corpoealmahumanizado.com.br`

### DEV (público / testes)

- Público DEV: `https://dev.public.corpoealmahumanizado.com.br`

Observação:
- Sempre validar domínio + commit do deploy antes de testar webhook/auth, porque redeploy manual de deploy antigo mantém commit velho.

## 3) Variáveis críticas por integração (checklist rápido)

### Supabase

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Google Maps

- `GOOGLE_MAPS_API_KEY`
- `DISPLACEMENT_ORIGIN_ADDRESS` (opcional)

### Mercado Pago

- `MERCADOPAGO_ACCESS_TOKEN`
- `MERCADOPAGO_PUBLIC_KEY`
- `MERCADOPAGO_WEBHOOK_SECRET`

### WhatsApp / Meta (automação)

- `WHATSAPP_AUTOMATION_MODE`
- `WHATSAPP_AUTOMATION_PROVIDER`
- `WHATSAPP_AUTOMATION_META_ACCESS_TOKEN`
- `WHATSAPP_AUTOMATION_META_PHONE_NUMBER_ID`
- `WHATSAPP_AUTOMATION_META_WEBHOOK_VERIFY_TOKEN`
- `WHATSAPP_AUTOMATION_META_APP_SECRET`
- `WHATSAPP_AUTOMATION_META_CREATED_TEMPLATE_NAME`
- `WHATSAPP_AUTOMATION_META_REMINDER_TEMPLATE_NAME`
- `CRON_SECRET`

### GitHub Actions (scheduler dos lembretes)

- Secrets:
  - `WHATSAPP_CRON_DEV_SECRET`
  - `WHATSAPP_CRON_PROD_SECRET`
- Variable:
  - `WHATSAPP_CRON_ENABLE_PROD` (`true` para ativar job PROD)

### Spotify (se habilitado)

- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `SPOTIFY_REDIRECT_URI` (opcional)

### App

- `APP_TIMEZONE=America/Sao_Paulo`

## 4) Mercado Pago (produção) - checklist de painel

### Configuração obrigatória (painel MP)

1. URL webhook produção:
- `https://public.corpoealmahumanizado.com.br/api/mercadopago/webhook`

2. URL webhook DEV (quando testando DEV):
- `https://dev.public.corpoealmahumanizado.com.br/api/mercadopago/webhook`

3. Eventos selecionados:
- `Pagamentos`
- `Order (Mercado Pago)`

4. Eventos que não precisam ficar ligados neste projeto:
- tópicos extras sem uso (fraude, reclamações, etc.) para evitar ruído operacional

### Validação rápida pós-configuração

1. `GET /api/mercadopago/webhook` no domínio do ambiente retorna `200`
2. Simulação de webhook no MP retorna `200/201`
3. Pagamento real/teste atualiza status no sistema

## 5) WhatsApp (manual + automação) - operação atual

### Regra de produto (obrigatória)

- O envio manual por WhatsApp continua válido e não deve ser removido do fluxo operacional.
- A automação deve coexistir ao lado do manual.

### O que já está automatizado (MVP)

- Aviso de agendamento (template)
- Lembrete 24h (template)
- Respostas automáticas aos botões:
  - `Confirmar`
  - `Reagendar`
  - `Falar com a Jana`
- Cancelamento com checkbox (mensagem livre) quando janela 24h está aberta

### Painel operacional (`Mensagens`)

O painel já mostra:
- fila e histórico
- timeline/caminho da mensagem
- status reais (`sent`, `delivered`, `read`, `failed`)
- nome do template
- horários em formato BR 24h
- motivos amigáveis de falha

### Modo seguro para piloto/teste (recomendado)

- É válido manter automação apontando para número de teste (`WHATSAPP_AUTOMATION_META_TEST_RECIPIENT`), inclusive em produção durante piloto.
- Isso reduz risco de spam/envio indevido enquanto cron/webhook/painel são validados.

### Scheduler dos lembretes 24h (importante)

- Vercel Hobby não é a fonte principal do scheduler frequente.
- Lembretes 24h são processados por:
  - endpoint `/api/cron/whatsapp-reminders`
  - GitHub Actions (`*/5`)

## 6) Fluxo operacional resumido (pagamento + mensagens)

### Pagamento (Mercado Pago)

1. Cliente inicia pagamento (Pix/cartão)
2. Sistema cria cobrança (Orders API)
3. Cliente paga
4. Mercado Pago chama webhook (`payment`/`order`)
5. Webhook reconcilia no banco (`appointment_payments`, `appointments.payment_status`)
6. UI de checkout/atendimento reflete confirmação (webhook e sincronizações complementares no fluxo Pix)
7. Comprovante/recibo pode ser exibido/compartilhado pelo fluxo do app

### WhatsApp (automação)

1. Evento de negócio gera job de notificação
2. Processador envia via Meta Cloud API (template ou session message)
3. Webhook Meta atualiza status
4. Painel `Mensagens` mostra resultado para operação

## 7) Rotina de validação antes de deploy (operacional)

1. Qualidade (quando houve mudança de código)
```powershell
pnpm --filter web lint
pnpm --filter web build
```

2. Banco
```powershell
pnpm supabase migration up   # local
pnpm supabase db push        # remoto linkado
```

3. Smoke tests mínimos
- Agendamento público
- Geração de Pix
- Confirmação via webhook MP
- Status financeiro atualizado
- Voucher abre em `/voucher/[id]`
- (Se automação ligada) mensagem aparece no painel `Mensagens`

4. WhatsApp (se em teste/piloto)
- webhook Meta verificado
- `messages` chegando no webhook
- status `sent/delivered/read` atualizando no painel
- cron de reminder funcionando (manual ou GitHub Actions)

## 8) Troubleshooting rápido

### 1. Pix gerado, mas status não atualiza na UI

Verificar:
- logs da rota `/api/mercadopago/webhook`
- `MERCADOPAGO_WEBHOOK_SECRET` correto no ambiente
- domínio webhook correto no painel MP
- se houve pagamento recebido mas sem reconciliação por evento (webhook falhou/atrasou)

Observação:
- O fluxo atual pode sincronizar Pix com consulta complementar à Orders API, mas isso não substitui webhook saudável.

### 2. Webhook MP responde `401`

Verificar:
- `MERCADOPAGO_WEBHOOK_SECRET` no ambiente correto
- assinatura enviada pelo MP
- domínio/URL configurado no painel MP

### 3. WhatsApp envia, mas painel não atualiza `delivered/read`

Verificar:
- callback URL `/api/whatsapp/meta/webhook`
- verify token
- assinatura (`WHATSAPP_AUTOMATION_META_APP_SECRET`)
- campo `messages` habilitado/assinado no app Meta
- logs do webhook Meta

### 4. Lembrete 24h não disparou

Verificar:
- `CRON_SECRET` no ambiente
- GitHub Actions workflow `whatsapp-reminders-cron`
- `WHATSAPP_CRON_ENABLE_PROD` (quando testando produção)
- secret correto (`WHATSAPP_CRON_DEV_SECRET` / `WHATSAPP_CRON_PROD_SECRET`)

### 5. Login do dashboard pedindo autenticação com frequência

Verificar:
- deploy com `apps/web/proxy.ts` ativo (refresh de sessão SSR)
- config de sessão/JWT no Supabase (tempo de expiração)
- domínio correto (DEV vs PROD) no fluxo OAuth

### 6. Spotify não conecta ou volta com erro

Verificar:
- `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET`
- callback URI no Spotify Dashboard
- sessão ativa no dashboard
- retorno para `/configuracoes?spotify=...`

## 9) Regras operacionais (não quebrar o sistema)

- Não misturar credenciais entre DEV e PROD.
- Não trocar Mercado Pago para Checkout Pro neste repo.
- Não remover o fluxo manual de WhatsApp ao ativar automação.
- Não ligar scheduler PROD sem checar fila/backlog e destinatário/allowlist.
- Em incidente, priorizar:
  1. pausar automação (`WHATSAPP_AUTOMATION_MODE`)
  2. corrigir env/webhook
  3. validar em DEV
  4. religar rollout controlado

