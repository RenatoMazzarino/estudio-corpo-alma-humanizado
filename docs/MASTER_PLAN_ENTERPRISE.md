# MASTER_PLAN_ENTERPRISE (Revisado)

Data: 2026-01-29  
Escopo: repositório `/mnt/c/Users/renat/projetos_de_dev/estudio-corpo-alma-humanizado`  
Objetivo: plano unificado e executável para elevar o repo a padrão enterprise, com modularização por domínio e paridade total **DB ⇄ Código**.

---

## 1. Executive Summary

* Plano mestre **executável**, orientado a entregas pequenas, verificáveis e reversíveis.
* Prioriza correções P0 (paridade DB⇄Código, status, RLS/tenant), elimina drift de types/migrations e só então modulariza.
* Define **contrato de dados** (o que é UI-managed vs System-managed vs Planned vs Remove) e define o **conjunto canônico de status** + transições permitidas.
* Define arquitetura alvo enterprise: `/app` como camada de composição e `src/modules/<domínio>` como fonte de verdade da lógica.

---

## 2. Estado Atual (com base nos 9 docs)

* Monorepo Turbo com `apps/web` (Next App Router) + `supabase/migrations`.
* Ambiente não reproduzível: `pnpm install/lint/check-types/build` falham por ausência de Node (`node: not found`).
* Divergências DB ⇄ Código:

  * `clients.notes` no código, coluna real no DB: `observacoes_gerais`.
  * Status divergente: `done` vs `completed`.
  * Drift types: `business_hours` ausente em `apps/web/lib/supabase/types.ts`.
  * `tenant_id` como TEXT sem FK em `settings`, `availability_blocks`, `transactions`.
  * RLS/policies fixas conflitam com fluxo público `/agendar/[slug]`.
* Arquitetura fragmentada: actions/queries dispersas; duplicação de layout (AppShell vs layout global); componentes órfãos.
* Regras de agendamento incompletas: fluxo interno sem validação robusta; fluxo público aplica regras parcialmente.
* Financeiro: `transactions` é escrito mas caixa lê `appointments`, causando inconsistência.

---

## 3. Objetivos e Escopo

### 3.1 Objetivos (IN SCOPE)

1. **Paridade total DB ⇄ Código**:

   * nenhum campo usado no código que não exista no DB
   * nenhum campo no DB sem **decisão explícita** (UI-managed/System-managed/Planned/Remove).
2. **Multi-tenant estrutural** (DB + RLS básico): `tenant_id` consistente e policies coerentes (mesmo que só exista 1 tenant operacional hoje).
3. **Normalização de status** (canônico + constraints + transições).
4. **Types sincronizados** com migrations (regeneração obrigatória após cada alteração de schema).
5. **Arquitetura enterprise modular**: `/app` como composição, lógica em `src/modules`.
6. **Qualidade e reprodutibilidade**: lint/typecheck/build em CI + ambiente padronizado.
7. **Agendamento robusto**: disponibilidade unificada, buffers, prevenção de double booking, cancelamento/reagendamento.
8. **Financeiro/caixa com ledger**: caixa = `transactions` (fonte da verdade), reconciliado com `appointments`.

### 3.2 Fora de escopo imediato (OUT OF SCOPE)

* Integração real com provedores de WhatsApp/SMS/pagamentos (somente estrutura e jobs).
* RBAC completo e UI para gestão de múltiplos tenants (admin multi-tenant), *apenas preparar base*.

---

## 4. Princípios de Arquitetura e Padrões Enterprise

* **Domain-first:** lógica e acesso a dados em `src/modules/<domínio>`.
* **/app = composition layer:** páginas/rotas só orquestram (sem query direta).
* **Schema como fonte da verdade:** migrations → types → código (types sempre regenerados após migrations).
* **Camadas por domínio (obrigatório):**

  1. `repository.ts` (DB only)
  2. `usecases.ts` (regras de negócio)
  3. `actions.ts` (entrada, validação, auth, chamadas do server)
* **Validação central:** Zod em toda action (FormData/JSON), com regras de required/optional.
* **Erro padronizado:** `AppError` + `mapSupabaseError` + padrão único de retorno para UI.
* **Server-first:** regras de negócio no server (evita divergência entre fluxo público/interno).
* **RLS consciente:** público e admin com políticas separadas; preferir **RPC** para escrita pública.
* **Naming:** kebab-case arquivos; PascalCase componentes; `page.tsx` mantido (Next).
* **Qualidade:** CI mínimo, padrão de PR pequeno, checklists e smoke tests.

---

## 5. Matriz de Prioridades (P0/P1/P2)

### P0 (bloqueia evolução)

