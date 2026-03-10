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
- Na Vercel, o ambiente `Development` (CLI) não usa domínio customizado.
- O domínio `dev.public...` deve ser tratado como alias de deploy `preview`.
- Se ficar desatualizado, realinhar com:
  - `pnpm exec vercel inspect dev.public.corpoealmahumanizado.com.br`
  - `pnpm exec vercel alias set <deployment-preview>.vercel.app dev.public.corpoealmahumanizado.com.br`

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

- `WHATSAPP_PROFILE`
- `WHATSAPP_AUTOMATION_RECIPIENT_MODE`
- `WHATSAPP_AUTOMATION_PROVIDER`
- `WHATSAPP_AUTOMATION_META_ACCESS_TOKEN`
- `WHATSAPP_AUTOMATION_META_PHONE_NUMBER_ID`
- `WHATSAPP_AUTOMATION_META_WEBHOOK_VERIFY_TOKEN`
- `WHATSAPP_AUTOMATION_META_APP_SECRET`
- `WHATSAPP_AUTOMATION_FLORA_HISTORY_SINCE` (opcional; usar como marco inicial para regra de apresentação da Flora)
- `WHATSAPP_AUTOMATION_PROCESSOR_SECRET`
- `EVENT_DISPATCHER_SECRET`
- `CRON_SECRET`
- `FF_REALTIME_PATCH_MODE`
- `FF_EDGE_DISPATCHER_V2`
- `FF_PUSH_NOTIFICATIONS`
- `FF_LOADING_SYSTEM_V2`
- `FF_CANARY_PERCENT`

### Push (OneSignal)

- `NEXT_PUBLIC_ONESIGNAL_APP_ID`
- `NEXT_PUBLIC_ONESIGNAL_SAFARI_WEB_ID`
- `ONESIGNAL_REST_API_KEY`

Observação importante:
- OneSignal push **não exige template pré-cadastrado** para este projeto.
- O conteúdo das notificações push é gerado dinamicamente pelo backend (evento + contexto operacional).

Perfis recomendados:
- Development: `dev_sandbox`
- Preview: `preview_real_test`
- Production: `prod_real`

Modo de destinatário:
- `test_recipient` para homologação/piloto controlado
- `customer` para envio real à cliente

Configuração de template e idioma:
- canônica no banco (`settings` por tenant), não em env.

Uso recomendado do baseline (`WHATSAPP_AUTOMATION_FLORA_HISTORY_SINCE`):
- para iniciar uma nova fase da automação tratando toda base como "primeiro contato", defina essa env com a data/hora de go-live.
- histórico anterior ao baseline é ignorado na decisão `com_flora` x `sem_oi_flora`.

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

### O que já está automatizado (estado atual)

- Aviso de agendamento (template) com matriz de 12 variações:
  - local: estúdio ou domicílio
  - financeiro: com sinal pago, pago integral ou pagamento no atendimento
  - linguagem: com flora ou sem oi flora
- Regras de apresentação:
  - primeira automação da cliente recebe `com_flora`
  - depois segue `sem_oi_flora`
  - se passar 180 dias sem automação, reapresenta com `com_flora`
- Regra de seleção automática por cenário financeiro/local do agendamento
- Fallback automático de variante (`com_flora` <-> `sem_oi_flora`) quando a preferida estiver em análise
- Falha controlada quando não existe template ativo para aquele cenário
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
- O dispatcher de eventos enterprise também roda no mesmo scheduler:
  - endpoint `/api/cron/event-dispatcher`

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
2. Processador resolve cenário do template de aviso (local + financeiro + variante) e envia via Meta Cloud API
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
- dispatcher processando outbox sem crescimento anormal de `pending/failed`
- push habilitado no dashboard da Jana (quando `FF_PUSH_NOTIFICATIONS` estiver ativo)

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
- validar também o endpoint `/api/cron/event-dispatcher` (quando status da automação não atualiza no módulo Mensagens)

### 7. Push não chega para a Jana

Verificar:
- OneSignal App ID e REST key corretos no ambiente
- `FF_PUSH_NOTIFICATIONS` ativo no ambiente
- assinatura ativa em `push_subscriptions` (dashboard logado e permissão de notificação aceita)
- preferências de evento em `/configuracoes` habilitadas para o tipo do alerta

Passo a passo de inscrição (obrigatório para começar a receber):
1. Abrir o dashboard no navegador/dispositivo da Jana (mesmo browser que será usado no dia a dia).
2. Ir em `/configuracoes` e aceitar a permissão de notificação quando o navegador pedir.
3. Confirmar no card de Push que existe ao menos `1` assinatura ativa.
4. Clicar em `Enviar push de teste` no card de Push e validar o recebimento.

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
  1. pausar automação (`WHATSAPP_AUTOMATION_MODE=disabled` ou `WHATSAPP_PROFILE=dev_sandbox`)
  2. corrigir env/webhook
  3. validar em DEV
  4. religar rollout controlado
