# WhatsApp Business Coexistence + Tech Provider Readiness (Meta) - Plano Unico, Status de Execucao e Roadmap

Data original: 2026-02-23
Ultima atualizacao: 2026-02-24
Versao do documento: v2 (consolidado e orientado a implantacao)
Escopo: consolidar em um unico documento o plano de readiness para Tech Provider/coexistencia (Meta), o estado real do repo, as regras da automacao WhatsApp ja implementadas, os gaps tecnicos/compliance e o roadmap de implantacao segura em DEV/PROD e evolucao multiempresa.

## Como ler este documento

Este documento separa explicitamente:

1. O que ja esta implementado no repo e foi validado em testes.
2. O que esta implementado mas ainda precisa de hardening/rollout.
3. O que ainda e backlog (tecnico, operacional ou compliance Meta).
4. O que e requisito oficial da Meta vs o que e pratica de mercado observada em parceiros.

Objetivo: evitar a falsa equivalencia entre "pipeline tecnico funcionando" e "produto pronto para operar como provedor de tecnologia em escala".

---

## 1. Resumo executivo (estado real)

Conclusao objetiva:

1. O sistema ja possui automacao WhatsApp funcional para envio de aviso de agendamento e lembrete 24h, coexistindo com o fluxo manual.
2. O webhook da Meta ja esta funcional (verificacao + eventos `messages`), com atualizacao de status e resposta automatica a botoes no MVP.
3. O painel `Mensagens` ja mostra fila, historico, timeline e motivos de falha em portugues para operacao.
4. O fluxo de cancelamento com checkbox "Avisar cliente" e regra de janela de atendimento de 24h (Meta) ja foi implementado no MVP e precisa de validacao/hardening operacional antes de rollout amplo.
5. O sistema ainda nao esta pronto para operar como Tech Provider/coexistencia multiempresa em escala. Faltam principalmente: modelo multi-tenant de credenciais Meta, onboarding Embedded Signup por tenant, cobertura mais completa de eventos de coexistencia e trilhas de compliance/App Review.

### Status do produto (resumo)

- Fluxo manual de WhatsApp: mantido e funcional.
- Automacao WhatsApp (aviso + 24h): funcional em DEV e base pronta para PROD.
- Cancelamento com aviso automatico (session message, janela 24h): MVP implementado.
- Webhook Meta com status reais (`sent/delivered/read/failed`): funcional.
- Tech Provider/coexistencia multiempresa: readiness em andamento (nao concluido).

### Decisao operacional atual

- Continuar com manual + automatico coexistindo.
- Usar DEV para fechamento de automacao, webhook, cron e painel de mensagens.
- Nao ligar automacoes amplas em producao sem checklist de rollout e limpeza/controle de fila.
- Evoluir o documento de readiness como fonte canonica para engenharia e operacao.

---

## 2. Objetivo de negocio e restricoes confirmadas

### Objetivo de negocio

Permitir que a Jana e futuras empresas clientes usem WhatsApp Business com coexistencia (WhatsApp Business App + API), sem "sequestro" do numero na API oficial, mantendo uma experiencia comercial viavel e um produto operavel como provedor de tecnologia.

### Restricoes confirmadas (decisoes de produto)

1. O fluxo manual de envio por WhatsApp nao sera removido.
2. A automacao deve existir ao lado do manual (coexistencia interna do produto).
3. A automacao precisa ser controlavel por ambiente e por tenant (feature flags / config).
4. Testes devem ocorrer de forma segura (anti-spam, filtros, cron controlado, secrets, numero de teste).
5. Em DEV, o sistema pode usar numero de teste Meta e destinatario unico de teste.
6. O sistema deve manter base estrutural para futura operacao multiempresa (Tech Provider), mesmo quando o rollout atual ainda estiver single-tenant.

---

## 3. Definicoes (produto + Meta)

### Coexistencia (Meta / WhatsApp)

Uso do mesmo numero tanto no WhatsApp Business App quanto na WhatsApp Business Platform (API), com sincronizacao/convivencia de funcionalidades, historico e eventos conforme capacidade/plano do ecossistema e parceiro.

### Tech Provider (provedor de tecnologia)

Empresa de software (ISV) que oferece um produto/plataforma para outras empresas operarem WhatsApp Business Platform por meio de integracao com Meta e/ou Solution Partners, incluindo onboarding, envio, webhooks, templates, suporte e operacao.

### Solution Partner / BSP

Parceiro da Meta (historicamente chamado de BSP) que oferece acesso/operacao da plataforma. Um Tech Provider pode operar com parceiro(s) e ainda precisar cumprir requisitos especificos de onboarding/coexistencia/programa.

### Janela de atendimento de 24h (customer service window)

Regra do WhatsApp Business Platform: mensagens livres (session/freeform) podem ser enviadas dentro de uma janela de atendimento aberta por mensagem do cliente. No produto (MVP atual), a inferencia de janela aberta esta baseada em inbound de webhook correlacionado ao agendamento (ex.: clique em botao/interactive reply) nos ultimos 24h.

### Template message vs session/freeform message

- Template message: mensagem iniciada pela empresa usando modelo aprovado pela Meta.
- Session/freeform message: mensagem livre enviada quando a janela de atendimento esta aberta.

### Status de mensagem (operacao)

- `pending`: job em fila
- `sent`: provider aceitou envio
- `delivered`: entregue ao destinatario
- `read`: lida pelo destinatario
- `failed`: falha final

### Status "skipped" (interno do produto)

Mensagem que nao foi enviada por regra de negocio/operacao (ex.: janela 24h fechada, template ausente, rollout desativado), sem representar falha tecnica do provider.

---

## 4. Estado atual do repo (verdade do codigo)

### 4.1 Implementado e validado (repo + testes)

#### Automacao WhatsApp (base)
- fila de notificacoes via `notification_jobs`
- processador de jobs de WhatsApp
- modos `disabled`, `dry_run`, `enabled`
- provider Meta Cloud API
- deduplicacao basica de jobs
- retries com backoff
- allowlist por tenant

Arquivos centrais:
- `apps/web/src/modules/notifications/automation-config.ts`
- `apps/web/src/modules/notifications/whatsapp-automation.ts`
- `apps/web/src/modules/notifications/repository.ts`

#### Templates automaticos aprovados (MVP atual)
- `appointment_created` -> template aprovado (aviso de agendamento)
- `appointment_reminder` -> template aprovado (confirmacao 24h)

Com preenchimento de variaveis:
- nome do cliente
- servico
- data
- hora
- local

