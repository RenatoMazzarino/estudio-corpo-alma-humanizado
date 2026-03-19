# Plano de Execucao White-Label Enterprise

Status: detalhamento operacional local  
Data base: 2026-03-18  
Escopo: concluir a fase inicial de white-label do produto sem fork e sem
gambiarra  
Dependencia estrategica: `docs/plans/PLANO_APP_NATIVO_WHITE_LABEL_WEB_MOBILE_2026-03-18.md`

## 0) Objetivo deste plano

Transformar a direcao white-label do produto em um plano executavel, baseado no
estado real do repositorio e do banco.

Este documento responde quatro perguntas:

1. o que ja existe no repo e ajuda;
2. o que hoje ainda impede chamar o produto de white-label pronto;
3. qual e a ordem correta de execucao sem retrabalho;
4. como validar, liberar e operar novos tenants sem fork do sistema.

## 0.3 Status de execução atual (2026-03-19)

Execução local ponta a ponta concluída até WL-10 com evidências em:

1. `docs/reports/WL5_WL10_EXECUCAO_LOCAL_2026-03-19.md`
2. `docs/runbooks/WL5_WL10_ROLLOUT_REMOTE_MAIN_2026-03-19.md`
3. `docs/runbooks/WHITE_LABEL_TENANT_ONBOARDING_BACKOFFICE_2026-03-19.md`

Pendências desta trilha foram encerradas em 2026-03-19 com execução remota em
`main` (ativação final do tenant secundário, providers ativos e domínios de
homologação válidos), sem bloqueio estrutural remanescente.

## 0.1 Principios obrigatorios para evitar retrabalho mobile

Este plano deve ser executado com mentalidade de produto mobile-first.

Isso significa:

1. nada novo aqui deve depender estruturalmente de `Next` para existir;
2. nada novo aqui deve nascer como hardcode de marca, dominio ou tenant;
3. configuracao por tenant nao pode ser substituida por env por tenant;
4. regra de negocio deve tender a contrato de dominio/API, nao a server action
   do app web;
5. tudo o que sair desta fase deve ser reaproveitavel na futura camada mobile,
   mesmo que a UI web atual continue como adaptador temporario.

## 0.2 Leitura conjunta obrigatoria

Este plano deve ser lido junto com:

1. `docs/plans/PLANO_APP_NATIVO_WHITE_LABEL_WEB_MOBILE_2026-03-18.md`
2. `docs/reports/AUDITORIA_WHITE_LABEL_MOBILE_FIRST_2026-03-18.md`

## 1) Definicao de pronto para white-label inicial

Esta fase so sera considerada concluida quando:

1. um novo tenant puder ser criado sem alterar codigo;
2. um novo tenant puder operar branding, links, canais e regras por
   configuracao;
3. o isolamento logico de dados estiver consistente em banco, runtime e
   integracoes;
4. onboarding de tenant puder ser executado por procedimento controlado;
5. nenhum fluxo core depender do tenant original para funcionar.

## 2) Leitura do estado atual do repo

## 2.1 O que ja existe e reduz risco

1. Grande parte do dominio ja usa `tenant_id`.
2. A autenticacao do dashboard ja resolve acesso por membership em
   `dashboard_access_users`.
3. Algumas integracoes ja operam por tenant:
   - `settings`
   - `whatsapp_environment_channels`
   - `notification_templates`
4. O modulo de clientes ja trabalha com queries filtradas por `tenant_id`.
5. O runtime atual do dashboard ja consegue resolver `tenantId` da sessao em
   `apps/web/src/modules/auth/dashboard-access.ts`.

## 2.2 O que hoje bloqueia white-label real

### A) Banco ainda tem heranca de tenant fixo

Existem migrations com `DEFAULT` hardcoded e RLS hardcoded para o tenant
`dccf4492-9576-479c-8594-2795bd6b81d7`, por exemplo:

1. `supabase/migrations/20260201150000_attendance_tables.sql`
2. `supabase/migrations/20260203100000_add_client_addresses.sql`
3. `supabase/migrations/20260203101000_add_client_contacts.sql`
4. `supabase/migrations/20260202120000_add_appointment_messages.sql`
5. `supabase/migrations/20260303113000_add_whatsapp_webhook_events.sql`
6. `supabase/migrations/20260130020000_align_tenant_id_uuid.sql`
7. `supabase/migrations/20260129000000_ajuste_v1_reality.sql`

Impacto:

1. novo tenant pode herdar comportamento do tenant original;
2. migrations antigas consolidam o cheiro de single-tenant;
3. o banco nao esta pronto para onboarding seguro de multiplos tenants.

### B) Tabela `tenants` ainda e minima demais

Hoje a origem mostra `tenants` com estrutura muito basica:

1. `id`
2. `name`
3. `slug`
4. `created_at`

Impacto:

1. falta modelagem canonica para branding, dominio, timezone e status;
2. o runtime precisa procurar configuracoes espalhadas;
3. o tenant ainda nao funciona como raiz de configuracao do produto.

### C) Membership existe, mas ainda esta sem camada completa de governanca

`dashboard_access_users` ja resolve acesso por tenant, mas hoje:

1. seeds estao presos ao tenant original;
2. ainda nao existe um onboarding formal de tenant + membership;
3. ainda falta separar claramente:
   - dono do tenant
   - administradores
   - equipe operacional
   - possiveis operadores futuros

### D) Runtime publico ainda nao esta fechado por tenant + dominio

Hoje o sistema ja usa `tenant_id` em fluxos publicos, mas o modelo ainda nao
esta formalizado para:

1. resolver tenant por dominio publico;
2. resolver tenant por slug publico com governanca;
3. impedir que links/public pages dependam de marca fixa do tenant original.

### E) Integracoes externas ainda pedem padronizacao por tenant

O WhatsApp esta mais avancado. Pagamentos e outros canais ainda precisam de uma
governanca unica para white-label.

Impacto:

1. sem contrato por tenant, novos clientes vao exigir ajuste manual;
2. o risco de hardcode por tenant aumenta conforme o produto cresce.

## 3) Decisao arquitetural para esta fase

Nao vamos criar uma infraestrutura separada por cliente agora.

O caminho correto desta fase e:

1. produto unico;
2. backend unico;
3. banco unico;
4. isolamento logico forte por tenant;
5. configuracao por tenant em vez de fork;
6. rollout controlado com onboarding de tenant.

## 4) Modelo alvo de white-label inicial

## 4.1 Camadas de configuracao do tenant

Cada tenant deve ter quatro camadas de configuracao:

1. identidade
2. operacao
3. canais/integracoes
4. features/permissoes

## 4.2 Entidades-alvo minimas

### A) `tenants` como raiz canonica

Proposta de evolucao da tabela/logica de `tenants`:

1. `id`
2. `slug`
3. `name`
4. `legal_name`
5. `status`
6. `timezone`
7. `locale`
8. `base_city`
9. `base_state`
10. `support_email`
11. `support_phone`
12. `created_at`
13. `updated_at`

Observacao:

- nao precisa colocar tudo na mesma migration inicial;
- mas a tabela precisa deixar de ser apenas `name + slug`.

### B) `tenant_branding`

Tabela ou equivalente dedicada para identidade visual:

1. `tenant_id`
2. `display_name`
3. `logo_url`
4. `icon_url`
5. `primary_color`
6. `secondary_color`
7. `accent_color`
8. `surface_style`
9. `public_app_name`
10. `updated_at`

### C) `tenant_domains`

Tabela ou equivalente para roteamento publico:

1. `tenant_id`
2. `domain`
3. `type`
   - `primary_public`
   - `secondary_public`
   - `preview_public`
   - `dashboard`
4. `is_primary`
5. `is_active`
6. `verified_at`
7. `updated_at`

### D) `tenant_feature_flags`

Tabela ou equivalente para liberar modulos por tenant:

1. `tenant_id`
2. `feature_key`
3. `enabled`
4. `scope`
5. `updated_at`

### E) Configuracao operacional e de integracoes

Aqui o melhor caminho e reaproveitar o que ja existe sempre que possivel:

1. `settings`
   - regras gerais do tenant
2. `whatsapp_environment_channels`
   - canal WhatsApp por ambiente
3. `notification_templates`
   - catalogo oficial de templates por tenant

Complementos novos so entram quando o modelo atual nao for suficiente.

## 5) Frentes de execucao

## 5.1 Frente A - Hardening de banco e RLS

Objetivo:

Eliminar a dependencia estrutural do tenant fixo no schema e nas policies.

Entregas:

1. inventario fechado de todas as tabelas com `DEFAULT tenant_id` hardcoded;
2. inventario fechado de todas as policies RLS com tenant hardcoded;
3. migrations novas removendo defaults fixos indevidos;
4. policies reescritas para modelo multi-tenant consistente;
5. validacao de integridade por tenant em tabelas core.

Escopo minimo de tabelas a revisar:

1. `settings`
2. `availability_blocks`
3. `transactions`
4. `appointment_attendances`
5. `appointment_checklist_items`
6. `appointment_evolution_entries`
7. `appointment_checkout`
8. `appointment_checkout_items`
9. `appointment_payments`
10. `appointment_post`
11. `appointment_events`
12. `client_addresses`
13. `client_phones`
14. `client_emails`
15. `client_health_items`
16. `appointment_messages`
17. `whatsapp_webhook_events`

Criterio de aceite:

1. nenhuma tabela core cria linha em tenant errado por `DEFAULT`;
2. nenhuma policy depende do UUID do tenant original;
3. inserts service-role continuam funcionando com `tenant_id` explicito;
4. dados antigos permanecem validos.

Rollback:

1. migrations reversiveis por bloco;
2. manter onboarding de novos tenants bloqueado ate a validacao completa.

## 5.2 Frente B - Modelo canonico de tenant

Objetivo:

Parar de tratar tenant como identificador minimo e passar a tratá-lo como raiz
de configuracao do produto.

Entregas:

1. evolucao de `tenants` para campos canonicos minimos;
2. tabela ou modulo de branding do tenant;
3. tabela ou modulo de dominios do tenant;
4. politica de status do tenant:
   - `draft`
   - `active`
   - `suspended`
   - `archived`

Criterio de aceite:

1. nome, branding e operacao nao dependem de constantes no codigo;
2. tenant consegue existir em `draft` antes de ir para producao;
3. rotas publicas e dashboard conseguem consultar configuracao canonica do
   tenant.

## 5.3 Frente C - Resolucao de tenant em runtime

Objetivo:

Definir, de forma unica, como o sistema resolve tenant no dashboard, nas rotas
publicas, nos webhooks e nos jobs.

Modelo recomendado:

1. dashboard resolve tenant por `dashboard_access_users`;
2. fluxo publico resolve tenant por dominio ou slug publico;
3. webhook resolve tenant por referencia do registro vinculado;
4. job/processador sempre carrega `tenant_id` persistido.

Entregas:

1. funcao/modulo canonico de resolucao de tenant por contexto;
2. contrato unico para:
   - server actions
   - pages
   - public routes
   - webhooks
   - processors
3. remocao de qualquer premissa de tenant default no runtime.

Criterio de aceite:

1. o sistema nao precisa de `DEFAULT_TENANT_ID` nem `FIXED_TENANT_ID`;
2. dashboard, publico e jobs concordam sobre o mesmo tenant;
3. um tenant nao consegue enxergar ou operar dados de outro por erro de
   resolucao.

## 5.4 Frente D - Configuracao por tenant das integracoes

Objetivo:

Garantir que canais e integracoes sejam governados por configuracao do tenant,
nao por ajuste manual em varios pontos.

Integracoes prioritarias:

1. WhatsApp
2. Mercado Pago
3. links/dominios publicos
4. push
5. Google Maps, quando houver base/localizacao especifica do tenant

Estado atual relevante:

1. WhatsApp ja esta mais pronto por tenant via:
   - `settings`
   - `whatsapp_environment_channels`
   - `notification_templates`
2. Mercado Pago ainda precisa de governanca operacional mais fechada por
   tenant.

Entregas:

1. matriz de integracoes por tenant;
2. contrato minimo por provider:
   - habilitado/desabilitado
   - credenciais
   - ambiente
   - remetente/origem
   - links publicos/base url
3. validacao fail-safe quando a configuracao estiver inconsistente.

Criterio de aceite:

1. novo tenant nao exige editar codigo para ativar integracoes;
2. canais falham de forma segura quando o tenant esta incompleto;
3. ambiente e tenant nao se confundem.

## 5.5 Frente E - Membership, perfis e governanca operacional

Objetivo:

Fechar a camada de acesso e governanca de operadores por tenant.

Entregas:

1. modelo fechado de perfis:
   - `owner`
   - `admin`
   - `staff`
   - `viewer`
2. onboarding de membership por tenant;
3. trilha auditavel de ativacao/desativacao;
4. playbook de criacao do primeiro owner de um tenant novo.

Pontos atuais do repo:

1. `dashboard_access_users` ja existe;
2. ele resolve o acesso atual do dashboard;
3. ainda falta a camada formal de onboarding/governanca.

Criterio de aceite:

1. novo tenant consegue ganhar owner sem SQL manual recorrente;
2. acesso dashboard respeita tenant e role;
3. remocao/suspensao de acesso nao afeta outros tenants.

## 5.6 Frente F - Dominio publico e links por tenant

Objetivo:

Garantir que as experiencias publicas do tenant sejam governadas por dominio e
configuracao dele.

Escopo:

1. agendamento publico
2. pagamento publico
3. voucher
4. comprovante
5. futuros links publicos operacionais

Entregas:

1. estrategia canonica de resolucao por dominio;
2. tabela/config de dominios do tenant;
3. politica para links fallback por slug;
4. padrao de base URL por tenant para mensagens e links publicos.

Criterio de aceite:

1. links publicos nao dependem de dominio fixo do tenant original;
2. tenant novo pode publicar links proprios sem fork;
3. a troca de dominio e configuracional e auditavel.

## 5.7 Frente G - Backoffice de tenant e onboarding

Objetivo:

Criar a camada administrativa minima para ativar um tenant novo de forma
repetivel.

Entregas:

1. checklist canonico de onboarding;
2. playbook operacional passo a passo;
3. estado minimo do tenant:
   - criado
   - branding aplicado
   - membros criados
   - integracoes configuradas
   - dominios validados
   - tenant ativo
4. backlog de futura tela interna de administracao de tenants.

Observacao:

- nao e obrigatorio construir a tela administrativa agora;
- mas o processo precisa existir e ser repetivel.

Criterio de aceite:

1. ativacao de tenant novo nao vira trabalho artesanal;
2. o procedimento cabe em runbook claro;
3. o produto suporta tenant de homologacao antes do tenant comercial.

## 5.8 Frente H - Observabilidade, auditoria e seguranca

Objetivo:

Ter rastreabilidade suficiente para operar multiplos tenants sem confusao de
dados e sem diagnostico cego.

Entregas:

1. logs relevantes sempre com `tenant_id`;
2. trilha de auditoria para mudanca de configuracao de tenant;
3. ids de correlacao em jobs/webhooks/eventos;
4. alarmes para configuracao inconsistente por tenant;
5. validacoes de seguranca entre tenant, membership e provider config.

Criterio de aceite:

1. qualquer incidente relevante consegue ser isolado por tenant;
2. alteracoes de configuracao ficam rastreaveis;
3. envio/cobranca errada por tenant gera falha segura, nao comportamento
   silencioso.

## 6) Ordem de execucao recomendada

### Etapa WL-1 - Inventario e saneamento do legado single-tenant

Executar:

1. inventario de migrations com tenant hardcoded;
2. inventario de runtime com premissas do tenant original;
3. inventario de links/dominios/marcas hardcoded.

Saida:

1. lista fechada de bloqueadores reais;
2. backlog tecnico priorizado por risco.

### Etapa WL-2 - Banco e tenant core

Executar:

1. endurecer `tenants`;
2. remover defaults fixos improprios;
3. ajustar RLS/policies;
4. criar estrutura de branding/dominios.

Saida:

1. banco pronto para tenant novo sem herdar tenant fixo;
2. tenant com raiz de configuracao formalizada.

### Etapa WL-3 - Runtime e resolucao canonica

Executar:

1. modulo unico de resolucao de tenant;
2. alinhamento dashboard/publico/jobs/webhooks;
3. fail-safe quando tenant nao estiver configurado.

Saida:

1. runtime sem ambiguidade de tenant.

### Etapa WL-4 - Integracoes por tenant

Executar:

1. consolidar WhatsApp;
2. consolidar pagamentos por tenant;
3. padronizar links/base URLs por tenant;
4. fechar matriz de configuracao por canal.

Saida:

1. integracoes sem hardcode do tenant original.

### Etapa WL-5 - Onboarding e tenant de homologacao

Executar:

1. criar tenant de homologacao independente;
2. aplicar branding e canais por configuracao;
3. rodar fluxo ponta a ponta.

Saida:

1. prova real de que o produto sobe tenant novo sem fork.

## 7) Prova de conclusao da fase

White-label inicial so deve ser marcado como concluido apos esta prova:

1. criar tenant novo;
2. criar owner novo;
3. aplicar branding novo;
4. configurar dominio/link publico;
5. configurar WhatsApp e pagamento do tenant;
6. publicar tenant sem editar codigo;
7. validar:
   - dashboard isolado
   - clientes isolados
   - agenda isolada
   - mensagens isoladas
   - links publicos corretos

## 8) Testes obrigatorios por frente

## 8.1 Banco

1. inserir registros em tenant A e tenant B;
2. provar que leituras nao cruzam tenants;
3. provar que policies nao dependem do UUID do tenant original.

## 8.2 Runtime

1. dashboard com memberships de tenants distintos;
2. public pages resolvendo tenant por dominio/slug;
3. jobs e webhooks respeitando `tenant_id` persistido.

## 8.3 Integracoes

1. WhatsApp usando template/canal do tenant correto;
2. pagamento usando configuracao do tenant correto;
3. links publicos montados com base URL do tenant correto.

## 8.4 Onboarding

1. ativar tenant sem editar codigo;
2. ativar membership owner sem SQL manual recorrente;
3. desativar tenant sem afetar outros tenants.

## 9) Riscos reais do repositorio que este plano precisa atacar

1. migrations antigas perpetuando tenant fixo;
2. policies RLS antigas aceitando apenas o tenant original;
3. seeds operacionais presas ao primeiro tenant;
4. integracoes futuras serem adicionadas fora do modelo por tenant;
5. confusao entre ambiente (`development/preview/production`) e tenant.

## 10) O que nao fazer

1. nao criar fork por cliente para compensar falta de modelagem;
2. nao usar env por cliente como substituto de configuracao por tenant;
3. nao deixar webhook/job descobrir tenant por heuristica fraca;
4. nao colocar branding publico hardcoded no frontend;
5. nao abrir onboarding comercial antes de validar um tenant secundario.

## 11) Entregavel final desta trilha

Ao fim desta execucao, o produto deve permitir:

1. um segundo tenant real de homologacao;
2. configuracao por tenant sem fork;
3. identidade visual por tenant;
4. links publicos por tenant;
5. memberships por tenant;
6. canais externos por tenant;
7. validacao e operacao auditavel por tenant.

## 12) Proximos passos recomendados a partir deste plano

1. abrir auditoria tecnica dos defaults/policies hardcoded por migration;
2. mapear exatamente quais tabelas de configuracao de tenant ja existem e quais
   ainda precisam nascer;
3. desenhar o modulo canonico de resolucao de tenant em runtime;
4. criar o tenant de homologacao como prova tecnica da fase;
5. so depois disso iniciar rollout comercial white-label.

## 13) Backlog faseado e executavel

## 13.1 Fase WL-1 - Saneamento single-tenant do banco

Objetivo:

Eliminar defaults e policies que ainda carregam o tenant original como
premissa.

Status local em `2026-03-18`:

1. migration corretiva criada;
2. migration aplicada e registrada no Supabase local;
3. validação funcional local concluída com sucesso;
4. rollout em ambientes compartilhados ainda pendente.

Entregas tecnicas:

1. inventario fechado de migrations com `tenant_id` hardcoded;
2. migrations corretivas por bloco;
3. remocao de `DEFAULT tenant_id` indevido nas tabelas core;
4. revisao de policies RLS antigas;
5. prova de isolamento entre tenant A e tenant B.

Areas do repo impactadas:

1. `supabase/migrations/*`
2. `docs/sql/*` se precisarem de refresh futuro
3. docs de integracao/operacao se houver mudanca de runtime

Criterio de aceite:

1. nenhuma tabela core cria registro no tenant original por default;
2. nenhuma policy depende do UUID do tenant original;
3. dados existentes continuam legiveis e consistentes.

Evidência local já obtida:

1. zero `column_default` com o UUID do tenant original nas tabelas core alvo;
2. zero policies core contendo o UUID do tenant original;
3. insert explícito por `tenant_id` validado em `client_phones`;
4. insert sem `tenant_id` falhando como esperado por `not null`.

Beneficio para mobile:

1. estabiliza a base de dados antes da API mobile-first;
2. evita reescrever app nativo sobre schema contaminado por tenant fixo.

## 13.2 Fase WL-2 - Tenant como raiz canonica de configuracao

Objetivo:

Parar de espalhar configuracao do tenant em varios lugares sem um contrato
central.

Status local em `2026-03-18`:

1. migration canônica criada para evoluir `tenants`;
2. tabelas `tenant_branding`, `tenant_domains` e `tenant_feature_flags`
   criadas no Supabase local;
3. tenant principal do estudio foi retroalimentado com branding/dominios
   equivalentes ao estado atual de producao;
4. rollout em ambiente compartilhado ainda pendente.

Entregas tecnicas:

1. evolucao da tabela `tenants`;
2. criacao da estrutura de branding do tenant;
3. criacao da estrutura de dominios do tenant;
4. criacao da estrutura de feature flags por tenant, se o modelo global nao
   for suficiente;
5. consolidacao do contrato operacional minimo por tenant.

Areas do repo impactadas:

1. `supabase/migrations/*`
2. `apps/web/src/modules/settings/*`
3. `apps/web/src/shared/*` onde hoje existirem fallbacks globais
4. futuras tabelas/modulos de tenant config

Criterio de aceite:

1. tenant deixa de ser apenas `id + slug + name`;
2. branding e dominios nao dependem mais de constante global;
3. o sistema consegue carregar configuracao canonica do tenant.

Beneficio para mobile:

1. app nativo ja pode nascer lendo o mesmo contrato de tenant;
2. evita reimplementar configuracao de tenant depois em outra modelagem.

## 13.3 Fase WL-3 - Resolucao canonica de tenant em runtime

Objetivo:

Unificar como o produto descobre o tenant em dashboard, publico, webhooks e
jobs.

Status local em `2026-03-18`:

1. modulo tenant-aware criado em `apps/web/src/modules/tenancy/*`;
2. trusted origin do auth e do Spotify passou a usar resolver unico;
3. dominios default do estudio atual continuam iguais, mas agora a allowlist
   pode crescer via banco;
4. rollout em ambiente compartilhado ainda pendente.

Entregas tecnicas:

1. modulo canonico de resolucao de tenant por contexto;
2. alinhamento entre:
   - dashboard
   - rotas publicas
   - cron/jobs
   - webhooks
3. remocao de heuristicas e fallbacks ambiguos;
4. fail-safe quando tenant nao puder ser resolvido com seguranca.

Areas do repo impactadas:

1. `apps/web/src/modules/auth/*`
2. `apps/web/app/(public)/*`
3. `apps/web/app/api/*`
4. `apps/web/src/modules/events/*`
5. `supabase/functions/*`

Criterio de aceite:

1. dashboard resolve tenant por membership;
2. publico resolve tenant por dominio/slug controlado;
3. webhooks e jobs trabalham com `tenant_id` persistido;
4. nao existe dependencia de tenant default no runtime.

