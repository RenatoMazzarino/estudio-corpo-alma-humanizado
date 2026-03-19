# Runbook de Rollout Remoto WL-5 até WL-10

Status: pronto para execução controlada  
Data base: 2026-03-19  
Escopo: concluir integrações, governança, onboarding, observabilidade e prova
de tenant secundário

## 1) Objetivo

Executar o rollout remoto das fases WL-5 a WL-10 sem alterar a experiência
atual da Jana e sem fallback oculto para o tenant principal.

## 2) Pré-condições

1. `main` com as mudanças WL-5..WL-10 revisadas.
2. Supabase remoto acessível com permissão administrativa.
3. Vercel com variáveis por ambiente já auditadas.
4. Webhook Meta apontando para o domínio público oficial:
   - `https://public.corpoealmahumanizado.com.br/api/whatsapp/meta/webhook`

## 3) Ordem obrigatória

### Passo 1 - Aplicar migrations em banco local e remoto

Aplicar:

1. `supabase/migrations/20260319143000_expand_tenant_branding_contract.sql`
2. `supabase/migrations/20260319170000_wl5_wl10_tenant_governance_and_billing.sql`

Comandos:

```powershell
pnpm exec supabase db push --local
pnpm exec supabase db push
pnpm exec supabase migration list
```

Critério:

1. `Local` e `Remote` devem mostrar os mesmos timestamps.
2. Sem drift de migration entre local e remoto.

### Passo 2 - Regenerar tipos Supabase

```powershell
pnpm supabase:types
```

### Passo 3 - Validar gates técnicos

```powershell
pnpm lint
pnpm --filter web lint:architecture
pnpm check-types
$env:NODE_OPTIONS='--max-old-space-size=8192'; pnpm --filter web test:unit
pnpm --filter web test:smoke
pnpm lint:md
pnpm build
```

### Passo 4 - Publicar aplicação

```powershell
git push origin main
```

## 4) Validação remota pós-deploy

### Integrations by tenant

Validar no tenant principal:

1. checkout cria pagamento via provider do tenant.
2. webhook Mercado Pago reconcilia sem erro de assinatura.
3. push de teste funciona em `/configuracoes`.
4. cálculo de deslocamento retorna `google_maps` quando provider ok.

### Governança

Validar endpoints internos:

1. `GET /api/internal/tenancy/overview`
2. `GET /api/internal/tenancy/memberships`
3. `POST /api/internal/tenancy/memberships`
4. `GET /api/internal/tenancy/onboarding`
5. `POST /api/internal/tenancy/onboarding`

Critério:

1. papéis sem permissão recebem `403`.
2. owner/admin operam onboarding/membership sem SQL manual.

### Domínios e links públicos

Validar:

1. `/agendar/[slug]`
2. `/pagamento/[id]`
3. `/voucher/[id]`
4. `/comprovante/[id]`

Critério:

1. links montados com base URL do tenant.
2. sem queda silenciosa para domínio errado.

### Tenant secundário de homologação

Tenant seeded:

1. nome: `Salao Aurora`
2. slug: `salao-aurora-demo`
3. id: `6f5f5004-7a58-4ab8-9c3c-5d6764ad2e01`

Validação mínima:

1. tenant existe em `draft`.
2. branding/domínios/providers seeded.
3. onboarding run inicial registrada.

## 5) Pendências externas esperadas

Após rollout técnico, estes itens continuam manuais por segurança operacional:

1. preencher credenciais reais dos providers do tenant secundário.
2. validar/verificar domínio próprio (se houver).
3. promover tenant secundário para `active` somente após checklist completo.

## 6) Rollback

Se houver regressão de runtime:

1. pausar novos deploys.
2. rollback de aplicação para último deploy estável.
3. manter migrations aplicadas, salvo incidente comprovado de banco.
4. se houver rollback SQL, fazer plano explícito por tabela com janela de manutenção.
