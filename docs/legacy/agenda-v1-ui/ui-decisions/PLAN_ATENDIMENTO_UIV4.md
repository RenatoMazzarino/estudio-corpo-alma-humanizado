# PLAN_ATENDIMENTO_UIV4.md — Atendimento UI V4 (Plano Único Consolidado)

## 1) Objetivo e Resultado Esperado

### Objetivo
Migrar a tela de **Atendimento** para a **UI V4** (baseada no HTML de referência) com um fluxo **robusto para produção**, preservando as regras atuais e evoluindo o módulo para suportar o ciclo completo:
**Pré-atendimento → Sessão → Checkout → Pós-atendimento**, com **cronômetro global persistente** (bolha flutuante + pause/resume) e **persistência/auditoria** em banco.

### Resultado Esperado (Definition of Done)
- A rota `/atendimento/[id]` vira uma experiência “por etapas” (HUB → PRE → SESSÃO → CHECKOUT → PÓS), fiel ao HTML.
- O cronômetro:
  - funciona dentro da tela de atendimento e **permanece visível no app inteiro** quando ativo,
  - tem **play/pause**,
  - tem **bolha arrastável** com **ring progress**,
  - persiste em **localStorage + DB** (com tolerância a reload).
- Fluxo por etapas tem:
  - **travas (locked/available/done)** com regras server-side,
  - **status e auditoria** (eventos),
  - **backfill** para atendimentos existentes.
- Checkout suporta:
  - itens (serviço, taxa, add-ons),
  - desconto (R$ / %),
  - múltiplos pagamentos e conciliação com o financeiro existente.
- Evolução suportará:
  - campos estruturados,
  - histórico versionado,
  - base pronta para presets (por serviço / profissional).

---

## 2) Fonte de Verdade, Referências e Restrições

### Fonte de Verdade UI
- `docs/legacy/agenda-v1-ui/ui-decisions/Visão da Nova Tela de Atendimento.htm` (HTML V4)

### Regras/Funcionalidades já existentes (devem ser preservadas)
- Start/finish/cancel, status do appointment, UI atual de detalhes, timer localStorage + bar atual (a ser substituída).

### Restrições e padrões
- Mobile-first (414px), tokens de cor e tipografia já adotados (studio.green, paper, Playfair/Lato).
- Não “quebrar” rotas existentes: `/atendimento/[id]` continua funcionando durante rollout.
- Manter compatibilidade com actions atuais: `startAppointment`, `finishAppointment`, `finishAdminAppointment`, `cancelAppointment` (podem virar wrappers do novo fluxo).

---

## 3) Glossário (termos internos do módulo)

- **Appointment**: agendamento.
- **Attendance**: entidade de atendimento (controle de etapas + timer + dados de sessão).
- **Stage**: etapa do atendimento (`hub`, `pre`, `session`, `checkout`, `post`).
- **Stage status**: `locked | available | in_progress | done | skipped`.
- **Timer status**: `idle | running | paused | finished`.
- **Ledger/Transactions**: estrutura financeira existente (não duplicar sem conciliar).

---

## 4) Spec UI/UX (extraída do HTML e consolidada)

### 4.1 Estrutura geral: “Etapas em telas”
- **HUB (Etapas)**: tela inicial do atendimento, com cards-resumo para PRE/SESSÃO/CHECKOUT/PÓS.
  - Cada card mostra: status (pendente/ok/bloqueada/liberada), resumo e CTA (“Abrir”).
  - Se sessão estiver em andamento, HUB exibe banner com tempo + botão “Voltar para Sessão”.
- **PRE**: logística + confirmação + checklist + observações internas.
- **SESSÃO**: evolução estruturada + histórico + presets.
- **CHECKOUT**: itens financeiros + desconto + meios de pagamento + confirmar pagamento.
- **PÓS**: KPIs + pesquisa satisfação + follow-up + notas pós + finalizar fluxo.

### 4.2 Padrões de layout
- Header sticky (com ação voltar), conteúdo scroll, footer fixo (CTA principal).
- Menos “amontoado”: 1 foco por tela.
- Cards usados como “blocos de leitura” (não para tudo virar card).
- Elementos persistentes:
  - Footer com CTA principal (por etapa).
  - Bolha do timer (global, fora da rota também).

### 4.3 Cronômetro global (UI)
- **Bolha circular** com:
  - ring progress (contorno preenchendo conforme tempo),
  - pulsar quando rodando,
  - tempo no centro,
  - play/pause dentro,
  - arrastar (drag),
  - tocar para abrir/retornar à Sessão.
