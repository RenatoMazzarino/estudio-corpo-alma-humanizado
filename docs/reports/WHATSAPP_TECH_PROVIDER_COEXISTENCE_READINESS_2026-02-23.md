# WhatsApp Business Coexistence + Tech Provider Readiness (Meta) - Pesquisa e Plano

Data: 2026-02-23
Escopo: preparar o app para uso de WhatsApp Business com coexistencia (WhatsApp Business App + API) sem substituir o fluxo manual atual, e mapear requisitos tecnicos para operacao como provedor de tecnologia independente.

## Resumo executivo

Conclusao objetiva:

1. O repo ja tem uma base boa para automacao de WhatsApp (fila, processador, webhook Meta, logs de status, controles de seguranca e feature flags).
2. Isso valida o pipeline tecnico de envio automatico, mas **nao fecha sozinho** os requisitos para operar como Tech Provider independente com coexistencia em escala multiempresa.
3. Para chegar ao objetivo (Jana + outras empresas usando coexistencia sem "sequestro" de numero na API), o app precisa completar:
   - onboarding por Embedded Signup (tenant-scoped),
   - armazenamento por tenant de credenciais/IDs da Meta,
   - webhook completo para coexistencia (incluindo eventos de sync/echo/history),
   - controles operacionais de producao (rate limit, retries robustos, auditoria, observabilidade),
   - requisitos de compliance/processo na Meta (business verification, app review, configuracao de permissao, possivel trilha de Tech Provider/Partner).

## Objetivo de negocio e restricoes

Objetivo:
- Permitir que cada empresa cliente use WhatsApp Business com coexistencia (continuar usando o app WhatsApp Business no celular e tambem usar a API no seu sistema).

Restricoes declaradas:
- O fluxo manual atual de envio por WhatsApp deve continuar funcionando.
- A automacao deve coexistir ao lado do manual.
- Automacao precisa ficar desligavel por feature flag para testes seguros.
- Nao ligar em producao sem validacao forte.

## O que "coexistencia" significa na pratica (para o produto)

Em termos de produto, coexistencia significa:
- o mesmo numero continua operando no WhatsApp Business App,
- e tambem pode ser conectado a um sistema via API,
- sem migrar para um modelo que remova o uso normal do app no celular.

Impacto direto no app:
- o sistema precisa lidar com eventos sincronizados da Meta (nao so "mensagens enviadas"),
- precisa suportar estados de conexao/conta por tenant,
- e precisa tratar eco/historico para nao duplicar registros nem "responder duas vezes".

## Requisitos tecnicos essenciais (minimo serio para SaaS multiempresa)

### 1) Multi-tenant de verdade para WhatsApp

O app precisa armazenar por tenant (nao por env global):
- `waba_id` (WhatsApp Business Account ID)
- `phone_number_id`
- identificador do numero (`display_phone_number`, se disponivel)
- token de acesso (idealmente em storage seguro / criptografado)
- status de conexao
- webhook verify token por integracao (ou token central + tenancy mapping)
- metadados de onboarding (quando conectou, quem conectou, app mode, etc.)

Risco se nao fizer:
- mistura de dados/credenciais entre clientes
- impossibilidade de escalar para varias empresas
- alto risco operacional em suporte

### 2) Onboarding por Embedded Signup (tenant-scoped)

Para escalar onboarding de clientes com WhatsApp, o caminho tecnico esperado e usar Embedded Signup / fluxo de onboarding com callback.

O app precisa ter:
- rota de inicio do onboarding (por tenant)
- callback para receber o resultado do onboarding
- persistencia dos IDs retornados
- troca/armazenamento de token (ou fluxo equivalente do parceiro)
- validacoes e logs de auditoria por tenant

Risco se nao fizer:
- onboarding manual demais
- pouca escalabilidade
- erro humano no cadastro de IDs/tokens

### 3) Webhook de producao (GET verificacao + POST eventos) com validacao de assinatura