Beneficio para mobile:

1. define desde ja o contrato que o app nativo vai usar;
2. evita criar logica de tenant diferente entre web e mobile.

## 13.4 Fase WL-4 - Desacoplamento de branding e dominios do tenant original

Objetivo:

Remover a marca do estudio e os dominios fixos do core do produto.

Status local em `2026-03-18`:

1. hardcodes criticos de base URL publica foram centralizados;
2. biblioteca de templates WhatsApp passou a montar links a partir do base URL
   canonico;
3. auth deixou de depender de allowlist duplicada de host;
4. a identidade visual visivel do estudio continua idêntica por design, agora
   vinda do tenant principal/default.

Entregas tecnicas:

1. inventario completo de hardcodes de marca e dominio;
2. extracao desses valores para tenant config;
3. ajuste de links publicos, auth callbacks e templates;
4. padrao de base URL por tenant.

Areas do repo impactadas:

1. `apps/web/src/shared/config.ts`
2. `apps/web/src/modules/notifications/*`
3. `apps/web/src/modules/payments/*`
4. `apps/web/app/auth/*`
5. `apps/web/app/(public)/*`
6. `apps/web/components/*` onde a marca esta embutida

Criterio de aceite:

1. tenant novo nao herda nome/dominio do estudio no runtime;
2. links publicos e mensagens usam base URL do tenant correto;
3. auth nao depende de allowlist fixa do dominio do tenant original.

Beneficio para mobile:

1. evita reconstruir branding/public links do zero no app nativo;
2. deixa o branding como dado, nao como detalhe de UI web.

## 13.5 Fase WL-5 - Integracoes por tenant

Objetivo:

Garantir que canais externos funcionem por configuracao de tenant.

Entregas tecnicas:

1. consolidacao do WhatsApp por tenant;
2. desenho e endurecimento do provider config de pagamentos por tenant;
3. definicao de push por tenant;
4. amarracao de base URLs publicas por tenant para mensageria e checkout.

Areas do repo impactadas:

1. `apps/web/src/modules/notifications/*`
2. `apps/web/src/modules/payments/*`
3. `apps/web/src/modules/push/*`
4. `apps/web/src/modules/settings/*`
5. `supabase/migrations/*`

Criterio de aceite:

1. canais falham de forma segura quando configuracao do tenant estiver errada;
2. novo tenant nao exige editar codigo para ativar provider;
3. ambiente e tenant nao se confundem.

Beneficio para mobile:

1. app nativo ja nasce consumindo o mesmo backend/canais por tenant;
2. evita solucao paralela de provider config depois.

## 13.6 Fase WL-6 - Memberships, onboarding e governanca

Objetivo:

Fazer o tenant novo nascer e operar sem SQL artesanal recorrente.

Entregas tecnicas:

1. padrao de criacao do owner inicial do tenant;
2. padrao de ativacao de admins/staff/viewer;
3. trilha auditavel de membership;
4. runbook de onboarding de tenant.

Areas do repo impactadas:

1. `supabase/migrations/*`
2. `apps/web/src/modules/auth/*`
3. `docs/runbooks/*`
4. futura camada administrativa de tenant

Criterio de aceite:

1. novo tenant recebe owner sem fork e sem codigo manual recorrente;
2. acesso dashboard respeita tenant e role;
3. desativacao de usuario nao vaza para outros tenants.

Beneficio para mobile:

1. o modelo de acesso ja fica pronto para autenticacao do app nativo;
2. evita ter que reinventar membership fora do web.

## 13.7 Fase WL-7 - API e contratos mobile-first

Objetivo:

Preparar a transicao para app nativo sem reescrever novamente a regra ja
consolidada no white-label.

Entregas tecnicas:

1. inventario do que hoje depende de server action/Next;
2. separacao entre:
   - regra de dominio
   - orquestracao web
   - superficie de API
3. backlog de endpoints mobile-first;
4. diretriz para extracao futura de contratos reutilizaveis para `packages/*`.

Areas do repo impactadas:

1. `apps/web/app/*`
2. `apps/web/src/modules/*`
3. `apps/web/app/api/*`
4. `supabase/functions/*`
5. `packages/*`

Criterio de aceite:

1. os fluxos core ja tem caminho claro para API/backend-first;
2. o white-label implementado nao depende de artefato exclusivo do web;
3. o app mobile consegue nascer em cima de contratos estaveis.

Beneficio para mobile:

1. esta e a ponte direta para a reescrita nativa;
2. evita que o white-label feito agora seja descartado depois.

## 13.8 Fase WL-8 - Tenant de homologacao como prova real

Objetivo:

Provar tecnicamente que o produto virou white-label logico de verdade.

Entregas tecnicas:

1. criacao de um tenant secundario de homologacao;
2. branding proprio;
3. membership proprio;
4. links proprios;
5. canais configurados;
6. validacao ponta a ponta sem fork.

Criterio de aceite:

1. tenant secundario sobe sem alterar codigo;
2. dados nao cruzam tenants;
3. links, mensagens e pagamentos respeitam o tenant correto;
4. o produto passa a ter prova concreta de white-label inicial.

Beneficio para mobile:

1. o app nativo nao sera iniciado sobre suposicoes;
2. ele nascera sobre uma plataforma multi-tenant ja comprovada.

## 14) Plano detalhado ponta a ponta das frentes pendentes

Esta secao detalha exatamente como concluir os itens que ainda faltam para
chamar o produto de white-label inicial finalizado, sem mudar a identidade
visual atual do estudio e sem criar trabalho descartavel para a futura
reescrita mobile.

## 14.1 Premissas obrigatorias desta execucao

1. o tenant principal do estudio continua sendo a referencia visual atual;
2. nome, cores, logos, dominios e textos do estudio atual permanecem iguais;
3. toda mudanca nova deve nascer orientada a contrato de dominio e API, nunca
   como detalhe acoplado ao `Next`;
4. nada novo deve depender de env por tenant para existir;
5. onboarding de tenant novo deve ser repetivel e auditavel;
6. a prova final obrigatoria sera feita com um tenant secundario de homologacao.

## 14.2 Fase detalhada WL-5 - Integracoes por tenant

### 14.2.1 Objetivo da WL-5

Fazer com que Mercado Pago, Push/OneSignal, Google Maps operacional e links
publicos passem a depender de configuracao do tenant, e nao mais de
configuracao global do estudio atual.

### 14.2.2 Resultado esperado da WL-5

Ao fim desta fase:

1. cada tenant consegue ter seus canais habilitados ou desabilitados;
2. cada tenant consegue operar com credenciais proprias quando o provider
   exigir isso;
3. nenhum canal funciona de forma ambigua quando a configuracao estiver
   incompleta;
4. a API/backend passa a responder com falha segura e rastreavel quando a
   configuracao do tenant estiver inconsistente.

### 14.2.3 Subfase WL-5A - Modelo canonico de provider config

Implementar:

1. inventario fechado da configuracao atual de providers em:
   - `settings`
   - `whatsapp_environment_channels`
   - `notification_templates`
   - `push-config`
   - modulos de pagamento
   - modulos de mapas/deslocamento
2. decisao de modelagem:
   - reaproveitar `settings` onde ja fizer sentido;
   - criar tabela dedicada so quando a configuracao atual nao comportar
     provider por tenant com seguranca;
3. contrato canonico minimo por provider:
   - `tenant_id`
   - `provider_key`
   - `enabled`
   - `environment_mode`
   - `base_url`
   - `sender_identifier`
   - `credentials_status`
   - `config_version`
   - `updated_at`
4. camada unica de leitura da configuracao do provider por tenant em
   `src/modules`.

Critico para evitar retrabalho mobile:

1. a camada de leitura nao deve depender de server action;
2. deve ser utilizavel por API, cron, job, webhook e app mobile no futuro;
3. o contrato de erro deve ser explicitamente tipado.

### 14.2.4 Subfase WL-5B - Mercado Pago por tenant

Implementar:

1. mapear o fluxo atual de cobranca e webhook para identificar onde hoje existe
   dependencia de credencial global;
2. criar contrato de configuracao por tenant para Mercado Pago contendo:
   - status habilitado
   - tipo de operacao permitido
   - credencial ativa
   - modo operacional
   - politica de webhook
3. centralizar a resolucao da credencial do tenant antes de:
   - criar pagamento
   - consultar status
   - processar webhook
4. adicionar fail-safe:
   - se o tenant nao tiver credencial valida, o fluxo deve falhar com erro
     operacional claro e auditavel;
   - nunca pode cair silenciosamente para a credencial do tenant principal;
5. ajustar webhooks para validar:
   - tenant resolvido
   - configuracao ativa
   - correspondencia entre pagamento e tenant.

Validacao obrigatoria:

1. tenant A nao consegue usar credencial do tenant B;
2. pagamento de tenant sem configuracao falha antes de cobrar;
3. webhook de pagamento nao cruza tenant;
4. links de comprovante e pagamento respeitam a base URL do tenant.

### 14.2.5 Subfase WL-5C - Push/OneSignal por tenant

Implementar:

1. sair do modelo atual puramente global por ambiente;
2. definir contrato por tenant para push contendo:
   - status habilitado
   - provedor ativo
   - app id/canal configurado
   - modo operacional
   - chaves/configuracao seguras
3. criar resolvedor unico de push por tenant;
4. garantir que:
   - subscription
   - envio de teste
   - mapeamento de eventos
   - preferencia de notificacao
   usem o tenant ativo;
5. impedir que tenant novo herde o app do estudio por fallback oculto.

Validacao obrigatoria:

1. tenant sem push configurado nao envia nada;
2. tenant com push configurado envia somente no app/canal correto;
3. logs de envio carregam `tenant_id`.

### 14.2.6 Subfase WL-5D - Google Maps e base operacional por tenant

Implementar:

1. manter a chave global apenas se isso continuar seguro e economicamente
   aceitavel;
2. mover para tenant config o que e operacional:
   - cidade/base principal
   - coordenada base
   - taxa ou regra de deslocamento
   - raio de atendimento
   - endereco publico operacional quando aplicavel
3. garantir que simulacoes e calculos de deslocamento usem a base do tenant,
   nao a base fixa do estudio atual.

Validacao obrigatoria:

1. tenant secundario com base diferente recebe calculo coerente;
2. nenhum calculo de deslocamento cai no endereco do tenant principal por
   acidente.

### 14.2.7 Subfase WL-5E - Fail-safe de configuracao inconsistente

Implementar:

1. um verificador canonico de integracao por tenant antes de acionar provider;
2. contratos claros de erro:
   - `tenant_not_resolved`
   - `tenant_inactive`
   - `provider_disabled`
   - `provider_credentials_missing`
   - `provider_config_invalid`
3. surface unica de observabilidade desses erros;
4. mensagem operacional compreensivel para a Jana/equipe quando o tenant atual
   estiver incompleto.

Critério de conclusão da subfase WL-5:

1. WhatsApp, Mercado Pago, Push e Maps conseguem ser resolvidos por tenant;
2. nenhum provider depende de fallback para o estudio atual;
3. tenant sem config valida falha cedo e com auditoria.

### 14.2.8 Subfase WL-5F - Medicao e cobranca de uso por tenant

Implementar:

1. contrato canonico de cobranca por integracao, assumindo modelo com chaves da
   plataforma e repasse por pacote ou uso;
2. tabelas dedicadas para:
   - perfil de cobranca por tenant e integracao
   - regra de precificacao por integracao
   - medicao diaria de consumo
   - snapshots de fechamento mensal
3. eventos de consumo com `tenant_id` para:
   - Google Maps
   - Push/OneSignal
   - outros providers compartilhados da plataforma
4. backend de consolidacao para:
   - calcular consumo por periodo
   - aplicar pacote/franquia
   - calcular excedente por tenant
5. painel interno minimo para backoffice consultar:
   - consumo do tenant
   - pacote contratado
   - excedente apurado
   - status de cobranca
6. regra clara separando:
   - providers com conta propria do tenant
   - providers compartilhados da plataforma.

Politica inicial recomendada:

1. WhatsApp e Mercado Pago seguem preferencialmente com conta propria do
   tenant;
2. Google Maps e Push podem usar chave/app da plataforma no inicio;
3. quando a plataforma arcar com o provider, o consumo precisa ser medido e
   fechado por tenant com trilha auditavel.

Critério de conclusão da subfase WL-5F:

1. todo uso compartilhado relevante gera medicao por `tenant_id`;
2. existe fonte unica para apurar custo por tenant;
3. a plataforma consegue cobrar por pacote ou por uso sem planilha manual.

## 14.3 Fase detalhada WL-6 - Memberships, onboarding e governanca

### 14.3.1 Objetivo da WL-6

Fazer o tenant novo nascer e operar sem SQL artesanal, com perfis claros,
auditaveis e prontos para o futuro app mobile.

### 14.3.2 Resultado esperado da WL-6

Ao fim desta fase:

1. existe um owner inicial claro para cada tenant;
2. os papeis `owner`, `admin`, `staff` e `viewer` estao fechados;
3. ativar e desativar acessos vira fluxo operacional repetivel;
4. o mesmo modelo serve para dashboard web e autenticacao futura do app.

### 14.3.3 Subfase WL-6A - Fechamento do modelo de perfis

Implementar:

1. definir responsabilidades de cada papel:
   - `owner`: dono operacional do tenant e autoridade maxima
   - `admin`: gestao ampla sem equivalencia completa ao owner
   - `staff`: operacao do dia a dia
   - `viewer`: leitura restrita
2. mapear permissoes por modulo:
   - agenda
   - clientes
   - atendimento
   - mensagens
   - caixa/financeiro
   - configuracoes
3. versionar a matriz de permissoes no repo;
4. impedir papeis ambiguos ou sobrepostos.

### 14.3.4 Subfase WL-6B - Onboarding do primeiro owner

Implementar:

1. fluxo canônico para criar tenant em estado `draft`;
2. fluxo canônico para criar o primeiro owner desse tenant;
3. regra de validacao:
   - tenant nao vai para `active` sem owner ativo;
4. mecanica de convite ou associacao inicial sem SQL manual recorrente.

Validacao obrigatoria:

1. um tenant novo recebe owner sem patch manual em banco;
2. o owner entra no dashboard do tenant correto;
3. o owner nao recebe acesso a outros tenants.

### 14.3.5 Subfase WL-6C - Ativacao, suspensao e auditoria de membership

Implementar:

1. status operacional de membership:
   - `pending`
   - `active`
   - `suspended`
   - `revoked`
2. trilha auditavel para:
   - criacao
   - promocao/rebaixamento
   - suspensao
   - revogacao
3. registro de quem executou a mudanca;
4. motivo/resumo da alteracao quando aplicavel.

Critério de conclusão da subfase WL-6:

1. tenant novo recebe owner sem SQL manual recorrente;
2. perfis e acessos ficam claros e rastreaveis;
3. o modelo de membership fica pronto para ser reutilizado no app nativo.

## 14.4 Fase detalhada WL-6.5 - Onboarding operacional de tenant

### 14.4.1 Objetivo do onboarding operacional

Parar de depender de memoria operacional e transformar a ativacao de tenant em
procedimento completo, repetivel e auditavel.

### 14.4.2 Entregas

Implementar no runbook e no processo:

1. checklist de criacao do tenant;
2. checklist de branding;
3. checklist de dominios;
4. checklist de memberships;
5. checklist de integracoes;
6. checklist de validacao final;
7. estados oficiais do tenant:
   - `draft`
   - `active`
   - `suspended`
   - `archived`

### 14.4.3 Fluxo operacional esperado

1. criar tenant em `draft`;
2. aplicar branding e informacoes basicas;
3. configurar dominios;
4. criar owner;
5. configurar integracoes;
6. rodar validacoes obrigatorias;
7. promover tenant para `active`;
8. registrar evidencias da ativacao.