#### Webhook Meta (base + status)
- `GET` verify (`hub.challenge`)
- `POST` eventos `messages`
- validacao de assinatura quando `WHATSAPP_AUTOMATION_META_APP_SECRET` configurado
- atualizacao de status por `provider_message_id`
- persistencia de timeline e payload de automacao

Arquivo:
- `apps/web/app/api/whatsapp/meta/webhook/route.ts`

#### Respostas automaticas a botoes (MVP)
- `Confirmar`
- `Reagendar`
- `Falar com a Jana`

Com correlacao do inbound ao agendamento e resposta automatica.

#### Voucher publico unificado
- URL canonica: `/voucher/[appointmentId]`
- base visual compartilhada entre overlay e pagina publica
- export/baixar/compartilhar reutilizados
- correcao de scroll mobile e clipping na exportacao

Arquivos principais:
- `apps/web/app/voucher/[id]/page.tsx`
- `apps/web/app/voucher/[id]/voucher-page-view.tsx`
- `apps/web/components/voucher/voucher-ticket-card.tsx`
- `apps/web/components/voucher/voucher-export.ts`
- `apps/web/app/(public)/agendar/[slug]/voucher-export.ts`
- `apps/web/app/(public)/agendar/[slug]/components/voucher-overlay.tsx`

#### Cancelamento com checkbox + janela 24h (MVP)
- Checkbox no modal: "Avisar cliente por WhatsApp (se a janela de conversa estiver aberta)"
- janela 24h validada por inbound correlacionado
- cancelamento enviado por mensagem livre (session message) quando janela aberta
- skip com motivo amigavel quando janela fechada

Arquivos principais:
- `apps/web/components/agenda/appointment-details-sheet.tsx`
- `apps/web/components/mobile-agenda.tsx`
- `apps/web/app/actions.ts`
- `apps/web/src/modules/appointments/actions.ts`
- `apps/web/src/modules/notifications/whatsapp-automation.ts`

#### Painel `Mensagens` (operacional)
Ja mostra fila, historico, timeline, modelo, horarios BR, motivos de falha em portugues e status do provider (`sent`, `delivered`, `read`, `failed`).

Arquivo:
- `apps/web/app/(dashboard)/mensagens/page.tsx`

#### Scheduler de lembrete 24h
- endpoint cron: `/api/cron/whatsapp-reminders`
- protegido por `CRON_SECRET`
- processa apenas `appointment_reminder`
- compatibilizado com Vercel Hobby + scheduler via GitHub Actions

Arquivos:
- `apps/web/app/api/cron/whatsapp-reminders/route.ts`
- `apps/web/vercel.json`
- `.github/workflows/whatsapp-reminders-cron.yml`
### 4.2 Implementado, mas precisa hardening / rollout controlado

1. Validacao completa do fluxo de cancelamento com checkbox em todos os pontos de entrada de UI (nao apenas no modal principal).
2. Hardening de idempotencia no webhook para eventos duplicados em producao real.
3. Melhor cobertura para inbound livre sem `context.id` (hoje o MVP favorece botoes e mensagens correlacionadas).
4. Runbook de rotacao de token Meta e tratamento de expiracao.
5. Observabilidade operacional por tenant (filtros e dashboards) para escalar multiempresa.
6. Estrategia de limpeza/reprocessamento seguro de fila em incidentes.

### 4.3 Backlog (nao implementado)

1. Modelo multi-tenant de credenciais Meta (WABA/phone/token por tenant).
2. Onboarding Embedded Signup por tenant.
3. Cobertura de eventos de coexistencia para sincronizacao mais robusta (`history`, `smb_message_echoes`, `smb_app_state_sync`).
4. Estrutura de suporte operacional/SLA e troubleshooting self-service para clientes.
5. App Review / Advanced Access readiness completo (evidencias, videos, fluxos de teste, compliance operacional).

---

## 5. Execucao realizada no repo (evidencia interna)

### Commits-chave (implementacao da automacao / webhook / voucher / cron)

Lista resumida dos commits relevantes nesta frente (branch de automacao):

- `a2235c9` - scaffold de automacao WhatsApp + webhook Meta
- `dfb2de1` - doc inicial de readiness + templates manuais
- `24d22dc` - tracking de entrega + timeline no painel Mensagens
- `6a5b88c` - endpoint de cron para lembrete 24h
- `79f369b` - ajuste de cron Vercel para Hobby (diario)
- `29812e1` - scheduler GitHub Actions para lembretes (5 min)
- `28862d3` - respostas automaticas a botoes + remocao de hello_world do fluxo final
- `44830a3` - link de voucher no Confirmar + cancelamento com janela 24h
- `33a91a6` - unificacao do voucher publico (reuso de base visual/export)
- `0c26810` - scroll mobile no voucher + correcao de clipping no export

### Validacoes tecnicas executadas (recorrentes)

- `pnpm --filter web lint` (multipas rodadas) - OK
- `pnpm --filter web build` (multipas rodadas) - OK

### Validacoes funcionais ja realizadas (DEV)

1. Envio automatico do aviso de agendamento (template aprovado) - OK
2. Envio automatico do lembrete 24h (template aprovado) - OK
3. Webhook Meta `messages` verificado e recebendo eventos de teste - OK
4. Botao `Confirmar` respondendo automaticamente - OK
5. Link do voucher publico usado no retorno automatico - OK
6. Painel `Mensagens` exibindo fila/timeline/status - OK
7. Cron endpoint chamavel manualmente com `CRON_SECRET` - OK

### Incidentes/ajustes importantes ja resolvidos

- Token Meta expirado (falha de envio) -> mapeamento e diagnostico no painel
- Redirecionamento de login DEV/PROD em dominios Vercel -> correcoes em auth + fallback dev login
- Risco de spam por processamento em lote durante testes -> filtros, targeted dispatch e controles
- Vercel Hobby sem cron frequente -> scheduler GitHub Actions

---

## 6. Arquitetura atual da automacao WhatsApp (MVP) e pontos de extensao

### 6.1 Fluxo de envio (alto nivel)

1. Um evento de negocio ocorre (ex.: criacao de agendamento, lembrete 24h, cancelamento com checkbox).
2. O sistema gera (ou nao) um `notification_job` de WhatsApp, com payload de automacao.
3. O processador decide quando enviar (imediato / agendado / retry) e qual modo usar (template ou session message).
4. A Meta recebe o envio e retorna `provider_message_id`.
5. O webhook `messages` atualiza status de entrega/leitura/falha.
6. O painel `Mensagens` le a fila + historico + timeline e mostra para operacao.

### 6.2 Fluxos especificos atualmente suportados