- Deve aparecer quando existir uma sessão ativa (timer running/paused).
- Persistir posição (localStorage) e respeitar safe-area (evitar ficar por baixo do bottom nav).

---

## 5) Modelo de Etapas e Regras (Matriz de Transição)

### 5.1 Etapas e condições de desbloqueio
- PRE: sempre `available` quando atendimento existe.
- SESSÃO: desbloqueia quando:
  - `confirmed_at` existe **OU** flag “Iniciar mesmo sem confirmação” (admin) registrada em evento.
- CHECKOUT: desbloqueia quando:
  - Sessão iniciada (`timer_started_at` existe) **E** pelo menos um “saveEvolution published” **OU** admin override.
- PÓS: desbloqueia quando:
  - Checkout confirmado (payment_status `paid` ou `confirmed` conforme regra).

### 5.2 Estados por etapa
- `locked`: usuário vê card mas não abre.
- `available`: usuário pode abrir.
- `in_progress`: entrou na etapa e iniciou ações (ex.: timer, edição).
- `done`: concluída.
- `skipped`: usado somente com evento/admin.

### 5.3 Tabela de transição (eventos → efeitos)
**Evento: `confirmPre(channel)`**
- Pré-condição: PRE != done
- Efeitos:
  - `confirmed_at` set
  - PRE -> done
  - SESSÃO -> available
  - log event `pre_confirmed`

**Evento: `startTimer(plannedSeconds)`**
- Pré-condição: SESSÃO available/in_progress; timer != running
- Efeitos:
  - timer -> running
  - SESSÃO -> in_progress
  - log event `timer_started`

**Evento: `pauseTimer()`**
- Pré-condição: timer running
- Efeitos:
  - timer -> paused
  - log event `timer_paused`

**Evento: `resumeTimer()`**
- Pré-condição: timer paused
- Efeitos:
  - timer -> running
  - log event `timer_resumed`

**Evento: `publishEvolution(payload)`**
- Pré-condição: SESSÃO in_progress/available
- Efeitos:
  - cria versão nova (published)
  - log event `evolution_published`
  - CHECKOUT -> available (se timer já iniciou)

**Evento: `confirmCheckout(items, discount, payments...)`**
- Pré-condição: CHECKOUT available/in_progress
- Efeitos:
  - checkout -> done
  - PÓS -> available
  - appointments.payment_status atualizado
  - log event `checkout_confirmed`

**Evento: `finishAttendance()`**
- Pré-condição: PÓS available/in_progress (ou admin override)
- Efeitos:
  - PÓS -> done
  - timer -> finished (se ainda não)
  - appointments.status -> completed
  - log event `attendance_finished`

### 5.4 Cancelamento / No-show / Remarcação (produção)
- Cancelamento durante PRE:
  - bloqueia demais etapas, marca attendance como `cancelled`, log event.
- No-show:
  - permite encerrar sem sessão (admin), gera evento e status distinto (ex.: `no_show`).
- Remarcação:
  - attendance permanece vinculada ao appointment? **Decisão**:
    - Recomendado: attendance é 1:1 com appointment; remarcação cria novo appointment e nova attendance, mantendo histórico no cliente.

---

## 6) AS-IS (mapa do que existe hoje) — para preservar e migrar

### 6.1 Rotas e UI
- `/atendimento/[id]`:
  - `apps/web/app/(dashboard)/atendimento/[id]/page.tsx` carrega appointment via `getAppointmentById`.
  - `apps/web/app/(dashboard)/atendimento/[id]/appointment-details-page.tsx` renderiza `AppointmentDetailsModal`.
- UI atual: `apps/web/components/appointment-details-modal.tsx` (abas Resumo/Evolução/Pagar).
- Navegação para atendimento:
  - `apps/web/components/mobile-agenda.tsx` e `apps/web/components/desktop-calendar.tsx` fazem `router.push("/atendimento/{id}")`.

### 6.2 Timer atual
- `apps/web/src/shared/timer/useActiveSession.ts` usa localStorage `active_appointment_session`.
- `apps/web/components/active-session-bar.tsx` é o card flutuante arrastável; é montado no `AppShell` e oculto quando a rota começa com `/atendimento`.