### 14.4.4 Critério de conclusão do onboarding operacional

1. onboarding deixa de ser conhecimento informal;
2. qualquer ativacao de tenant cabe num runbook unico;
3. o processo fica pronto para uso interno antes do rollout comercial.

## 14.5 Fase detalhada WL-7 - Dominios publicos 100% governados por tenant

### 14.5.1 Objetivo da WL-7

Garantir que o produto publique links corretos por tenant em todas as
experiencias publicas, sem depender do dominio do estudio atual.

### 14.5.2 Escopo obrigatorio

Esta fase cobre:

1. agendamento
2. pagamento
3. voucher
4. comprovante
5. futuros links operacionais enviados por mensagem

### 14.5.3 Subfase WL-7A - Resolucao canonica por dominio

Implementar:

1. resolver tenant por dominio de forma unica;
2. usar esse resolvedor em:
   - rotas publicas
   - auth callback/logout
   - construcao de links em notificacoes
   - webhooks com retorno publico quando aplicavel
3. impedir divergencia entre dominio do dashboard e dominio publico.

### 14.5.4 Subfase WL-7B - Politica de fallback por slug

Implementar:

1. fallback controlado para tenant por slug publico;
2. governanca clara para quando usar:
   - preview
   - homologacao
   - tenant sem dominio verificado
3. regra de precedencia:
   - dominio verificado sempre vence;
   - slug so entra como fallback autorizado;
4. logs quando o sistema cair no fallback por slug.

### 14.5.5 Subfase WL-7C - Base URLs por tenant em todos os links

Implementar:

1. construcao centralizada da base URL publica por tenant;
2. revalidar toda geracao de links em:
   - WhatsApp
   - pagamentos
   - vouchers
   - comprovantes
   - notificacoes futuras
3. eliminar qualquer montagem de URL fora do resolvedor canonico.

Validacao obrigatoria:

1. tenant A monta links de tenant A;
2. tenant B monta links de tenant B;
3. nenhum fluxo publica link do estudio atual para o tenant secundario;
4. quando o dominio do tenant estiver inativo, o fallback permitido e o slug
   controlado, nunca o dominio do estudio principal.

Critério de conclusão da subfase WL-7:

1. dominio publico passa a ser dado do tenant;
2. links publicos ficam corretos em todos os fluxos core;
3. troca de dominio vira mudanca configuracional, nao refatoracao de codigo.

## 14.6 Fase detalhada WL-7.5 - Padronizacao final do runtime multi-tenant

### 14.6.1 Objetivo da padronizacao final do runtime

Garantir que dashboard, rotas publicas, webhooks, jobs e cron usem o mesmo
resolvedor de tenant e nao caiam no tenant principal por acidente.

### 14.6.2 Subfase WL-7.5A - Inventario de pontos de entrada

Mapear e ajustar:

1. App Router do dashboard;
2. rotas publicas;
3. webhooks externos;
4. cron/jobs internos;
5. edge functions;
6. processadores assincronos.

### 14.6.3 Subfase WL-7.5B - Eliminacao de heuristicas remanescentes

Implementar:

1. busca de qualquer uso residual de:
   - tenant default
   - base URL default
   - fallback para tenant principal
2. remocao ou encapsulamento estrito desses pontos;
3. fail-safe quando o tenant nao puder ser resolvido com seguranca.

### 14.6.4 Subfase WL-7.5C - Testes sistemicos

Validar:

1. dashboard com memberships de tenants distintos;
2. rotas publicas resolvendo tenant por dominio/slug;
3. webhooks usando `tenant_id` persistido;
4. cron/jobs respeitando tenant do registro processado.

Critério de conclusão da subfase WL-7.5:

1. todos os pontos de entrada usam o resolvedor canonico;
2. nao existe queda silenciosa para o tenant principal;
3. incidentes de tenant mal resolvido passam a ser detectaveis.

## 14.7 Fase detalhada WL-8 - Observabilidade, auditoria e seguranca por tenant

### 14.7.1 Objetivo da WL-8

Dar visibilidade operacional suficiente para operar mais de um tenant sem
misturar dados, mensagens, pagamentos ou diagnosticos.

### 14.7.2 Subfase WL-8A - Logs e correlacao

Implementar:

1. `tenant_id` em logs relevantes;
2. correlation id em:
   - jobs
   - webhooks
   - eventos
   - envios de canal
3. padrao unico de log para erro de tenant/configuracao.

### 14.7.3 Subfase WL-8B - Auditoria de configuracao

Implementar:

1. trilha auditavel para mudancas em:
   - branding
   - dominios
   - memberships
   - integracoes
   - feature flags do tenant
2. captura de:
   - quem alterou
   - quando alterou
   - o que alterou
   - tenant impactado

### 14.7.4 Subfase WL-8C - Alarmes e fail-safe

Implementar:

1. alerta para tenant sem owner;
2. alerta para provider habilitado sem credencial valida;
3. alerta para dominio ativo sem tenant resolvivel;
4. alerta para webhook/processo com tenant inconsistente;
5. bloqueio operacional quando houver risco de vazamento entre tenants.

Critério de conclusão da subfase WL-8:

1. qualquer incidente relevante consegue ser isolado por tenant;
2. configuracao errada deixa rastro e gera acao operacional;
3. o sistema para de falhar silenciosamente em cenarios multi-tenant.

## 14.8 Fase detalhada WL-9 - Tenant secundario de homologacao como prova real

### 14.8.1 Objetivo da WL-9

Esta e a prova que decide se o white-label terminou ou nao.

Sem tenant secundario real, o sistema continua promissor, mas nao concluido.

### 14.8.2 Passos de implementacao

1. criar um segundo tenant em `draft`;
2. aplicar branding proprio;
3. aplicar dominios proprios ou fallback controlado por slug;
4. criar owner proprio;
5. configurar memberships adicionais se necessario;
6. configurar WhatsApp, pagamento e push do tenant;
7. validar links publicos do tenant;
8. promover para `active` apenas apos validacao completa.

### 14.8.3 Prova obrigatoria ponta a ponta

Validar no tenant secundario:

1. dashboard isolado;
2. clientes isolados;
3. agenda isolada;
4. mensagens isoladas;
5. pagamentos isolados;
6. links publicos corretos;
7. branding correto;
8. logs e auditoria corretos;
9. nenhum ajuste de codigo para o tenant novo.

Critério de conclusão da subfase WL-9:

1. tenant secundario sobe sem editar codigo;
2. nao existe cruzamento de dados ou links;
3. o produto passa a ter prova concreta de white-label inicial concluido.

## 14.9 Fase detalhada WL-10 - Fechamento mobile-first da camada de contratos

### 14.9.1 Objetivo da WL-10

Fechar o white-label de um jeito que nao precise ser desmontado quando a
reescrita nativa comecar.

### 14.9.2 O que esta faltando aqui

Hoje ainda falta deixar claro:

1. quais fluxos core dependem de server actions;
2. quais regras de dominio precisam sair de `apps/web`;
3. quais contratos devem nascer como API/backend-first;
4. o que deve ser extraido depois para `packages/*`.

### 14.9.3 Subfase WL-10A - Inventario de acoplamentos ao runtime web

Mapear:

1. fluxo de clientes;
2. fluxo de agendamentos;
3. fluxo de atendimento;
4. fluxo de mensagens;
5. fluxo de pagamentos;
6. fluxo de auth/dashboard access.

Para cada fluxo, identificar:

1. regra de dominio;
2. adaptador web/Next;
3. necessidade de endpoint mobile-first;
4. risco de retrabalho se nada for extraido.

### 14.9.4 Subfase WL-10B - Contratos de API prioritarios

Produzir backlog de endpoints e contratos para:

1. auth e membership;
2. clientes/pacientes;
3. agenda;
4. atendimento/evolucao;
5. mensagens/notificacoes;
6. pagamentos;
7. configuracao do tenant.

### 14.9.5 Subfase WL-10C - Diretriz de extracao futura

Definir:

1. o que permanece como adaptador web;
2. o que vira superficie de API;
3. o que deve migrar para modulo compartilhado;
4. o que deve nascer pensando no app Android e depois iOS.