* `clients.notes` → `clients.observacoes_gerais` (quebra insert/update).
* Status canônico: `done` vs `completed` (quebra caixa/histórico).
* RLS/policies compatíveis com fluxo público `/agendar/[slug]`.

### P1 (drift e estabilidade)

* Drift migrations vs types (regeneração obrigatória; `business_hours` e demais).
* `tenant_id` inconsistente (TEXT sem FK em tabelas chave).
* Falta validação server-side para colisão/slots no fluxo interno.
* Falta padrão de tratamento de erro/validação.

### P2 (polimento e maturidade)

* UI/layout duplicados; componentes não usados.
* Falta testes automatizados e CI (CI entra em Fase 0; testes avançados depois).
* Consistência de SearchParams/rotas.

---

## 6. Definições Canônicas (evita drift)

### 6.1 AppointmentStatus (canônico)

**Status permitidos (canônico):**

* `scheduled` (criado, aguardando confirmação se aplicável)
* `confirmed` (confirmado)
* `completed` (atendido finalizado)
* `canceled_by_client`
* `canceled_by_studio`
* `no_show`

> Se hoje o DB usa outro conjunto, este é o alvo. Durante migração, manter compat temporária apenas até concluir backfill + constraint.

**Transições permitidas (state machine mínima):**

* scheduled → confirmed | canceled_by_client | canceled_by_studio
* confirmed → completed | no_show | canceled_by_client | canceled_by_studio
* completed → (terminal)
* no_show → (terminal)
* canceled_* → (terminal)

**Fonte da verdade:**

* DB constraint/enum + TS union central (ex.: `src/modules/appointments/types.ts`).

### 6.2 Required vs Optional (contrato mínimo)

Toda action deve aplicar:

* required: `client.name`, `client.phone`, `appointment.start_time`, `service_id`
* optional: email, address, cpf, etc (conforme DB Contract)

---

## 7. Plano Mestre por Fases

### Fase 0 — Baseline e Reprodutibilidade (PR 0)

**Objetivo:** repo rodar em qualquer máquina + CI executando lint/typecheck/build.

**Tarefas:**

* Adicionar `.nvmrc` (Node 18+ ou 20 LTS).
* `engines` no `package.json` root (e `apps/web` se houver).
* Padronizar scripts root: `lint`, `check-types`, `build`, `format`.
* Criar CI (GitHub Actions): pnpm cache + rodar `pnpm install/lint/check-types/build`.
* Documentar pré-requisitos no README.

**DoD:**

* CI verde com `pnpm install`, `pnpm lint`, `pnpm check-types`, `pnpm build`.
* Instruções de ambiente claras.

---

### Fase 1 — Correções P0 no Código + Contrato DB⇄Código (PR 1)

**Objetivo:** corrigir falhas críticas sem mexer em arquitetura.

**Tarefas (granular por arquivo):**

* Trocar `notes` → `observacoes_gerais`:

  * `apps/web/app/clientes/novo/actions.ts`
  * `apps/web/app/clientes/[id]/actions.ts`
  * `apps/web/app/clientes/[id]/page.tsx`
  * Qualquer componente que exiba/edite “notas”.
* Normalizar status no código para canônico:

  * remover escrita de `done`
  * escrever `completed` (ou status canônico definido)
  * criar `AppointmentStatus` central e usar em todo o código
  * **compat temporária** de leitura: aceitar `done` apenas até Fase 2 concluir backfill/constraint
* Atualizar Caixa e histórico para o status canônico.

**DoD:**

* Sem referências a `notes` e sem escrita de `done`.
* Criar/editar cliente salva observações.
* Finalizar atendimento reflete no histórico/caixa (mesmo antes das migrations).

---

### Fase 2 — Migrations Críticas + RLS (PR 2A / PR 2B / PR 2C)

**Objetivo:** alinhar schema com contrato e garantir RLS seguro.

> **Regra:** qualquer PR com migration deve terminar com **regeneração de types no mesmo PR**.

#### PR 2A — tenant_id consistente (TEXT → UUID + FK)

* Migrar `tenant_id` para UUID com FK em `settings`, `availability_blocks`, `transactions` (e demais identificadas).
* Backfill/convert de valores existentes com estratégia segura (pré-check + rollback).
* Ajustar índices e constraints necessárias.
* **Regenerar types** no fim do PR.

**DoD:**

* Sem `tenant_id` TEXT nas tabelas alvo.
* Types regenerados e compilando.

#### PR 2B — service_id em appointments + backfill em 2 passos

**Passo 1 (obrigatório): relatório de duplicidade**

* Gerar relatório: serviços duplicados por `tenant_id + name`.
* Se duplicados existirem: plano exige decisão (merge/rename/manual mapping) antes de backfill automático.

**Passo 2: migration + backfill**

