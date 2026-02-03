# Plano Oficial — Nova Aparência/UX v1.0 (Produção)

> **Escopo:** Agenda/Agendamentos, Atendimento (novo padrão produção) e Clientes (lista, detalhe e novo).  
> **Fontes oficiais:** HTMLs em `docs/ui-decisions/*`, `Auditoria Visual – Estúdio Corpo & Alma Humanizado.pdf` e o estado atual do repo (rotas/actions/repos/migrations).  
> **Regra-mãe:** UI ↔ DB 1:1 (exceto auditoria/logs/tenant).  
> **Status:** Plano de produção alinhado ao **código atual** e **schema Supabase** do repo.

---

## 0. Resultado esperado (Definition of Done — Produção v1.0)
- **Visual:** telas/componentes seguem exatamente os HTMLs + PDF (sem variações inventadas).
- **Dados:** tudo exibido na UI vem do DB ou de derivações determinísticas; novas colunas existem apenas para UI/auditoria/tenant.
- **Arquitetura:** mutações apenas via Server Actions (service role no server); componentes reutilizáveis padronizados em um lugar central.
- **Qualidade:** `pnpm lint`, `pnpm check-types`, `pnpm build`.
- **Rollback:** não haverá fallback de UI antiga (nova UI passa a ser padrão).

## 1. Objetivo e escopo (Produção v1.0)
- **Objetivo:** Consolidar a nova aparência/UX dos módulos críticos (Agenda, Atendimento, Clientes) com qualidade de produção, preservando regras de negócio e consistência DB↔UI.
- **Escopo obrigatório:**
  - **Agenda / Agendamentos:** Home (Agenda), criação interna e bloqueios (plantão).
  - **Atendimento:** Nova UI alinhada ao HTML final (substitui o “V4” atual) com hardening de produção.
  - **Clientes:** Lista, detalhe e criação de cliente.
- **Critérios de produção:**
  - UI só exibe dados **persistidos** ou **derivações determinísticas** do DB.
  - DB só mantém dados **consumidos** pela UI ou para auditoria/segurança.

---

## 2. Fonte de verdade (HTMLs + decisões)
**HTMLs de referência (visual/hierarquia):**
- `docs/ui-decisions/Visão da Nova Tela Agenda.htm`
- `docs/ui-decisions/Visão da Nova Tela de Fomulário Agendamento Interno.htm`
- `docs/ui-decisions/Visão da Nova Tela de Atendimento.htm`
- `docs/ui-decisions/Visão da Nova Telas de Lista de Clientes e Detalhes de Clientes.htm`
- `docs/ui-decisions/Visão da Nova Tela de Novo Cliente.htm`

**Auditoria Visual (padrões obrigatórios de tipografia, paleta, layout e interação):**
- `docs/ui-decisions/Auditoria Visual – Estúdio Corpo & Alma Humanizado.pdf`
> O PDF é referência obrigatória para todas as telas e componentes (Agenda, Atendimento, Clientes).

**Decisões técnicas anteriores relevantes:**
- `docs/ui-decisions/AGENDA_V1_IMPLEMENTATION_NOTES.md` (mapeamento já aplicado em Agenda/Form interno)
- `docs/ui-decisions/PLAN_ATENDIMENTO_UIV4.md` (base do fluxo de atendimento implementado)

### 2.1 Estrutura oficial de documentação UI/UX
Criar e manter a pasta `docs/ui-system/` com arquivos tarifados que transformem o “olhar o HTML” em documentação técnica:

```
docs/ui-system/
  README.md
  tokens.md
  typography.md
  colors.md
  spacing-radius-shadow.md
  components/
    button.md
    header.md
    card.md
    chip.md
    input.md
    bottom-nav.md
    toast.md
  patterns/
    forms.md
    lists.md
    empty-states.md
    loading-states.md
    errors.md
    permissions-rls.md
```

Cada documento referencia o PDF/HTML correspondente, descreve classes utilitárias (Tailwind v4) e indica componentes canônicos, garantindo que desenvolvedores possam seguir o design sem inspecionar os HTMLs diretamente.

---

## 3. Design System V1 (tokens, tipografia, componentes canônicos, padrões)
> **Regra:** todo ajuste visual deve seguir o **PDF de Auditoria Visual** e os HTMLs, evitando estilos “inventados”.

