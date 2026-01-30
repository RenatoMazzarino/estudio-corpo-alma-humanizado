# ARCHITECTURE_TARGET

## Princípios
- **Domínios claros**: módulos por domínio (Agendamentos, Clientes, Serviços, Financeiro, Auth, Notificações, Configurações).
- **Dados consistentes**: schema e types sincronizados (migrations → types → código).
- **Server-first**: queries e regras de negócio no servidor; client só para UI/UX.
- **Validação sistemática**: entradas sempre validadas (Zod) antes de tocar no DB.
- **Erro padronizado**: erros retornam `AppError` com código e mensagem amigável.

## Estrutura de pastas (proposta)

```
apps/web/
  app/
    (dashboard)/
      layout.tsx        // AppShell + navegação privada
      page.tsx          // Agenda (dashboard)
      clientes/
      catalogo/
      caixa/
      novo/
    (public)/
      agendar/[slug]/
        page.tsx
        layout.tsx      // layout público sem BottomNav
  src/
    modules/
      appointments/
        actions.ts
        repository.ts
        queries.ts
        schemas.ts
        types.ts
        components/
      clients/
      services/
      finance/
      auth/
      notifications/
      settings/
    shared/
      ui/               // botões, inputs, cards, modals
      layouts/          // AppShell, headers, navs
      lib/              // supabase client, tenant resolver
      utils/            // datas, formatação, money
      types/
      errors/
```

## Regras de localização
- **Server actions** ficam em `src/modules/<domain>/actions.ts`.
- **Queries** e **repositories** ficam em `src/modules/<domain>/repository.ts` e `queries.ts`.
- **Componentes** de domínio em `src/modules/<domain>/components/`.
- **Componentes compartilhados** em `src/shared/ui/`.
- **Helpers de Supabase** em `src/shared/lib/supabase` com `createServerClient`/`createBrowserClient`.

## Naming
- `kebab-case` para arquivos. 
- `PascalCase` para componentes.
- Actions: `create-appointment.action.ts` ou `actions.ts` por domínio.
- Zod schemas: `appointments.schema.ts`.

## Tratamento de erros
- Centralizar em `src/shared/errors`.
- Função `mapSupabaseError(err)` → `AppError`.
- Actions retornam `{ ok: false, error }` ao invés de `throw` em fluxo de UI.

## Validação (Zod)
- Para cada ação: `inputSchema.parse(formData)`.
- Para dados de rota pública (`/agendar`), aplicar validação + rate limit simples.

## Supabase
- `createClient` centralizado e com helpers de `getTenantId()`.
- **Tenant** resolvido por:
  - sessão/auth (no backoffice),
  - slug (em rotas públicas).

## Padrões de UI
- Tokens em `globals.css` (cores, radius, spacing).
- Componentes base (Button, Card, Input, Modal) no `shared/ui`.
- Layouts por rota: `app/(dashboard)` e `app/(public)`.
