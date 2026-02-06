# estudio-corpo-alma-humanizado

## Requisitos

- Node.js 20.11.1+ (use `.nvmrc`).
- pnpm 9 (via `corepack enable`).
- Docker + Supabase CLI (instalado via `pnpm install`).
- `SUPABASE_SERVICE_ROLE_KEY` para operações administrativas server-side (RLS habilitado).
- VS Code: use o TypeScript do workspace (evita erro de JSX).

## Setup rápido

```sh
corepack enable
pnpm install
pnpm lint
pnpm check-types
pnpm build
```

## Windows (PowerShell)

```powershell
corepack enable
pnpm install
pnpm dev
```

Se alternar entre WSL e Windows, apague `node_modules` e `.next` antes de reinstalar:

```powershell
Remove-Item -Recurse -Force node_modules, apps/web/node_modules, packages/ui/node_modules, packages/eslint-config/node_modules, packages/typescript-config/node_modules, apps/web/.next
pnpm install
```

> O `pnpm dev` usa o Turbo local (sem necessidade de instalação global).
> Se aparecer aviso de Turbo global, rode `pnpm install` novamente no Windows para recriar os binários locais.

> Em WSL, garanta que o `pnpm` esteja usando o Node Linux (corepack). Isso evita binários nativos incompatíveis (ex.: lightningcss).

---

## Padrão de layout (UI)

- Todas as telas seguem 3 partes: **Header / Content / Navigation**.
- `AppShell` controla frame + scroll único; `ModulePage` organiza header e conteúdo.
- Decisão documentada em `docs/ui-decisions/REPORT_EXECUCAO_NOVA_APARENCIA_V1_PRODUCAO.md` e `docs/ui-system/README.md`.

## Scripts úteis

```sh
pnpm dev
pnpm lint
pnpm check-types
pnpm build
```
