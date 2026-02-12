# MASTER_PLAN_ENTERPRISE (V2 — Branch única, commits por grupos, 1 PR)

**Data:** 2026-01-30  
**Escopo:** repositório `/mnt/c/Users/renat/projetos_de_dev/estudio-corpo-alma-humanizado`  
**Objetivo:** plano unificado e executável para elevar o repo a padrão enterprise, com modularização por domínio e paridade total **DB ⇄ Código**.  
**Base factual:** auditoria aponta monorepo Turbo + Next App Router + Supabase, com arquitetura fragmentada, divergências DB⇄Código (notes/status/types), regras de agendamento parciais e risco de segurança por RLS/policies inconsistentes.

---

## 0. Estratégia de Branch, Commits em Grupos e PR Único (mudança solicitada)

### 0.1 Branch única

* Criar **uma** branch a partir da `main` (ou `master`):

  * sugestão de nome: `feat/master-plan-enterprise`
* Tudo será implementado **dentro dessa branch**, em **commits agrupados por fase**.
* Somente após concluir todos os grupos (com checks + smoke tests), abrir **um único PR**.

### 0.2 Commits em grupos (reversíveis)

Cada fase vira um “grupo de commits” com prefixo padronizado no título do commit:

* `G0/*` Baseline e reprodutibilidade
* `G1/*` Correções P0 no código (sem migrations)
* `G2A/*` Migration: `service_id`
* `G2B/*` Migration: `tenant_id` TEXT→UUID+FK (settings/blocks/transactions)
* `G2C/*` Migration: status (`done→completed`) + constraint
* `G2D/*` Migration: índices core
* `G2E/*` RLS/policies + escrita pública segura (RPC)
* `G3/*` Erros + Zod + validação server-side
* `G4/*` Modularização por domínio (src/modules)
* `G5/*` Layout/UI (route groups, AppShell)
* `G6/*` Robustez agendamento (slots unificados + lock)
* `G7/*` Financeiro ledger (transactions = fonte de verdade)
* `G8/*` Notificações (estrutura)

**Regra de ouro:** ao fechar cada grupo, rodar:

* `pnpm lint`
* `pnpm check-types`
* `pnpm build`
* smoke tests do grupo

Se algum grupo der problema, você consegue:

* `git revert` do(s) commit(s) daquele grupo, sem jogar o trabalho inteiro fora.

### 0.3 PR único no final

No PR final:

* Descrever todos os grupos (G0…G8) como checklist
* Anexar evidências (prints/saídas de CI, logs de migrations, smoke tests executados)
* Garantir que migrations e regeneração de types ficaram no mesmo PR (mesmo sendo PR único, isso fica preservado por commits).

  * A auditoria exige regenerar types porque há drift, inclusive `business_hours` não aparece no TS.

---

## 1. Executive Summary

* Plano mestre **executável** e reversível por grupos de commits (um PR ao final).
* Prioriza P0:

  1. corrigir `clients.notes` (inexistente) para `clients.observacoes_gerais`
  2. unificar status (`done` vs `completed`) que quebra caixa/histórico
  3. ajustar RLS/policies e tenant para não quebrar `/agendar/[slug]`
* Depois, migrations críticas com ordem segura (service_id → tenant_id uuid → status constraint → índices → RLS).
* Arquitetura alvo: **domain-first**, `/app` só compõe; regra de negócio e DB access em `src/modules/<domínio>`.

---

## 2. Estado Atual (auditoria + schema)

### 2.1 Repo

* Monorepo Turbo / Next.js App Router / Supabase, com: layouts duplicados, ações espalhadas, componentes não usados.
* Pontos de rotas e ações relevantes incluem áreas de dashboard, público `/agendar/[slug]` e ações “admin” específicas (ex.: atendimento/escala) — isso influencia o desenho modular e RLS.

### 2.2 DB — fatos importantes do schema

* `clients` tem `observacoes_gerais` (não existe `notes`).
* `appointments` hoje:

  * não tem `service_id`, só `service_name`
  * `status` é TEXT com default `'pending'`
  * `payment_status` já tem CHECK (`pending/paid/partial/refunded`)