#### A) Aviso de agendamento (`appointment_created`)
- disparo automatico no momento da criacao do agendamento (auto-dispatch)
- usa template aprovado
- nao depende de webhook para enviar
- webhook apenas complementa status real (`sent/delivered/read`)

#### B) Lembrete 24h (`appointment_reminder`)
- job criado e agendado para horario alvo
- processado por cron/scheduler
- usa template aprovado

#### C) Cancelamento (`appointment_canceled`)
- nao usa template no MVP
- usa mensagem livre (session message)
- envio so ocorre se:
  - checkbox "Avisar cliente" marcado
  - janela 24h aberta (inbound correlacionado <= 24h)
- caso contrario, nao envia e registra `skipped_auto`

### 6.3 Janela de 24h (MVP) - definicao operacional do produto

Regra adotada no produto (MVP atual):

- Janela aberta = existe inbound do cliente, correlacionado ao mesmo agendamento (ex.: resposta de botao), recebido via webhook nos ultimos 24h.

Escopo e limitacao (intencional no MVP):
- privilegia correlogramas com `context.id` (botao/resposta associada)
- nao tenta inferir com alta confianca mensagens livres sem contexto de agendamento

Implicacao:
- mais seguro para evitar envio indevido
- pode deixar de enviar cancelamento em casos de inbound sem correlacao (aceitavel no MVP)

### 6.4 Contratos/rotas publicas e internas relevantes

#### Rotas publicas / semi-publicas
- `GET /voucher/[id]` - voucher publico canonico do agendamento
- `GET|POST /api/whatsapp/meta/webhook` - webhook da Meta
- `GET /api/cron/whatsapp-reminders` - processador de lembretes 24h (com `CRON_SECRET`)

#### Server actions / callbacks (dashboard)
- `cancelAppointment(id, options?: { notifyClient?: boolean })`
- callbacks de UI propagando `notifyClient` no fluxo de cancelamento

#### Job types (automacao)
- `appointment_created`
- `appointment_reminder`
- `appointment_canceled`

### 6.5 Convencoes de payload e logs (base para coexistencia futura)

#### `notification_jobs.payload.automation` (conceitual)
O produto ja usa payload estruturado para timeline e status do provider, incluindo informacoes como:
- `queued_at`
- `provider_name`
- `provider_message_id`
- `template_name` / `template_language` (quando template)
- `delivery_mode`
- `provider_accepted_at`
- `provider_delivery_status`
- `provider_delivery_error`
- `failed_at`
- `retry` / `next_retry_at`
- dados da janela 24h (quando aplicavel)

#### `appointment_messages`
O historico interno e usado para observabilidade e correlacao com statuses como:
- `queued_auto`
- `sent_auto`
- `failed_auto`
- `skipped_auto`
- eventos inbound/reply quando correlacionados

Esta estrutura deve ser mantida generica o bastante para nao acoplar a UI exclusivamente a Meta (preparacao para coexistencia e potencial multi-provider).

---

## 7. Fechamento das pendencias da automacao (cancelamento + janela 24h + painel `Mensagens`)

Esta secao incorpora o plano que estava pendente e o reclassifica com base no que ja foi implementado.

### 7.1 O que ja foi implementado (MVP)

1. Checkbox no modal de cancelamento: "Avisar cliente por WhatsApp (se a janela de conversa estiver aberta)".
2. Cancelamento sem checkbox continua cancelando sem automacao (coexistencia com fluxo atual preservada).
3. Cancelamento com checkbox marcado:
   - tenta validar janela 24h
   - se janela aberta, envia mensagem livre (session message)
   - se janela fechada, registra `skipped_auto`
4. Painel `Mensagens` exibe status/timeline/motivos em portugues.
5. Horarios exibidos em formato BR (24h) no painel.

### 7.2 O que precisa de hardening antes de considerar "fechado"

#### A) Cancelamento (entrada de UI)
- auditar todos os pontos de cancelamento (modal principal, lista mobile, possiveis atalhos)
- garantir que o checkbox realmente controla a automacao em todos eles
- evitar regressao onde cancelamento sem checkbox ainda gere job

#### B) Janela 24h (confiabilidade)
- reforcar diagnostico no painel para distinguir:
  - sem inbound correlacionado
  - inbound correlacionado fora da janela
  - erro ao validar janela
- registrar timestamp do ultimo inbound usado na decisao

#### C) Painel `Mensagens` (operacao)
- confirmar UX para jobs antigos malformados (ex.: `appointment_id=null`)
- opcional: adicionar acoes operacionais (marcar como falha/descartar) para fila de teste legado
- reforcar distincoes entre template vs mensagem livre no card

#### D) Webhook / idempotencia
- garantir que eventos duplicados de `messages` nao dupliquem timeline relevante
- validar correlacao de `context.id` em cenarios reais (Confirmar, Reagendar, Falar com a Jana)

### 7.3 Critarios de aceite (consolidados)

#### Cancelamento sem aviso (fluxo preservado)
1. Abrir modal de cancelamento
2. Checkbox desmarcado
3. Confirmar cancelamento
4. Agendamento cancelado
5. Nenhum job automatico de cancelamento criado

#### Cancelamento com aviso + janela aberta
1. Cliente responde via WhatsApp (ex.: botao `Confirmar`)
2. Abrir modal e marcar checkbox
3. Cancelar agendamento
4. Job de cancelamento criado e processado
5. Cliente recebe mensagem de cancelamento
6. Painel `Mensagens` mostra timeline e status

#### Cancelamento com aviso + janela fechada
1. Sem inbound correlacionado (ou inbound > 24h)
2. Marcar checkbox e cancelar
3. Agendamento cancelado normalmente
4. Nao cria job de envio
5. Painel/log mostra `skipped_auto` com motivo amigavel
---

## 8. Readiness Meta Tech Provider / Coexistencia - requisitos oficiais e praticas de mercado

Esta secao consolida requisitos e implicacoes para o objetivo de se tornar provedor de tecnologia (Technology Provider) com suporte a coexistencia.

### 8.1 Classificacao de requisitos usada neste documento

Cada requisito abaixo deve ser lido com uma classificacao explicita:

- **Oficial Meta**: consta em documentacao/painel/processo oficial da Meta.
- **Inferido por parceiro / pratica de mercado**: nao necessariamente exigencia formal publicada pela Meta, mas recorrente em parceiros/integradores e importante para operacao real.
- **Operacional interno**: exigencia que o proprio produto precisa cumprir para ser vendavel/suportavel, mesmo sem imposicao formal da Meta.

