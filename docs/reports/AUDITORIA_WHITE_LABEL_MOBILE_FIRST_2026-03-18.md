# Auditoria White-Label Mobile-First

Status: auditoria local sem commit  
Data base: 2026-03-18  
Escopo: repo inteiro com foco em white-label inicial e preparacao para app
nativo

## 0) Veredito executivo

O repo ja tem base suficiente para iniciar a trilha white-label sem refazer o
produto do zero, mas ainda nao pode ser considerado pronto para operar multiplos
tenants com seguranca.

O principal achado e este:

1. o dominio de negocio ja usa bastante `tenant_id`;
2. o acesso do dashboard ja resolve membership por tenant;
3. mas o banco e parte da configuracao ainda carregam heranca concreta de
   single-tenant.

Em termos de preparacao para mobile:

1. a separacao em `src/modules` ajuda;
2. mas a camada reutilizavel ainda vive dentro de `apps/web`;
3. e parte importante da orquestracao ainda depende de `Next` e server actions.

Conclusao:

- white-label inicial e viavel;
- mobile-first tambem e viavel;
- mas o plano precisa priorizar remover acoplamentos de tenant fixo e de
  runtime web antes da reescrita mobile.

## 1) O que ja esta bom para a trilha futura

### 1.1 Tenant no dominio

Sinal positivo:

1. `tenant_id` ja aparece de forma forte em modulos core:
   - clientes
   - agendamentos
   - atendimento
   - notificacoes
   - pagamentos
2. o dashboard ja resolve acesso por membership em
   `apps/web/src/modules/auth/dashboard-access.ts`.

Impacto:

- nao estamos partindo de um produto totalmente single-tenant.

### 1.2 Integracoes parcialmente tenant-aware

Sinal positivo:

1. WhatsApp ja trabalha com configuracao por tenant em partes importantes:
   - `apps/web/src/modules/notifications/tenant-whatsapp-settings.ts`
   - `apps/web/src/modules/notifications/whatsapp-environment-channel.ts`
   - `apps/web/src/modules/notifications/whatsapp-template-catalog.ts`
2. clientes e historico financeiro ja consultam dados filtrando por tenant.

Impacto:

- a camada de canais nao precisa ser reinventada, mas sim consolidada.

### 1.3 Arquitetura com algum isolamento de dominio

Sinal positivo:

1. existe separacao entre:
   - `app/*`
   - `src/modules/*`
   - `src/shared/*`
2. isso reduz retrabalho na hora de migrar regra para API/backend mobile-first.

Impacto:

- parte do dominio atual pode ser reaproveitada conceitualmente.

## 2) Bloqueadores reais do white-label

### 2.1 Migrations com tenant fixo hardcoded

Este e o maior bloqueador estrutural encontrado.

Exemplos:

1. `supabase/migrations/20260201150000_attendance_tables.sql`
2. `supabase/migrations/20260203100000_add_client_addresses.sql`
3. `supabase/migrations/20260203101000_add_client_contacts.sql`
4. `supabase/migrations/20260202120000_add_appointment_messages.sql`
5. `supabase/migrations/20260303113000_add_whatsapp_webhook_events.sql`
6. `supabase/migrations/20260130020000_align_tenant_id_uuid.sql`
7. `supabase/migrations/20260129000000_ajuste_v1_reality.sql`

Problema concreto:

1. `DEFAULT tenant_id` aponta para o tenant original;
2. policies RLS antigas filtram pelo mesmo UUID fixo;
3. novos tenants podem nascer contaminados pelo tenant do estudio.

Se isso nao for resolvido primeiro:

- todo o resto do white-label vira maquiagem.

### 2.2 Seeds e memberships presos ao tenant original

Exemplo:

- `supabase/migrations/20260223122000_add_dashboard_access_users_auth.sql`

Problema:

1. seeds de acesso ainda nascem amarrados ao tenant original;
2. onboarding de owner/admin de um tenant novo ainda nao e formalizado.

Impacto:

- novo tenant continua dependendo de intervencao manual artesanal.

### 2.3 Tabela `tenants` ainda minima demais

Origem observada:

- `supabase/migrations/20260128074018_remote_schema.sql`

Estrutura atual percebida:

1. `id`
2. `name`
3. `slug`
4. `created_at`

Problema:

1. tenant ainda nao e raiz completa de configuracao;
2. branding, dominios e operacao ficam espalhados;
3. o sistema nao tem um contrato claro de tenant pronto para produto.

## 3) Bloqueadores reais para mobile-first

### 3.1 Regra reutilizavel ainda mora dentro de `apps/web`

Estado atual:

1. modulos de dominio existem;
2. mas estao localizados em `apps/web/src/modules/*`;
3. `packages/*` ainda nao abriga contratos de dominio reutilizaveis.

Impacto:

1. o app mobile nao conseguira reutilizar essa camada diretamente sem nova
   extracao;
2. se a execucao do white-label continuar acoplando tudo em `apps/web`, teremos
   retrabalho na reescrita mobile.

### 3.2 Server actions e comportamento Next ainda entram na orquestracao

Sinais encontrados:

1. `redirect(...)`, `revalidatePath(...)`, `headers(...)` aparecem em partes de
   `apps/web/src/modules/*` e `apps/web/app/*`;
2. exemplo:
   - `apps/web/src/modules/clients/actions/create-client-action.ts`
   - `apps/web/src/modules/appointments/actions/create-internal-booking.ts`
   - `apps/web/src/modules/appointments/actions/update-internal-booking.ts`
   - `apps/web/src/modules/attendance/communication-actions.ts`
   - `apps/web/src/modules/auth/dashboard-access.ts`