Requisitos tecnicos minimos:
- endpoint publico HTTPS
- `GET` com `hub.mode`, `hub.verify_token`, `hub.challenge`
- `POST` com parse seguro
- validacao de assinatura `x-hub-signature-256` com App Secret
- logs de eventos recebidos e status de processamento
- idempotencia/deduplicacao

Risco se nao fizer:
- spoofing de webhook
- perda de rastreabilidade
- status de mensagem inconsistente

### 4) Suporte a eventos de coexistencia (nao so status de outbound)

Para coexistencia, o sistema precisa estar preparado para processar (ou ao menos armazenar e auditar) eventos/assuntos especificos de sincronizacao/eco.

Pontos relevantes citados em documentacao de parceiros:
- `messages` (status e mensagens)
- `history`
- `smb_app_state_sync`
- `smb_message_echoes`

Impacto no app:
- evitar duplicidade de conversa/mensagem
- manter estado confiavel quando mensagens sao enviadas no app e/ou na API
- diagnosticar problemas de sincronizacao

### 5) Fila de envio com controles de producao

Minimo esperado:
- retries com backoff
- limites de lote
- controle anti-spam
- deduplicacao por evento/tenant/agendamento
- kill switch global e por tenant
- observabilidade (sucesso/falha, motivo, provider message id, timestamps)

### 6) Templates + compliance de envio

Como regra operacional do WhatsApp Business Platform:
- mensagens iniciadas pela empresa dependem de template aprovado
- templates precisam estar aprovados para cada caso de uso (confirmacao, lembrete, cancelamento, etc.)
- conteudo enviado deve casar com o template aprovado (nome, idioma, variaveis)

No produto isso exige:
- versionamento de templates por tipo de mensagem
- mapeamento por tenant (caso clientes usem templates diferentes)
- fallback de teste (`hello_world`) apenas em ambiente controlado

### 7) Observabilidade e auditoria (muito importante para vender como ferramenta seria)

O app precisa registrar:
- quem conectou o WhatsApp (tenant, operador, data)
- qual mensagem foi enfileirada (tipo, origem, agendamento)
- qual mensagem foi enviada (provider_message_id)
- status retornado (sent/delivered/read/failed)
- erros da Meta (com payload sanitizado)
- reprocessamentos e retries

Sem isso:
- suporte vira tentativa e erro
- fica dificil cobrar por valor real

### 8) Seguranca de segredos e operacao

Requisitos praticos:
- nunca armazenar token em texto em arquivos versionados
- rotacao de token
- separacao de ambientes (local/dev/prod)
- limitar processamento interno por segredo/assinatura
- logs sem vazar tokens

## Requisitos nao-tecnicos (mas obrigatorios para viabilizar o produto)

Esses pontos nao "entram por commit", mas podem bloquear o projeto:

1. Business Verification / verificacoes na Meta (empresa)
2. Configuracao e revisao do app/permissoes na Meta (App Review, dependendo do fluxo)
3. Politica de privacidade, termos e suporte
4. Processo de onboarding como parceiro/tech provider (quando aplicavel)
5. Processo operacional de suporte para clientes (onboarding, desconexao, rotacao de token, troca de numero)

## O que ja foi executado no repo (nesta branch) e ajuda na readiness

### Base de automacao de WhatsApp (coexistindo com fluxo manual)

Implementado:
- fila de `notification_jobs` para WhatsApp
- processador interno de jobs
- modo `disabled | dry_run | enabled`
- provider `meta_cloud`
- envio de teste via template `hello_world`
- deduplicacao de job pendente
- retries com backoff
- allowlist por tenant
- auto-dispatch controlado do job recem-criado (evita varrer backlog inteiro)

Arquivos principais:
- `apps/web/src/modules/notifications/automation-config.ts`
- `apps/web/src/modules/notifications/repository.ts`
- `apps/web/src/modules/notifications/whatsapp-automation.ts`
- `apps/web/app/api/internal/notifications/whatsapp/process/route.ts`

### Webhook Meta (base)

