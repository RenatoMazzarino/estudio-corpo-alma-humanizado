# Runbook de Onboarding de Tenant (Backoffice Interno)

Status: ativo  
Data base: 2026-03-19  
Escopo: onboarding operacional sem SQL manual recorrente

## 1) Quando usar

Use este runbook ao criar ou ativar um tenant novo de white-label.

## 2) Estados oficiais do tenant

1. `draft`: tenant criado, ainda não publicado.
2. `active`: tenant pronto para operação.
3. `suspended`: tenant bloqueado temporariamente.
4. `archived`: tenant encerrado.

## 3) Checklist canônico por etapa

### Etapa A - Tenant criado

1. confirmar `tenants.slug` único.
2. confirmar timezone/locale.
3. iniciar run:
   - `POST /api/internal/tenancy/onboarding` com `{ "action": "start" }`
4. marcar etapa:
   - `POST /api/internal/tenancy/onboarding` com
     `{ "action": "step", "step": "tenant_created", "status": "completed" }`

### Etapa B - Branding

1. preencher `tenant_branding` com:
   - nome de exibição
   - logos
   - cores por token
2. validar contraste mínimo dos tokens.
3. marcar etapa `branding` como `completed`.

### Etapa C - Domínios

1. registrar domínios em `tenant_domains`.
2. definir um domínio primário público e um de dashboard.
3. para homologação, pode usar `*.vercel.app`.
4. marcar etapa `domains` como `completed`.

### Etapa D - Memberships

1. criar primeiro owner:
   - `POST /api/internal/tenancy/memberships` com
     `{ "action": "bootstrap_owner", "ownerEmail": "email@tenant.com" }`
2. criar equipe adicional por papel (`admin`, `staff`, `viewer`).
3. validar pelo `GET /api/internal/tenancy/memberships`.
4. marcar etapa `memberships` como `completed`.

### Etapa E - Integrações

1. configurar provider por tenant:
   - `mercadopago`
   - `onesignal`
   - `google_maps`
   - `whatsapp_meta`
2. conferir health/alertas via:
   - `GET /api/internal/tenancy/overview`
3. corrigir qualquer alerta `critical`.
4. marcar etapa `integrations` como `completed`.

### Etapa F - Validação final

1. validar dashboard isolado.
2. validar clientes/agenda/mensagens isolados.
3. validar links públicos:
   - agendamento
   - pagamento
   - voucher
   - comprovante
4. validar logs/auditoria do tenant.
5. marcar etapa `validation` como `completed`.

### Etapa G - Ativação

1. ativar tenant:
   - `POST /api/internal/tenancy/onboarding` com `{ "action": "activate" }`
2. validar status final em `tenants.status = "active"`.

## 4) Alertas que bloqueiam ativação

Não promover para `active` enquanto existir:

1. tenant sem owner ativo.
2. provider habilitado sem credencial válida.
3. onboarding bloqueado (`status = blocked`).

## 5) Evidências mínimas para fechar onboarding

1. snapshot de `GET /api/internal/tenancy/overview`.
2. histórico de `GET /api/internal/tenancy/onboarding`.
3. evidência de memberships ativas.
4. evidência de links públicos válidos.
