# AGENTS Precedence Map

Status: active
Owner: engenharia de plataforma
Gerado em: 2026-03-10 14:22:41 -03:00

## Como ler

1. A cadeia mostra a ordem de heranca de regras para cada override local.
2. O ultimo item da cadeia e o arquivo de maior prioridade para aquele caminho.

| Override local | Cadeia de precedencia |
| --- | --- |
| `.agents/AGENTS.override.md` | `AGENTS.md` -> `.agents/AGENTS.override.md` |
| `.agents/skills/estudio-repo-context/AGENTS.override.md` | `AGENTS.md` -> `.agents/AGENTS.override.md` -> `.agents/skills/estudio-repo-context/AGENTS.override.md` |
| `.github/AGENTS.override.md` | `AGENTS.md` -> `.github/AGENTS.override.md` |
| `.github/workflows/AGENTS.override.md` | `AGENTS.md` -> `.github/AGENTS.override.md` -> `.github/workflows/AGENTS.override.md` |
| `.vscode/AGENTS.override.md` | `AGENTS.md` -> `.vscode/AGENTS.override.md` |
| `apps/AGENTS.override.md` | `AGENTS.md` -> `apps/AGENTS.override.md` |
| `apps/web/AGENTS.override.md` | `AGENTS.md` -> `apps/AGENTS.override.md` -> `apps/web/AGENTS.override.md` |
| `apps/web/app/(dashboard)/AGENTS.override.md` | `AGENTS.md` -> `apps/AGENTS.override.md` -> `apps/web/AGENTS.override.md` -> `apps/web/app/AGENTS.override.md` -> `apps/web/app/(dashboard)/AGENTS.override.md` |
| `apps/web/app/(dashboard)/atendimento/AGENTS.override.md` | `AGENTS.md` -> `apps/AGENTS.override.md` -> `apps/web/AGENTS.override.md` -> `apps/web/app/AGENTS.override.md` -> `apps/web/app/(dashboard)/AGENTS.override.md` -> `apps/web/app/(dashboard)/atendimento/AGENTS.override.md` |
| `apps/web/app/(dashboard)/novo/AGENTS.override.md` | `AGENTS.md` -> `apps/AGENTS.override.md` -> `apps/web/AGENTS.override.md` -> `apps/web/app/AGENTS.override.md` -> `apps/web/app/(dashboard)/AGENTS.override.md` -> `apps/web/app/(dashboard)/novo/AGENTS.override.md` |
| `apps/web/app/(public)/agendar/AGENTS.override.md` | `AGENTS.md` -> `apps/AGENTS.override.md` -> `apps/web/AGENTS.override.md` -> `apps/web/app/AGENTS.override.md` -> `apps/web/app/(public)/AGENTS.override.md` -> `apps/web/app/(public)/agendar/AGENTS.override.md` |
| `apps/web/app/(public)/AGENTS.override.md` | `AGENTS.md` -> `apps/AGENTS.override.md` -> `apps/web/AGENTS.override.md` -> `apps/web/app/AGENTS.override.md` -> `apps/web/app/(public)/AGENTS.override.md` |
| `apps/web/app/AGENTS.override.md` | `AGENTS.md` -> `apps/AGENTS.override.md` -> `apps/web/AGENTS.override.md` -> `apps/web/app/AGENTS.override.md` |
| `apps/web/app/api/AGENTS.override.md` | `AGENTS.md` -> `apps/AGENTS.override.md` -> `apps/web/AGENTS.override.md` -> `apps/web/app/AGENTS.override.md` -> `apps/web/app/api/AGENTS.override.md` |
| `apps/web/app/api/mercadopago/AGENTS.override.md` | `AGENTS.md` -> `apps/AGENTS.override.md` -> `apps/web/AGENTS.override.md` -> `apps/web/app/AGENTS.override.md` -> `apps/web/app/api/AGENTS.override.md` -> `apps/web/app/api/mercadopago/AGENTS.override.md` |
| `apps/web/app/api/whatsapp/AGENTS.override.md` | `AGENTS.md` -> `apps/AGENTS.override.md` -> `apps/web/AGENTS.override.md` -> `apps/web/app/AGENTS.override.md` -> `apps/web/app/api/AGENTS.override.md` -> `apps/web/app/api/whatsapp/AGENTS.override.md` |
| `apps/web/components/AGENTS.override.md` | `AGENTS.md` -> `apps/AGENTS.override.md` -> `apps/web/AGENTS.override.md` -> `apps/web/components/AGENTS.override.md` |
| `apps/web/src/AGENTS.override.md` | `AGENTS.md` -> `apps/AGENTS.override.md` -> `apps/web/AGENTS.override.md` -> `apps/web/src/AGENTS.override.md` |
| `apps/web/src/modules/agenda/AGENTS.override.md` | `AGENTS.md` -> `apps/AGENTS.override.md` -> `apps/web/AGENTS.override.md` -> `apps/web/src/AGENTS.override.md` -> `apps/web/src/modules/AGENTS.override.md` -> `apps/web/src/modules/agenda/AGENTS.override.md` |
| `apps/web/src/modules/AGENTS.override.md` | `AGENTS.md` -> `apps/AGENTS.override.md` -> `apps/web/AGENTS.override.md` -> `apps/web/src/AGENTS.override.md` -> `apps/web/src/modules/AGENTS.override.md` |
| `apps/web/src/modules/appointments/AGENTS.override.md` | `AGENTS.md` -> `apps/AGENTS.override.md` -> `apps/web/AGENTS.override.md` -> `apps/web/src/AGENTS.override.md` -> `apps/web/src/modules/AGENTS.override.md` -> `apps/web/src/modules/appointments/AGENTS.override.md` |
| `apps/web/src/modules/attendance/AGENTS.override.md` | `AGENTS.md` -> `apps/AGENTS.override.md` -> `apps/web/AGENTS.override.md` -> `apps/web/src/AGENTS.override.md` -> `apps/web/src/modules/AGENTS.override.md` -> `apps/web/src/modules/attendance/AGENTS.override.md` |
| `apps/web/src/modules/auth/AGENTS.override.md` | `AGENTS.md` -> `apps/AGENTS.override.md` -> `apps/web/AGENTS.override.md` -> `apps/web/src/AGENTS.override.md` -> `apps/web/src/modules/AGENTS.override.md` -> `apps/web/src/modules/auth/AGENTS.override.md` |
| `apps/web/src/modules/clients/AGENTS.override.md` | `AGENTS.md` -> `apps/AGENTS.override.md` -> `apps/web/AGENTS.override.md` -> `apps/web/src/AGENTS.override.md` -> `apps/web/src/modules/AGENTS.override.md` -> `apps/web/src/modules/clients/AGENTS.override.md` |
| `apps/web/src/modules/finance/AGENTS.override.md` | `AGENTS.md` -> `apps/AGENTS.override.md` -> `apps/web/AGENTS.override.md` -> `apps/web/src/AGENTS.override.md` -> `apps/web/src/modules/AGENTS.override.md` -> `apps/web/src/modules/finance/AGENTS.override.md` |
| `apps/web/src/modules/integrations/AGENTS.override.md` | `AGENTS.md` -> `apps/AGENTS.override.md` -> `apps/web/AGENTS.override.md` -> `apps/web/src/AGENTS.override.md` -> `apps/web/src/modules/AGENTS.override.md` -> `apps/web/src/modules/integrations/AGENTS.override.md` |
| `apps/web/src/modules/notifications/AGENTS.override.md` | `AGENTS.md` -> `apps/AGENTS.override.md` -> `apps/web/AGENTS.override.md` -> `apps/web/src/AGENTS.override.md` -> `apps/web/src/modules/AGENTS.override.md` -> `apps/web/src/modules/notifications/AGENTS.override.md` |
| `apps/web/src/modules/payments/AGENTS.override.md` | `AGENTS.md` -> `apps/AGENTS.override.md` -> `apps/web/AGENTS.override.md` -> `apps/web/src/AGENTS.override.md` -> `apps/web/src/modules/AGENTS.override.md` -> `apps/web/src/modules/payments/AGENTS.override.md` |
| `apps/web/src/modules/services/AGENTS.override.md` | `AGENTS.md` -> `apps/AGENTS.override.md` -> `apps/web/AGENTS.override.md` -> `apps/web/src/AGENTS.override.md` -> `apps/web/src/modules/AGENTS.override.md` -> `apps/web/src/modules/services/AGENTS.override.md` |
| `apps/web/src/modules/settings/AGENTS.override.md` | `AGENTS.md` -> `apps/AGENTS.override.md` -> `apps/web/AGENTS.override.md` -> `apps/web/src/AGENTS.override.md` -> `apps/web/src/modules/AGENTS.override.md` -> `apps/web/src/modules/settings/AGENTS.override.md` |
| `apps/web/src/shared/AGENTS.override.md` | `AGENTS.md` -> `apps/AGENTS.override.md` -> `apps/web/AGENTS.override.md` -> `apps/web/src/AGENTS.override.md` -> `apps/web/src/shared/AGENTS.override.md` |
| `apps/web/tests/AGENTS.override.md` | `AGENTS.md` -> `apps/AGENTS.override.md` -> `apps/web/AGENTS.override.md` -> `apps/web/tests/AGENTS.override.md` |
| `docs/AGENTS.override.md` | `AGENTS.md` -> `docs/AGENTS.override.md` |
| `docs/plans/AGENTS.override.md` | `AGENTS.md` -> `docs/AGENTS.override.md` -> `docs/plans/AGENTS.override.md` |
| `docs/reports/AGENTS.override.md` | `AGENTS.md` -> `docs/AGENTS.override.md` -> `docs/reports/AGENTS.override.md` |
| `docs/runbooks/AGENTS.override.md` | `AGENTS.md` -> `docs/AGENTS.override.md` -> `docs/runbooks/AGENTS.override.md` |
| `packages/AGENTS.override.md` | `AGENTS.md` -> `packages/AGENTS.override.md` |
| `packages/ui/AGENTS.override.md` | `AGENTS.md` -> `packages/AGENTS.override.md` -> `packages/ui/AGENTS.override.md` |
| `scripts/AGENTS.override.md` | `AGENTS.md` -> `scripts/AGENTS.override.md` |
| `supabase/AGENTS.override.md` | `AGENTS.md` -> `supabase/AGENTS.override.md` |
| `supabase/functions/AGENTS.override.md` | `AGENTS.md` -> `supabase/AGENTS.override.md` -> `supabase/functions/AGENTS.override.md` |
| `supabase/migrations/AGENTS.override.md` | `AGENTS.md` -> `supabase/AGENTS.override.md` -> `supabase/migrations/AGENTS.override.md` |
| `vercel/AGENTS.override.md` | `AGENTS.md` -> `vercel/AGENTS.override.md` |