Implementado:
- `GET` de verificacao (`hub.challenge`)
- `POST` para eventos
- validacao opcional de assinatura `x-hub-signature-256` via `WHATSAPP_AUTOMATION_META_APP_SECRET`
- atualizacao de status de jobs por `provider_message_id`
- log em `appointment_messages`

Arquivo:
- `apps/web/app/api/whatsapp/meta/webhook/route.ts`

### Integracao com eventos de agendamento (sem quebrar manual)

Integrado ao fluxo de negocio:
- criacao de agendamento (admin/public) agenda o job automatico
- cancelamento agenda job automatico
- fluxo manual atual continua coexistindo

Arquivos:
- `apps/web/src/modules/appointments/actions.ts`
- `apps/web/src/modules/appointments/public-booking.ts`

### Teste tecnico concluido (local)

Validado:
- criar agendamento -> gerar evento -> enviar WhatsApp automaticamente
- envio real via Meta Cloud API usando template `hello_world`

Observacao:
- este teste valida o pipeline tecnico, nao a prontidao para producao.

## Gaps atuais para chegar em "pronto para producao com coexistencia multiempresa"

### Gap A - Credenciais WhatsApp ainda globais por env

Hoje (teste):
- `WHATSAPP_AUTOMATION_META_*` vem de env global

Para SaaS multiempresa:
- precisa migrar para configuracao por tenant (DB + UI + seguranca)

### Gap B - Templates reais por tipo de mensagem

Hoje:
- `hello_world` em modo de teste

Falta:
- mapeamento de templates aprovados (confirmacao, lembrete, cancelamento, etc.)
- parametros por template e idioma
- fallback/validador de template por tenant

### Gap C - Webhook de coexistencia completo

Base pronta para status, mas ainda falta completar tratamento e armazenamento de:
- `history`
- `smb_app_state_sync`
- `smb_message_echoes`

### Gap D - Onboarding de cliente (Embedded Signup)

Ainda falta:
- fluxo de onboarding em UI/backend
- callback e persistencia por tenant
- amarracao com permissao do tenant no app

### Gap E - Operacao/observabilidade de producao

Ainda falta:
- dashboard de falhas/retries por tenant
- alertas
- limites e janelas de disparo por tipo
- controles anti-spam mais fortes para producao

## Plano de implementacao recomendado (por fases)

### Fase 1 - Producao segura (1 tenant piloto)

Objetivo:
- usar templates reais aprovados e status webhook com controle operacional

Entregas:
1. Mapeamento de templates reais (confirmacao/lembrete/cancelamento)
2. Env/config para desligar `hello_world` por tenant
3. Webhook: persistir eventos de status com idempotencia
4. Rate limit por tenant e tipo
5. Logs de auditoria de envio/erro
6. Telas/indicadores basicos de status (admin)

### Fase 2 - Coexistencia pronta para clientes

Objetivo:
- suportar coexistencia de forma confiavel por tenant

Entregas:
1. Ingestao e processamento de `history`, `smb_app_state_sync`, `smb_message_echoes`
2. Regras de deduplicacao/echo
3. Estado de conexao por tenant (sincronizado)
4. Testes de reconexao / interrupcao / retomada

### Fase 3 - Tech Provider onboarding escalavel

Objetivo:
- conectar novos clientes sem cadastro manual de IDs/tokens

Entregas:
1. Embedded Signup (frontend + callback + persistencia)
2. Credenciais por tenant (seguras)
3. Fluxo de desconexao/reconexao
4. Checklist de readiness por tenant

### Fase 4 - Hardening para escala

Objetivo:
- operacao robusta e suporte comercial

Entregas:
1. observabilidade/alertas
2. retries inteligentes por erro da Meta
3. dashboards de entrega/falha
4. trilha de auditoria completa
5. playbooks de suporte

## Ajustes de mensagem (manual atual) executados nesta rodada

Foi ajustado o texto do fluxo manual de WhatsApp para:
- mensagem de agendamento com estrutura mais clara e negritos via `*...*`
- mensagem de confirmacao com opcoes numeradas (manual), sem depender de botoes interativos

