# AGENTS Precedence Map

Status: active
Owner: engenharia de plataforma
Gerado em: 2026-03-18 14:21:47 -03:00

## Como ler

1. A cadeia mostra a ordem de heranca de regras para cada override local.
2. O ultimo item da cadeia e o arquivo de maior prioridade para aquele caminho.

## Overrides locais e cadeia de precedencia

### `.agents/AGENTS.override.md`

Cadeia:

1. `AGENTS.md`
2. `.agents/AGENTS.override.md`

### `.agents/skills/estudio-repo-context/AGENTS.override.md`

Cadeia:

1. `AGENTS.md`
2. `.agents/AGENTS.override.md`
3. `.agents/skills/estudio-repo-context/AGENTS.override.md`

### `.github/AGENTS.override.md`

Cadeia:

1. `AGENTS.md`
2. `.github/AGENTS.override.md`

### `.github/workflows/AGENTS.override.md`

Cadeia:

1. `AGENTS.md`
2. `.github/AGENTS.override.md`
3. `.github/workflows/AGENTS.override.md`

### `.vscode/AGENTS.override.md`

Cadeia:

1. `AGENTS.md`
2. `.vscode/AGENTS.override.md`

### `apps/AGENTS.override.md`

Cadeia:

1. `AGENTS.md`
2. `apps/AGENTS.override.md`

### `apps/web/AGENTS.override.md`

Cadeia:

1. `AGENTS.md`
2. `apps/AGENTS.override.md`
3. `apps/web/AGENTS.override.md`

### `apps/web/app/(dashboard)/AGENTS.override.md`

Cadeia:

1. `AGENTS.md`
2. `apps/AGENTS.override.md`
3. `apps/web/AGENTS.override.md`
4. `apps/web/app/AGENTS.override.md`
5. `apps/web/app/(dashboard)/AGENTS.override.md`

### `apps/web/app/(dashboard)/atendimento/AGENTS.override.md`

Cadeia:

1. `AGENTS.md`
2. `apps/AGENTS.override.md`
3. `apps/web/AGENTS.override.md`
4. `apps/web/app/AGENTS.override.md`
5. `apps/web/app/(dashboard)/AGENTS.override.md`
6. `apps/web/app/(dashboard)/atendimento/AGENTS.override.md`

### `apps/web/app/(dashboard)/novo/AGENTS.override.md`

Cadeia:

1. `AGENTS.md`
2. `apps/AGENTS.override.md`
3. `apps/web/AGENTS.override.md`
4. `apps/web/app/AGENTS.override.md`
5. `apps/web/app/(dashboard)/AGENTS.override.md`
6. `apps/web/app/(dashboard)/novo/AGENTS.override.md`

### `apps/web/app/(public)/agendar/AGENTS.override.md`

Cadeia:

1. `AGENTS.md`
2. `apps/AGENTS.override.md`
3. `apps/web/AGENTS.override.md`
4. `apps/web/app/AGENTS.override.md`
5. `apps/web/app/(public)/AGENTS.override.md`
6. `apps/web/app/(public)/agendar/AGENTS.override.md`

### `apps/web/app/(public)/AGENTS.override.md`

Cadeia:

1. `AGENTS.md`
2. `apps/AGENTS.override.md`
3. `apps/web/AGENTS.override.md`
4. `apps/web/app/AGENTS.override.md`
5. `apps/web/app/(public)/AGENTS.override.md`

### `apps/web/app/AGENTS.override.md`

Cadeia:

1. `AGENTS.md`
2. `apps/AGENTS.override.md`
3. `apps/web/AGENTS.override.md`
4. `apps/web/app/AGENTS.override.md`

### `apps/web/app/api/AGENTS.override.md`

Cadeia:

1. `AGENTS.md`
2. `apps/AGENTS.override.md`
3. `apps/web/AGENTS.override.md`
4. `apps/web/app/AGENTS.override.md`
5. `apps/web/app/api/AGENTS.override.md`

### `apps/web/app/api/mercadopago/AGENTS.override.md`

Cadeia:

1. `AGENTS.md`
2. `apps/AGENTS.override.md`
3. `apps/web/AGENTS.override.md`
4. `apps/web/app/AGENTS.override.md`
5. `apps/web/app/api/AGENTS.override.md`
6. `apps/web/app/api/mercadopago/AGENTS.override.md`

### `apps/web/app/api/whatsapp/AGENTS.override.md`

Cadeia:

1. `AGENTS.md`
2. `apps/AGENTS.override.md`
3. `apps/web/AGENTS.override.md`
4. `apps/web/app/AGENTS.override.md`
5. `apps/web/app/api/AGENTS.override.md`
6. `apps/web/app/api/whatsapp/AGENTS.override.md`

### `apps/web/components/AGENTS.override.md`

Cadeia:

1. `AGENTS.md`
2. `apps/AGENTS.override.md`
3. `apps/web/AGENTS.override.md`
4. `apps/web/components/AGENTS.override.md`

### `apps/web/src/AGENTS.override.md`

Cadeia:

1. `AGENTS.md`
2. `apps/AGENTS.override.md`
3. `apps/web/AGENTS.override.md`
4. `apps/web/src/AGENTS.override.md`

### `apps/web/src/modules/agenda/AGENTS.override.md`

Cadeia:

1. `AGENTS.md`
2. `apps/AGENTS.override.md`
3. `apps/web/AGENTS.override.md`
4. `apps/web/src/AGENTS.override.md`
5. `apps/web/src/modules/AGENTS.override.md`
6. `apps/web/src/modules/agenda/AGENTS.override.md`

### `apps/web/src/modules/AGENTS.override.md`

Cadeia:

1. `AGENTS.md`
2. `apps/AGENTS.override.md`
3. `apps/web/AGENTS.override.md`
4. `apps/web/src/AGENTS.override.md`
5. `apps/web/src/modules/AGENTS.override.md`

### `apps/web/src/modules/appointments/AGENTS.override.md`

Cadeia:

1. `AGENTS.md`
2. `apps/AGENTS.override.md`
3. `apps/web/AGENTS.override.md`
4. `apps/web/src/AGENTS.override.md`
5. `apps/web/src/modules/AGENTS.override.md`
6. `apps/web/src/modules/appointments/AGENTS.override.md`

### `apps/web/src/modules/attendance/AGENTS.override.md`

Cadeia:

1. `AGENTS.md`
2. `apps/AGENTS.override.md`
3. `apps/web/AGENTS.override.md`
4. `apps/web/src/AGENTS.override.md`
5. `apps/web/src/modules/AGENTS.override.md`
6. `apps/web/src/modules/attendance/AGENTS.override.md`

### `apps/web/src/modules/auth/AGENTS.override.md`

Cadeia:

1. `AGENTS.md`
2. `apps/AGENTS.override.md`
3. `apps/web/AGENTS.override.md`
4. `apps/web/src/AGENTS.override.md`
5. `apps/web/src/modules/AGENTS.override.md`
6. `apps/web/src/modules/auth/AGENTS.override.md`

### `apps/web/src/modules/clients/AGENTS.override.md`

Cadeia:

1. `AGENTS.md`
2. `apps/AGENTS.override.md`
3. `apps/web/AGENTS.override.md`
4. `apps/web/src/AGENTS.override.md`
5. `apps/web/src/modules/AGENTS.override.md`
6. `apps/web/src/modules/clients/AGENTS.override.md`

### `apps/web/src/modules/finance/AGENTS.override.md`

Cadeia:

1. `AGENTS.md`
2. `apps/AGENTS.override.md`
3. `apps/web/AGENTS.override.md`
4. `apps/web/src/AGENTS.override.md`
5. `apps/web/src/modules/AGENTS.override.md`
6. `apps/web/src/modules/finance/AGENTS.override.md`

### `apps/web/src/modules/integrations/AGENTS.override.md`

Cadeia:

1. `AGENTS.md`
2. `apps/AGENTS.override.md`
3. `apps/web/AGENTS.override.md`
4. `apps/web/src/AGENTS.override.md`
5. `apps/web/src/modules/AGENTS.override.md`
6. `apps/web/src/modules/integrations/AGENTS.override.md`

