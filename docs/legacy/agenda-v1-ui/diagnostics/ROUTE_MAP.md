# ROUTE_MAP

> **Status documental:** Histórico/legado. Use apenas para contexto e rastreabilidade.
> **Nao canonico:** Para comportamento atual do sistema, valide `codigo + migrations + env real` e docs ativos (`README.md`, `MANUAL_RAPIDO.md`, `docs/integrations/*`, `docs/apis/API_GUIDE.md`).

Fonte: `apps/web/app` (Next.js App Router)

## Rotas

| Rota | Page | Layout(s) | Componentes principais | Server Actions / Data Ops |
| --- | --- | --- | --- | --- |
| `/` | `apps/web/app/page.tsx` | `apps/web/app/layout.tsx` | `apps/web/components/mobile-agenda.tsx` (usa `ShiftManager`, `AppointmentDetailsModal`) | Supabase: `appointments`, `availability_blocks`. Actions indiretas: `finishAppointment` (`apps/web/app/admin/atendimento/actions.ts`), `createShiftBlocks`/`clearMonthBlocks` (`apps/web/app/admin/escala/actions.ts`). |
| `/menu` | `apps/web/app/menu/page.tsx` | `apps/web/app/layout.tsx` | — | Sem actions. |
| `/catalogo` | `apps/web/app/catalogo/page.tsx` | `apps/web/app/layout.tsx` | `apps/web/app/catalogo/catalogo-view.tsx`, `apps/web/components/service-form.tsx` | Supabase: `services`. Action: `upsertService` (`apps/web/app/actions.ts`). |
| `/caixa` | `apps/web/app/caixa/page.tsx` | `apps/web/app/layout.tsx` | — | Supabase: `appointments` (status + intervalos). |
| `/clientes` | `apps/web/app/clientes/page.tsx` | `apps/web/app/layout.tsx` | — | Supabase: `clients` (search). |
| `/clientes/novo` | `apps/web/app/clientes/novo/page.tsx` | `apps/web/app/layout.tsx` | `apps/web/components/app-shell.tsx` | Action: `createClientAction` (`apps/web/app/clientes/novo/actions.ts`). |
| `/clientes/[id]` | `apps/web/app/clientes/[id]/page.tsx` | `apps/web/app/layout.tsx` | `apps/web/components/app-shell.tsx`, `apps/web/app/clientes/[id]/notes-section.tsx` | Supabase: `clients`, `appointments`. Action: `updateClientNotes` (`apps/web/app/clientes/[id]/actions.ts`). |
| `/novo` | `apps/web/app/novo/page.tsx` | `apps/web/app/layout.tsx` | `apps/web/components/app-shell.tsx`, `apps/web/app/novo/appointment-form.tsx` | Supabase: `services`. Action: `createAppointment` (`apps/web/app/novo/appointment-actions.ts`). |
| `/agendar/[slug]` | `apps/web/app/agendar/[slug]/page.tsx` | `apps/web/app/layout.tsx` | `apps/web/app/agendar/[slug]/booking-flow.tsx` | Supabase: `tenants`, `services`, `settings`, `business_hours`, `appointments`, `availability_blocks`, `clients`. Actions: `getAvailableSlots` (`availability.ts`), `submitPublicAppointment` (`public-actions.ts`). |

## Notas
- Não existem páginas em `/admin/*` (apenas actions em `apps/web/app/admin/...`).
- Componentes `AppointmentCard`, `AdminCalendar` e `DesktopCalendar` estão no repo, mas não são referenciados por nenhuma rota atualmente.