### 3.1 Fonte real no repo (AS-IS)
- `apps/web/app/globals.css`:
  - `@theme` com `--color-studio-bg`, `--color-studio-green`, `--color-studio-green-dark`, `--color-studio-pink`, `--color-studio-text`.
  - utilitário `.no-scrollbar` já existe.
- `apps/web/app/layout.tsx`: fonte atual `Inter` via `next/font/google`.
- `apps/web/components/app-shell.tsx`: frame mobile `max-w-[414px]`, `pb-24` no conteúdo, nav inferior fixa.
- `packages/ui/*`: base para componentes compartilháveis (a padronização deve convergir aqui ou em `apps/web/components/ui/*`).

### 3.2 Tipografia (alinhada ao PDF)
- **Fonte:** Playfair Display (títulos) + Lato (UI).
  - **Ação planejada:** substituir `Inter` em `apps/web/app/layout.tsx` por `Playfair_Display` + `Lato` via `next/font/google` e mapear `font-serif`/`font-sans`.
- **Hierarquia e escala:**
  - H1 (título de tela): Playfair, `text-2xl` (~22–24px), `leading-tight`, cor `text-main`.
  - Labels/section titles: Lato 900, `text-[11px]` ou `text-xs`, `uppercase`, `tracking-wide`.
  - Corpo: Lato regular, `text-sm` (14px).
  - Subtexto/ajuda: Lato, `text-xs` (12px), `text-muted`.
- **Regras de consistência:** labels sempre em caixa-alta com tracking uniforme; evitar tamanhos fora da escala.

### 3.3 Paleta de cores (alinhada ao PDF)
- **Atualizar/expandir tokens em `apps/web/app/globals.css`** para refletir a Auditoria Visual:
  - `studio.green` `#6A806C` (ok).
  - `studio.dark` `#4E5F50` (**atual está `#556656`**, ajustar).
  - `studio.light` `#F3F6F4`.
  - `studio.accent` `#D4A373`.
  - `paper` `#FAF9F6` (já existe).
  - `text.main` `#2C3333` (**atual está `#2D2D2D`**, ajustar).
  - `text.muted` `#868E96`.
  - `line` `rgba(44,51,51,0.06)`.
  - `ok` `#16A34A`, `warn` `#F59E0B`, `danger` `#DC2626`, `dom` `#A855F7`.
- **Padrão de pills/ícones:** fundo claro + texto/ícone em tom forte da mesma cor (confirmado/domicílio/bloqueado).

### 3.4 Layout, espaçamento e sombras (alinhado ao PDF)
- **Container mobile:** manter `max-w-[414px]` do `AppShell` e centralização (PDF reforça frame 414px).
- **Paddings padrão:** header `px-6 pt-8 pb-4`; conteúdo `px-6`; cards `p-4`; seções `mb-6`; formulários `space-y-4`.
- **Safe areas:** adicionar utilitários em `globals.css` (`safe-top`, `safe-bottom`) e usar em headers/footers.
- **Arredondamentos:** unificar headers e cards principais em `rounded-3xl` (24px).
- **Sombras:** criar `shadow-soft` (cards/headers) e `shadow-float` (FAB, menus, overlays) no `@theme` ou utilitários Tailwind v4.
- **Scroll horizontal:** aplicar `no-scrollbar` sempre que houver chips/dias com overflow.

### 3.5 Botões, chips e toggles (alinhado ao PDF)
- **Primário:** `bg-studio-green text-white font-extrabold rounded-2xl w-full`, hover `bg-studio-dark`.
- **Secundário:** `bg-studio-light text-studio-green` (inverte no hover).
- **Texto/ghost:** apenas texto com `text-gray-400` → `text-studio-green` no hover.
- **Ícone circular:** `w-10 h-10` padrão; `w-9 h-9` só quando necessário.
- **FAB:** 56px, circular verde, ícone 28px; menu com pílulas brancas e ícones em círculos coloridos.
- **Chips/toggles:** estilo pílula; ativo em verde ou roxo conforme contexto (Studio/Domicílio).

### 3.6 Ícones e avatares (alinhado ao PDF)
- **Biblioteca:** `lucide-react` (já usada em `apps/web/components/app-shell.tsx`).
- **Tamanhos:** 12px (labels), 20–24px (botões), 28px (FAB).
- **Ícones em círculo:** usar cor contextual (studio/dom/danger/ok) e fundo claro correspondente.
- **Avatar:** círculo 40px com iniciais (Lato/Playfair), cor conforme tag (VIP, atenção, normal).