### 6.3 Actions atuais
- `apps/web/src/modules/appointments/actions.ts`: `startAppointment`, `finishAppointment`, `finishAdminAppointment`, `cancelAppointment`.
- `apps/web/app/(dashboard)/admin/atendimento/actions.ts`: wrapper para `finishAdminAppointment`.
- Observação importante: `finishAdminAppointment` atualmente salva notas no `clients.observacoes_gerais` (não em estrutura de evolução de atendimento).

### 6.4 Banco atual (appointments e correlatos)
- `appointments` possui: `status`, `started_at`, `finished_at`, `payment_status`, `is_home_visit`, `total_duration_minutes`, `actual_duration_minutes`, `internal_notes`, endereço estruturado e `service_id`.
- Migrations relevantes:
  - `supabase/migrations/20260128065418_estrutura_mvp.sql` (appointments base)
  - `supabase/migrations/20260129000000_ajuste_v1_reality.sql` (payment_status, is_home_visit, total_duration_minutes)
  - `supabase/migrations/20260130010000_add_service_id_to_appointments.sql`
  - `supabase/migrations/20260130030000_normalize_appointment_status.sql`
  - `supabase/migrations/20260131130000_add_actual_duration_minutes.sql`
  - `supabase/migrations/20260131133000_add_address_fields.sql`
  - `supabase/migrations/20260201140000_add_internal_notes_to_appointments.sql`
- Financeiro atual: `transactions` (`supabase/migrations/20260129000000_ajuste_v1_reality.sql`) e repos em `apps/web/src/modules/finance/repository.ts`.
- Notificações: `notification_jobs` e `notification_templates` (`supabase/migrations/20260130090000_notifications_structure.sql`).

### 6.5 Disponibilidade / buffers
- Cálculo de slots usa `services.duration_minutes` + buffers em `settings` e `business_hours` (`apps/web/src/modules/appointments/availability.ts`).
- Esses dados podem virar `planned_seconds` do timer.

---

## 7) GAP Analysis (o que falta para chegar na V4)
- Não existe HUB com etapas nem estados de bloqueio; UI atual é uma modal com 3 abas.
- Não existe modelagem de etapa (pre/session/checkout/post) nem regras server-side.
- Evolução estruturada e histórico versionado inexistem.
- Checkout hoje é simples; faltam itens, desconto R$/%, split payment e conciliação robusta.
- Pós-atendimento não existe (KPI, pesquisa, follow-up, notas pós).
- Timer atual é localStorage; não persiste em DB e não tem bolha/ring progress.
- Não há entidade “attendance” para auditoria por etapa.

---

## 8) Arquitetura alvo no Repo (organização limpa)

### 8.1 Nova estrutura sugerida (sem quebrar imports)
- `apps/web/app/(dashboard)/atendimento/[id]/page.tsx`
- `apps/web/app/(dashboard)/atendimento/[id]/components/`
  - `attendance-shell.tsx` (layout base: header + content + footer)
  - `hub-stage.tsx`
  - `pre-stage.tsx`
  - `session-stage.tsx`
  - `checkout-stage.tsx`
  - `post-stage.tsx`
- `apps/web/components/timer/`
  - `timer-provider.tsx` (global)
  - `timer-bubble.tsx` (bolha flutuante)
  - `use-timer.ts` (hook)
- `apps/web/app/(dashboard)/atendimento/[id]/actions.ts`
  - novas server actions (confirmPre, saveEvolution, setDiscount, recordPayment...)
- `apps/web/lib/attendance/`
  - `attendance-types.ts` (zod + tipos)
  - `attendance-repository.ts` (queries)
  - `attendance-domain.ts` (regras/transições server-side)

### 8.2 Compatibilidade com UI antiga
- UI antiga removida; a UI atual é padrão (sem feature flag).

---

## 9) DB: Fonte de verdade e modelagem (produção)

### 9.1 Princípio
- `appointments` continua como entidade do agendamento.
- Criamos um conjunto de tabelas “attendance” para suportar etapas/versões/itens/pagamentos/auditoria.
- **Dual-write controlado**: alguns campos continuam em `appointments` para compatibilidade.