### 8.2 Requisitos oficiais (Meta) - camada App / plataforma / compliance

#### A) App Dashboard - Basic Settings (oficial Meta)
Para readiness de review e operacao seria, o app precisa ter configuracoes de base completas e consistentes:

1. Nome do app coerente com a solucao
2. Categoria apropriada
3. `App Domains` corretos (DEV/PROD e eventuais dominios de onboarding)
4. `Privacy Policy URL`
5. `Terms of Service URL`
6. Email de suporte
7. Instrucao/URL de exclusao de dados (data deletion)
8. Branding minimo coerente (icone, descricao)

**Status atual no repo/produto**
- O repo contem rotas e UX de automacao, mas esta secao e sobretudo de configuracao de app/painel e documentos externos.
- Precisa de checklist formal e evidencias para App Review.

#### B) App Review / Submission Guide (oficial Meta)
Para permissoes sensiveis e operacao em escala, a Meta exige processo de revisao com evidencias.

Microexigencias praticas (oficiais + experiencia comum de review):
1. Descricao clara do caso de uso
2. Justificativa por permissao solicitada
3. Fluxo reproduzivel para o reviewer
4. Credenciais/ambiente de teste quando necessario
5. Screencasts/videos mostrando o uso real da permissao
6. UI clara indicando onde a funcionalidade aparece
7. Politicas/termos e compliance basico acessiveis

**Implicacao para o produto**
- O sistema precisa de um fluxo de demonstracao reproduzivel (sandbox/piloto) para review.
- O documento deve listar evidencias a preparar por permissao.

#### C) Permissoes de WhatsApp / Business (oficial Meta)
Permissoes relevantes informadas e/ou mapeadas para este projeto:

1. `whatsapp_business_messaging` (essencial)
   - envio de mensagens, perfis, midia, operacao basica de numero
2. `whatsapp_business_management` (essencial)
   - gestao de ativos WhatsApp Business (WABA, numeros, templates, webhooks)
3. `business_management` (essencial para objetivo Tech Provider)
   - leitura/escrita via Business Manager API e gestao de ativos de negocios
4. `manage_app_solution` (avaliar conforme trilha de parceiro/solution provider)
   - util para contextos de app solution / gestao de apps de terceiros
5. `public_profile` (padrao)
6. `email` (somente se usado no fluxo de login/onboarding Meta)
7. `whatsapp_business_manage_events` (nao prioritario para o nucleo de agenda; util para eventos/marketing)

**Status pratico atual**
- Para o MVP de automacao de agenda, o foco operacional esta em `whatsapp_business_messaging` e `whatsapp_business_management`.
- Para Tech Provider/coexistencia multiempresa, `business_management` entra como requisito de alto valor.

#### D) Webhooks (oficial Meta)
Requisitos oficiais basicos para webhook:
1. Endpoint publico HTTPS
2. Verificacao `GET` via token (`hub.verify_token` / `hub.challenge`)
3. Recepcao `POST`
4. Assinatura de campos/eventos no painel
5. (Boa pratica critica) validacao de assinatura (`x-hub-signature-256`) com App Secret

**Status atual do produto**
- Base implementada e funcional.
- Em DEV, ja foi configurado campo `messages` e testado com sucesso.
- Recomendacao: exigir `WHATSAPP_AUTOMATION_META_APP_SECRET` preenchido em DEV/PROD para validar assinatura.

#### E) Embedded Signup (oficial Meta, etapa futura)
Para operar como provedor de tecnologia em escala e onboarding de empresas clientes, Embedded Signup e um caminho importante.

Requisitos tecnicos tipicos a preparar:
1. Rotas de inicio e callback seguras
2. Persistencia por tenant (nao global)
3. Controle de estados de onboarding
4. Armazenamento seguro de credenciais/ids de ativos
5. Auditoria de onboarding/reconexao
6. UX administrativa para conectar/desconectar/revalidar integracao

**Status atual**
- Ainda nao implementado (backlog de fase seguinte).

### 8.3 Requisitos de coexistencia (Meta + pratica de parceiros)

#### Eventos e sincronizacao (oficial/inferido)
No MVP atual, o produto usa `messages` e ja suporta status e inbound de botoes.

Para coexistencia robusta multiempresa, este documento assume como backlog necessario a avaliacao/implementacao de eventos adicionais (conforme docs e pratica de parceiros):
- `history`
- `smb_message_echoes`
- `smb_app_state_sync`

**Por que isso importa (pratica operacional)**
- sincronizar mensagens vindas do app/API
- evitar duplicidade de registros
- manter consistencia de timeline e estado
- suportar operacao coexistente real com qualidade de suporte

### 8.4 Praticas de mercado observadas (parceiros) - "microexigencias" nao explicitadas pela Meta

Estas exigencias podem nao aparecer como checklist formal da Meta, mas sao recorrentes em parceiros/integradores e fortemente recomendadas para um Tech Provider serio.

#### A) Operacao / suporte
- runbooks de incidentes (token expirado, webhook parado, fila travada)
- playbook de troubleshooting para clientes
- logs e auditoria acessiveis
- visibilidade de status de mensagem (sent/delivered/read/failed)
- trilha temporal da mensagem (o produto ja avancou bem aqui)

#### B) Controles anti-risco
- deduplicacao de jobs/eventos
- retries com backoff e limite
- kill-switch por tenant/ambiente
- filtros por tipo de job no cron
- protecao contra backlog acidental em testes (limpeza de fila + processamento targeted)

#### C) Governanca de templates
- mapeamento por tenant/idioma/tipo de uso
- status de aprovacao e qualidade
- fallbacks controlados e explicitamente desligaveis
- processo para atualizar template sem quebrar automacao

#### D) Multi-tenant real
- credenciais e ativos Meta por tenant
- status de conexao por tenant
- observabilidade por tenant
- isolamento de secrets/configs
- onboarding e reconexao self-service (ou semi-self-service)

#### E) Compliance e App Review na pratica
- ambiente de teste reproduzivel para review
- videos/fluxos por permissao
- descricoes sem ambiguidade do que o app faz e do que nao faz
- documentacao de politicas/termos/data deletion pronta e publica

### 8.5 Benchmark resumido de parceiros (como eles costumam viabilizar)

#### Twilio (ISV / partner onboarding) - padrao observado
- forte foco em onboarding estruturado e governanca de conta
- processo de registro/qualificacao de ISV/partner
- separacao clara entre integracao tecnica e readiness comercial/operacional

#### 360dialog (coexistence + webhooks) - padrao observado
- documentacao explicita para coexistencia e eventos de webhook
- foco em cobertura de eventos e sincronizacao
- ênfase em integracao de operacao/monitoramento para parceiros