### 3.7 Headers, navbar e padrões de navegação
- **Header sticky:** fundo branco, `shadow-soft`, radius inferior, padding padronizado, `safe-top`.
- **Templates obrigatórios:** Agenda (saudação/online + título + ações), Lista (título + ação), Form (voltar + título/subtítulo).
- **Navbar inferior:** única, fixa, ícones 24px, labels 10px; ativo verde/extrabold e inativo cinza.

### 3.8 Interações e animações (alinhado ao PDF)
- **Scroll-snap:** tabs e listas horizontais com snap e `no-scrollbar`.
- **Transições:** padrão 250–260ms `ease` para páginas internas e modais.
- **Feedback tátil:** `active:scale-[0.98]` em todos os botões/itens clicáveis.
- **Acordeões:** altura com transição (endereços/mais detalhes) em 300–400ms.
- **Estados:** hover/active/disabled padronizados em todos os componentes.

### 3.9 Acessibilidade mínima
- **Contraste:** `text-muted` só para apoio; texto crítico em `text-main`.
- **Toque:** área mínima 44px para botões e itens.
- **Semântica:** usar `<button>` e `<label>` adequados (já presente em várias telas).

> **Objetivo do DS:** eliminar “salada visual” e garantir consistência entre Agenda, Atendimento e Clientes **seguindo o PDF**.

---

## 4. Arquitetura Frontend (páginas, componentes, padrões)
### 4.1 Rotas reais (AS-IS)
- **Agenda (home):** `apps/web/app/(dashboard)/page.tsx` → `apps/web/components/mobile-agenda.tsx`
- **Novo agendamento interno:**
  - Página: `apps/web/app/(dashboard)/novo/page.tsx`
  - Form: `apps/web/app/(dashboard)/novo/appointment-form.tsx`
- **Bloqueios:** `apps/web/app/(dashboard)/bloqueios` + actions em `apps/web/app/(dashboard)/bloqueios/actions.ts`
- **Atendimento:** `apps/web/app/(dashboard)/atendimento/[id]/page.tsx`
  - **UI nova padrão:** `attendance-v4-page.tsx` + `components/*`
- **Clientes:**
  - Lista: `apps/web/app/(dashboard)/clientes/page.tsx`
  - Detalhe: `apps/web/app/(dashboard)/clientes/[id]/page.tsx`
  - Perfil: `apps/web/app/(dashboard)/clientes/[id]/client-profile.tsx`
  - Notas: `apps/web/app/(dashboard)/clientes/[id]/notes-section.tsx`
  - Novo cliente: `apps/web/app/(dashboard)/clientes/novo/page.tsx`

### 4.2 Componentes globais e padrões
- **AppShell / AppShellMobileFrame:** `apps/web/components/app-shell.tsx` define frame 414px, padding de `px-4`/`pb-24`, safe areas e tamanho máximo, garantindo a estrutura “mobile frame”.
- **AppHeader:** componentizar variações (home, detalhe, formulário) para manter layout sticky, ícones/back, títulos e subtítulos padronizados.
- **BottomNav:** único, fixo, com ícones Lucide 24px, labels 10px, ativo verde e inativo cinza, safe-bottom aplicado (nav principal do app).
- **SurfaceCard / FormSection / StageCarousel / AppointmentCard / ClientListItem:** classes compartilhadas para padding, radius, shadow (`shadow-soft`), evitando “salada visual” por tela.
- **StageNav (Atendimento):** navegação para etapas com dots verdes, status visual e comportamento horizontal (pager).
- **Timer global:** `apps/web/components/timer/*` (provider + nova `TimerBubble`) garante single ticker, persistência e drag.
- **ActiveSessionBar:** componente legado removido (timer bubble novo é padrão).
- **States reutilizáveis:** skeletons, empty states e mensagens de erro com CTA devem usar componentes/estilos canônicos para manter consistência de feedback.

### 4.3 Padrão de composição
- **Server Component** carrega dados (via `createServiceClient`).
- **Client Component** controla interações, forms e UI state.

### 4.4 Gaps reais por módulo (AS-IS vs HTML)
**Agenda (home + day/week/month):**
- ✅ Estrutura base já está em `mobile-agenda.tsx` (tabs, FAB, day/week/month, month picker).
- ⛳ Ajustes para aderir ao HTML:
  - Tipografia/estilo da header e pills.
  - Buscar (UI e ação real).
  - Modal de detalhes (no HTML existe modal; hoje abre `/atendimento/[id]`).