* Adicionar `service_id` com FK.
* Backfill apenas quando nomes forem unívocos (ou mapping manual).
* Manter `service_name` como snapshot histórico.
* **Regenerar types** no fim do PR.

**DoD:**

* appointments possuem `service_id` corretamente populado ou bloqueado com relatório/justificativa.
* Tipos regenerados.

#### PR 2C — status constraint + backfill `done → completed`

* Rodar query de distinct status antes de criar constraint.
* Backfill: `done` → `completed`.
* Criar constraint/enum para impedir valores fora do canônico.
* Remover compat temporária do código.
* **Regenerar types** no fim do PR.

**DoD:**

* DB impede status inválido.
* Código não tem fallback para `done`.

#### RLS/policies (dentro da Fase 2, preferencialmente PR separado 2D se necessário)

**Decisão enterprise:** escrita pública deve ser via **RPC**.

* Criar RPC `create_public_appointment(tenant_slug, service_id, start_time, client_payload...)`:

  * resolve tenant por slug
  * valida slot (sem colisão)
  * aplica buffers
  * grava appointment
  * retorna appointment_id
* Policies:

  * usuário público/anon: **sem insert direto** em `appointments`
  * permitir apenas `execute` da RPC
  * selects públicos estritamente restritos (services/business_hours/availability “safe”)
  * admin: policies por tenant para operar o dashboard

**DoD:**

* `/agendar/[slug]` funciona via RPC.
* Dashboard continua funcionando.
* Segurança: público não lê dados sensíveis.

---

### Fase 3 — Types, Erros e Validação (PR 3)

**Objetivo:** padronizar tratamento de erro e validação; impedir entradas inválidas.

**Tarefas:**

* Consolidar `AppError`, `mapSupabaseError`, padrão de retorno.
* Criar Zod schemas:

  * clients (create/update)
  * services (create/update)
  * appointments (create/complete/cancel)
* Garantir que **nenhuma action** escreva no DB sem validar payload.

**DoD:**

* Actions com validação Zod obrigatória.
* Erros padronizados na UI.
* Typecheck/lint/build ok.

---

### Fase 4 — Modularização por Domínio (PR 4)

**Objetivo:** migrar lógica para `src/modules` com camadas repository/usecases/actions.

**Tarefas:**

* Criar estrutura `apps/web/src/modules/*` e `shared/*`.
* Migrar por domínio, na ordem:

  1. appointments (inclui public booking)
  2. clients
  3. services
  4. finance
* Impor regra: páginas não fazem `supabase.from()` e não importam client Supabase.

**DoD:**

* Supabase acessado apenas via repositories.
* Regras no usecases.
* /app apenas compõe e chama actions.

---

### Fase 5 — UI/Layout e Design System Mínimo (PR 5)

**Objetivo:** eliminar duplicação e padronizar UI.

**Tarefas:**

* Route groups `(dashboard)` e `(public)` com layouts distintos.
* Unificar AppShell no layout do dashboard.
* BottomNav sem duplicação.
* Design system mínimo: Button/Input/Card/Modal/Toast.
* Remover ou migrar componentes legacy (com decisão explícita).

**DoD:**

* Layout sem duplicação.
* Padrões visuais consistentes nas rotas principais.

---

### Fase 6 — Robustez do Agendamento (PR 6)

**Objetivo:** regras únicas de disponibilidade e prevenção de double booking.

**Tarefas:**

* Unificar cálculo de slots em `src/modules/appointments/availability.ts`.
* Reuso no fluxo interno e público.
* Implementar lock/transação server-side (evitar double booking).
* Padronizar timezone (UTC) e serialização de datas.

**DoD:**

* Slots idênticos para interno/público.
* Double booking prevenido.
* Buffers aplicados consistentemente.

---

### Fase 7 — Financeiro/Caixa (PR 7)

**Objetivo:** caixa como ledger (`transactions`) e reconciliação com appointments.

**Regras mínimas (Ledger rules):**

* `transactions.type`: `income | expense | refund`
* `amount` em centavos (int)
* `appointment_id`:

  * obrigatório para `income` proveniente de atendimento
  * opcional para ajustes/expense com `description` obrigatório
* Ao concluir atendimento: criar `income` obrigatório.

**Tarefas:**

* `/caixa` passa a ler `transactions` como fonte da verdade.
* Reconciliar com appointments (sinalizar divergências).
* Ajustes manuais (opcional) com trilha de auditoria.

**DoD:**

* Totais do caixa batem com ledger.
* Conclusão de atendimento sempre gera transação.

---

### Fase 8 — Notificações (Estrutura, sem provedor) (PR 8)

**Objetivo:** preparar base para automação.

**Tarefas:**

