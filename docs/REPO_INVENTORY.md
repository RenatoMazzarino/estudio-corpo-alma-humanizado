# REPO_INVENTORY

## Árvore (nível 1–2)
```
.
├─ apps/
│  └─ web/
├─ packages/
│  ├─ eslint-config/
│  ├─ typescript-config/
│  └─ ui/
├─ supabase/
│  └─ migrations/
├─ docs/
├─ package.json
├─ pnpm-workspace.yaml
├─ turbo.json
```

## Apps / Packages
- **Apps**: `apps/web` (Next.js App Router)
- **Packages**: `packages/ui`, `packages/eslint-config`, `packages/typescript-config`

## Stack detectada
- **Next.js** 16.1.0 (App Router)
- **React** 19.2.0
- **TypeScript** 5.9.2
- **Tailwind** 4.1.x
- **Supabase** (`@supabase/ssr`, `@supabase/supabase-js`)
- **UI/Icons**: `lucide-react`
- **Calendário**: `react-big-calendar`
- **Data**: `date-fns`
- **Monorepo**: Turbo + pnpm

## Scripts relevantes
### Root `package.json`
- `build`: `turbo run build`
- `dev`: `turbo run dev`
- `lint`: `turbo run lint`
- `format`: `prettier --write "**/*.{ts,tsx,md}"`
- `check-types`: `turbo run check-types`

### `apps/web/package.json`
- `dev`: `next dev --port 3000`
- `build`: `next build`
- `start`: `next start`
- `lint`: `eslint --max-warnings 0`
- `check-types`: `next typegen && tsc --noEmit`