#### Implicacao para o produto
Para competir como provedor de tecnologia, nao basta enviar mensagens:
- precisa onboarding + operacao + observabilidade + suporte + compliance + governanca de templates/ativos.

---

## 9. Matriz de permisses Meta (objetivo, status, readiness)

### 9.1 Matriz resumida

#### `whatsapp_business_messaging`
- Tipo: oficial Meta
- Necessidade atual: alta (essencial para envio e operacao de mensagens)
- Uso atual no produto: sim (MVP de automacao e replies)
- Review/readiness: precisa trilha de evidencia e fluxo reproduzivel

#### `whatsapp_business_management`
- Tipo: oficial Meta
- Necessidade atual: alta (templates, ativos, webhooks, numeros)
- Uso atual no produto: parcial/implocito na operacao configurada via painel
- Readiness: precisa formalizar no plano operacional e de onboarding

#### `business_management`
- Tipo: oficial Meta
- Necessidade para Tech Provider/coexistencia: alta
- Uso atual: nao explorado no MVP
- Readiness: backlog de fase Tech Provider (multi-tenant, ativos, Business Manager)

#### `manage_app_solution`
- Tipo: oficial Meta
- Necessidade: a validar conforme trilha de parceria/solucao adotada
- Uso atual: nao
- Acao: investigar oficialmente quando entrar na fase de onboarding/partner path

#### `public_profile`
- Tipo: oficial Meta (padrao)
- Necessidade: baixa (baseline)

#### `email`
- Tipo: oficial Meta
- Necessidade: somente se fluxo de login/onboarding Meta usar email
- Estado: opcional

#### `whatsapp_business_manage_events`
- Tipo: oficial Meta
- Necessidade atual: baixa (nao critica para agenda/confirmacao/cancelamento)
- Backlog: futura camada de eventos/marketing, se houver estrategia comercial

### 9.2 Evidencias que o produto precisa produzir (App Review readiness)

Para cada permissao sensivel (principalmente as de WhatsApp/Business), preparar:
1. descricao de caso de uso por tenant/empresa
2. passo a passo reproduzivel
3. video curto mostrando uso real da funcionalidade
4. credenciais/conta de teste quando exigido
5. captura de tela da UI onde a permissao e utilizada
6. texto de justificativa objetivo (sem jargao desnecessario)
---

## 10. Ambientes, secrets e operacao (DEV / PROD)

### 10.1 Princpios de segregacao (obrigatorio)

1. Segregar variaveis por ambiente (DEV/Preview/PROD).
2. Nao reutilizar tokens temporarios em producao.
3. Nao usar configuracoes de teste (`hello_world`, poller local) em producao.
4. Proteger rotas internas/cron por secret.
5. Registrar e documentar rotacao de token.

### 10.2 Variaveis WhatsApp (familias)

#### A) Nucleo da automacao
- `WHATSAPP_AUTOMATION_QUEUE_ENABLED`
- `WHATSAPP_AUTOMATION_MODE`
- `WHATSAPP_AUTOMATION_PROVIDER`
- `WHATSAPP_AUTOMATION_PROCESSOR_SECRET`
- `WHATSAPP_AUTOMATION_BATCH_LIMIT`
- `WHATSAPP_AUTOMATION_AUTO_DISPATCH_ON_QUEUE`
- `WHATSAPP_AUTOMATION_MAX_RETRIES`
- `WHATSAPP_AUTOMATION_RETRY_BASE_DELAY_SECONDS`
- `WHATSAPP_AUTOMATION_ALLOWED_TENANT_IDS`

#### B) Poller local (somente localhost)
- `WHATSAPP_AUTOMATION_LOCAL_POLLER_ENABLED`
- `WHATSAPP_AUTOMATION_LOCAL_POLLER_INTERVAL_SECONDS`

Observacao: estas variaveis nao devem ser usadas como base da operacao em Vercel/PROD.

#### C) Meta Cloud API (envio)
- `WHATSAPP_AUTOMATION_META_ACCESS_TOKEN`
- `WHATSAPP_AUTOMATION_META_PHONE_NUMBER_ID`
- `WHATSAPP_AUTOMATION_META_TEST_RECIPIENT`
- `WHATSAPP_AUTOMATION_META_API_VERSION`

#### D) Templates aprovados
- `WHATSAPP_AUTOMATION_META_CREATED_TEMPLATE_NAME`
- `WHATSAPP_AUTOMATION_META_CREATED_TEMPLATE_LANGUAGE`
- `WHATSAPP_AUTOMATION_META_REMINDER_TEMPLATE_NAME`
- `WHATSAPP_AUTOMATION_META_REMINDER_TEMPLATE_LANGUAGE`

#### E) Endereco do estudio (variavel de template)
- `WHATSAPP_AUTOMATION_STUDIO_LOCATION_LINE`

#### F) Webhook Meta
- `WHATSAPP_AUTOMATION_META_WEBHOOK_VERIFY_TOKEN`
- `WHATSAPP_AUTOMATION_META_APP_SECRET`
- opcional de catalogo/interno: `WHATSAPP_AUTOMATION_META_APP_ID`

#### G) Cron / scheduler
- `CRON_SECRET` (rota cron no app)
- `WHATSAPP_CRON_DEV_SECRET` / `WHATSAPP_CRON_PROD_SECRET` (GitHub Secrets)
- `WHATSAPP_CRON_ENABLE_PROD` (GitHub Actions variable para ativar job de PROD)

### 10.3 Regras praticas de rollout (DEV -> PROD)

#### DEV
- pode usar numero de teste + destinatario unico de teste
- webhook `messages` deve estar configurado no dominio DEV
- cron pode ser acionado manualmente e/ou scheduler GitHub em branch/main conforme fluxo
- painel `Mensagens` deve ser a fonte de validacao operacional

#### PROD
- tokens permanentes (nao temporarios)
- webhook com assinatura validada (`APP_SECRET`) obrigatoria
- scheduler documentado e monitorado
- filtros anti-spam e limpeza de fila sob runbook antes de rollout

---

## 11. Scheduler / Cron: decisao arquitetural atual (Vercel Hobby + GitHub Actions)

### 11.1 Problema encontrado

Conta Vercel Hobby limita cron para execucoes diarias. O lembrete 24h exige processador frequente (ex.: a cada 5 min).

### 11.2 Solucao adotada (atual)

