# MIGRATION_PLAN

> **Status documental:** Histórico/legado. Use apenas para contexto e rastreabilidade.
> **Nao canonico:** Para comportamento atual do sistema, valide `codigo + migrations + env real` e docs ativos (`README.md`, `MANUAL_RAPIDO.md`, `docs/integrations/*`, `docs/apis/API_GUIDE.md`).

Ordem sugerida para migrations (pequenas, reversíveis, com validação). Datas/ids são placeholders.

## 1) `2026xxxxxx_add_service_id_to_appointments.sql`
**Objetivo:** preservar vínculo com catálogo de serviços.
- Adicionar coluna `service_id uuid` em `appointments`.
- Backfill: tentar mapear por (`tenant_id`, `service_name`) → `services.id` (somente se nomes forem únicos por tenant).
- Criar FK `appointments.service_id -> services.id` (ON DELETE SET NULL).
- Manter `service_name` como snapshot histórico.

**Risco:** se houver serviços com nomes duplicados por tenant, o backfill pode ser ambíguo.
**Validação:** comparar contagem de `appointments` com `service_id` NULL antes/depois; amostrar casos manuais.

## 2) `2026xxxxxx_align_tenant_id_uuid.sql`
**Objetivo:** unificar `tenant_id` como UUID com FK em todas as tabelas.
- Tabelas: `settings`, `availability_blocks`, `transactions`.
- Estratégia segura:
  1. Adicionar coluna `tenant_id_uuid uuid`.
  2. Popular `tenant_id_uuid = tenant_id::uuid`.
  3. Adicionar FK `tenant_id_uuid -> tenants(id)`.
  4. Ajustar políticas RLS para usar `tenant_id_uuid`.
  5. Remover coluna antiga ou renomear (`tenant_id_uuid` → `tenant_id`).

**Risco:** valores de `tenant_id` que não são UUID válidos (hoje parece fixo e válido).
**Validação:** SELECT de linhas com cast inválido antes do drop.

## 3) `2026xxxxxx_normalize_appointment_status.sql`
**Objetivo:** padronizar status e reduzir divergência no app.
- Normalizar dados: `done` → `completed`.
- Criar CHECK constraint para valores permitidos (ex.: `pending`, `in_progress`, `completed`, `canceled`).
- (Opcional) criar enum `appointment_status`.

**Risco:** falha de migração se existirem status inesperados.
**Validação:** query de distinct antes da constraint.

## 4) `2026xxxxxx_indexes_core.sql`
**Objetivo:** performance para consultas por período e tenant.
- `appointments (tenant_id, start_time)`
- `appointments (tenant_id, status)`
- `clients (tenant_id, name)`
- `services (tenant_id, name)`
- `availability_blocks (tenant_id, start_time)`
- `transactions (tenant_id, created_at)`

**Risco:** baixo (índices). 
**Validação:** `EXPLAIN` nas queries principais.

## 5) `2026xxxxxx_rls_policies_core.sql`
**Objetivo:** segurança e coerência entre ambientes.
- Habilitar RLS para `appointments` e `clients`.
- Políticas administrativas para tenant fixo (MVP).
- Políticas públicas específicas para `/agendar`: leitura de `tenants`, `services`, `business_hours` e inserção de `appointments`.

**Risco:** bloqueio de fluxo público se políticas não forem corretas.
**Validação:** testar fluxos `/agendar/[slug]` e backoffice.

## 6) (Opcional) `2026xxxxxx_clients_notes_alias.sql`
**Objetivo:** compatibilidade com código legado.
- Criar VIEW ou trigger para mapear `notes` → `observacoes_gerais`, **ou** renomear a coluna.
- Preferência recomendada: ajustar código para usar `observacoes_gerais` e evitar migration.

**Risco:** renomear coluna impacta queries/clients externos.
**Validação:** inserir/atualizar notas por ambos caminhos (se compatibilidade for mantida).

## Pós-migração (não-SQL)
- Regenerar `apps/web/lib/supabase/types.ts` via `supabase gen types`.
- Revalidar queries e server actions afetados.