Impacto:

1. parte da regra ainda esta acoplada ao runtime do Next;
2. o app mobile nao pode depender disso;
3. a camada de aplicacao precisa ser reorganizada em adaptadores:
   - web/Next
   - API/backend
   - mobile

### 3.3 API mobile-first ainda nao esta formalizada

Estado atual:

1. existem rotas em `apps/web/app/api/*`;
2. existem edge functions em `supabase/functions/*`;
3. mas o produto ainda nao tem um contrato de API unico pensado para app
   nativo.

Impacto:

1. o mobile corre risco de usar endpoints herdados do web sem desenho claro;
2. isso geraria retrabalho logo depois da reescrita.

## 4) Hardcodes de marca e dominio que precisam sair do core

A auditoria encontrou muitos pontos com marca/dominio do estudio embutidos no
codigo.

Exemplos:

1. `apps/web/src/shared/config.ts`
2. `apps/web/src/modules/notifications/whatsapp-template-library.ts`
3. `apps/web/src/modules/payments/public-payment-link.ts`
4. `apps/web/app/layout.tsx`
5. `apps/web/app/auth/google/route.ts`
6. `apps/web/app/auth/callback/route.ts`
7. `apps/web/app/auth/logout/route.ts`
8. `apps/web/app/auth/dev-login/route.ts`
9. `apps/web/app/(public)/*`
10. `apps/web/components/voucher/*`

Problema:

1. marca do tenant original aparece como fallback estrutural;
2. dominios publicos estao hardcoded;
3. auth callback/logout ainda trabalha com allowlist de hostname fixa.

Impacto:

- white-label real fica inviavel sem uma camada canonica de branding/dominios
  por tenant.

## 5) Integracoes: avaliacao de prontidao por tenant

### 5.1 WhatsApp

Prontidao:

- media para alta

Pontos fortes:

1. ja existe canal por ambiente;
2. ja existe catalogo de templates por tenant;
3. ja existe politica de dispatch por tenant.

Pontos que ainda faltam:

1. consolidar base URL publica por tenant;
2. eliminar dependencia de marca fixa em mensagens e templates locais onde isso
   nao deveria ser hardcoded;
3. padronizar onboarding do tenant no canal.

### 5.2 Mercado Pago

Prontidao:

- media

Pontos fortes:

1. a integracao principal esta organizada;
2. webhook e fluxo financeiro ja existem.

Pontos que ainda faltam:

1. credencial ainda e global por ambiente;
2. falta contrato claro de configuracao por tenant;
3. futuro white-label vai exigir camada de provider config por tenant.

### 5.3 Push / OneSignal

Prontidao:

- baixa para white-label

Estado:

1. configuracao atual e global por ambiente em
   `apps/web/src/modules/push/push-config.ts`;
2. o recurso usa feature flag e envs globais.

Impacto:

1. isso serve para o tenant atual;
2. nao serve como base final de white-label por tenant.

### 5.4 Google Maps

Prontidao:

- media

Leitura:

1. a chave pode continuar global no inicio;
2. mas a origem operacional e parametros de deslocamento devem nascer por
   tenant.

## 6) Leitura de risco por area do produto

### Agenda

Risco:

- medio

Motivo:

1. agenda ja usa `tenant_id`;
2. mas politicas/tabelas auxiliares ainda carregam tenant fixo historico.

### Clientes/Pacientes

Risco:

- medio

Motivo:

1. o modulo esta mais organizado;
2. depende fortemente de `tenant_id`;
3. ainda precisara de camada de API/backend propria para mobile.

### Atendimento

Risco:

- alto

Motivo:

1. muitas tabelas de atendimento vieram de migration com tenant fixo;
2. parte relevante da orquestracao usa `revalidatePath` e acoplamento com web.

### Pagamentos

Risco:

- alto

Motivo:

1. regras financeiras sao criticas;
2. provider config ainda nao esta tenantizada de ponta a ponta.

### Mensagens e automacoes

Risco:

- alto

Motivo:

1. a base esta boa, mas ainda existe bastante marca fixa e base URL fixa;
2. errar aqui significa mandar mensagem/link do tenant errado.

## 7) Decisoes anti-retrabalho para mobile

Para o white-label executado agora nao ser jogado fora na reescrita mobile, as
decisoes corretas sao:

1. nao colocar regra nova diretamente em server action do Next se ela puder
   nascer como contrato de dominio/API;
2. nao criar config por tenant baseada apenas em env;
3. nao usar branding hardcoded como fallback estrutural;
4. nao expandir mais a superficie de negocio em `apps/web/app/*` quando ela
   deveria ir para backend/modulo;
5. usar `tenant` como raiz canonica de configuracao do produto;
6. separar:
   - contrato de dominio
   - adaptador web
   - adaptador API
   - adaptador mobile

## 8) Conclusao da auditoria

O repo nao precisa ser refeito do zero para virar white-label e depois mobile.

Mas a ordem e obrigatoria:

1. endurecer tenant no banco;
2. consolidar tenant como raiz de configuracao;
3. tirar marca/dominio hardcoded do core;
4. mover a operacao para uma superficie mais API/backend-first;
5. so entao acelerar a reescrita mobile.

Se fizermos o contrario:

1. o app nativo nascera em cima de contratos instaveis;
2. o white-label sera remendo;
3. parte da implementacao seria descartada depois.

## 9) Recomendacao final

A execucao correta e:

1. fechar white-label inicial agora com mentalidade mobile-first;
2. usar este trabalho para estabilizar:
   - tenant
   - dominio
   - configuracao
   - integracoes
   - contratos
3. depois iniciar a reescrita mobile sobre essa base ja saneada.