* `settings`, `availability_blocks`, `transactions` usam `tenant_id` como **TEXT** sem FK (diferente do resto do schema que usa UUID+FK).
* RLS:

  * habilitado em `services`, `settings`, `availability_blocks`, `business_hours`, `transactions`
  * **não habilitado** nas migrations para `clients` e `appointments`

### 2.3 DB ⇄ Código (divergências reais)

* Uso de `clients.notes` no código quebra insert/update, porque coluna não existe.
* Status divergente (`done` vs `completed`) afeta caixa/histórico.
* Drift de types: `business_hours` está no schema, mas não aparece no TS gerado atualmente.
* `transactions` é escrito em server action, mas não é lido no caixa; caixa usa appointments (inconsistência de “fonte da verdade”).

---

## 3. Objetivos e Escopo

### 3.1 IN SCOPE

1. **Paridade total DB ⇄ Código**

   * nenhum campo usado no código que não exista no DB
   * nenhum campo no DB sem decisão explícita (UI-managed / System-managed / Planned / Remove)
2. **Multi-tenant estrutural (base)**

   * `tenant_id` consistente e com integridade referencial (UUID+FK em tudo)
3. **Normalização de status**

   * corrigir divergência `done` vs `completed`
   * travar valores permitidos no DB via CHECK/enum após limpeza
4. **Types sincronizados**

   * regeneração após migrations (drift atual é real)
5. **Arquitetura enterprise modular**

   * `/app` como composição, lógica em `src/modules`
6. **Qualidade e reprodutibilidade**

   * lint/typecheck/build rodando no CI
7. **Agendamento robusto**

   * disponibilidade unificada + prevenção de double booking
8. **Financeiro/caixa com ledger**

   * `transactions` como fonte de verdade e reconciliação com appointments

### 3.2 OUT OF SCOPE imediato

* Integrações reais externas (WhatsApp/pagamento), apenas estrutura.
* RBAC completo e UI multi-tenant: preparar base, não entregar painel de multi-tenancy.

---

## 4. Princípios de Arquitetura e Padrões Enterprise

* **Domain-first:** lógica e dados em `src/modules/<domínio>`
* **/app = composition layer:** páginas só orquestram (sem `supabase.from()` direto)
* **Schema como fonte da verdade:** migrations → types → código

  * drift existe hoje e precisa virar “impossível” após G2.
* **Camadas por domínio (obrigatório):**

  1. `repository.ts` (DB only)
  2. `usecases.ts` (regras de negócio)
  3. `actions.ts` (entrada/validação/auth/fluxo)
* **Validação central:** Zod em toda action (FormData/JSON)
* **Erro padronizado:** `AppError` + `mapSupabaseError` + contrato de retorno único
* **Server-first:** regra de negócio no server para evitar divergência (público vs interno)
* **RLS consciente:** público e admin separados; escrita pública preferencialmente via RPC
* **Naming:** kebab-case arquivos; PascalCase componentes; `page.tsx` mantido (Next)
* **Qualidade:** CI mínimo, commit groups, smoke tests por fase

---

## 5. Matriz de Prioridades (P0/P1/P2)

### P0 (bloqueia)

1. `clients.notes` → `clients.observacoes_gerais` (corrigir no código).
2. Status `done` vs `completed` (corrigir escrita/leitura).
3. RLS/policies/tenant contraditórios com `/agendar/[slug]`.

### P1 (estabilidade)

1. Drift schema vs types (ex.: `business_hours`).
2. Agendamento interno ignora disponibilidade e cria duplicados.
3. Ações sem tratamento de erro.
4. `tenant_id` TEXT sem FK em settings/blocks/transactions.

### P2 (maturidade)

* Layout duplicado e UI inconsistente.
* Componentes/CSS não usados.
* SearchParams / Next inconsistentes.

---

## 6. Definições Canônicas (evita drift)

### 6.1 AppointmentStatus (canônico V2 — alinhado ao DB atual)