1. Manter endpoint de cron no app:
- `/api/cron/whatsapp-reminders`
2. Proteger endpoint com `CRON_SECRET`.
3. Em Vercel, deixar cron diario (compatibilidade/Hobby-safe) para nao bloquear deploy.
4. Usar GitHub Actions scheduler (`*/5`) como scheduler principal do lembrete 24h.

### 11.3 Vantagens e limites

#### Vantagens
- funciona sem Vercel Pro
- reproduzivel
- controlavel por secrets
- facil desligar/ligar em DEV/PROD

#### Limites
- dependencia de GitHub Actions para scheduler
- logs distribuidos entre GitHub e app
- ainda nao e desenho ideal para escala multiempresa

### 11.4 Criterio de evolucao futura

Quando houver necessidade de maior confiabilidade/escala:
- mover scheduler para plataforma de infra dedicada (Cloud Scheduler, EventBridge, etc.)
- manter o endpoint cron e a semantica de autenticacao para minimizar rework

---

## 12. Infraestrutura futura (estudo inicial) - sair da dependencia da Vercel

Esta secao registra o estudo inicial para eventual migracao, sem mudar o produto agora.

### 12.1 Requisitos de plataforma para este sistema

Para suportar automacao WhatsApp + coexistencia + Tech Provider, a plataforma precisa oferecer:
1. endpoint HTTPS publico estavel (webhooks Meta)
2. scheduler frequente e confiavel
3. gestao segura de segredos
4. logs/observabilidade decentes
5. deploy de app web + APIs
6. escalabilidade progressiva sem reescrever tudo
7. custo previsivel no inicio

### 12.2 Opcao recomendada (medio prazo): GCP Cloud Run + Cloud Scheduler

#### Por que faz sentido para este produto
- Cloud Run hospeda app HTTP/container facilmente (Next.js)
- Cloud Scheduler resolve lembretes 24h sem limite de Hobby
- Secret Manager melhora operacao de tokens/segredos
- Cloud Logging/Error Reporting ajudam suporte e incidentes
- bom equilibrio entre operacao e escalabilidade

#### Desenho-alvo (curto/medio prazo)
- Cloud Run: app web + APIs + webhook Meta
- Cloud Scheduler: cron de lembretes e jobs recorrentes
- Secret Manager: tokens/secrets (Meta, MP, Spotify, etc.)
- (Opcional depois) Cloud Tasks/PubSub: worker/fila dedicada

#### Adequacao ao plano Tech Provider/coexistencia
Boa, porque favorece:
- webhooks confiaveis
- scheduler nativo
- futura separacao de worker
- multi-tenant com mais controle operacional

### 12.3 Opcao alternativa: AWS (ECS/Fargate + EventBridge + SQS)

#### Pontos fortes
- alto controle e robustez
- scheduler (EventBridge) e fila (SQS) maduros
- bom caminho para escala e operacao enterprise

#### Pontos fracos para o momento atual
- maior complexidade inicial (IAM, rede, ALB, ECS, etc.)
- custo operacional/tempo de setup maiores

#### Quando escolher AWS
- equipe ja opera AWS com conforto
- necessidade de controles enterprise mais cedo
- roadmap de escala acelerado

### 12.4 Opcao intermediaria (Fly.io / Railway / Render)

#### Vantagens
- menor complexidade que AWS/GCP no curto prazo
- cron/worker geralmente mais flexiveis que Vercel Hobby

#### Desvantagens
- podem exigir nova migracao futura ao escalar/coexistencia multiempresa
- menor padronizacao enterprise dependendo da escolha

### 12.5 Decisao recomendada (hoje)

1. Curto prazo: manter Vercel + GitHub Actions cron (ja em uso)
2. Medio prazo: migrar para GCP Cloud Run + Cloud Scheduler
3. Longo prazo: separar worker/fila e ampliar observabilidade para Tech Provider/coexistencia multiempresa

---

## 13. Checklist de readiness (unificado)

### 13.1 Checklist tecnico - automacao WhatsApp (single-tenant piloto)

- [x] Aviso de agendamento automatico com template aprovado
- [x] Lembrete 24h automatico com template aprovado
- [x] Webhook Meta `messages` configurado e funcional
- [x] Status reais (`sent/delivered/read/failed`) no painel `Mensagens`
- [x] Resposta automatica a botoes (Confirmar/Reagendar/Falar com a Jana)
- [x] Voucher publico canonico `/voucher/[id]`
- [x] Export/compartilhar voucher reutilizados
- [x] Cancelamento com checkbox e regra de janela 24h (MVP)
- [x] Cron endpoint protegido por `CRON_SECRET`
- [x] Scheduler alternativo via GitHub Actions (Vercel Hobby)
- [ ] Auditoria de todos os pontos de cancelamento da UI (hardening)
- [ ] Idempotencia de webhook validada em volume/duplicidade real
- [ ] Tratamento operacional para jobs legados invalidos (ferramenta/acao no painel)

### 13.2 Checklist DEV (operacao)

- [ ] `dev.public...` apontando para a branch/deploy correto
- [ ] Login DEV preserva dominio `dev` apos auth
- [ ] Env de WhatsApp/Meta importadas na Vercel DEV
- [ ] `WHATSAPP_AUTOMATION_META_APP_SECRET` preenchido na Vercel DEV
- [ ] Webhook Meta verificado com URL DEV
- [ ] Campo `messages` assinado na Meta
- [ ] Teste de envio (`appointment_created`) concluido em DEV
- [ ] Teste de reminder 24h em DEV concluido (cron/manual cron)
- [ ] Teste de cancelamento com janela 24h concluido
- [ ] Painel `Mensagens` exibindo timeline em portugues/BR

### 13.3 Checklist PROD (piloto controlado)

- [ ] Tokens permanentes e rotacao definida
- [ ] Webhook Meta com assinatura validada (APP_SECRET)
- [ ] Scheduler de lembrete 24h ativo e monitorado
- [ ] Runbook de fila pendente/limpeza segura documentado
- [ ] Kill-switch de automacao validado
- [ ] Rollout por tenant/allowlist configurado
- [ ] Acompanhamento de entrega/leitura no painel `Mensagens`

### 13.4 Checklist Tech Provider / coexistencia (fase seguinte)

- [ ] Modelo multi-tenant de credenciais Meta
- [ ] Estado de integracao por tenant (WABA/phone/template/webhook)
- [ ] Embedded Signup tenant-scoped implementado
- [ ] Webhook/eventos de coexistencia adicionais avaliados/implementados (`history`, `smb_message_echoes`, `smb_app_state_sync`)
- [ ] Observabilidade e dashboards por tenant
- [ ] Runbooks de suporte para clientes (reconexao, template, webhook, token)
- [ ] App Review evidence pack por permissao
- [ ] Politicas/termos/data deletion URLs publicas e validadas
---

