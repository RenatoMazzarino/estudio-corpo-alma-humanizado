> **Status documental:** Histórico/legado. Use apenas para contexto e rastreabilidade.
> **Nao canonico:** Para comportamento atual do sistema, valide `codigo + migrations + env real` e docs ativos (`README.md`, `MANUAL_RAPIDO.md`, `docs/integrations/*`, `docs/apis/API_GUIDE.md`).
﻿# REPO_INVENTORY

## Arvore (nivel 1-2)
```
.
|-- apps/
|   `-- web/
|-- packages/
|   |-- eslint-config/
|   |-- typescript-config/
|   `-- ui/
|-- supabase/
|   `-- migrations/
|-- docs/
|-- package.json
|-- pnpm-workspace.yaml
`-- turbo.json
```

## Apps / Packages
- **Apps**: `apps/web` (Next.js App Router)
- **Packages**: `packages/ui`, `packages/eslint-config`, `packages/typescript-config`

## Stack detectada
- **Node.js** 24.13.0
- **pnpm** 10.29.1
- **Turbo** 2.8.3
- **Next.js** 16.1.6 (App Router)
- **React** 19.2.0
- **TypeScript** 5.9.2
- **Tailwind** 4.1.18
- **Supabase** (`@supabase/ssr`, `@supabase/supabase-js`)
- **UI/Icons**: `lucide-react`
- **Calendario**: `react-big-calendar`
- **Data**: `date-fns`

## Scripts relevantes
### Root `package.json`
- `build`: `turbo run build`
- `dev`: `turbo run dev`
- `lint`: `turbo run lint`
- `format`: `prettier --write "**/*.{ts,tsx,md}"`
- `check-types`: `turbo run check-types`

### `apps/web/package.json`
- `dev`: `next dev --turbo --port 3000`
- `build`: `next build`
- `start`: `next start`
- `lint`: `eslint --max-warnings 0`
- `check-types`: `next typegen && tsc --noEmit`

## Integracoes ativas
- **Supabase**: persistencia e RPCs de agendamento
- **Google Maps Platform**: busca de endereco e calculo de deslocamento
- **Mercado Pago (Checkout Transparente)**: Pix/cartao e webhook de confirmacao
- **WhatsApp**: envio assistido por deep links/share

Documentacao:
- `docs/integrations/INTEGRATIONS_TECNICO.md`
- `docs/integrations/INTEGRATIONS_GUIA_OPERACIONAL.md`
- `docs/apis/API_GUIDE.md`