### 9.2 Tabela principal (1:1)
#### `appointment_attendances`
- `appointment_id uuid primary key references appointments(id) on delete cascade`
- `current_stage text not null default 'hub'`
- `pre_status text not null default 'available'`
- `session_status text not null default 'locked'`
- `checkout_status text not null default 'locked'`
- `post_status text not null default 'locked'`
- `confirmed_at timestamptz null`
- `confirmed_channel text null` (whats/manual/auto)
- `timer_status text not null default 'idle'` (idle/running/paused/finished)
- `timer_started_at timestamptz null`
- `timer_paused_at timestamptz null`
- `paused_total_seconds int not null default 0`
- `planned_seconds int null` (ex.: duração do serviço)
- `actual_seconds int not null default 0` (cache; fonte real é cálculo)
- `stage_lock_reason text null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Índices:
- `(current_stage)`
- `(timer_status)`
- `(confirmed_at)`

### 9.3 Checklist
#### `appointment_checklist_items`
- `id uuid primary key`
- `appointment_id uuid references appointments(id) on delete cascade`
- `label text not null`
- `sort_order int not null`
- `completed_at timestamptz null`
- `source text null` (service_preset/manual)
- `created_at timestamptz not null default now()`

Índices:
- `(appointment_id, sort_order)`
- `(appointment_id, completed_at)`

### 9.4 Evolução estruturada (versionada + extensível)
#### `appointment_evolution_entries`
- `id uuid primary key`
- `appointment_id uuid references appointments(id) on delete cascade`
- `version int not null`
- `status text not null default 'draft'` (draft/published)
- `summary text null`
- `complaint text null`
- `techniques text null`
- `recommendations text null`
- `sections_json jsonb null`
- `created_by uuid null`
- `created_at timestamptz not null default now()`

Constraints:
- unique `(appointment_id, version)`

Índices:
- `(appointment_id, created_at desc)`
- `(appointment_id, status)`

### 9.5 Checkout e itens
#### `appointment_checkout`
- `appointment_id uuid primary key references appointments(id) on delete cascade`
- `discount_type text null` (value/pct)
- `discount_value numeric(12,2) null`
- `discount_reason text null`
- `subtotal numeric(12,2) not null default 0`
- `total numeric(12,2) not null default 0`
- `payment_status text not null default 'pending'` (pending/partial/paid/failed/void)
- `confirmed_at timestamptz null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

#### `appointment_checkout_items`
- `id uuid primary key`
- `appointment_id uuid references appointments(id) on delete cascade`
- `type text not null` (service/fee/addon/adjustment)
- `label text not null`
- `qty int not null default 1`
- `amount numeric(12,2) not null`
- `metadata jsonb null`
- `sort_order int not null default 0`
- `created_at timestamptz not null default now()`

Índices:
- `(appointment_id, sort_order)`

### 9.6 Pagamentos (conciliar com financeiro existente)
#### `appointment_payments`
- `id uuid primary key`
- `appointment_id uuid references appointments(id) on delete cascade`
- `method text not null` (pix/card/cash/other)
- `amount numeric(12,2) not null`
- `status text not null default 'pending'` (pending/paid/failed/refunded)
- `paid_at timestamptz null`
- `provider_ref text null`
- `transaction_id uuid null` (FK opcional p/ transactions existente)
- `created_at timestamptz not null default now()`

Índices:
- `(appointment_id, status)`
- `(transaction_id)`