## 14. Runbooks operacionais (DEV / PROD)

### 14.1 Runbook DEV - teste seguro de automacao WhatsApp

1. Confirmar deploy correto no dominio DEV (`dev.public...`) e commit esperado.
2. Confirmar envs na Vercel DEV (WhatsApp automacao + webhook + cron secret).
3. Confirmar webhook Meta configurado com:
   - callback URL DEV
   - verify token correto
   - campo `messages` assinado
4. Testar envio de aviso de agendamento (criar agendamento de teste).
5. Validar status no painel `Mensagens` (`sent/delivered/read`).
6. Testar lembrete 24h:
   - via cron/manual cron endpoint
   - ou agendamento criado proximo da janela para validacao rapida
7. Testar botao `Confirmar` e verificar resposta com voucher `/voucher/[id]`.
8. Testar cancelamento com checkbox + janela 24h aberta.
9. Revisar fila pendente e limpar jobs de teste legados quando necessario (sem apagar historico indevidamente).

### 14.2 Runbook PROD - ativacao controlada (piloto)

1. Validar envs de producao (tokens permanentes, secrets, templates aprovados).
2. Confirmar webhook Meta com assinatura ativa (`APP_SECRET`).
3. Confirmar scheduler de reminder 24h ativo e autenticado.
4. Confirmar filtros/allowlist de rollout.
5. Fazer teste controlado com 1 tenant e numero conhecido.
6. Monitorar painel `Mensagens` por um periodo de observacao.
7. Habilitar gradualmente para novos tenants apos checklist.

### 14.3 Incidentes comuns e respostas

#### Token Meta expirado
Sintoma:
- falha de envio com erro de token/`Session has expired`
Acao:
1. gerar novo token
2. atualizar env do ambiente afetado
3. redeploy (se necessario)
4. reprocessar job ou reenfileirar conforme runbook

#### Webhook nao atualiza status
Sintoma:
- mensagens aparecem como enviadas, mas sem `delivered/read`
Acao:
1. verificar callback URL e verify token
2. confirmar campo `messages` assinado
3. validar `APP_SECRET`
4. checar logs do endpoint `/api/whatsapp/meta/webhook`

#### Fila com jobs antigos indevidos
Sintoma:
- painel `Mensagens` mostra pendentes velhos
Acao:
1. auditar jobs (tipo, tenant, appointment_id, scheduled_for)
2. marcar jobs de teste como `failed` com motivo operacional (nao apagar historico de forma cega)
3. religar scheduler/cron apenas apos limpeza segura

#### Dominio DEV redirecionando para PROD apos login
Sintoma:
- login iniciado em `dev.public...` termina em `public...`
Acao:
1. verificar deploy da branch correta (commit novo)
2. checar configuracao de dominio/branch na Vercel
3. validar callbacks de auth no Supabase
4. testar novamente no dominio DEV

---

## 15. Riscos principais e mitigacoes

### Risco 1 - Confusao de ambiente (DEV vs PROD)
- Impacto: testes feitos em producao, envs erradas, diagnosticos falsos
- Mitigacao:
  - preservar host no auth (ja corrigido)
  - checklist de deploy/dominios
  - endpoint de diagnostico de automacao (`/api/internal/notifications/whatsapp/process`)

### Risco 2 - Envio indevido por backlog pendente
- Impacto: spam em numero de teste/cliente
- Mitigacao:
  - limpeza segura de fila antes de ligar scheduler
  - auto-dispatch targeted para `appointment_created`
  - cron processando apenas `appointment_reminder`

### Risco 3 - Token temporario expirar durante testes
- Impacto: falhas aparentes da automacao
- Mitigacao:
  - mensagens de falha amigaveis no painel
  - runbook de rotacao de token
  - migrar para token permanente quando entrar em piloto de producao

### Risco 4 - Janela 24h mal inferida em inbound sem contexto
- Impacto: cancelamento automatico nao enviado quando poderia / ou envio indevido se mal correlacionado
- Mitigacao (MVP):
  - usar somente inbound correlacionado com confianca (botao/contexto)
  - registrar `skipped_auto` quando nao houver evidencias suficientes
  - evoluir para ledger de conversa por `wa_id` na fase multi-tenant/coexistencia

### Risco 5 - Dependencia de Vercel Hobby para cron
- Impacto: lembretes 24h nao processados se scheduler nao estiver operacional
- Mitigacao:
  - GitHub Actions cron como scheduler principal (ja implementado)
  - estudo de migracao para GCP/AWS na fase seguinte

---

## 16. Plano faseado (execucao futura)

### Fase 1 - DEV operacional confiavel (curto prazo)
Objetivo: consolidar automacao e painel em DEV.

Itens:
- validar cancelamento com checkbox + janela 24h em todos os pontos de UI
- validar status `sent/delivered/read` via webhook em fluxo real
- padronizar runbook DEV
- consolidar este documento (v2) e manter atualizado

### Fase 2 - Piloto controlado em producao (single-tenant)
Objetivo: operar automacao com baixa exposicao e alto controle.

Itens:
- tokens/secrets de producao
- webhook com assinatura obrigatoria
- scheduler estavel
- monitoramento de fila/status
- rollout por allowlist/tenant

### Fase 3 - Readiness Tech Provider (produto + processo)
Objetivo: preparar sistema e operacao para onboard de outras empresas.

Itens:
- modelo multi-tenant de credenciais Meta
- estados de conexao por tenant
- Embedded Signup tenant-scoped
- checklist/App Review por permissao
- evidencias e processos de suporte

### Fase 4 - Coexistencia robusta multiempresa
Objetivo: suportar coexistencia com mais confiabilidade operacional.

Itens:
- eventos adicionais (`history`, `smb_message_echoes`, `smb_app_state_sync`)
- dedupe/sync robustos
- observabilidade por tenant
- trilhas de auditoria e troubleshooting de escala

### Fase 5 - Escala comercial
Objetivo: produto operavel como plataforma com suporte e previsibilidade.

Itens:
- dashboards operacionais
- SLA/processos
- runbooks maduros
- governanca de templates por tenant
- custos e precificacao alinhados ao custo operacional real

---

## 17. Cenarios de teste (aceitacao e regressao)

### A. Voucher e resposta `Confirmar`
1. Criar agendamento no DEV
2. Receber template de aviso automatico
3. Clicar em `Confirmar`
4. Receber resposta automatica com link
5. Abrir `/voucher/[id]`
6. Validar que nao e `/comprovante/[id]`
7. Testar baixar/compartilhar voucher
8. Validar scroll mobile e export sem clipping