**Formulário de Agendamento Interno:**
- ✅ Seções e toggle Studio/Domicílio já implementados (`appointment-form.tsx`).
- ⛳ Ajustes para aderir ao HTML:
  - Header/Status visual.
  - Horários em grade com estados (selecionado/indisponível).
  - Observações internas já persistem em `appointments.internal_notes`.
  - **Gap crítico:** “Valor final ajustável” no HTML vs. preço fixo hoje.

**Atendimento:**
- ✅ Estrutura por etapas + tabelas do DB já existem (`attendance-v4-page.tsx`, `lib/attendance/*`, migrations 2026020115*).
- ⛳ Aderência ao HTML final:
  - O HTML exige **pager horizontal** com etapas e header compacto + painel expandido.
  - Bolha persistente precisa ficar visualmente igual (ring/blur/posição) e obedecer “safe-area”.
  - UI atual é próxima, mas **precisa ser refeita** para refletir o HTML final.
  - Mensageria forte: botões para enviar WhatsApp/confirmar 24h com `appointment_messages` + log, ações `sendMessage`/`recordMessageStatus`.

**Clientes:**
- ✅ CRUD básico e histórico de visitas já existem.
- ⛳ HTML traz recursos não persistidos:
  - **VIP/Atenção** (sem campo no DB).
  - **Preferências e contraindicações** (sem campo dedicado).
  - **Consentimento marketing** e **menor de idade/guardião** (sem campo).
  - **Índice alfabético** (UI-only possível).

---

## 5. Arquitetura Backend (actions, repos, validações, idempotência)
### 5.1 Ações/Repos reais (AS-IS)
- **Appointments:**
  - Actions: `apps/web/src/modules/appointments/actions.ts`
  - Repos: `apps/web/src/modules/appointments/repository.ts`
  - Disponibilidade: `apps/web/src/modules/appointments/availability.ts`
- **Clientes:**
  - Actions: `apps/web/src/modules/clients/actions.ts`
  - Repos: `apps/web/src/modules/clients/repository.ts`
  - Validação: `apps/web/src/shared/validation/clients.ts`
- **Atendimento (novo):**
  - Actions: `apps/web/app/(dashboard)/atendimento/[id]/actions.ts`
  - Domain/Repo: `apps/web/lib/attendance/*`
  - Validação: `apps/web/src/shared/validation/attendance.ts`
- **Financeiro:** `apps/web/src/modules/finance/repository.ts` (transactions)

### 5.2 Regras de idempotência obrigatórias
- **Timer:** `startTimer/pauseTimer/resumeTimer/syncTimer` (já idempotentes).
- **Checkout:** `recordPayment` + `confirmCheckout` devem evitar duplicidade.
- **PRE:** `confirmPre` idempotente.

### 5.3 Propostas (necessárias para alinhar HTMLs)
- **Agenda:** `searchAppointments(query)` → usar join `appointments + clients`.
- **Agendamento interno:**
  - Adicionar **override de preço** (se UI exigir ajuste manual) ou **fixar valor** (decisão abaixo).
- **Clientes:**
  - `updateClientFlags` (VIP/alert) e `updateClientPreferences`.

---

## 6. Banco de dados (schema, migrations, backfill, índices)
### 6.1 Tabelas reais (AS-IS)
**Agenda/Agendamentos**
- `appointments` (core): `service_name`, `start_time`, `finished_at`, `status`, `price`, `is_home_visit`, `total_duration_minutes`, `payment_status`, `internal_notes`, `started_at`, `actual_duration_minutes`, `address_*`.
- `availability_blocks`: bloqueios e plantões (usado em agenda e disponibilidade).
- `services`, `settings`, `business_hours` para disponibilidade.

**Clientes**
- `clients` (campos principais):
  - `name`, `phone`, `email`, `data_nascimento`, `cpf`, `profissao`, `como_conheceu`, `observacoes_gerais`, `health_tags[]`
  - `address_*` + `endereco_completo` (legado)

**Atendimento** (já criado)
- `appointment_attendances`
- `appointment_checklist_items`
- `appointment_evolution_entries`
- `appointment_checkout`
- `appointment_checkout_items`
- `appointment_payments`
- `appointment_post`
- `appointment_events`

