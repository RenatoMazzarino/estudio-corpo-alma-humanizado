# REFACTOR_PLAN

Plano faseado com PRs pequenos e testáveis. Cada tarefa inclui objetivo, arquivos, passos, critérios e testes.

## Fase 0 — Hardening (sem mudança de comportamento)

### 0.1 Padronizar ambiente e scripts
- **Objetivo:** garantir que build/lint/typecheck rodam em qualquer máquina.
- **Arquivos afetados:** `package.json`, `apps/web/package.json`, (opcional) `.nvmrc` ou `.tool-versions`.
- **Passos:**
  1. Definir versão de Node (>=18) em `.nvmrc`.
  2. Adicionar script `supabase:types` no root.
  3. Documentar comandos em `docs/legacy/agenda-v1-ui/diagnostics/AUDIT_LOGS.md`.
- **Critérios de aceitação:** `pnpm install`, `pnpm lint`, `pnpm check-types`, `pnpm build` executam sem erro.
- **Como testar:** rodar os scripts do root.

### 0.2 Padronizar Supabase client + error handling
- **Objetivo:** centralizar criação de client e erros.
- **Arquivos afetados:** `apps/web/lib/supabase/server.ts`, `apps/web/lib/supabase/client.ts`, novos `apps/web/src/shared/lib/supabase/*`.
- **Passos:**
  1. Criar helper `handleSupabaseError`.
  2. Fornecer client tipado (`Database`).
  3. Usar helper nas ações existentes (sem alterar comportamento).
- **Critérios de aceitação:** todas as ações retornam erro consistente quando o DB falha.
- **Como testar:** simular erro (ex.: inserir payload inválido) e verificar mensagens.

### 0.3 Regenerar types a partir das migrations
- **Objetivo:** eliminar drift entre DB e types.
- **Arquivos afetados:** `apps/web/lib/supabase/types.ts`.
- **Passos:**
  1. Executar `supabase gen types` contra a base local.
  2. Commitar o arquivo gerado.
- **Critérios de aceitação:** `business_hours` e demais tabelas aparecem no types.
- **Como testar:** `pnpm check-types`.

## Fase 1 — Modularização semântica

### 1.1 Criar módulos por domínio (appointments, clients, services)
- **Objetivo:** tirar lógica de data access das páginas.
- **Arquivos afetados:** `apps/web/src/modules/*`, `apps/web/app/*`.
- **Passos:**
  1. Criar `repository.ts` por domínio.
  2. Mover selects/updates/insert dos pages/actions para repositories.
  3. Páginas chamam repositories e actions por domínio.
- **Critérios de aceitação:** páginas não possuem queries diretas ao Supabase.
- **Como testar:** navegar pelas rotas existentes e validar render.

### 1.2 Zod schemas para inputs
- **Objetivo:** validar `FormData` e payloads client → server.
- **Arquivos afetados:** `apps/web/src/modules/*/schemas.ts`, server actions.
- **Passos:**
  1. Definir schemas para criação de cliente, agendamento e serviço.
  2. Validar e normalizar antes de escrever no DB.
- **Critérios de aceitação:** inputs inválidos retornam erro claro.
- **Como testar:** enviar payloads inválidos e validar erro.

### 1.3 Resolver tenant de forma centralizada
- **Objetivo:** eliminar `FIXED_TENANT_ID` espalhado.
- **Arquivos afetados:** `apps/web/lib/tenant-context.ts`, actions, repositories.
- **Passos:**
  1. Criar `getTenantId()` (por sessão ou slug).
  2. Substituir `FIXED_TENANT_ID` gradualmente.
- **Critérios de aceitação:** todas as queries usam tenant definido centralmente.
- **Como testar:** abrir `/agendar/[slug]` e backoffice com tenant correto.

## Fase 2 — Unificação de UI

### 2.1 Separar layout público vs dashboard
- **Objetivo:** remover duplicação de shells.
- **Arquivos afetados:** `apps/web/app/layout.tsx`, `apps/web/components/app-shell.tsx`, rotas em `app/`.
- **Passos:**
  1. Criar route groups `(public)` e `(dashboard)`.
  2. `AppShell` vira layout de `(dashboard)`.
  3. Remover duplicação de `BottomNav`.
- **Critérios de aceitação:** cada rota tem layout único, sem duplicar nav.
- **Como testar:** navegar por `/`, `/clientes`, `/agendar/[slug]`.

### 2.2 Design system mínimo
- **Objetivo:** padronizar visual e reduzir CSS duplicado.
- **Arquivos afetados:** `apps/web/src/shared/ui/*`, `apps/web/app/globals.css`.
- **Passos:**
  1. Criar componentes base (Button, Input, Card, Modal).
  2. Trocar uso direto de Tailwind repetido em páginas principais.