Critério de conclusão da subfase WL-10:

1. o white-label feito agora passa a ser base reutilizavel da reescrita
   nativa;
2. a equipe sabe exatamente o que nao deve mais nascer acoplado ao `Next`;
3. a futura trilha mobile pode comecar sem refazer tenant, dominio,
   integracao e membership.

## 14.10 Sequencia executiva recomendada daqui para frente

Executar nesta ordem:

1. WL-5 integracoes por tenant;
2. WL-6 memberships e governanca;
3. WL-6.5 onboarding operacional;
4. WL-7 dominios publicos por tenant;
5. WL-7.5 padronizacao final do runtime multi-tenant;
6. WL-8 observabilidade e auditoria;
7. WL-9 tenant secundario de homologacao;
8. WL-10 fechamento mobile-first de contratos.

## 14.11 Definicao final de pronto para white-label inicial

White-label inicial so estara realmente concluido quando:

1. um tenant secundario de homologacao estiver ativo e validado;
2. integrações, memberships, dominios e links estiverem 100% governados por
   tenant;
3. nenhum fluxo core depender do estudio atual como fallback estrutural;
4. houver runbook repetivel de onboarding;
5. a camada de contratos estiver pronta para sustentar a reescrita mobile sem
   retrabalho estrutural.

## 14.12 Checklist de execucao integral pelo agente principal

Esta secao assume o modelo pedido pelo usuario:

1. a execucao sera feita de ponta a ponta por um unico agente principal;
2. as fases nao sao pausas para aprovacao intermediaria;
3. cada fase funciona como gate interno de validacao;
4. ao passar no gate, a fase seguinte deve comecar automaticamente;
5. o agente principal so deve parar se surgir:
   - bloqueio externo real;
   - risco alto com consequencia nao obvia;
   - decisao de negocio ainda nao tomada pelo usuario.

### 14.12.1 Checklist executivo da WL-5

1. fechar inventario atual de configuracao de providers;
2. definir e implementar contrato canonico por tenant para providers;
3. tenantizar Mercado Pago;
4. tenantizar Push/OneSignal;
5. tenantizar base operacional do Google Maps;
6. implementar fail-safe de configuracao inconsistente;
7. validar:
   - provider correto por tenant;
   - falha segura sem fallback indevido;
   - logs com `tenant_id`;
8. se tudo passar, seguir automaticamente para WL-6.

### 14.12.2 Checklist executivo da WL-6

1. fechar matriz de papeis `owner/admin/staff/viewer`;
2. implementar contrato de permissao por modulo;
3. implementar criacao do primeiro owner do tenant;
4. implementar ativacao, suspensao e revogacao auditavel;
5. validar:
   - owner criado sem SQL manual recorrente;
   - acesso isolado por tenant;
   - trilha auditavel de alteracao;
6. se tudo passar, seguir automaticamente para WL-6.5.

### 14.12.3 Checklist executivo da WL-6.5

1. criar runbook operacional completo de onboarding;
2. fechar checklist canônica de tenant:
   - criacao
   - branding
   - dominios
   - membros
   - integracoes
   - validacao final
3. implementar estados oficiais do tenant;
4. validar:
   - onboarding repetivel;
   - tenant sai de `draft` para `active` de forma controlada;
5. se tudo passar, seguir automaticamente para WL-7.

### 14.12.4 Checklist executivo da WL-7

1. fechar resolucao de tenant por dominio;
2. implementar fallback por slug governado;
3. centralizar montagem de base URL publica por tenant;
4. revisar todos os links publicos:
   - agendamento
   - pagamento
   - voucher
   - comprovante
5. validar:
   - tenant A gera links de tenant A;
   - tenant B gera links de tenant B;
   - nenhum fluxo cai no dominio do estudio principal por acidente;
6. se tudo passar, seguir automaticamente para WL-7.5.

### 14.12.5 Checklist executivo da WL-7.5

1. mapear todos os pontos de entrada do runtime;
2. eliminar heuristicas residuais de tenant default;
3. padronizar o resolvedor canonico em dashboard, publico, jobs, cron e
   webhooks;
4. validar:
   - runtime consistente entre todos os pontos de entrada;
   - ausencia de queda silenciosa para o tenant principal;
5. se tudo passar, seguir automaticamente para WL-8.

### 14.12.6 Checklist executivo da WL-8

1. padronizar logs com `tenant_id` e correlation id;
2. implementar auditoria de configuracao do tenant;
3. implementar alarmes de configuracao inconsistente;
4. validar:
   - incidente isolavel por tenant;
   - erro operacional detectavel e rastreavel;
5. se tudo passar, seguir automaticamente para WL-9.

### 14.12.7 Checklist executivo da WL-9

1. criar tenant secundario de homologacao;
2. aplicar branding proprio;
3. aplicar memberships proprios;
4. aplicar links proprios;
5. aplicar integracoes proprias;
6. validar ponta a ponta:
   - dashboard
   - clientes
   - agenda
   - mensagens
   - pagamentos
   - links publicos
   - auditoria
7. se tudo passar, seguir automaticamente para WL-10.

### 14.12.8 Checklist executivo da WL-10

1. mapear dependencias remanescentes de `Next`/server actions;
2. fechar backlog de contratos mobile-first;
3. definir o que vira:
   - adaptador web
   - superficie de API
   - modulo compartilhado
4. validar:
   - white-label reaproveitavel para a trilha mobile;
   - ausencia de acoplamento novo desnecessario ao web;
5. se tudo passar, encerrar a trilha white-label inicial como pronta.

## 14.13 Decisoes fechadas para execucao integral

As decisoes abaixo foram fechadas com o usuario em `2026-03-19`.
Com base nelas, o agente principal consegue executar o restante da trilha
white-label sem depender de nova decisao estrutural previa.

### 14.13.1 Politica visual do white-label

Status decidido em `2026-03-19`:

1. layout fixo com branding configuravel.

Decisao fechada:

1. o produto tera layout fixo com branding configuravel.

Recomendacao tecnica:

1. manter layout, navegacao, componentes, espacamento e estrutura fixos;
2. permitir por tenant apenas configuracao de branding controlado.

Motivo:

1. isso preserva estabilidade visual;
2. reduz regressao no mobile;
3. evita virar um construtor de temas complexo demais.

### 14.13.2 Politica de fonte por tenant

Status decidido em `2026-03-19`:

1. fonte base unica da plataforma;
2. opcao de variacao apenas para titulo e marca;
3. configuracao feita internamente no onboarding, nunca pelo proprio tenant.

Decisao fechada:

1. a plataforma usara uma tipografia base unica;
2. a variacao de tipografia fica restrita a titulos e marca;
3. a configuracao sera feita internamente no onboarding.

Recomendacao tecnica:

1. fonte base unica do sistema para corpo e interface;
2. opcionalmente uma fonte de destaque por tenant apenas para titulos e marca.

Motivo:

1. fonte livre por tenant aumenta risco de quebra de layout;
2. especialmente no futuro app Android/iOS isso gera custo alto de manutencao.

### 14.13.3 Politica de cor por tenant

Status decidido em `2026-03-19`:

1. tema controlado por tokens.

Decisao fechada:

1. a configuracao de cores sera controlada por tokens de tema.

Recomendacao tecnica:

1. usar tokens de tema controlados, com contraste minimo validado.

Tokens recomendados:

1. `primary_color`
2. `secondary_color`
3. `accent_color`
4. `background_color`
5. `surface_color`
6. `on_primary_color`
7. `on_surface_color`

Motivo:

1. isso permite personalizacao real sem comprometer acessibilidade e legibilidade.

### 14.13.4 Kit de logo por tenant

Status decidido em `2026-03-19`:

1. pacote de assets obrigatorios por tenant aprovado;
2. assets ficarao em storage controlado da plataforma.

Decisao fechada:

1. cada tenant deve fornecer no minimo:
   - logo principal horizontal
   - logo quadrado ou icone
   - versao para fundo claro
   - versao para fundo escuro
   - favicon/app icon
