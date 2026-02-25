# `apps/web` — App Web (Next.js App Router)

Aplicação principal do projeto (dashboard interno + fluxos públicos + APIs do App Router).

## Escopo

- Dashboard interno do estúdio (agenda, clientes, atendimento, caixa, mensagens, configurações)
- Fluxos públicos (`/agendar/[slug]`, voucher, comprovantes, páginas legais)
- APIs internas em `app/api/*` (pagamentos, WhatsApp/Meta, cron, Spotify, utilidades)
- Auth do dashboard via Supabase (Google OAuth + fallback DEV opcional)

## Stack (app)

- Next.js `16.1.6` (App Router)
- React `19.2`
- Tailwind CSS `4`
- Supabase (`@supabase/ssr`, `@supabase/supabase-js`)
- Zod

## Scripts locais (`apps/web`)

```bash
pnpm --filter web dev
pnpm --filter web lint
pnpm --filter web check-types
pnpm --filter web build
```

## Auth do Dashboard (resumo)

- Login principal: Google OAuth via Supabase (`/auth/login` -> `/auth/google` -> `/auth/callback`)
- Logout: `/auth/logout`
- Fallback DEV/local (opcional): `/auth/dev-login` quando `DEV_PASSWORD_LOGIN_ENABLED=true`
- Controle de acesso por tabela `dashboard_access_users`

### Sessão / persistência

- O app usa `apps/web/proxy.ts` (Next 16 Proxy) para refresh de sessão/cookies do Supabase SSR durante navegação.
- Isso reduz reautenticação frequente no painel, principalmente em uso mobile/PWA.

## Layout/UI (padrão)

- Estrutura canônica: **Header / Content / Navigation**
- `AppShell` controla frame mobile e scroll único
- `ModulePage` organiza header + conteúdo
- Referência: `docs/ui-system/README.md`

## APIs do app

- Rotas em `apps/web/app/api/**/route.ts`
- Guia consolidado: `docs/apis/API_GUIDE.md`

## Integrações (ver docs)

- Mercado Pago (Orders API + webhook): `docs/integrations/INTEGRATIONS_TECNICO.md`
- WhatsApp/Meta automação + webhook + cron: `docs/integrations/INTEGRATIONS_TECNICO.md`
- Spotify (OAuth + player): `docs/integrations/INTEGRATIONS_TECNICO.md`

## Observação

Para setup do monorepo, versões, comandos globais e operação local (Windows), use o `README.md` da raiz e `MANUAL_RAPIDO.md`.