### 9.7 Pós-atendimento
#### `appointment_post`
- `appointment_id uuid primary key references appointments(id) on delete cascade`
- `kpi_total_seconds int not null default 0`
- `survey_status text not null default 'not_sent'` (not_sent/sent/answered)
- `survey_score int null` (0..10 ou 1..5)
- `follow_up_due_at timestamptz null`
- `follow_up_note text null`
- `post_notes text null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### 9.8 Auditoria (produção)
#### `appointment_events`
- `id uuid primary key`
- `appointment_id uuid references appointments(id) on delete cascade`
- `event_type text not null`
- `payload jsonb null`
- `created_by uuid null`
- `created_at timestamptz not null default now()`

Índices:
- `(appointment_id, created_at desc)`
- `(event_type, created_at desc)`

### 9.9 Triggers (opcional, mas recomendado)
- Trigger para `updated_at` em tabelas principais.
- Constraint de consistência:
  - `appointment_attendances.timer_status = 'running'` ⇒ `timer_started_at not null`
  - quando `timer_status='paused'` ⇒ `timer_paused_at not null`

---

## 10) RLS / Policies (Supabase)

### 10.1 Papéis
- `authenticated` (profissional/admin logado)
- `service_role` (server)

### 10.2 Policies (mínimo)
- Leitura (`select`) permitida para `authenticated` no tenant correto (se existir tenant_id no appointments).
- Escrita (`insert/update/delete`) **negada** para `authenticated` por padrão nas tabelas novas.
- Escrita liberada para `service_role` (server).

---

## 11) Actions / Endpoints (contratos, validações, idempotência)

### 11.1 Leitura agregada
`getAttendance(appointmentId)`
- Retorna appointment + attendance + checklist + evolução + checkout + post

### 11.2 PRE
`sendReminder24h({ appointmentId })`
- Registra evento `reminder_24h_sent`

`confirmPre({ appointmentId, channel })`
- idempotente

`saveInternalNotes({ appointmentId, internal_notes })`
- mantém `appointments.internal_notes` + log

`upsertChecklist({ appointmentId, items[] })`
`toggleChecklistItem({ appointmentId, itemId, completed })`

### 11.3 Sessão / Evolução
`saveEvolutionDraft({ appointmentId, payload })`
`publishEvolution({ appointmentId, payload })`
`listEvolutionHistory({ appointmentId })`

### 11.4 Timer (global)
`startTimer({ appointmentId, plannedSeconds })`
`pauseTimer({ appointmentId })`
`resumeTimer({ appointmentId })`
`syncTimer({ appointmentId, clientNow, localState })`

### 11.5 Checkout
`setCheckoutItems({ appointmentId, items[] })`
`setDiscount({ appointmentId, type, value, reason })`
`recordPayment({ appointmentId, method, amount, transactionRef? })`
`confirmCheckout({ appointmentId })`

### 11.6 Pós
`savePost({ appointmentId, postNotes, followUpDueAt, followUpNote })`
`sendSurvey({ appointmentId, channel })`
`recordSurveyAnswer({ appointmentId, score, answersJson? })`
`finishAttendance({ appointmentId })`

### 11.7 Compatibilidade com actions existentes
- `startAppointment` → chama `startTimer` + marca attendance/session in_progress
- `finishAppointment` / `finishAdminAppointment` → chama `finishAttendance` (mantendo interface atual)
- `cancelAppointment` → cancela attendance e loga evento

---

## 12) Estratégia do Cronômetro Global (provider + bolha)

### 12.1 Single ticker (evitar travamento/duplicação)
- Criar `TimerProvider` no `AppShell`:
  - mantém **um único interval** no app
  - expõe `start/pause/resume/stop`
- Toda UI consome provider (`useTimer`).

### 12.2 Fonte de verdade do tempo (sem drift)
- Elapsed = `now - timer_started_at - paused_total_seconds - (now - timer_paused_at se paused)`
- `actual_seconds` é cache/telemetria, não a base do cálculo.

### 12.3 Persistência local
- localStorage:
  - `active_timer_session`: appointmentId + startedAt + pausedAt + pausedTotalSeconds + plannedSeconds
  - `timer_bubble_position`: x/y
- Ao abrir o app:
  - provider restaura sessão
  - busca estado do DB e resolve conflitos.

### 12.4 Conflitos multi-aba/multi-device
- “Lock” leve via `broadcastchannel` no browser:
  - evita dois tickers atualizando UI local
- No server:
  - endpoints idempotentes; “último write vence” por timestamps.

### 12.5 UI bolha
- Renderizada em nível global.
- Clique:
  - se não estiver na rota do appointment: navega para `/atendimento/[id]` e abre SESSÃO.
- Drag:
  - restrições para não passar por baixo do bottom nav.

---

## 13) Financeiro: integração com o que já existe

### 13.1 Decisão de arquitetura (evitar duplicidade)
- `appointment_checkout` + `appointment_payments` são a “visão de atendimento”.
- `transactions` continua como ledger consolidado.
- `appointment_payments.transaction_id` referencia lançamentos em `transactions` quando necessário.

### 13.2 Regras
- Total = subtotal - desconto + taxas/add-ons.
- `payment_status`:
  - `pending`: pago 0
  - `partial`: pago >0 e < total
  - `paid`: pago >= total
- Permitir split: ex. pix + dinheiro.
- “Outro” método: exige `notes` (metadata).

---

## 14) Confirmação 24h (produção)

### 14.1 Registro e rastreabilidade
- Campo `confirmed_at` e `confirmed_channel` em attendance.
- Evento `reminder_24h_sent` com payload:
  - job_id (se existir), canal, template, timestamp.

### 14.2 Manual vs automático
- Manual: botão na PRE.
- Automático: job pode setar `reminder_sent_at`, mas **não confirma** sem ação humana.

---

## 15) Migração e Backfill (sem quebrar produção)

### 15.1 Migrations (passo a passo)
1) Criar tabelas novas + índices + triggers updated_at
2) Criar policies RLS
3) Backfill `appointment_attendances`:
   - Para appointments existentes, criar uma linha 1:1
4) Backfill status por regra:
   - `appointments.status = completed` → todas etapas done, timer finished
   - `in_progress` → pre done, session in_progress, demais locked/available conforme regras
   - `pending` → pre available, demais locked

### 15.2 Dual-write temporário (recomendado)
- Ao start/finish/cancel:
  - atualiza attendance + mantém `appointments.*` coerente

### 15.3 Rollout seguro
- Feature flag:
  - V4 ligada só para você inicialmente
  - depois para todos

### 15.4 Rollback
- Se V4 falhar:
  - desliga flag
  - dados continuam salvos nas tabelas novas sem quebrar V1

---

## 16) Roadmap em PRs (com Acceptance Criteria)

### PR1 — Base UI V4 (sem mudar regra)
- Implementa `/atendimento/[id]` com HUB + cascas das etapas (sem persistência nova)
- Tokens e layout fiéis ao HTML
**Aceite**
- Navegar entre HUB/PRE/SESSÃO/CHECKOUT/PÓS com dados mockados do appointment

### PR2 — Timer global + bolha (substitui ActiveSessionBar)
- Provider no AppShell
- Bolha com ring progress + drag + play/pause
- Integra com ações atuais (start/finish) sem DB novo ainda (ou DB mínimo)
**Aceite**
- Timer continua rodando ao sair da tela
- Reload mantém sessão via localStorage
- Não duplica interval

### PR3 — DB Attendance + backfill + leitura agregada
- Migrations tabelas
- getAttendance agregando
- UI lendo do DB
**Aceite**
- Backfill cria attendance para appointments existentes
- UI V4 mostra status correto

### PR4 — PRE completo
- confirmação 24h + checklist persistido + ações contato/endereço
- notas internas persistidas
**Aceite**
- Confirmar PRE libera SESSÃO (server-side)

### PR5 — SESSÃO / evolução estruturada + histórico
- evolution_entries com draft/published + sections_json
- presets stub
**Aceite**
- Publicar evolução cria versão e libera CHECKOUT (se timer iniciado)

### PR6 — CHECKOUT robusto + pagamentos
- itens + desconto R$/% + multi-payments + conciliação com transactions
**Aceite**
- partial/paid correto e travas por etapa funcionando

### PR7 — PÓS + KPIs + survey + follow-up
- KPI total seconds
- survey status e registro
- finalizar atendimento
**Aceite**
- Finalizar marca appointment completed + salva KPI

### PR8 — Limpeza e descontinuação da UI antiga
- remover tabs antigas ou manter só fallback por mais tempo (decisão)
**Aceite**
- Nenhuma rota antiga depende de campos removidos

---

## 17) Testes (produção) — unit/integration/e2e + manual

### Unit
- cálculo elapsed (pause/resume)
- validações desconto (R$/%)
- regras de transição (matriz)

### Integração
- fluxo completo: PRE → SESSÃO → CHECKOUT → PÓS
- multi-payments
- reload durante sessão

### E2E (Playwright se houver)
- iniciar timer, navegar para agenda, ver bolha, voltar, finalizar

### Checklist manual mínimo
- iniciar e pausar timer (na tela e na bolha)
- sair e voltar com timer ativo
- confirmar pre e liberar sessão
- publicar evolução e liberar checkout
- aplicar desconto % e R$
- registrar 2 pagamentos e fechar total
- finalizar e ver KPI salvo

---

## 18) Riscos e Mitigações

### Risco: divergência entre appointments e attendance
- Mitigação: dual-write + auditoria + fallback de leitura

### Risco: RLS bloqueando UI
- Mitigação: writes via server role; testar policies antes

### Risco: drift/duplicação de interval
- Mitigação: ticker único no provider + broadcastchannel

### Risco: financeiro duplicado
- Mitigação: usar transaction_id e não criar ledger paralelo

### Risco: complexidade de rollout
- Mitigação: feature flag + PRs incrementais + rollback simples

---

## 19) Incertezas / Verificações obrigatórias antes de implementar
- Confirmar se existe outra rota/tela de atendimento além de `/atendimento/[id]`.
- Confirmar como tenant/permissions funcionam hoje (para RLS).
- Confirmar como `transactions` é criado hoje (server action vs client).

> Se qualquer uma dessas verificações revelar rotas paralelas ou writes client-side, ajustar policies e compatibilidade antes de merge.
