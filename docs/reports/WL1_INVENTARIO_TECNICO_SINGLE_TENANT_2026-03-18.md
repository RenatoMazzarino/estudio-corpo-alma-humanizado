# WL-1 Inventário Técnico Single-Tenant

Status: inventário local sem commit  
Data base: 2026-03-18  
Objetivo: listar precisamente os artefatos que ainda carregavam herança de
tenant fixo e que precisam ser saneados na `WL-1`

## 0) Veredito

O maior problema estrutural de white-label no repo não estava no runtime do
dashboard, e sim no legado histórico de banco:

1. `DEFAULT tenant_id` hardcoded em tabelas operacionais;
2. policies `service_role` com filtro preso ao tenant original;
3. seeds históricas amarradas ao tenant inicial.

Na validação local executada em `2026-03-18`, o banco já se encontrava sem esses
defaults/policies hardcoded nas tabelas core alvo. A `WL-1` passa então a ter
dois papéis:

1. formalizar essa limpeza no histórico versionado;
2. garantir reproducibilidade do saneamento nos demais ambientes.

## 1) Tabelas core com `tenant_id` hardcoded em default

Inventário identificado:

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
12. `appointment_messages`
13. `client_addresses`
14. `client_phones`
15. `client_emails`
16. `client_health_items`
17. `whatsapp_webhook_events`

## 2) Policies core presas ao tenant original

Policies identificadas:

1. `Admin services access`
2. `Admin business_hours access`
3. `Admin settings access`
4. `Admin availability_blocks access`
5. `Admin transactions access`
6. `Admin clients access`
7. `Admin appointments access`
8. `Admin notification_templates access`
9. `Admin notification_jobs access`
10. `Admin appointment_attendances access`
11. `Admin appointment_checklist_items access`
12. `Admin appointment_evolution_entries access`
13. `Admin appointment_checkout access`
14. `Admin appointment_checkout_items access`
15. `Admin appointment_payments access`
16. `Admin appointment_post access`
17. `Admin appointment_events access`
18. `Admin appointment_messages access`
19. `Admin client_addresses access`
20. `Admin client_phones access`
21. `Admin client_emails access`
22. `Admin client_health_items access`
23. `Admin whatsapp_webhook_events access`

## 3) Artefatos históricos que continuam documentando/sinalizando single-tenant

Não são o alvo principal da migration corretiva, mas precisam ficar mapeados:

1. `supabase/migrations/20260129010000_seed_tenant.sql`
2. `supabase/migrations/20260129020000_seed_business_hours.sql`
3. `supabase/migrations/20260129030000_enable_home_visit_flag.sql`
4. `supabase/migrations/20260129040000_clear_availability_blocks.sql`
5. `supabase/migrations/20260223122000_add_dashboard_access_users_auth.sql`
6. `supabase/migrations/20260226143000_add_client_name_profile_columns.sql`
7. `supabase/migrations/20260226174000_client_name_profile_local_test_client_overrides.sql`
8. `supabase/migrations/20260212234000_canonicalize_public_booking_slug.sql`

Leitura correta:

1. parte disso é seed/controlado por contexto histórico;
2. parte disso não pode ser tratada como padrão para novos tenants;
3. a correção da `WL-1` precisa neutralizar o impacto estrutural sem reescrever
   migrations históricas já aplicadas.

## 4) Ação implementada na `WL-1`

Migration corretiva criada:

- `supabase/migrations/20260318213000_wl1_remove_hardcoded_tenant_defaults_and_policies.sql`

Essa migration faz duas coisas:

1. remove `DEFAULT tenant_id` hardcoded das tabelas operacionais;
2. recria as policies `Admin ... access` com escopo:
   - `auth.role() = 'service_role'`

Observação importante:

1. no ambiente local auditado, essa migration funcionou como formalização do
   estado correto;
2. o alvo principal dela passa a ser consistência histórica e rollout seguro em
   ambientes compartilhados.

## 5) O que a `WL-1` resolve

1. evita criação de novas linhas caindo no tenant original por default;
2. tira o UUID do tenant original das policies operacionais core;
3. preserva o modelo atual do app, que usa `service_role` no backend;
4. prepara o banco para tenant novo sem herança silenciosa do tenant inicial.

## 6) O que a `WL-1` ainda não resolve sozinha

1. onboarding de owner/admin por tenant;
2. branding e domínio por tenant;
3. resolução canônica de tenant em runtime público;
4. provider config por tenant;
5. seeds históricas que ainda embutem o tenant original como contexto.

Esses pontos ficam para as próximas fases do plano white-label.