Arquivos alterados:
- `apps/web/content/auto-messages.md`
- `apps/web/src/shared/auto-messages.utils.ts`
- `apps/web/components/mobile-agenda.tsx`
- `apps/web/app/(dashboard)/novo/appointment-form.tsx`

## Riscos criticos (nao ignorar)

1. Token da Meta exposto em ambiente de teste/conversa: precisa rotacionar.
2. Automacao nao deve ser ligada em producao antes de templates reais e controles por tenant.
3. Coexistencia exige tratamento de eventos alem de "mensagem enviada" para evitar inconsistencias.
4. Requisitos de parceiro/tech provider na Meta incluem trilhas de aprovacao e compliance fora do codigo.

## Checklist de readiness (objetivo, antes de ligar para clientes)

- [ ] Credenciais WhatsApp por tenant (nao globais)
- [ ] Templates reais aprovados e mapeados por tipo
- [ ] Webhook de status com assinatura validada em prod
- [ ] Eventos de coexistencia (`history`, `smb_app_state_sync`, `smb_message_echoes`) tratados
- [ ] Retry/backoff/rate-limit por tenant
- [ ] Auditoria e logs de entrega/falha por mensagem
- [ ] Fluxo de onboarding (Embedded Signup) por tenant
- [ ] Feature flag por tenant para ligar/desligar automacao
- [ ] Processo de suporte (desconectar/reconectar/rotacionar token)
- [ ] Validacao de compliance/politicas Meta/WhatsApp antes do go-live comercial

## Fontes (pesquisa)

### Fontes primarias (Meta / console / docs oficiais)

1. Meta App Dashboard (painel do desenvolvedor WhatsApp) - capturas e dados informados pelo usuario nesta sessao
   - campos observados: `URL de callback`, `Verificar token`, `Phone Number ID`, `WABA ID`, token temporario, fluxo de teste `hello_world`

2. Meta / WhatsApp Cloud API - documentacao oficial (referencias para validacao manual)
   - https://developers.facebook.com/docs/whatsapp/cloud-api/
   - https://developers.facebook.com/docs/graph-api/webhooks/getting-started
   - https://developers.facebook.com/docs/whatsapp/embedded-signup/

Observacao: durante esta sessao, parte das paginas oficiais da Meta apresentou limitacao de acesso/rate limit via ferramenta automatizada (429), entao as referencias oficiais acima devem ser usadas como fonte de confirmacao final no processo de implantacao.

### Fontes secundarias tecnicas (usadas para detalhamento de coexistencia / onboarding)

3. Twilio - Tech Provider setup / Embedded Signup (guia operacional para ISV/tech provider em WhatsApp)
   - https://www.twilio.com/docs/whatsapp/isv/register-with-twilio
   - Pontos usados: configuracao de app, Facebook Login for Business, Embedded Signup, webhook callback URI, setup tecnico para onboarding escalavel.

4. 360dialog - Coexistence and migration docs (detalhes de eventos e campos de webhook de coexistencia)
   - https://docs.360dialog.com/docs/waba-management/coexistence-and-migration
   - https://docs.360dialog.com/docs/waba-basics/webhook-events-and-notifications
   - Pontos usados: `history`, `smb_app_state_sync`, `smb_message_echoes`, consideracoes de coexistencia e comportamento de webhooks.

5. YCloud - Embedded Signup + Coexistence flow (referencia tecnica complementar)
   - https://docs.ycloud.com/reference/whatsapp-business-accounts#create-a-whatsapp-business-account
   - Pontos usados: coexistence onboarding via Embedded Signup, pre-requisitos operacionais e fluxo de conexao.

## Nota final (rigor)

Este documento separa:
- o que ja esta tecnicamente implementado e testado no repo,
- o que ainda falta para producao,
- e o que depende de processo/aprovacao na Meta.

Isso evita a falsa conclusao de que "automacao funcionando em teste" == "produto pronto como Tech Provider/coexistencia em producao".
