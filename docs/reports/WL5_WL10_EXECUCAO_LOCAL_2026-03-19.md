# Execução Local WL-5 até WL-10

Status: executado localmente com validação técnica completa  
Data base: 2026-03-19  
Ambiente validado: Supabase local + Supabase remoto + app web local

## 1) Escopo executado

Fases concluídas nesta execução:

1. WL-5: integrações por tenant (Mercado Pago, OneSignal, Google Maps, fail-safe).
2. WL-6: governança de memberships por tenant.
3. WL-6.5: onboarding operacional estruturado.
4. WL-7: domínio e links públicos por tenant.
5. WL-7.5: padronização de resolução de tenant em runtime.
6. WL-8: observabilidade e auditoria por tenant.
7. WL-9: tenant secundário de homologação seeded.
8. WL-10: fechamento mobile-first dos contratos operacionais.

## 2) Entregas técnicas

### 2.1 Banco

Migrations aplicadas:

1. `20260319143000_expand_tenant_branding_contract.sql`
2. `20260319170000_wl5_wl10_tenant_governance_and_billing.sql`

Entidades novas:

1. `tenant_provider_configs`
2. `tenant_provider_usage_profiles`
3. `tenant_provider_metering_events`
4. `tenant_provider_daily_usage`
5. `tenant_provider_monthly_snapshots`
6. `tenant_membership_audit_logs`
7. `tenant_onboarding_runs`
8. `tenant_onboarding_step_logs`
9. `tenant_configuration_audit_logs`

Complemento de branding:

1. expansão de `tenant_branding` para contrato visual completo
   (tokens/estratégias/logo kit).

### 2.2 Runtime e módulos

Módulos novos:

1. `provider-config.ts`
2. `provider-metering.ts`
3. `membership-governance.ts`
4. `onboarding.ts`
5. `config-audit.ts`
6. `tenant-alerts.ts`
7. `request-context.ts`
8. `overview.ts`
9. `tenant-permissions.ts`

### 2.3 APIs internas novas

1. `GET /api/internal/tenancy/overview`
2. `GET|POST /api/internal/tenancy/memberships`
3. `GET|POST /api/internal/tenancy/onboarding`

### 2.4 Integrações tenant-aware

Aplicado:

1. Mercado Pago por tenant para token/public key/webhook candidates.
2. OneSignal por tenant para bootstrap e envio.
3. Google Maps por tenant para endereço e deslocamento.
4. metering de uso integrado em:
   - Mercado Pago (create/status/point)
   - OneSignal (push send)
   - Google Maps (distance calculation)

### 2.5 Domínios e links públicos

Aplicado:

1. resolução de tenant por request context (tenantId, sessão, slug, host).
2. links públicos e URLs operacionais com base por tenant.
3. fail-safe `400/423` para rotas públicas quando tenant/provider não resolvem.

### 2.6 Tenant secundário (prova WL-9)

Seeded:

1. nome: `Salao Aurora`
2. slug: `salao-aurora-demo`
3. id: `6f5f5004-7a58-4ab8-9c3c-5d6764ad2e01`
4. branding/domínios/providers/base settings/onboarding run inicial.

## 3) Validação executada

Comandos:

```powershell
pnpm exec supabase db push --local
pnpm exec supabase db push
pnpm exec supabase migration list
pnpm supabase:types
pnpm lint
pnpm --filter web lint:architecture
pnpm --filter web check-types
$env:NODE_OPTIONS='--max-old-space-size=8192'; pnpm --filter web test:unit
pnpm --filter web test:smoke
pnpm lint:md
pnpm build
pnpm vercel:env:audit
```

Resultado:

1. migrations local/remoto em espelho.
2. lint/typecheck/unit/smoke/build sem falha.
3. markdownlint sem erro.
4. auditoria de env Vercel sem chave obrigatória faltando.

## 4) Pendências externas (não bloqueiam commit)

1. preencher credenciais reais dos providers no tenant secundário.
2. validar domínio próprio do tenant secundário (se houver).
3. executar ativação do tenant secundário para `active` após checklist completo.

## 5) Runbooks associados

1. `docs/runbooks/WL5_WL10_ROLLOUT_REMOTE_MAIN_2026-03-19.md`
2. `docs/runbooks/WHITE_LABEL_TENANT_ONBOARDING_BACKOFFICE_2026-03-19.md`