### B. Aviso de agendamento (automacao) + manual coexistindo
1. Criar agendamento sem usar envio manual
2. Validar aviso automatico
3. Criar agendamento usando opcao manual
4. Validar que manual continua funcionando
5. Validar que automacao nao quebrou o fluxo manual

### C. Lembrete 24h
1. Criar agendamento para entrar na janela de teste
2. Rodar scheduler (cron/manual cron)
3. Validar envio do template `confirmacao_de_agendamento_24h`
4. Ver status no painel `Mensagens`

### D. Cancelamento com checkbox OFF
1. Abrir modal de cancelamento
2. Checkbox desmarcado
3. Cancelar
4. Nao deve criar job de cancelamento

### E. Cancelamento com checkbox ON e janela aberta
1. Cliente responder via WhatsApp (botao)
2. Marcar checkbox e cancelar
3. Validar envio de mensagem livre de cancelamento
4. Ver timeline no painel `Mensagens`

### F. Cancelamento com checkbox ON e janela fechada
1. Sem inbound correlacionado ou >24h
2. Marcar checkbox e cancelar
3. Validar `skipped_auto` e motivo amigavel

### G. Webhook status real
1. Mensagem enviada
2. Webhook `messages` recebe status `sent`
3. Evolui para `delivered`
4. Evolui para `read` (quando aplicavel)
5. Painel `Mensagens` reflete a timeline em PT-BR

### H. Scheduler/GitHub Actions
1. Executar workflow manual (`workflow_dispatch`) na branch de teste
2. Confirmar chamada ao endpoint cron com `CRON_SECRET`
3. Confirmar que apenas `appointment_reminder` e processado

---

## 18. Matriz de readiness (oficial vs inferido vs status no produto)

| Item | Tipo | Status no produto | Proxima acao |
|---|---|---|---|
| Envio automatico de templates (aviso + 24h) | Operacional interno | Implementado | Hardening e rollout PROD |
| Webhook `messages` | Oficial Meta | Implementado | Assinatura obrigatoria em DEV/PROD |
| Status `sent/delivered/read` no painel | Operacional interno | Implementado | Auditar idempotencia e filtros por tenant |
| Cancelamento com janela 24h (session) | Regra Meta + MVP interno | Implementado (MVP) | Melhorar cobertura inbound livre |
| Embedded Signup por tenant | Oficial Meta | Nao implementado | Planejar fase 3 |
| Multi-tenant de credenciais Meta | Operacional / Tech Provider | Nao implementado | Modelagem + UX admin |
| Eventos de coexistencia (`history`, `smb_message_echoes`, `smb_app_state_sync`) | Oficial/pratica de coexistencia | Nao implementado | Pesquisa + backlog fase 4 |
| Runbooks e suporte de escala | Inferido por parceiro / operacional | Parcial | Formalizar processo e SLA |
| App Review evidence pack | Oficial Meta | Nao implementado | Produzir artefatos por permissao |

---

## 19. Fontes e referencias

### 19.1 Fontes oficiais da Meta (prioritarias)

1. Tech Providers (get started)
- https://developers.facebook.com/documentation/business-messaging/whatsapp/solution-providers/get-started-for-tech-providers

2. App Dashboard / Basic Settings
- https://developers.facebook.com/docs/development/create-an-app/app-dashboard/basic-settings

3. App Review / Submission Guide
- https://developers.facebook.com/docs/resp-plat-initiatives/individual-processes/app-review/submission-guide

4. WhatsApp Cloud API (geral)
- https://developers.facebook.com/docs/whatsapp/cloud-api/

5. Graph API Webhooks (conceitos base)
- https://developers.facebook.com/docs/graph-api/webhooks/getting-started

6. Embedded Signup (WhatsApp)
- https://developers.facebook.com/docs/whatsapp/embedded-signup/

Observacao:
- Durante parte da pesquisa automatizada houve limitacoes temporarias (rate limiting / respostas 429) em paginas oficiais. Validacao final de detalhes deve ser feita tambem no navegador/painel Meta.

### 19.2 Fontes complementares (parceiros / pratica de mercado)

1. Twilio - ISV / onboarding para parceiros WhatsApp
- https://www.twilio.com/docs/whatsapp/isv/register-with-twilio

2. 360dialog - Coexistence and migration
- https://docs.360dialog.com/docs/waba-management/coexistence-and-migration

3. 360dialog - Webhook events and notifications
- https://docs.360dialog.com/docs/waba-basics/webhook-events-and-notifications

4. YCloud - referencia de contas WhatsApp Business / onboarding
- https://docs.ycloud.com/reference/whatsapp-business-accounts#create-a-whatsapp-business-account

### 19.3 Evidencias internas (repo e testes)

- Commits da branch `feat/whatsapp-automations` (ver secao 5)
- Rota de webhook Meta funcional em DEV
- Rota de cron de lembrete 24h funcional
- Painel `Mensagens` com timeline/status em PT-BR
- Voucher publico canonico `/voucher/[id]`

---

## 20. Proximos passos priorizados (curto prazo)

1. Fechar hardening do cancelamento com checkbox em todos os pontos de UI.
2. Validar idempotencia do webhook em repeticao de eventos reais.
3. Formalizar runbook DEV/PROD (rotacao token, limpeza fila, scheduler, troubleshooting).
4. Atualizar este documento com matriz detalhada de requisitos oficiais/inferidos por permissao e por fase de rollout.
5. Iniciar modelagem multi-tenant de credenciais Meta (fase 3 readiness Tech Provider).
6. Planejar cobertura de eventos de coexistencia (`history`, `smb_message_echoes`, `smb_app_state_sync`) com base em docs oficiais e benchmark de parceiros.
7. Consolidar estrategia de infraestrutura (manter Vercel + GH Actions no curto prazo; preparar migracao para GCP Cloud Run + Cloud Scheduler no medio prazo).

---

## 21. Nota final (rigor e posicionamento)

O produto ja saiu da fase de "prova tecnica de envio" e entrou na fase de "operacao controlada com automacao". Isso e uma evolucao importante, mas nao equivale a readiness completo para Tech Provider/coexistencia multiempresa.

O valor deste documento e manter essa distincao clara:
- o que ja esta pronto para usar/testar em DEV e piloto,
- o que precisa de hardening,
- e o que e inevitavel para operar como plataforma de tecnologia com qualidade, suporte e compliance.

Este arquivo deve continuar sendo atualizado como documento canonico de decisao e rollout.