### 6.2 Migrations existentes relevantes
- `20260129000000_ajuste_v1_reality.sql` (clientes, appointments, transactions)
- `20260131133000_add_address_fields.sql` (address_* em clientes e appointments)
- `20260201140000_add_internal_notes_to_appointments.sql` (internal_notes + RPC)
- `20260201150000_attendance_tables.sql` + `20260201151000_attendance_backfill.sql`

### 6.3 Gaps de DB (para aderir ao HTML) — **propostas necessárias**
**Clientes (UI final exige persistência):**
- **VIP/Atenção:** adicionar `clients.is_vip boolean default false`, `clients.needs_attention boolean default false`.
- **Preferências e contraindicações:** adicionar `clients.preferences_notes text`, `clients.contraindications text`.
- **Marketing opt-in:** `clients.marketing_opt_in boolean default false`.
- **Menor de idade/guardião:** `clients.is_minor boolean default false`, `clients.guardian_name text`, `clients.guardian_phone text`, `clients.guardian_cpf text`.

**Agendamento interno (valor final):**
- Opção A (mais simples): manter `appointments.price` calculado pelo serviço e **não permitir edição** na UI.
- Opção B (se UI exigir ajuste): adicionar `appointments.price_override numeric` e ajustar RPC `create_internal_appointment`.

> Todas as novas colunas só entram se forem usadas na UI final. Caso a decisão seja remover campos da UI, **não** criar colunas.

### 6.4 Mensageria e surveys (DB)
- Criar `appointment_messages` (appointment_id PK/FK, type, status, payload jsonb, sent_at, created_at) para registrar envios/ações manuais/automáticas (confirmações, lembrete 24h, pós, mensagens com link para WhatsApp).
- Extender `appointment_post` ou criar `appointment_surveys` para `score`, `comment`, `follow_up_due_at`, `answered_at`, garantindo consulta fácil e ligação à etapa PÓS.
- Índices: `(appointment_id, status)` e `(type, sent_at)` em `appointment_messages`, `(appointment_id, answered_at)` em `appointment_surveys`.

### 6.5 Índices mínimos
- `appointments (tenant_id, start_time)` já implícito nas queries.
- `availability_blocks (tenant_id, start_time)`.
- `appointments (client_id, start_time desc)` para histórico em clientes.
- `appointment_events (appointment_id, created_at desc)` já criado.

### 6.6 Backfill
- **Attendance:** já existente (`20260201151000_attendance_backfill.sql`).
- **Clientes (novos campos):** `is_vip=false`, `needs_attention=false`, `marketing_opt_in=false`, `is_minor=false`.

---

## 7. Segurança (RLS, service_role, env vars)
### 7.1 RLS atual (AS-IS)
- Policies em `supabase/migrations/20260130050000_rls_policies_core.sql`.
- Padrão: **writes via `service_role`**, `authenticated` não escreve.
- `createServiceClient()` exige `SUPABASE_SERVICE_ROLE_KEY` (server-side).

### 7.2 Estratégia recomendada
- **Todas as ações mutáveis** via Server Actions (`createServiceClient`).
- UI client-side só lê dados via Server Components.
- **UI padrão:** Atendimento usa a nova UI sem flags de fallback.

---

## 8. Workflows completos (Agenda → Atendimento → Checkout → Pós)
### 8.1 Agenda
1. `listAppointmentsInRange` + `listAvailabilityBlocksInRange` alimentam `mobile-agenda.tsx`.
2. Botão “Novo Agendamento” → `/novo`.
3. Botão “Bloquear Plantão” → `/bloqueios`.

### 8.2 Novo Agendamento Interno
- UI → `create_internal_appointment` (RPC)
- Campos enviados (já existentes):
  - `clientName`, `clientPhone`, `serviceId`, `date`, `time`, `is_home_visit`, `address_*`, `internal_notes`
- Regra de conflito de horário já no RPC (`supabase/migrations/20260201140000_add_internal_notes_to_appointments.sql`).

### 8.3 Atendimento
- Ao abrir `/atendimento/[id]` → `getAttendanceOverview` cria registros faltantes.
- Etapas controladas por `appointment_attendances.*`.
- Checkout confirmado → atualiza `appointments.payment_status` + `appointment_checkout.payment_status`.
- Finalizar → `appointments.status = completed` + `actual_duration_minutes`.

### 8.4 Pós
- KPI de tempo: `appointment_post.kpi_total_seconds`.
- Survey: `appointment_post.survey_status/survey_score`.
- Eventos: `appointment_events`.

---

