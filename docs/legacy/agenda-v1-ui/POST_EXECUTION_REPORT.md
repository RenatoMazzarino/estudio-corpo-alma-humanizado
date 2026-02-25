# POST_EXECUTION_REPORT

> **Status documental:** Histórico/legado. Use apenas para contexto e rastreabilidade.
> **Nao canonico:** Para comportamento atual do sistema, valide `codigo + migrations + env real` e docs ativos (`README.md`, `MANUAL_RAPIDO.md`, `docs/integrations/*`, `docs/apis/API_GUIDE.md`).

Data: 2026-01-30  
Branch: `feat/master-plan-enterprise`  
Escopo: execução completa do plano MASTER_PLAN_ENTERPRISE (V2)

---

## 1) Sumário Executivo (G0…G8)

- G0: baseline/CI/scripts concluídos e documentados.
- G1: correções P0 no código (observacoes_gerais + status canônico + revalidatePath).
- G2A–G2E: migrations críticas aplicadas (service_id, tenant_id UUID, status constraint, índices, RLS/RPC).
- G3: padronização de erro + validação Zod em actions.
- G4: modularização por domínio (repositories/actions) e /app como composição.
- G5: route groups `(dashboard)` e `(public)`, AppShell unificado no layout.
- G6: disponibilidade unificada + RPC com lock para evitar double booking.
- G7: caixa baseado em ledger (`transactions`) com reconciliação.
- G8: estrutura de notificações com `notification_jobs` + templates e jobs automáticos.

---

## 2) Mudanças por Grupo/Commit

### G0
- `.nvmrc`, `engines`, scripts `lint/check-types/build/format`, CI GitHub Actions.
- README com pré-requisitos, `supabase:types` script.
- Plano MASTER atualizado para V2.

### G1
- `clients.notes` → `observacoes_gerais`.
- Status `done` → `completed` (compat temporária removida posteriormente).
- Fixes de `revalidatePath` e tratamento de erro nas actions críticas.

### G2A
- Migration `service_id` em appointments + backfill.
- Types regenerados.

### G2B
- `tenant_id` TEXT → UUID + FK (settings/availability_blocks/transactions).
- Policies ajustadas, types regenerados.

### G2C
- Backfill status + constraint (canônico com `pending`).
- Remoção de compat para `done`.

### G2D
- Índices core para consultas por tenant e período.

### G2E
- RLS habilitado para `appointments`/`clients`.
- RPC `create_public_appointment` + policies públicas/admin.

### G3
- `AppError`, `mapSupabaseError`, `ActionResult`.
- Zod schemas (clients/services/appointments) aplicados em actions.

### G4
- `src/modules/*` (appointments/clients/services/finance/settings).
- /app sem acesso direto ao Supabase (repositories centralizados).

### G5
- Route groups `(dashboard)` / `(public)`.
- AppShell centralizado no layout do dashboard.
- Ajustes de imports e revalidações.

### G6
- RPC `create_internal_appointment` com lock (`pg_advisory_xact_lock`).
- `create_public_appointment` atualizado com lock.
- Fluxo interno usa slots unificados e RPC.

### G7
- `/caixa` lê `transactions` como fonte da verdade.
- Reconciliação com appointments concluídos e alertas de divergência.
- Transação criada ao finalizar atendimento (admin e rápido).

### G8
- Tabelas `notification_jobs` + `notification_templates`.
- Jobs criados em criação/cancelamento/lembrete de agendamento.

---

## 3) Estado final dos comandos

Executados no final do G8:

- `pnpm lint` ✅
- `pnpm check-types` ✅
- `pnpm build` ✅ (warning: erro de metadata em symlink do cache turbopack)

---

## 4) DB Changes (migrations + types)

Migrations criadas/aplicadas (ordem):

1. `20260130010000_add_service_id_to_appointments.sql`
2. `20260130020000_align_tenant_id_uuid.sql`
3. `20260130030000_normalize_appointment_status.sql`
4. `20260130040000_indexes_core.sql`
5. `20260130050000_rls_policies_core.sql`
6. `20260130080000_internal_appointment_locking.sql`
7. `20260130090000_notifications_structure.sql`

Backfills e constraints:

- `done → completed`, `canceled → canceled_by_studio`, `scheduled → pending`.
- CHECK constraint para status canônico.
- Índices por tenant em appointments/clients/services/blocks/transactions.

Types:

- `apps/web/lib/supabase/types.ts` regenerado após G6 e G8 (via `pnpm supabase:types`).

---

## 5) RLS/RPC

Policies:

- Admin por tenant (service role) em `services`, `settings`, `availability_blocks`, `transactions`, `clients`, `appointments`.
- Público: leitura mínima (services/business_hours) + escrita via RPC.

RPCs:

- `create_public_appointment(tenant_slug, service_id, start_time, client_name, client_phone, is_home_visit)`  
  - valida tenant/service  
  - aplica buffers  
  - **lock** `pg_advisory_xact_lock`  
  - bloqueia colisões/blocks  
  - grava appointment e retorna ID

- `create_internal_appointment(p_tenant_id, service_id, start_time, client_name, client_phone, is_home_visit)`  
  - mesma regra de buffers  
  - **lock** `pg_advisory_xact_lock`  
  - grava appointment com `total_duration_minutes`

---

## 6) Modularização

Estrutura final:

```
apps/web/src/modules/
  appointments/
    actions.ts
    availability.ts
    repository.ts
  clients/
    actions.ts
    repository.ts
  services/
    actions.ts
    repository.ts
  finance/
    repository.ts
  settings/
    repository.ts
  notifications/
    repository.ts
```

Regra aplicada:

- /app = composição (sem `supabase.from` direto)
- Supabase apenas via repositories
- Actions centralizadas e validadas com Zod

---

## 7) Agendamento

- Cálculo de slots unificado em `src/modules/appointments/availability.ts`.
- Fluxo interno utiliza slots unificados e RPC com lock.
- Double booking mitigado via `pg_advisory_xact_lock`.
- Datas serializadas em UTC (`toISOString()`).

---

## 8) Financeiro

- Ledger (`transactions`) como fonte da verdade no `/caixa`.
- Reconciliação automática com appointments concluídos.
- Finalização gera transação (admin e rápida).

---

## 9) Pendências

1. **Warning no build**:  
   - Mensagem: *Invalid file path: IO Error failed to query metadata of symlink ... .next/dev/cache/turbopack*  
   - Impacto: baixo (cache dev).  
   - Próximo passo: limpar `.next` se persistir, ou ajustar ignore de symlinks no ambiente.

2. **Templates de notificação vazios**:  
   - Estrutura criada, mas templates não seedados.  
   - Próximo passo: criar seed com templates base (confirm/cancel/reminder).

---

## 10) Checklist “Enterprise Ready”

- [x] G0: ambiente reprodutível + CI verde
- [x] G1: P0 (observacoes/status) corrigidos
- [x] G2A: `service_id` + types regenerados
- [x] G2B: tenant_id UUID+FK + types regenerados
- [x] G2C: status constraint + sem compat `done`
- [x] G2D: índices core
- [x] G2E: RLS completo + fluxo público via RPC
- [x] G3: Zod + AppError + sem falhas silenciosas
- [x] G4: modularização repository/usecases/actions
- [x] G5: layouts/UI sem duplicação
- [x] G6: agendamento robusto (slots + lock)
- [x] G7: caixa ledger (transactions)
- [x] G8: notificações (estrutura)