**Fato do DB hoje:** `appointments.status` é TEXT com default `'pending'`.  
**Fato do bug:** código usa valores divergentes (`done` vs `completed`).

**Alvo canônico (status):**

* `pending` (criado, aguardando atendimento/confirmação conforme regra do negócio)
* `confirmed` (confirmado, opcional — pode ser introduzido já no código mesmo antes de constraint)
* `in_progress` (atendimento iniciado)
* `completed` (atendimento finalizado)
* `canceled_by_client`
* `canceled_by_studio`
* `no_show`

**Compatibilidade temporária (somente até G2C):**

* aceitar leitura de `done` como `completed`
* nunca mais escrever `done` a partir do G1 (P0)

**Transições permitidas (state machine mínima):**

* `pending → confirmed | canceled_by_client | canceled_by_studio`
* `confirmed → in_progress | canceled_by_* | no_show`
* `in_progress → completed | canceled_by_* | no_show`
* `completed` terminal
* `no_show` terminal
* `canceled_*` terminal

**Fonte da verdade final:**

* CHECK constraint (ou enum) no DB + union type central no TS (ex.: `src/modules/appointments/types.ts`).

### 6.2 Required vs Optional (contrato mínimo de actions)

Conforme plano original:

* required: `client.name`, `client.phone`, `appointment.start_time`, `service_id`
* optional: email/endereço/cpf/etc conforme DB Contract

---

## 7. Plano Mestre por Fases (implementado como grupos de commits)

> Observação: abaixo eu mantenho “Fases” como organização mental, mas **na prática** você vai executar como `G0…G8` dentro de uma única branch.

---

### Fase 0 — Baseline e Reprodutibilidade (**G0/***)

**Objetivo:** repo rodar em qualquer máquina + CI executando lint/typecheck/build.

**Tarefas:**

* `.nvmrc` (Node 18+ ou 20 LTS)
* `engines` no `package.json` root (e `apps/web` se aplicável)
* scripts padronizados no root: `lint`, `check-types`, `build`, `format`
* GitHub Actions: cache pnpm + `pnpm install/lint/check-types/build`
* README com pré-requisitos (Node/pnpm/Supabase CLI/Docker)

**DoD:**

* CI verde com `pnpm install`, `pnpm lint`, `pnpm check-types`, `pnpm build`.

---

### Fase 1 — Correções P0 no Código + Contrato DB⇄Código (**G1/***)

**Objetivo:** corrigir falhas críticas **sem migrations**.

#### 1.1 Corrigir `notes` → `observacoes_gerais`

**Por quê:** DB tem `observacoes_gerais` e auditoria confirmou `clients.notes` inexistente.

**Alvos mínimos (confirmados pela auditoria):**

* `apps/web/app/clientes/novo/actions.ts`
* `apps/web/app/clientes/[id]/actions.ts`
* `apps/web/app/clientes/[id]/page.tsx`

**Regras:**

* nunca mais enviar `notes` em insert/update
* garantir que formulário de cliente escreve em `observacoes_gerais`
* garantir que a UI lê `observacoes_gerais`

#### 1.2 Normalizar status no código (parar de escrever `done`)

**Por quê:** hoje isso quebra caixa/histórico.

**Ações:**

* criar tipo central `AppointmentStatus` (union) e usar em toda a app
* remover escrita de `done`
* padronizar escrita para `completed` ao finalizar
* manter “leitura compatível” temporária (mapear `done` → `completed`) até G2C

#### 1.3 Ajustes colaterais P0/P1 imediatos (sem migrations)

* corrigir `revalidatePath` apontando para rotas inexistentes (auditoria detectou `/admin/servicos`).
* padronizar checagem de `error` em updates/inserts nas server actions mais críticas (evitar falha silenciosa).

**DoD:**

* sem referências a `notes` no código
* sem escrita de `done` (somente `completed` para finalização)
* criar/editar cliente salva observações
* finalizar atendimento reflete corretamente em histórico/caixa (mesmo antes de migrations)

