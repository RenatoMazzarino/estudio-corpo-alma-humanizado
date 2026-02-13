# DB_SCHEMA_REPORT

Fonte de verdade: `supabase/migrations/*.sql` (até `20260129040000_clear_availability_blocks.sql`).

## Tabelas (public)

### tenants
- **Colunas**: `id` uuid PK, `name` text, `slug` text UNIQUE, `created_at` timestamptz default now().
- **FKs**: —
- **RLS**: não habilitado nas migrations.

### services
- **Colunas**: `id` uuid PK, `tenant_id` uuid FK, `name` text, `price` numeric(10,2), `duration_minutes` int, `accepts_home_visit` boolean default false, `home_visit_fee` numeric(10,2) default 0, `custom_buffer_minutes` int null, `description` text null, `created_at` timestamptz default now().
- **FKs**: `tenant_id -> tenants(id)`
- **RLS**: habilitado. Política “Acesso total services admin” (tenant fixo).

### clients
- **Colunas**: `id` uuid PK, `tenant_id` uuid FK, `name` text, `initials` text, `phone` text, `email` text, `data_nascimento` date, `cpf` text, `endereco_completo` text, `profissao` text, `como_conheceu` text, `observacoes_gerais` text, `health_tags` text[] default '{}', `created_at` timestamptz default now().
- **FKs**: `tenant_id -> tenants(id)`
- **RLS**: não habilitado nas migrations.

### appointments
- **Colunas**: `id` uuid PK, `tenant_id` uuid FK, `client_id` uuid FK, `service_name` text, `start_time` timestamptz, `status` text default 'pending', `price` numeric(10,2), `started_at` timestamptz, `finished_at` timestamptz, `is_home_visit` boolean default false, `total_duration_minutes` int, `payment_status` text default 'pending' CHECK in ('pending','paid','partial','refunded'), `created_at` timestamptz default now().
- **FKs**: `client_id -> clients(id)` (ON DELETE CASCADE), `tenant_id -> tenants(id)`
- **RLS**: não habilitado nas migrations.

### settings
- **Colunas**: `id` uuid PK, `tenant_id` text default fixed, `default_studio_buffer` int default 30, `default_home_buffer` int default 60, `whatsapp_notification_number` text, `created_at` timestamptz default now(), `updated_at` timestamptz default now().
- **FKs**: —
- **RLS**: habilitado. Política “Acesso total settings admin” (tenant fixo).

### availability_blocks
- **Colunas**: `id` uuid PK, `tenant_id` text default fixed, `title` text default 'Bloqueio', `start_time` timestamptz, `end_time` timestamptz, `reason` text, `created_at` timestamptz default now().
- **FKs**: —
- **RLS**: habilitado. Política “Acesso total blocks admin” (tenant fixo).

### business_hours
- **Colunas**: `id` uuid PK, `tenant_id` uuid FK, `day_of_week` int (0–6), `open_time` time, `close_time` time, `is_closed` boolean default false, `created_at` timestamptz default now().
- **Constraints**: UNIQUE (`tenant_id`, `day_of_week`).
- **FKs**: `tenant_id -> tenants(id)` (ON DELETE CASCADE)
- **RLS**: habilitado. Política “Acesso total business_hours admin” (tenant fixo).

### transactions
- **Colunas**: `id` uuid PK, `tenant_id` text default fixed, `appointment_id` uuid FK null, `description` text, `amount` numeric(10,2), `type` text CHECK in ('income','expense'), `category` text, `payment_method` text, `created_at` timestamptz default now().
- **FKs**: `appointment_id -> appointments(id)` (ON DELETE SET NULL)
- **RLS**: habilitado. Política “Acesso total transactions admin” (tenant fixo).

## Observações
- Existe drift entre migrations e `apps/web/lib/supabase/types.ts` (ex.: `business_hours` não aparece no types gerado).
- `settings`, `availability_blocks` e `transactions` usam `tenant_id` como TEXT sem FK — diferente do resto do schema (UUID). Isso impacta consistência e integridade referencial.