### `apps/web/src/modules/notifications/AGENTS.override.md`

Cadeia:

1. `AGENTS.md`
2. `apps/AGENTS.override.md`
3. `apps/web/AGENTS.override.md`
4. `apps/web/src/AGENTS.override.md`
5. `apps/web/src/modules/AGENTS.override.md`
6. `apps/web/src/modules/notifications/AGENTS.override.md`

### `apps/web/src/modules/payments/AGENTS.override.md`

Cadeia:

1. `AGENTS.md`
2. `apps/AGENTS.override.md`
3. `apps/web/AGENTS.override.md`
4. `apps/web/src/AGENTS.override.md`
5. `apps/web/src/modules/AGENTS.override.md`
6. `apps/web/src/modules/payments/AGENTS.override.md`

### `apps/web/src/modules/services/AGENTS.override.md`

Cadeia:

1. `AGENTS.md`
2. `apps/AGENTS.override.md`
3. `apps/web/AGENTS.override.md`
4. `apps/web/src/AGENTS.override.md`
5. `apps/web/src/modules/AGENTS.override.md`
6. `apps/web/src/modules/services/AGENTS.override.md`

### `apps/web/src/modules/settings/AGENTS.override.md`

Cadeia:

1. `AGENTS.md`
2. `apps/AGENTS.override.md`
3. `apps/web/AGENTS.override.md`
4. `apps/web/src/AGENTS.override.md`
5. `apps/web/src/modules/AGENTS.override.md`
6. `apps/web/src/modules/settings/AGENTS.override.md`

### `apps/web/src/shared/AGENTS.override.md`

Cadeia:

1. `AGENTS.md`
2. `apps/AGENTS.override.md`
3. `apps/web/AGENTS.override.md`
4. `apps/web/src/AGENTS.override.md`
5. `apps/web/src/shared/AGENTS.override.md`

### `apps/web/tests/AGENTS.override.md`

Cadeia:

1. `AGENTS.md`
2. `apps/AGENTS.override.md`
3. `apps/web/AGENTS.override.md`
4. `apps/web/tests/AGENTS.override.md`

### `docs/AGENTS.override.md`

Cadeia:

1. `AGENTS.md`
2. `docs/AGENTS.override.md`

### `docs/plans/AGENTS.override.md`

Cadeia:

1. `AGENTS.md`
2. `docs/AGENTS.override.md`
3. `docs/plans/AGENTS.override.md`

### `docs/reports/AGENTS.override.md`

Cadeia:

1. `AGENTS.md`
2. `docs/AGENTS.override.md`
3. `docs/reports/AGENTS.override.md`

### `docs/runbooks/AGENTS.override.md`

Cadeia:

1. `AGENTS.md`
2. `docs/AGENTS.override.md`
3. `docs/runbooks/AGENTS.override.md`

### `packages/AGENTS.override.md`

Cadeia:

1. `AGENTS.md`
2. `packages/AGENTS.override.md`

### `packages/ui/AGENTS.override.md`

Cadeia:

1. `AGENTS.md`
2. `packages/AGENTS.override.md`
3. `packages/ui/AGENTS.override.md`

### `scripts/AGENTS.override.md`

Cadeia:

1. `AGENTS.md`
2. `scripts/AGENTS.override.md`

### `supabase/AGENTS.override.md`

Cadeia:

1. `AGENTS.md`
2. `supabase/AGENTS.override.md`

### `supabase/functions/AGENTS.override.md`

Cadeia:

1. `AGENTS.md`
2. `supabase/AGENTS.override.md`
3. `supabase/functions/AGENTS.override.md`

### `supabase/migrations/AGENTS.override.md`

Cadeia:

1. `AGENTS.md`
2. `supabase/AGENTS.override.md`
3. `supabase/migrations/AGENTS.override.md`

### `vercel/AGENTS.override.md`

Cadeia:

1. `AGENTS.md`
2. `vercel/AGENTS.override.md`