---

### Fase 2 — Migrations Críticas + Types + RLS (G2A…G2E)

> **Mudança importante:** ordem alinhada ao `MIGRATION_PLAN` anexado.  
> **Regra obrigatória:** toda alteração de schema termina com **regeneração de types** no mesmo grupo. Drift existe hoje.

---

#### Fase 2A — `service_id` em appointments (**G2A/***)

**Motivação:** hoje `appointments` só tem `service_name`; isso destrói integridade e dificulta relatórios/mudanças no catálogo.

**Passo 0 (pré-check obrigatório): duplicidade de serviços**

* relatório de duplicidade por `(tenant_id, name)` antes do backfill (se houver duplicados, trava o backfill automático)

**Migration (conforme MIGRATION_PLAN):**

* adicionar `appointments.service_id uuid`
* backfill por `(tenant_id, service_name) -> services.id` somente quando nome for unívoco
* FK `appointments.service_id -> services.id (ON DELETE SET NULL)`
* manter `service_name` como snapshot histórico

**Pós-migration:**

* regenerar `apps/web/lib/supabase/types.ts`

**DoD:**

* coluna existe + FK criada
* backfill realizado (ou relatório + justificativa formal)
* types regenerados e build OK

---

#### Fase 2B — Alinhar `tenant_id` TEXT → UUID+FK (**G2B/***)

**Fato:** `settings`, `availability_blocks`, `transactions` usam `tenant_id` TEXT e sem FK; isso é inconsistente com o resto do schema.

**Migration (estratégia segura do MIGRATION_PLAN):**

1. adicionar `tenant_id_uuid uuid`
2. popular `tenant_id_uuid = tenant_id::uuid`
3. adicionar FK `tenant_id_uuid -> tenants(id)`
4. ajustar policies RLS para usar `tenant_id_uuid`
5. remover coluna antiga ou renomear (`tenant_id_uuid` vira `tenant_id`)

**Pré-check obrigatório:**

* SELECT para detectar linhas com cast inválido antes de dropar coluna antiga

**Pós-migration:**

* regenerar types

**DoD:**

* não existe mais `tenant_id` TEXT nessas tabelas
* policies atualizadas
* types regenerados + build OK

---

#### Fase 2C — Normalizar status + constraint (e matar compat) (**G2C/***)

**Problema real:** divergência `done` vs `completed`.  
**DB hoje:** `status` é TEXT default `pending` sem constraint.

**Etapas:**

1. query de distinct status (pré-check) — capturar todos valores existentes
2. backfill `done → completed`
3. criar CHECK constraint (ou enum) para valores permitidos
4. remover fallback do código para `done` (a partir daqui, `done` não existe mais)

**Pós-migration:**

* regenerar types

**DoD:**

* DB impede status inválido
* código não tem compat para `done`

---

#### Fase 2D — Índices core (**G2D/***)

**Objetivo:** performance para dashboard e consultas por período/tenant.

Conforme MIGRATION_PLAN:

* `appointments (tenant_id, start_time)`
* `appointments (tenant_id, status)`
* `clients (tenant_id, name)`
* `services (tenant_id, name)`
* `availability_blocks (tenant_id, start_time)`
* `transactions (tenant_id, created_at)`

**DoD:**

* índices criados
* queries principais com `EXPLAIN` mostrando uso (quando aplicável)

---

#### Fase 2E — RLS/policies + Escrita pública segura via RPC (**G2E/***)

**Fatos do schema hoje:**

* RLS habilitado em algumas tabelas “admin”, mas não em `appointments` e `clients`.
  **Fato do problema:** policies fixas conflitam com `/agendar/[slug]` e multi-tenant estrutural.

**Decisão enterprise (mantida):** escrita pública **via RPC**.

**Trabalho de DB:**

1. habilitar RLS para `appointments` e `clients` (como MIGRATION_PLAN recomenda)
2. criar policies administrativas por tenant (MVP com tenant fixo, mas estrutura pronta)
3. criar policies públicas mínimas de leitura (tenant/services/business_hours “safe”)
4. bloquear insert direto público em `appointments` e expor apenas RPC

