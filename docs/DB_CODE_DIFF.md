# DB_CODE_DIFF

Fonte de verdade: `supabase/migrations/*.sql`.
Types TS analisados: `apps/web/lib/supabase/types.ts` (drift detectado).

## Usage Map (por tabela)

### appointments
- **Select**: `id`, `service_name`, `start_time`, `finished_at`, `status`, `price`, `is_home_visit`, `total_duration_minutes`, `clients(*)` (`apps/web/app/page.tsx`, `apps/web/app/clientes/[id]/page.tsx`, `apps/web/app/caixa/page.tsx`, `apps/web/app/agendar/[slug]/availability.ts`).
- **Insert**: `client_id`, `service_name`, `start_time`, `finished_at`, `price`, `status`, `tenant_id`, `is_home_visit`, `total_duration_minutes`, `payment_status` (`apps/web/app/novo/appointment-actions.ts`, `apps/web/app/agendar/[slug]/public-actions.ts`).
- **Update**: `status`, `started_at`, `finished_at`, `payment_status`, `price` (`apps/web/app/actions.ts`, `apps/web/app/admin/atendimento/actions.ts`).
- **Filters**: `tenant_id`, `client_id`, `status`, `start_time`.

### clients
- **Select**: `*` (`apps/web/app/clientes/page.tsx`, `apps/web/app/clientes/[id]/page.tsx`), `observacoes_gerais` (`apps/web/app/admin/atendimento/actions.ts`), `id` (`public-actions.ts`).
- **Insert**: `name`, `phone`, `initials`, `tenant_id`, `notes` (inexistente no DB), `observacoes_gerais` (não usado no create) (`apps/web/app/clientes/novo/actions.ts`, `apps/web/app/novo/appointment-actions.ts`, `apps/web/app/agendar/[slug]/public-actions.ts`).
- **Update**: `notes` (inexistente no DB), `observacoes_gerais` (`apps/web/app/clientes/[id]/actions.ts`, `apps/web/app/admin/atendimento/actions.ts`).
- **Campos exibidos**: `initials`, `phone`, `health_tags`, `endereco_completo`.

### services
- **Select**: `*` e subsets (`id`, `name`, `price`, `duration_minutes`, `accepts_home_visit`, `home_visit_fee`, `description`, `custom_buffer_minutes`).
- **Insert/Update**: `name`, `description`, `price`, `duration_minutes`, `accepts_home_visit`, `home_visit_fee`, `custom_buffer_minutes`, `tenant_id`.

### tenants
- **Select**: `id`, `name`, `slug` (`apps/web/app/agendar/[slug]/page.tsx`).

### settings
- **Select**: `default_home_buffer`, `default_studio_buffer` (`apps/web/app/agendar/[slug]/public-actions.ts`, `availability.ts`).

### availability_blocks
- **Select**: `id`, `title`, `start_time`, `end_time` (`apps/web/app/page.tsx`, `availability.ts`).
- **Insert**: `tenant_id`, `title`, `start_time`, `end_time`, `reason` (`apps/web/app/admin/escala/actions.ts`).

### business_hours
- **Select**: `open_time`, `close_time`, `is_closed` (`apps/web/app/agendar/[slug]/availability.ts`).

### transactions
- **Insert**: `tenant_id`, `appointment_id`, `type`, `category`, `description`, `amount`, `payment_method` (`apps/web/app/admin/atendimento/actions.ts`).

## Matriz de Consistência

### (A) COLUNAS USADAS NO CÓDIGO MAS AUSENTES NO DB (BUG)
- `clients.notes` — usado em `apps/web/app/clientes/novo/actions.ts` e `apps/web/app/clientes/[id]/actions.ts`. No schema a coluna correta é `observacoes_gerais`.

### (B) COLUNAS NO DB QUE NÃO SÃO USADAS EM NENHUM LUGAR
- `clients.email`, `clients.data_nascimento`, `clients.cpf`, `clients.profissao`, `clients.como_conheceu` — nenhuma tela ou fluxo referencia.
- `settings.whatsapp_notification_number` — sem uso no app.
- `appointments.created_at`, `clients.created_at`, `services.created_at`, `tenants.created_at`, `availability_blocks.created_at`, `transactions.created_at` — não usados (ok se forem auditáveis).

### (C) COLUNAS COM TIPO/SCHEMA INCONSISTENTE (TS vs DB)
- `business_hours` não existe em `apps/web/lib/supabase/types.ts` (types desatualizado vs migrations).
- `settings.tenant_id`, `availability_blocks.tenant_id`, `transactions.tenant_id` são TEXT no DB, enquanto o restante do schema usa UUID e possui FKs. Isso cria inconsistência de integridade e tipagem.

### (D) COLUNAS/USO APENAS EM BACKEND OU APENAS EM UI
- `transactions` só é escrito (server action) e nunca lido em UI/caixa.
- `appointments.payment_status` é escrito, mas não é exibido em lugar nenhum.
- `clients.health_tags` e `endereco_completo` são exibidos em UI (modal), mas não são gerenciados em nenhuma tela de cadastro/edição.

## Divergências semânticas relevantes
- **Status de agendamento**: valores divergentes (`done` vs `completed`) em `apps/web/app/actions.ts`, `apps/web/app/caixa/page.tsx`, `apps/web/app/clientes/[id]/page.tsx`, `apps/web/components/appointment-card.tsx`. Isso afeta caixa, histórico e estilos.
- **Agendamento vs Serviço**: `appointments` não possui `service_id`, apenas `service_name`. O código precisa buscar `services` para preço/duração, mas depois perde a relação (impacta relatórios, alterações no catálogo e integridade).
