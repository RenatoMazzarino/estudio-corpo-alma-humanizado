# AGENTS.override.md (apps/web)

Escopo: tudo dentro de `apps/web`.

## Stack e estrutura

1. App Next.js 16 (App Router).
2. UI principal organizada por `AppShell` + `ModulePage`.
3. Modulos de negocio em `src/modules/*`.

## Comandos obrigatorios para mudancas no web app

1. `pnpm --filter web lint`
2. `pnpm --filter web lint:architecture`
3. `pnpm --filter web check-types`
4. `pnpm --filter web test:unit`
5. Quando tocar fluxo E2E/smoke: `pnpm --filter web test:smoke`

## Regras de implementacao

1. Preservar a separacao entre:
   - `app/*` (rotas e handlers)
   - `src/modules/*` (regra de negocio por dominio)
   - `components/*` (componentes compartilhados de interface)
2. Nao mover logica sensivel para cliente quando ja existe em server action/route.
3. Evitar acoplamento entre modulos sem necessidade (seguir fronteiras de dominio).
4. Se alterar env usada em build/runtime, refletir tambem em `turbo.json` e templates de `vercel/env-import`.

## Integracoes criticas no app web

1. WhatsApp Meta webhook/processador (`/api/whatsapp/meta/webhook`, `/api/internal/notifications/whatsapp/process`).
2. Mercado Pago webhook (`/api/mercadopago/webhook`).
3. Fluxos publicos (`/agendar/*`, `/pagamento/*`, `/voucher/*`, `/comprovante/*`).