**RPC alvo:**

* `create_public_appointment(tenant_slug, service_id, start_time, client_payload...)`

  * resolve `tenant_id` pelo slug
  * valida slot (sem colisão)
  * aplica buffers (settings/service)
  * grava appointment
  * retorna `appointment_id`

**Validação:**

* `/agendar/[slug]` funcionando via RPC
* dashboard funcionando
* público não lê dados sensíveis

**DoD:**

* RLS habilitado em `appointments`/`clients`
* fluxo público e interno funcionando
* tenant/policies coerentes

---

### Fase 3 — Types, Erros e Validação (**G3/***)

**Objetivo:** padronizar tratamento de erro e validação; impedir entradas inválidas.

**Tarefas:**

* consolidar `AppError`, `mapSupabaseError`, contrato de retorno
* criar Zod schemas:

  * clients (create/update)
  * services (create/update)
  * appointments (create/confirm/start/complete/cancel)
* garantir: nenhuma action escreve no DB sem validar payload
* atacar “falhas silenciosas” identificadas na auditoria (server actions sem tratamento).

**DoD:**

* actions com Zod obrigatório
* erros padronizados na UI
* lint/typecheck/build OK

---

### Fase 4 — Modularização por Domínio (**G4/***)

**Objetivo:** migrar lógica para `src/modules` com camadas repository/usecases/actions.

**Ordem de migração (baseada em impacto e divergências):**

1. appointments (inclui público `/agendar`)
2. clients
3. services
4. finance
5. settings/auth/notifications (infra)

**Regras duras:**

* páginas não fazem `supabase.from()` diretamente
* supabase client só aparece em `repository.ts`
* regras de agendamento e validações só em `usecases`

**DoD:**

* Supabase acessado apenas via repositories
* /app apenas compõe e chama actions
* fluxo público e interno usam o mesmo core

---

### Fase 5 — UI/Layout e Design System mínimo (**G5/***)

**Objetivo:** eliminar duplicação e padronizar UI (problema P2 real).

**Tarefas:**

* route groups `(dashboard)` e `(public)` com layouts distintos
* unificar AppShell no layout do dashboard
* remover duplicação de BottomNav
* design system mínimo: Button/Input/Card/Modal/Toast
* remover/migrar componentes legacy e arquivos não usados (com decisão explícita)

**DoD:**

* layout sem duplicação
* padrões visuais consistentes nas rotas principais

---

### Fase 6 — Robustez do Agendamento (**G6/***)

**Objetivo:** regras únicas e prevenção de double booking.

**Tarefas:**

* unificar cálculo de slots em `src/modules/appointments/availability.ts`
* reusar no fluxo interno e público
* implementar lock/transação server-side (evitar double booking)
* padronizar timezone (UTC) e serialização de datas
* corrigir bug P1: criação interna ignora disponibilidade e cria duplicados.

**DoD:**

* slots idênticos interno/público
* double booking prevenido
* buffers aplicados consistentemente

---

### Fase 7 — Financeiro/Caixa como Ledger (**G7/***)

**Objetivo:** caixa = `transactions` como fonte da verdade (hoje só escreve, não lê).

**Ledger rules (V2):**

* `transactions.type`: `income | expense | refund` (expandir schema atual se necessário)
* `amount` em centavos (mudar de numeric → int no futuro, se você quiser “enterprise real”)
* `appointment_id`:

  * obrigatório para income de atendimento concluído
  * opcional para ajustes (com description obrigatório)
* ao concluir atendimento: criar `income` obrigatório

**Tarefas:**

* `/caixa` passa a ler `transactions` como fonte de verdade
* reconciliar com appointments (sinalizar divergências)
* ajustes manuais com trilha de auditoria (opcional)

**DoD:**

* totais do caixa batem com ledger
* conclusão de atendimento sempre gera transação

---

### Fase 8 — Notificações (estrutura) (**G8/***)

**Objetivo:** preparar base para automação (sem provedor externo).

