# ROUTE_MAP

> **Status documental:** Historico/legado. Use apenas para contexto.
> **Nao canonico:** para estado atual, valide `codigo + migrations + env real`
> e docs ativas (`README.md`, `MANUAL_RAPIDO.md`, `docs/integrations/*`,
> `docs/apis/API_GUIDE.md`).

Fonte: `apps/web/app` (Next.js App Router).

## Rotas

### `/`

- Page: `apps/web/app/page.tsx`
- Layout: `apps/web/app/layout.tsx`
- Componentes: `mobile-agenda.tsx`, `ShiftManager`, `AppointmentDetailsModal`
- Dados: Supabase `appointments` e `availability_blocks`
- Actions indiretas: `finishAppointment`, `createShiftBlocks`,
  `clearMonthBlocks`

### `/menu`

- Page: `apps/web/app/menu/page.tsx`
- Layout: `apps/web/app/layout.tsx`
- Sem actions.

### `/catalogo`

- Page: `apps/web/app/catalogo/page.tsx`
- Layout: `apps/web/app/layout.tsx`
- Componentes: `catalogo-view.tsx`, `service-form.tsx`
- Dados: Supabase `services`
- Action: `upsertService`

### `/caixa`

- Page: `apps/web/app/caixa/page.tsx`
- Layout: `apps/web/app/layout.tsx`
- Dados: Supabase `appointments` (status e intervalos)

### `/clientes`

- Page: `apps/web/app/clientes/page.tsx`
- Layout: `apps/web/app/layout.tsx`
- Dados: Supabase `clients` (busca)

### `/clientes/novo`

- Page: `apps/web/app/clientes/novo/page.tsx`
- Layout: `apps/web/app/layout.tsx`
- Componentes: `app-shell.tsx`
- Action: `createClientAction`

### `/clientes/[id]`

- Page: `apps/web/app/clientes/[id]/page.tsx`
- Layout: `apps/web/app/layout.tsx`
- Componentes: `app-shell.tsx`, `notes-section.tsx`
- Dados: Supabase `clients` e `appointments`
- Action: `updateClientNotes`

### `/novo`

- Page: `apps/web/app/novo/page.tsx`
- Layout: `apps/web/app/layout.tsx`
- Componentes: `app-shell.tsx`, `appointment-form.tsx`
- Dados: Supabase `services`
- Action: `createAppointment`

### `/agendar/[slug]`

- Page: `apps/web/app/agendar/[slug]/page.tsx`
- Layout: `apps/web/app/layout.tsx`
- Componentes: `booking-flow.tsx`
- Dados: `tenants`, `services`, `settings`, `business_hours`,
  `appointments`, `availability_blocks`, `clients`
- Actions: `getAvailableSlots` e `submitPublicAppointment`

## Notas

- Nao existem paginas em `/admin/*` (somente actions em `apps/web/app/admin/*`).
- `AppointmentCard`, `AdminCalendar` e `DesktopCalendar` existem no repo, mas
  nao estao referenciados por rotas atuais.
