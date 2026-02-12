# PR (Draft) — Agenda v1 UI + Disponibilidade Inteligente + Agendamento Público + Pagamentos

## Contexto
Esta PR consolida a evolução da branch `agenda-v1-ui` para o estado final do módulo de agenda e do fluxo público de agendamento, incluindo:
- agenda interna (dia/semana/mês),
- gestão de disponibilidade e bloqueios,
- jornada pública de agendamento,
- integração de pagamento (Mercado Pago + webhook),
- cálculo automático de deslocamento,
- hardening de dados de clientes (telefone).

## Entregas principais

## 1) Agenda interna e UX mobile
- Cards de agenda refatorados (status de agendamento + status financeiro).
- Bottom sheet de detalhes de agendamento consolidado.
- Calendário mensal reutilizável e padronização visual.
- Melhorias de navegação, shell e consistência de layout.

## 2) Gestão de disponibilidade inteligente
- Gerador de escala (dias pares/ímpares) integrado ao fluxo de agenda.
- Bloqueios de dia inteiro/parcial com tipagem de motivo.
- Integração com disponibilidade de agendamento online.

## 3) Agendamento público
- Jornada pública por etapas com revisão e confirmação.
- Busca de cliente por telefone com preenchimento automático.
- Voucher de serviço com overlay e exportação de imagem.
- Fluxo de pagamento integrado ao checkout público.

## 4) Pagamentos e integrações
- Mercado Pago (Checkout Transparente): Pix + cartão.
- Webhook validado por assinatura HMAC.
- Atualização de `appointment_payments` e `appointments.payment_status`.
- Google Maps: busca de endereço e cálculo de deslocamento.

## 5) Banco de dados
- Migrations para disponibilidade, pagamentos, taxa de deslocamento e contatos.
- Nova migration de hardening:
  - `20260212113000_normalize_client_phone_uniqueness.sql`
  - normalização + deduplicação por telefone + índice único por tenant.

## 6) Documentação
- Report executivo atualizado:
  - `docs/ui-decisions/REPORT_EXECUCAO_NOVA_APARENCIA_V1_PRODUCAO.md`
- Auditoria final completa da branch:
  - `docs/reports/BRANCH_AUDIT_AGENDA_FINAL_2026-02-12.md`
- Documentação de integrações:
  - `docs/integrations/INTEGRATIONS_TECNICO.md`
  - `docs/integrations/INTEGRATIONS_GUIA_OPERACIONAL.md`
- Referências atualizadas em:
  - `README.md`
  - `MANUAL_RAPIDO.md`
  - `docs/REPO_INVENTORY.md`

## Validações executadas
```powershell
pnpm --filter web lint
pnpm --filter web build
pnpm lint
pnpm build
```
Resultado: sem erros.

## Checklist de deploy (obrigatório antes de merge final)
- [ ] Aplicar migrations pendentes em preview/produção.
- [ ] Confirmar variáveis de ambiente por ambiente (Supabase/Google/MP).
- [ ] Validar webhook MP em preview e produção.
- [ ] Smoke test ponta a ponta (agendar -> pagar -> webhook -> status).

## Observações de risco residual (não bloqueante de merge draft)
- Arquivos ainda grandes para próxima etapa de refactor:
  - `apps/web/app/(public)/agendar/[slug]/booking-flow.tsx`
  - `apps/web/src/modules/appointments/actions.ts`
  - `apps/web/components/mobile-agenda.tsx`
