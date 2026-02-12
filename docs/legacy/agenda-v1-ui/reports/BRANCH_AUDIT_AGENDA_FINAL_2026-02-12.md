# Auditoria Final da Branch Agenda (Pré-PR)
Data: 2026-02-12  
Escopo: auditoria completa da branch `agenda-v1-ui` contra `main`, incluindo código, banco, integrações, modularidade e prontidão de produção.

## 1) Metodologia e cobertura

1. Inspeção estrutural da branch
- Commits analisados: **235** (`main..HEAD`)
- Arquivos tocados na branch: **175**
- Delta aproximado: **+26.422 / -3.802 linhas**

2. Distribuição do escopo por área (arquivos)
- `apps/web/app`: 50
- `apps/web/components`: 25
- `apps/web/src`: 23
- `supabase/migrations`: 18
- `docs`: 34

3. Validações executadas
```powershell
pnpm --filter web lint
pnpm --filter web build
pnpm lint
pnpm build
```
Resultado: **tudo OK** (sem erro).

4. Artefatos de referência (analisados por conteúdo)
- Índice consolidado: `docs/legacy/agenda-v1-ui/LEGACY_REFERENCE_INDEX.md`
- HTML/HTM auditados:
  - `docs/legacy/agenda-v1-ui/ui-decisions/Visão da Nova Tela Agenda.htm`
  - `docs/legacy/agenda-v1-ui/ui-decisions/prancha-de-calendario.html`
  - `docs/legacy/agenda-v1-ui/ui-decisions/Visão da Nova Tela de Fomulário Agendamento Interno.htm`
  - `docs/legacy/agenda-v1-ui/ui-decisions/Visão da Nova Tela de Atendimento.htm`
  - `docs/legacy/agenda-v1-ui/ui-decisions/Visão da Nova Tela de Novo Cliente.htm`
  - `docs/legacy/agenda-v1-ui/ui-decisions/Visão da Nova Telas de Lista de Clientes e Detalhes de Clientes.htm`
- Referência visual complementar:
  - `docs/legacy/agenda-v1-ui/ui-decisions/Auditoria Visual – Estúdio Corpo & Alma Humanizado.pdf`

---

## 2) Resultado executivo (estado atual)

1. Qualidade técnica
- Lint: **OK**
- Build: **OK**
- Typecheck via build Next: **OK**

2. Produto (agenda + público)
- Fluxos principais de agenda interna e agendamento público: **funcionais**
- Fluxo de pagamento MP (Pix/cartão) + webhook assinado: **implementado**
- Taxa de deslocamento automática por endereço: **implementada**
- Gestão de disponibilidade (calendário + bloqueios + escala): **implementada**

3. Banco de dados
- Migrations da branch cobrem o modelo final de agenda/pagamento/clientes.
- Foi adicionada hardening migration de anti-duplicidade por telefone normalizado.

4. Prontidão para PR
- **Apta para abrir PR draft**.
- Produção 100% depende de checklist operacional (seção 8).

---

## 3) O que foi auditado por domínio

## 3.1 Agenda interna (dia/semana/mês)
- Revisada renderização de cards, status (agendamento + financeiro), modal de detalhes e navegação.
- Revisados ajustes de bloqueio/plantão e integração com disponibilidade.
- Validado comportamento de cancelamento e atualização de UI.

## 3.2 Gestão de agenda (disponibilidade)
- Revisado módulo de bloqueios + gerador de escala.
- Revisada tipagem e compatibilidade de `block_type` e `is_full_day`.
- Revisada integração com disponibilidade pública.

## 3.3 Agendamento público
- Revisadas etapas de jornada pública e persistência dos dados.
- Revisada busca por cliente existente via telefone.
- Revisada consistência de endereço e cálculo de deslocamento.

## 3.4 Pagamentos (MP)
- Revisadas ações de pagamento no fluxo público.
- Revisada rota de webhook com validação de assinatura.
- Revisado update de status financeiro em `appointment_payments`/`appointments`.

## 3.5 Clientes e dados de contato
- Revisadas rotas/repositórios/formulários de cliente.
- Revisado risco de duplicidade por telefone e tratamentos aplicados.

## 3.6 Documentação
- Revisados `REPORT_EXECUCAO...`, `MANUAL_RAPIDO`, `README`, API docs.
- Adicionados documentos dedicados de integrações (técnico e operacional).

---

## 4) Ações corretivas executadas nesta auditoria (pente-fino)

1. Modularidade/higiene
- Extração do voucher overlay para componente dedicado:
  - `apps/web/app/(public)/agendar/[slug]/components/voucher-overlay.tsx`
- Redução de complexidade local do `booking-flow.tsx`.

2. Padronização de telefone
- Novo utilitário compartilhado:
  - `apps/web/src/shared/phone.ts`
- Aplicado em:
  - `apps/web/app/(public)/agendar/[slug]/booking-flow.tsx`
  - `apps/web/app/(dashboard)/novo/appointment-form.tsx`
  - `apps/web/app/(dashboard)/clientes/novo/page.tsx`
  - `apps/web/app/(public)/agendar/[slug]/public-actions/helpers.ts`
  - `apps/web/src/modules/clients/repository.ts`

