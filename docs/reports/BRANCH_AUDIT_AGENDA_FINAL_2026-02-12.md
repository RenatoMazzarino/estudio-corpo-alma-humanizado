# Auditoria Final da Branch Agenda (Pré-PR)
Data: 2026-02-12  
Escopo: revisão técnica da branch atual para validar prontidão de merge em `main` e produção.

## 1) Resultado objetivo
- Build: **OK**
- Lint: **OK**
- Tipagem: coberta dentro do `next build` (TypeScript passou)
- Fluxo de taxa de deslocamento: **OK com fallback operacional**
- Fluxo de voucher (overlay + download): **OK**
- Estado geral: **Apto para PR**, com pendências operacionais/documentais listadas abaixo.

## 2) Comandos executados na auditoria
```powershell
pnpm --filter web lint
pnpm --filter web build
pnpm lint
pnpm build
```
Todos passaram sem erro.

## 3) Correções aplicadas durante a auditoria
1. `apps/web/app/(public)/agendar/[slug]/booking-flow.tsx`
- Ajustes canônicos Tailwind v4 (classes sugeridas pelo IntelliSense).
- Voucher ajustado para overlay real sobre fundo escuro/transparente.
- Botão “Baixar imagem” corrigido (blob + objectURL + fallback iOS).

2. `apps/web/app/api/displacement-fee/route.ts`
- Em falha de Google Maps, a rota não retorna mais `422`.
- Retorna fallback com taxa mínima provisória (R$ 15,00), mantendo fluxo funcional.

3. `docs/ui-decisions/REPORT_EXECUCAO_NOVA_APARENCIA_V1_PRODUCAO.md`
- Atualizado com taxa automática, fallback, voucher overlay e alinhamento Tailwind v4.

## 4) Auditoria de modularidade e higiene (codebase)
### Pontos bons
- Separação de ações públicas por domínio avançou (`public-actions/appointments.ts`, `clients.ts`, `payments.ts`).
- Regras de deslocamento isoladas em módulo dedicado:
  - `apps/web/src/shared/displacement/rules.ts`
  - `apps/web/src/shared/displacement/service.ts`
- Integração de fee no fluxo interno e público está coerente com regras de negócio atuais.

### Pontos de atenção (não bloqueantes para PR)
- `apps/web/app/(public)/agendar/[slug]/booking-flow.tsx` está muito grande (monolito de UI/estado/integração).
  - Recomenda-se quebrar em componentes:
  - `steps/WelcomeStep`, `steps/IdentStep`, `steps/ServiceStep`, `steps/DateTimeStep`, `steps/LocationStep`, `steps/ConfirmStep`, `steps/PaymentStep`, `steps/SuccessStep`
  - `components/VoucherOverlay`
  - `hooks/useBookingFlowState`, `hooks/useDisplacementEstimate`, `hooks/useMercadoPagoCardForm`
- `apps/web/src/modules/appointments/actions.ts` concentra múltiplos fluxos (interno, público, disponibilidade, etc.).  
  Recomenda-se dividir por submódulos (`public.ts`, `internal.ts`, `availability.ts`, `payment.ts`) para manutenção futura.

## 5) Auditoria de banco de dados e consistência de dados
## Cobertura de dados do produto (status)
- Taxa de deslocamento:
  - Colunas em `appointments`: `displacement_fee`, `displacement_distance_km` (**OK**)
  - Uso em UI/ações/repositórios: **OK**
- Taxa fixa por serviço (`services.home_visit_fee`):
  - Removida na migration nova (**OK**)
  - Código atualizado para não depender desse campo (**OK**)

### Risco identificado: duplicidade de clientes por telefone
- Sintoma já observado em ambiente: múltiplos clientes com mesmo telefone textual.
- Hoje, sem constraint forte por telefone normalizado no DB, duplicidade ainda pode ocorrer por formatação diferente.

### Verificações SQL recomendadas (rodar em local e remoto)
```sql
-- Duplicidade por telefone normalizado
select
  tenant_id,
  regexp_replace(coalesce(phone, ''), '\D', '', 'g') as phone_digits,
  count(*) as total
from public.clients
where coalesce(phone, '') <> ''
group by tenant_id, regexp_replace(coalesce(phone, ''), '\D', '', 'g')
having count(*) > 1
order by total desc;

-- Appointments sem displacement_fee (não deveria existir após migration)
select count(*) as sem_fee
from public.appointments
where displacement_fee is null;
```

## 6) Tailwind v4 (estado)
- Avisos canônicos reportados na tela pública de agendamento foram corrigidos.
- Não há erro de lint/build relacionado a Tailwind no estado atual da branch.
- Observação: ainda pode haver pontos isolados de arbitrários em outras telas não cobertas por avisos atuais.

## 7) Pendências para marcar “100% produção”
## Bloqueantes operacionais (devops/config)
1. Aplicar migration nova em todos os ambientes alvo:
- `supabase/migrations/20260212100000_displacement_fee_rules.sql`
2. Confirmar variáveis de ambiente em Preview/Production:
- `GOOGLE_MAPS_API_KEY`
- `DISPLACEMENT_ORIGIN_ADDRESS` (opcional; sem ela usa endereço padrão no código)
- `MERCADOPAGO_ACCESS_TOKEN`
- `MERCADOPAGO_PUBLIC_KEY` / `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`
- `MERCADOPAGO_WEBHOOK_SECRET`
- Supabase (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
3. Validar webhook MP em Preview e Production com assinatura ativa.

## Pendências de hardening (não bloqueantes imediatos)
1. Criar política anti-duplicidade de cliente por telefone normalizado (migration dedicada).
2. Modularizar `booking-flow.tsx` e `appointments/actions.ts` para reduzir risco de regressão na próxima fase.
3. Adicionar testes automatizados críticos (smoke e2e):
- agendamento público completo (pix/cartão simulado)
- fallback de taxa de deslocamento
- confirmação de webhook e atualização de pagamento

## 8) Conclusão
- A branch está **tecnicamente estável** (lint/build OK) e com as principais integrações de agenda concluídas.
- Não há bloqueio técnico imediato para abrir PR para `main`.
- Para “produção 100%”, faltam principalmente itens de operação/configuração e hardening de dados (telefone duplicado).