2. opcionalmente:
   - splash image
   - logo simplificado para cabecalhos compactos
3. todos os assets ficarao em storage controlado da plataforma.

Recomendacao tecnica:

1. cada tenant deve fornecer no minimo:
   - logo principal horizontal
   - logo quadrado ou icone
   - versao para fundo claro
   - versao para fundo escuro
   - favicon/app icon
2. opcionalmente:
   - splash image
   - logo simplificado para cabeçalhos compactos

Motivo:

1. isso evita improviso de recorte/escala depois;
2. ja prepara a trilha mobile e PWA.

### 14.13.5 Grau de autonomia do tenant na propria configuracao

Status decidido em `2026-03-19`:

1. configuracao white-label inicial operada apenas por backoffice interno.

Decisao fechada:

1. a configuracao white-label inicial sera operada apenas por backoffice
   interno.

Recomendacao tecnica:

1. fase inicial com operacao interna controlada;
2. autoatendimento so depois que a governanca estiver madura.

Motivo:

1. reduz risco operacional;
2. simplifica auditoria e rollout.

### 14.13.6 Estrategia de dominios por tenant

Status decidido em `2026-03-19`:

1. suportar dominio proprio do tenant;
2. suportar subdominio padrao da plataforma para `draft/homologacao`;
3. permitir uso temporario de dominio da Vercel apenas em `draft/homologacao`,
   nunca como dominio comercial final;
4. o usuario optou por dashboard separado por tenant.

Decisao fechada:

1. cada tenant podera usar ambos:
   - dominio proprio
   - subdominio padrao da plataforma
2. `*.vercel.app` fica aprovado como fallback provisório para
   `draft/homologacao`;
3. a producao comercial de tenant ativo continua preferindo:
   - dominio proprio do tenant
   - ou dominio neutro proprio da plataforma quando ele existir
4. o dashboard inicial sera separado por tenant, entao WL-7 deve nascer pronta
   para esse contrato.

Recomendacao tecnica:

1. suportar ambos;
2. usar subdominio padrao para `draft/homologacao`;
3. usar dominio proprio em `active` quando o tenant quiser publicar.
4. aceitar `*.vercel.app` como fallback provisório apenas para homologacao
   tecnica, nunca como identidade neutra definitiva da plataforma;
5. se a decisao final for manter dashboard por tenant, o contrato de dominio,
   auth, membership e suporte precisa nascer preparado para isso desde a WL-7;
6. um dominio neutro proprio da plataforma continua desejavel para maturidade
   comercial, mas deixou de ser bloqueador para iniciar a execucao.

### 14.13.7 Estrategia de integracoes por tenant

Status decidido em `2026-03-19`:

1. WhatsApp com conta/canal proprio do tenant;
2. Mercado Pago com conta propria do tenant;
3. Push com infraestrutura da plataforma, governada por tenant;
4. Google Maps com chave inicialmente da plataforma e base operacional por
   tenant.

Decisao fechada:

1. WhatsApp usara conta/canal proprio do tenant;
2. Mercado Pago usara conta propria do tenant;
3. Push usara infraestrutura da plataforma governada por tenant;
4. Google Maps usara chave inicial da plataforma com base operacional por
   tenant.

Recomendacao tecnica inicial:

1. WhatsApp: preferencialmente conta/canal proprio do tenant;
2. Mercado Pago: conta propria do tenant;
3. Push: estrutura da plataforma, mas app/canal governado por tenant;
4. Google Maps: chave pode continuar da plataforma no inicio, com operacao por
   tenant.

### 14.13.8 Politica de cobranca de integracoes compartilhadas

Status decidido em `2026-03-19`:

1. a plataforma podera operar com chaves proprias em integracoes
   compartilhadas;
2. a cobranca devera suportar pacote contratado ou uso unico/excedente;
3. o banco, backend e, quando necessario, frontend interno fazem parte do
   escopo final, nao de backlog futuro.

Decisao fechada:

1. o motor tecnico deve suportar:
   - pacote contratado
   - franquia
   - excedente
   - uso unitario
2. a regra comercial concreta sera configurada depois pelo usuario no
   backoffice, sem bloquear a implementacao estrutural agora.

Recomendacao tecnica:

1. guardar o motor de medicao/custo no backend desde a WL-5;
2. deixar o backoffice interno com leitura de consumo e pacote;
3. manter a regra comercial parametrizavel por tenant e provider.

### 14.13.9 Tenant secundario de homologacao

Status decidido em `2026-03-19`:

1. usar tenant ficticio de homologacao;
2. nome recomendado para a prova real: `Salão Aurora`;
3. slug recomendado: `salao-aurora-demo`.

Decisao fechada:

1. o tenant de prova sera uma marca ficticia de homologacao;
2. nome aprovado: `Salao Aurora`;
3. slug aprovado: `salao-aurora-demo`.

Recomendacao tecnica:

1. usar primeiro uma marca ficticia de homologacao.

Motivo:

1. permite provar a arquitetura sem pressao comercial;
2. evita expor cliente real a ajustes estruturais.

### 14.13.10 Veredito de bloqueios de decisao

Com as definicoes acima:

1. nao restam decisoes estruturais bloqueando a execucao integral do plano;
2. o que continuar variavel daqui para frente e configuracao operacional,
   onboarding e rollout, nao definicao de arquitetura;
3. a futura execucao pode seguir fase a fase automaticamente, com validacao
   interna do agente principal entre gates.

## 14.14 Modelo de configuracao visual e operacional por tenant

Esta e a forma recomendada de tratar branding e detalhes de white-label sem
transformar o produto num sistema dificil de manter.

### 14.14.1 O que deve ser configuravel por tenant

1. nome de exibicao
2. nome juridico
3. logos
4. icones/favicons
5. cores de marca
6. contatos de suporte
7. dominios publicos e do dashboard
8. textos institucionais curtos
9. link de redes sociais
10. base operacional do atendimento
11. provedores/integracoes
12. feature flags do tenant

### 14.14.2 O que nao deve ser livre por tenant nesta fase

1. estrutura de navegacao
2. arquitetura dos componentes
3. espacamento base do sistema
4. grid/layout do dashboard
5. fluxo core de agenda, atendimento, clientes e pagamentos
6. politicas internas de seguranca e auditoria

### 14.14.3 Campos recomendados para `tenant_branding`

1. `display_name`
2. `public_app_name`
3. `logo_url`
4. `logo_dark_url`
5. `logo_light_url`
6. `icon_url`
7. `favicon_url`
8. `primary_color`
9. `secondary_color`
10. `accent_color`
11. `background_color`
12. `surface_color`
13. `on_primary_color`
14. `on_surface_color`
15. `heading_font_family`
16. `body_font_family`
17. `font_strategy`
18. `radius_strategy`
19. `illustration_style`
20. `updated_at`
21. `splash_image_url`

### 14.14.4 Politica recomendada de fontes

1. `body_font_family` deve, na fase inicial, permanecer controlada pela
   plataforma;
2. `heading_font_family` pode ser configuravel dentro de uma lista aprovada;
3. `font_strategy` deve indicar:
   - `platform_default`
   - `brand_headings_only`
   - `custom_locked_set`

### 14.14.5 Politica recomendada de formas e superficies

Para evitar que cada tenant vire um produto visualmente instavel:

1. `radius_strategy` deve ser controlada por preset:
   - `soft`
   - `balanced`
   - `sharp`
2. `surface_style` deve ser controlado por preset:
   - `neutral`
   - `warm`
   - `high_contrast`
3. isso evita que cada tenant tenha bordas, sombras e fundos arbitrarios.

### 14.14.6 Como isso deve aparecer na pratica

Na execucao real do white-label:

1. para a Jana tudo continua igual;
2. para um tenant novo, o sistema passa a ler:
   - logo
   - nome
   - cores
   - dominios
   - contatos
   - integracoes
   - flags
3. sem alterar a estrutura do app nem exigir fork.
4. logos, favicon e demais assets devem sair de storage governado pela
   plataforma, nunca de upload solto em codigo.