## 9. Observabilidade (events/logs) e KPIs
- **Eventos já implementados:** `appointment_events` (timer, checkout, pre, etc.).
- **Recomendado:** registrar também
  - abertura de atendimento,
  - cancelamentos manual/admin,
  - envio de lembretes e WhatsApp (`notification_jobs`).
- **KPIs:** `appointment_post.kpi_total_seconds`, total de atendimentos/dia (derivado).

### 9.1 Mensageria e survey (logs + tabelas)
- **Tabela `appointment_messages`:** rastrear cada envio manual ou notificação gerada (tipo `created_confirmation`, `reminder_24h`, `post_survey`, status `drafted`, `sent_manual`, `sent_auto`, `delivered`, `failed`, `payload` jsonb, `sent_at`).
- **Tabela `appointment_surveys` (ou colunas em `appointment_post`):** opcional para armazenar `score`, `comment`, `answered_at` e vincular ao `appointment_id`.
- **Botão “Enviar WhatsApp”:** na UI da etapa PRE, abre WhatsApp com texto template, marca mensagem como `sent_manual` e salva log.
- **Regras:** cada ação crítica (timer start/pause/resume, checkout confirmado, message log, survey respondida) deve gerar `appointment_events` e atualizar status apropriado.

---

## 10. Testes + Definition of Done
### Testes mínimos
- **Agenda:**
  - Tabs DIA/SEMANA/MÊS funcionais.
  - Clique no dia do mês abre visão DIA correta.
  - Navegação semanal (setas) correta.
- **Agendamento interno:**
  - criação com e sem domicílio.
  - validação de conflitos.
  - persistência de `internal_notes`.
- **Atendimento:**
  - Timer global (start/pause/resume) persistente.
  - Checkout com desconto e múltiplos pagamentos.
- **Clientes:**
  - criação, edição e histórico.
  - chips/tags persistindo em `health_tags`.
- **Visual (Auditoria PDF):**
  - Tipografia Playfair/Lato aplicada.
  - Paleta e sombras conforme PDF.
  - Header/nav/toggles coerentes entre telas.

### Definition of Done
- UI final segue HTMLs **e** Auditoria Visual (PDF), sem divergências visuais críticas.
- Nenhum dado exibido sem base no DB.
- Todas as mutações passam por server actions.
- Build, lint e typecheck passam.

---

## 11. Plano de execução por commits (sequência lógica)
1. **Design System V1:** aplicar Auditoria Visual (tipografia, paleta, espaçamento, sombras, botões, headers/nav).
2. **Agenda UI:** ajustes finais do HTML (header, pills, FAB, search real).
3. **Agendamento interno:** refino visual e decisão final sobre preço manual.
4. **Atendimento:** refactor completo para aderir ao HTML final, usando o schema já criado.
5. **Clientes:** lista/detalhe/novo com chips e persistência (inclui migrations se necessário).
6. **Observabilidade:** eventos críticos e validações.
7. **Hardening + QA:** testes manuais e regressão.

> Em todas as fases, validar conformidade com o **PDF de Auditoria Visual**.

---

## Apêndice — Mapa DB ↔ UI (regra de consistência)
### Agenda
- **Nome do cliente** → `appointments.clients.name` (`listAppointmentsInRange`).
- **Local (Estúdio/Domicílio)** → `appointments.is_home_visit`.
- **Status (Confirmado/Concluído)** → `appointments.status`.
- **Bloqueios** → `availability_blocks`.
- **Hora atual** → UI-only (derivado do relógio local).

### Agendamento interno
- **Nome/WhatsApp** → `clients.name`/`clients.phone` (RPC `create_internal_appointment`).
- **Procedimento** → `services` (select) → `appointments.service_id/service_name`.
- **Preço final** → `appointments.price` (decisão: fixo ou override).
- **Endereço** → `appointments.address_*`.
- **Observações internas** → `appointments.internal_notes`.

### Atendimento
- **Etapas/status** → `appointment_attendances`.
- **Checklist** → `appointment_checklist_items`.
- **Evolução** → `appointment_evolution_entries`.
- **Checkout** → `appointment_checkout` + `appointment_checkout_items` + `appointment_payments`.
- **Pós** → `appointment_post`.
- **Logs** → `appointment_events`.

### Clientes
- **Dados pessoais** → `clients.*` (name/phone/email/cpf/data_nascimento etc.).
- **Tags saúde** → `clients.health_tags`.
- **Observações internas** → `clients.observacoes_gerais`.
- **Histórico** → `appointments`.