- **Critérios de aceitação:** componentes reutilizados nas telas principais.
- **Como testar:** revisão visual das telas.

### 2.3 Limpeza de componentes não usados
- **Objetivo:** reduzir ruído e dívida técnica.
- **Arquivos afetados:** `apps/web/components/*`, `apps/web/app/page.module.css`, `packages/ui/*`.
- **Passos:**
  1. Remover/arquivar componentes não utilizados ou migrá-los para o novo módulo.
  2. Deletar CSS legado não referenciado.
- **Critérios de aceitação:** `rg` não encontra referências órfãs.
- **Como testar:** `pnpm lint` e smoke test UI.

## Fase 3 — Alinhamento DB ⇄ Código

### 3.1 Aplicar migrations críticas
- **Objetivo:** normalizar tenant_id, status e FKs.
- **Arquivos afetados:** `supabase/migrations/*`, actions e repositories.
- **Passos:**
  1. Executar migrations do `docs/legacy/agenda-v1-ui/diagnostics/MIGRATION_PLAN.md`.
  2. Ajustar queries para novos campos (`service_id`, `tenant_id` uuid).
- **Critérios de aceitação:** schema e código 100% consistentes.
- **Como testar:** rodar fluxo completo (novo agendamento, finalizar, caixa).

### 3.2 Corrigir uso de notas do cliente
- **Objetivo:** eliminar `notes` inexistente.
- **Arquivos afetados:** `apps/web/app/clientes/*`, repositories.
- **Passos:**
  1. Trocar para `observacoes_gerais` no código.
  2. (Opcional) Criar alias DB se necessário.
- **Critérios de aceitação:** criação/edição de notas funciona e persiste.
- **Como testar:** criar cliente + editar notas.

## Fase 4 — Robustez do agendamento

### 4.1 Serviço de disponibilidade único
- **Objetivo:** única fonte de verdade para cálculo de slots.
- **Arquivos afetados:** `appointments/availability.ts`, `novo/appointment-actions.ts`.
- **Passos:**
  1. Extrair cálculo de slots para `appointments` module.
  2. Reusar em `/agendar` e `/novo`.
- **Critérios de aceitação:** slots iguais para público e interno.
- **Como testar:** comparar disponibilidade em ambas as telas.

### 4.2 Lock/Collision check
- **Objetivo:** evitar double booking.
- **Arquivos afetados:** `appointments/actions.ts`, DB (constraint/tx).
- **Passos:**
  1. Validar colisão no server action.
  2. (Opcional) usar transaction/lock por horário.
- **Critérios de aceitação:** dois inserts simultâneos não geram conflito.
- **Como testar:** simular dois agendamentos no mesmo horário.

### 4.3 Cancelamento/rea gendamento + logs
- **Objetivo:** trilha auditável.
- **Arquivos afetados:** `appointments` module, DB (tabela `appointment_events`).
- **Passos:**
  1. Criar tabela de eventos.
  2. Registrar mudanças de status e remarcar horários.
- **Critérios de aceitação:** histórico completo por agendamento.
- **Como testar:** cancelar e remarcar, validar eventos.

## Fase 5 — Financeiro/Caixa

### 5.1 Caixa lendo transactions
- **Objetivo:** caixa baseado em ledger real.
- **Arquivos afetados:** `apps/web/app/caixa/page.tsx`, `finance` module.
- **Passos:**
  1. Ajustar queries para `transactions`.
  2. Conciliar com `appointments`.
- **Critérios de aceitação:** totais batem com transações.
- **Como testar:** finalizar atendimento e validar caixa.

### 5.2 Reconciliação automática
- **Objetivo:** evitar divergência entre preço do agendamento e transação.
- **Arquivos afetados:** `finance` module, DB triggers (opcional).
- **Passos:**
  1. Criar regra: `appointment.completed -> transaction`.
  2. Exibir inconsistências no caixa.
- **Critérios de aceitação:** divergências detectadas e exibidas.
- **Como testar:** finalizar com valor diferente.

## Fase 6 — Notificações

### 6.1 Estrutura de fila/eventos
- **Objetivo:** preparar notificações sem integração externa.
- **Arquivos afetados:** `notifications` module, DB (tabela `notification_jobs`).
- **Passos:**
  1. Criar tabela de jobs e status.
  2. Gerar job ao criar/cancelar agendamento.
- **Critérios de aceitação:** jobs aparecem no DB.
- **Como testar:** criar/cancelar agendamento e inspecionar tabela.

### 6.2 Templates básicos
- **Objetivo:** mensagens padronizadas (WhatsApp/SMS).
- **Arquivos afetados:** `notifications/templates/*`.
- **Passos:**
  1. Criar templates e placeholders.
  2. Renderizar conteúdo no job.
- **Critérios de aceitação:** templates renderizam corretamente.
- **Como testar:** gerar job e verificar payload.