* Tabela `notification_jobs` + templates.
* Gerar jobs em: criar/cancelar/lembrar agendamento.
* Sem integração externa (apenas estrutura e logs).

**DoD:**

* Jobs criados com payload consistente.
* Sem envio real (somente queue).

---

## 8. DB ⇄ Código: Divergências e Decisões (DB Contract)

### 8.1 Divergências principais (decisões firmes)

* `clients.notes` vs `observacoes_gerais`: **padronizar no código para `observacoes_gerais`**.
* `done` vs `completed`: **status canônico conforme seção 6.1**.
* `business_hours` ausente em types: **regeneração obrigatória após migrations**.
* `tenant_id` TEXT sem FK: **migrar para UUID + FK**.
* RLS conflitando com `/agendar`: **escrita pública via RPC + policies separadas**.

### 8.2 Contrato Required/Optional (mínimo)

* **clients:** required = name, phone; optional = email, cpf, etc.
* **appointments:** required = service_id, start_time, client_id (ou payload para criação); optional = is_home_visit.
* **services:** required = name, price, duration_minutes.

### 8.3 Classificação por tabela/coluna (UI/System/Planned/Remove)

(Mantém sua listagem atual, com regra extra:)

* Marcar Required/Optional e Validation Rule para campos críticos.
* Campos Planned devem ter “fase alvo” (ex.: email em Fase 5 ou 6).

---

## 9. Estrutura Alvo do Repositório (Folder Tree + regras)

```
apps/web/
  app/
    (dashboard)/
      layout.tsx
      page.tsx
      clientes/
      catalogo/
      caixa/
      novo/
    (public)/
      agendar/[slug]/
        page.tsx
        layout.tsx
  src/
    modules/
      appointments/
        actions.ts
        usecases.ts
        repository.ts
        availability.ts
        schemas.ts
        types.ts
        components/
      clients/
        actions.ts
        usecases.ts
        repository.ts
        schemas.ts
        types.ts
      services/
      finance/
      settings/
      auth/
      notifications/
    shared/
      supabase/
        client.ts
      errors/
        AppError.ts
      ui/
      utils/
      types/
```

**Regras:**

* `page.tsx` não renomear.
* /app sem query e sem supabase client.
* Supabase client centralizado e somente em repository.
* Actions validam com Zod.

---

## 10. Estratégia de PRs (pequenos, reversíveis)

* PR 0: Baseline + CI
* PR 1: P0 fixes (notes/status) no código
* PR 2A: tenant_id UUID + FK (+ types no mesmo PR)
* PR 2B: service_id + relatório duplicidade + backfill (+ types)
* PR 2C: status backfill + constraint (+ types) + remover compat
* PR 2D: RPC booking público + RLS policies
* PR 3: errors + Zod
* PR 4: modularização por domínio (appointments → clients → services → finance)
* PR 5: layouts + design system
* PR 6: robustez do agendamento (availability + lock)
* PR 7: financeiro ledger
* PR 8: notificações (estrutura)

---

## 11. Plano de Validação e Qualidade

### 11.1 Comandos obrigatórios

* `pnpm install`
* `pnpm lint`
* `pnpm check-types`
* `pnpm build`

### 11.2 Smoke tests manuais

1. Cliente: criar + editar observações.
2. Agendamento interno: criar → aparece na agenda.
3. Concluir: status `completed` (ou canônico) + cria transação.
4. Caixa: total = ledger (transactions).
5. Público `/agendar/[slug]`: cria agendamento via RPC.

### 11.3 Testes automatizados desejáveis

* Unit: Zod schemas, cálculo de slots, state machine de status.
* Integration: repositories (mock supabase client).
* E2E (Playwright): fluxos principais.

---

## 12. Riscos e Mitigações

* tenant_id TEXT→UUID: pré-check, rollback, migration por etapas.
* backfill service_id: relatório duplicidade obrigatório + mapping.
* RLS público: preferir RPC, policies mínimas e restritas.
* status constraint: verificar valores distintos antes de travar.
* layout route groups: smoke tests por rota.
* timezone: padronizar UTC + testes em datas limite.

---

## 13. Apêndice: Checklist “Enterprise Ready”

* [ ] Ambiente reprodutível + CI verde
* [ ] Types regenerados após migrations
* [ ] DB Contract + Required/Optional + validação
* [ ] tenant_id UUID + FK
* [ ] booking público via RPC + RLS seguro
* [ ] Status canônico + constraint + transições
* [ ] Modularização: repository/usecases/actions por domínio
* [ ] Zod em todas actions
* [ ] Layouts e UI consistentes
* [ ] Agendamento robusto (slots + lock)
* [ ] Caixa ledger (transactions)
* [ ] Testes mínimos (unit + e2e básico)