3. Hardening de deduplicação por telefone
- Nova migration:
  - `supabase/migrations/20260212113000_normalize_client_phone_uniqueness.sql`
- A migration:
  - cria função SQL de normalização de telefone;
  - cria índices de lookup por telefone normalizado;
  - faz merge de clientes duplicados por tenant+telefone;
  - atualiza FKs (`appointments`, `client_addresses`, `client_phones`, `client_emails`, `client_health_items`);
  - cria índice único por telefone normalizado (`clients_tenant_phone_digits_unique`).

4. Documentação de integrações
- Técnico:
  - `docs/integrations/INTEGRATIONS_TECNICO.md`
- Operacional:
  - `docs/integrations/INTEGRATIONS_GUIA_OPERACIONAL.md`
- Inventário/manual/readme atualizados para apontar integrações:
  - `README.md`
  - `MANUAL_RAPIDO.md`
  - `docs/legacy/agenda-v1-ui/diagnostics/REPO_INVENTORY.md`

---

## 5) Auditoria de banco (consistência e cobertura)

## Cobertura de dados necessários ao produto
1. Agenda e disponibilidade
- `availability_blocks` com `block_type` e `is_full_day`: **coberto**

2. Pagamentos
- `appointments.payment_status` + metadados + `appointment_payments`: **coberto**

3. Domicílio
- `appointments.displacement_fee` e `appointments.displacement_distance_km`: **coberto**

4. Clientes
- Estrutura com endereços, múltiplos contatos e saúde: **coberta**

## Risco principal identificado e mitigado
- Duplicidade de cliente por variação de formatação de telefone.
- Mitigação aplicada:
  - normalização em código;
  - dedupe/constraint em DB via migration nova.

## Consultas recomendadas para validação pós-migration (local e remoto)
```sql
-- 1) duplicidade residual por telefone normalizado
select
  tenant_id,
  regexp_replace(coalesce(phone, ''), '\D', '', 'g') as phone_digits,
  count(*) as total
from public.clients
where regexp_replace(coalesce(phone, ''), '\D', '', 'g') <> ''
group by tenant_id, regexp_replace(coalesce(phone, ''), '\D', '', 'g')
having count(*) > 1
order by total desc;

-- 2) agendamentos sem taxa de deslocamento preenchida (quando domicílio)
select count(*) as domicilios_sem_taxa
from public.appointments
where is_home_visit = true
  and displacement_fee is null;
```

---

## 6) Auditoria de modularidade e higiene

## O que está bom
1. Separação de responsabilidades avançou:
- `public-actions/{appointments,clients,payments,helpers}.ts`
- `shared/displacement/{rules,service}.ts`
- `shared/phone.ts`
- `voucher-overlay.tsx`

2. Design system e UI base:
- adoção consistente de componentes `ui/*` e shells.

## O que ainda é débito técnico (não bloqueante de PR)
1. Arquivos grandes (manutenção difícil):
- `apps/web/app/(public)/agendar/[slug]/booking-flow.tsx`
- `apps/web/src/modules/appointments/actions.ts`
- `apps/web/components/mobile-agenda.tsx`
- `apps/web/components/availability-manager.tsx`

2. Recomendação para próxima branch (atendimento)
- quebrar `booking-flow` por step components + hooks.
- dividir `appointments/actions.ts` por domínio (`internal/public/availability/payment`).

---

## 7) Tailwind v4 e padronização visual

1. Situação atual
- Sem erro de lint/build.
- Ajustes canônicos recentes aplicados na tela pública.

2. Risco residual
- Possíveis classes arbitrárias residuais em telas legadas não cobertas por warnings atuais.
- Não bloqueia PR, mas deve entrar no backlog de limpeza contínua.

---

## 8) Checklist de produção (faltas operacionais)

1. Banco/migrations
- Aplicar as migrations pendentes no ambiente de destino:
  - `20260212100000_displacement_fee_rules.sql`
  - `20260212113000_normalize_client_phone_uniqueness.sql`

2. Variáveis por ambiente (Vercel)
- Confirmar segregação Preview vs Production:
  - Supabase
  - Google Maps
  - Mercado Pago (tokens e webhook secret)

3. Webhook Mercado Pago
- Confirmar URL por ambiente:
  - Preview: `https://dev.public.corpoealmahumanizado.com.br/api/mercadopago/webhook`
  - Production: `https://public.corpoealmahumanizado.com.br/api/mercadopago/webhook`
- Confirmar assinatura ativa e validada.

4. Smoke test obrigatório pós-deploy
- Agendar público completo (Pix e cartão).
- Simular/confirmar webhook.
- Verificar atualização de status financeiro.

---

## 9) Conclusão final

1. A branch foi auditada no escopo completo (`main..HEAD`) com validação de qualidade (lint/build) e revisão dos domínios críticos.
2. Foram aplicadas correções de hardening/modularidade e documentação de integrações.
3. Estado atual: **pronta para PR draft**.
4. Para marcar “produção 100%”, restam ações operacionais de ambiente/deploy (seção 8), não bloqueios de código.