**Tarefas:**

* tabela `notification_jobs` + templates
* gerar jobs em: criar/cancelar/lembrar agendamento
* sem envio real (apenas queue/log)

**DoD:**

* jobs criados com payload consistente
* sem integração externa

---

## 8. DB ⇄ Código: DB Contract (decisões explícitas)

### 8.1 Divergências principais (decisões firmes)

* `clients.notes` vs `observacoes_gerais`: **padronizar no código para `observacoes_gerais`**.
* `done` vs `completed`: **status canônico e constraint após backfill**.
* `business_hours` ausente em types: **regeneração obrigatória pós-migration**.
* `tenant_id` TEXT sem FK: **migrar para UUID + FK**.
* RLS conflitando com `/agendar`: **policies públicas mínimas + escrita via RPC**.

### 8.2 Colunas no DB não usadas (decisão)

A auditoria detectou colunas sem uso (não significa remover agora — significa classificar):

* **Planned (não remover agora):**

  * `clients.email`, `data_nascimento`, `cpf`, `profissao`, `como_conheceu`
  * `settings.whatsapp_notification_number`
* **System-managed/auditáveis:**

  * `created_at` de várias tabelas
* **Ajuste de produto:**

  * `clients.health_tags` e `endereco_completo` aparecem na UI mas não têm tela de edição → decidir em G5/G4 se vira “editable” ou “read-only”.

(Se você quiser, eu também posso transformar essa seção numa matriz completa “tabela×coluna×classe×regra×fase alvo”, mas mantive aqui fiel ao que a auditoria apontou como gap objetivo.)

---

## 9. Estrutura Alvo do Repositório (folder tree + regras)

```
apps/web/
  app/
    (dashboard)/
      layout.tsx
      page.tsx
      clientes/
      caixa/
      novo/
      admin/
        atendimento/
        escala/
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

* `page.tsx` não renomear
* `/app` não faz query direta e não instancia supabase client
* supabase client centralizado e usado só em repositories
* actions validam com Zod

---

## 10. Validação e Qualidade

### 10.1 Comandos obrigatórios

* `pnpm install`
* `pnpm lint`
* `pnpm check-types`
* `pnpm build`

### 10.2 Smoke tests manuais (por grupos)

1. Cliente: criar + editar `observacoes_gerais`
2. Agendamento interno: criar → aparece na agenda
3. Concluir: status `completed` + cria transação
4. Caixa: total = ledger (`transactions`)
5. Público `/agendar/[slug]`: cria agendamento via RPC

### 10.3 Testes automatizados (depois do PR único, como evolução)

* Unit: Zod schemas, cálculo de slots, state machine de status
* Integration: repositories (mock supabase)
* E2E: Playwright nos fluxos principais

---

## 11. Riscos e Mitigações

* `tenant_id` TEXT→UUID: pré-check de cast, migration por etapas, rollback por commit group.
* backfill `service_id`: relatório de duplicidade obrigatório; mapping manual se necessário.
* status constraint: distinct status antes de travar; backfill `done→completed`.
* RLS público: risco de bloquear `/agendar`; mitigar com testes do fluxo público e admin em G2E.
* double booking: resolver com lock/transação server-side em G6.

---

## 12. Checklist “Enterprise Ready” (para fechar o PR único)

* [ ] G0: ambiente reprodutível + CI verde
* [ ] G1: P0 (observacoes/status) corrigidos
* [ ] G2A: `service_id` + types regenerados
* [ ] G2B: tenant_id UUID+FK em todas tabelas + types regenerados
* [ ] G2C: status constraint + sem compat `done`
* [ ] G2D: índices core
* [ ] G2E: RLS completo + fluxo público via RPC
* [ ] G3: Zod + AppError + sem falhas silenciosas
* [ ] G4: modularização repository/usecases/actions
* [ ] G5: layouts/UI sem duplicação
* [ ] G6: agendamento robusto (slots + lock)
* [ ] G7: caixa ledger (transactions)
* [ ] G8: notificações (estrutura)
