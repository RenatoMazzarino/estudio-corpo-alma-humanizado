# AUDIT_REPORT

> **Status documental:** Histórico/legado. Use apenas para contexto e rastreabilidade.
> **Nao canonico:** Para comportamento atual do sistema, valide `codigo + migrations + env real` e docs ativos (`README.md`, `MANUAL_RAPIDO.md`, `docs/integrations/*`, `docs/apis/API_GUIDE.md`).

## Sumário executivo (curto)
- O repo é um monorepo Turbo (Next.js App Router + Supabase), mas a arquitetura está fragmentada entre layouts duplicados, ações espalhadas e componentes não usados.
- Há divergências críticas DB ⇄ código: campo `clients.notes` não existe, status de agendamentos divergentes e drift entre migrations e types.
- Regras de negócio de agendamento são parciais (sem lock de slot, sem validação completa) e o fluxo interno não respeita disponibilidade.
- Falta padronização de erros/validação e existem riscos de segurança (RLS incompleta e políticas inconsistentes com o fluxo público).

## Problemas Prioritários

### P0 (bloqueio funcional)
1) **Campo inexistente no DB**
   - **Onde:** `apps/web/app/clientes/novo/actions.ts`, `apps/web/app/clientes/[id]/actions.ts`, `apps/web/app/clientes/[id]/page.tsx`
   - **Problema:** uso de `clients.notes`, mas o schema tem `observacoes_gerais`.
   - **Impacto:** inserts/updates falham; prontuário não salva.

2) **Status inconsistente em `appointments`**
   - **Onde:** `apps/web/app/actions.ts` usa `done`; `apps/web/app/caixa/page.tsx` filtra `completed`; `apps/web/app/clientes/[id]/page.tsx` compara `done`.
   - **Impacto:** caixa não contabiliza atendimentos finalizados quando outro fluxo grava `done`; histórico exibe status errado.

3) **Políticas/RLS e tenant contraditórios para `/agendar/[slug]`**
   - **Onde:** `supabase/migrations/20260129000000_ajuste_v1_reality.sql` (policy fixa para services/settings/blocks/transactions), `apps/web/app/agendar/[slug]/page.tsx` (tenant via slug).
   - **Impacto:** com RLS ativa, rotas públicas para outros tenants falham. (Mesmo que hoje exista um tenant fixo, a arquitetura não suporta múltiplos tenants).

### P1 (alto impacto)
1) **Drift entre schema e types**
   - **Onde:** `apps/web/lib/supabase/types.ts` não inclui `business_hours`; migrations incluem.
   - **Impacto:** tipos desatualizados → risco de typecheck ou mudanças incorretas.

2) **Criação de agendamento interno ignora disponibilidade**
   - **Onde:** `apps/web/app/novo/appointment-actions.ts`
   - **Problema:** não checa colisões nem regras de horário; cria clientes duplicados.
   - **Impacto:** double booking + base de clientes duplicada.

3) **Ações sem tratamento de erro**
   - **Onde:** várias server actions (`apps/web/app/actions.ts`, `apps/web/app/novo/appointment-actions.ts`, `apps/web/app/clientes/novo/actions.ts`).
   - **Impacto:** falhas silenciosas e inconsistência de dados.

4) **Tenant inconsistente no schema**
   - **Onde:** `settings`, `availability_blocks`, `transactions` usam `tenant_id` TEXT sem FK.
   - **Impacto:** perda de integridade referencial e potencial dificuldade de migração multi-tenant.

### P2 (médio/baixo)
1) **Layouts duplicados e UI inconsistente**
   - **Onde:** `apps/web/app/layout.tsx` vs `apps/web/components/app-shell.tsx`.
   - **Impacto:** renderização dupla, UX inconsistente, estilos divergentes.

2) **Componentes e CSS não usados**
   - **Onde:** `apps/web/components/appointment-card.tsx`, `admin-calendar.tsx`, `desktop-calendar.tsx`, `apps/web/app/page.module.css`, `packages/ui/*`.
   - **Impacto:** dívida técnica e manutenção confusa.

3) **SearchParams / Next.js inconsistentes**
   - **Onde:** `apps/web/app/caixa/page.tsx`, `apps/web/app/novo/page.tsx`.
   - **Impacto:** risco de type errors e comportamento inesperado em upgrades.

## Revisão granular (arquivo a arquivo / grupos lógicos)

### `apps/web/app/page.tsx`
- Lógica de leitura de agendamentos/bloqueios dentro do page; sem tratamento de erro. 
- Usa campos de `clients` (ex.: `health_tags`, `endereco_completo`) que não têm tela de edição correspondente.

### `apps/web/app/actions.ts`
- Status divergente (`done`), conflitando com `completed` no caixa.
- `revalidatePath` aponta para rotas inexistentes (`/admin/servicos`).
- Updates sem checagem de `error` do Supabase.

### `apps/web/app/caixa/page.tsx`
- Filtra `status = 'completed'` enquanto outras ações gravam `done`.
- Workaround de `searchParams` com `@ts-ignore` sugere inconsistência de Next.js versioning.

### `apps/web/app/clientes/novo/actions.ts` e `apps/web/app/clientes/[id]/actions.ts`
- Usa `notes` (coluna inexistente). Deve usar `observacoes_gerais`.
- Falta validação estruturada (Zod) e tratamento de erro.

### `apps/web/app/clientes/[id]/page.tsx`
- UI usa `apt.status === 'done'` e exibe “Agendado” para qualquer outro valor.

### `apps/web/app/novo/appointment-actions.ts`
- Sempre cria um novo cliente (duplicação).
- Não verifica colisão de horário.
- Busca serviço sem filtrar por `tenant_id`.

### `apps/web/app/agendar/[slug]/public-actions.ts`
- Busca serviços por `id` sem `tenant_id` (possível cross-tenant).
- `settings`/buffers dependem de tabela com `tenant_id` TEXT.
- Não grava `transactions` para o fluxo público (caixa incompleto).

### `apps/web/app/agendar/[slug]/availability.ts`
- Lógica de overlap de blocks é inconsistente (uso redundante de `.gte/.lte`).
- Baseia-se em `total_duration_minutes` opcional; para alguns fluxos pode ficar incorreto.
- Risco de timezone (parse ISO vs local).

### `apps/web/components/service-form.tsx`
- Comentário indica que `description` não existe, mas existe no DB.
- Não permite editar `custom_buffer_minutes` (campo existente no schema).

### `apps/web/components/mobile-agenda.tsx`
- FAB não navega para `/novo` (ação ausente).
- Iniciais hardcoded “EC” no avatar.

### `apps/web/components/appointment-details-modal.tsx`
- Usa action `finishAppointment` (admin) que cria `transactions`, mas não atualiza UI financeira (sem leitura).

### `apps/web/app/layout.tsx` + `apps/web/components/app-shell.tsx`
- Dois shells concorrentes; páginas com `AppShell` ficam duplicadas dentro do layout global.

### `apps/web/components/*` (não usados)
- `AppointmentCard`, `AdminCalendar`, `DesktopCalendar` não são referenciados; sinal de dívida técnica.

## Recomendações objetivas (macro)
1) Padronizar schema ⇄ código (corrigir `notes`, status, tenant_id e types gerados).
2) Separar layout público vs dashboard para evitar duplicação de UI.
3) Centralizar queries/actions por domínio e adicionar validação Zod.
4) Completar regras de agendamento (buffers, locks, conflitos) e alinhar com o DB.
5) Revisar RLS/policies para fluxos admin vs público.
