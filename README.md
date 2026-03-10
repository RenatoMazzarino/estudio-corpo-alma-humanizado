# estudio-corpo-alma-humanizado

## Requisitos

- Node.js 24.13.0+ (use `.nvmrc`).
- pnpm 10.29.1 (via `corepack enable`).
- Turbo 2.8.3 (devDependency no root).
- Docker + Supabase CLI 2.75.0 (instalado via `pnpm install`).
- `SUPABASE_SERVICE_ROLE_KEY` para operações administrativas server-side (RLS habilitado).
- VS Code: use o TypeScript do workspace (evita erro de JSX).

## Setup rápido

```sh
corepack enable
pnpm install
pnpm lint
pnpm --filter web lint:architecture
pnpm check-types
pnpm --filter web test:unit
pnpm --filter web test:smoke
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
- Decisão documentada em `docs/legacy/agenda-v1-ui/ui-decisions/REPORT_EXECUCAO_NOVA_APARENCIA_V1_PRODUCAO.md` e `docs/ui-system/README.md`.

## Scripts úteis

```sh
pnpm dev
pnpm lint
pnpm check-types
pnpm --filter web lint:architecture
pnpm --filter web test:unit
pnpm --filter web test:smoke
pnpm build
```

## Integrações

- Visão técnica: `docs/integrations/INTEGRATIONS_TECNICO.md`
- Guia operacional: `docs/integrations/INTEGRATIONS_GUIA_OPERACIONAL.md`
- API interna do app: `docs/apis/API_GUIDE.md`

Integrações ativas no produto:
- Supabase (dados, RPCs e autenticação server-side)
- Google Maps Platform (endereços e taxa de deslocamento)
- Mercado Pago Checkout Transparente (Pix/cartão + webhook)
- WhatsApp (manual + automação via Meta Cloud API, webhook, cron e painel `Mensagens`)
- Spotify (OAuth + estado/controle de player no módulo de atendimento)

WhatsApp (estado atual):
- `appointment_created` usa biblioteca oficial de 12 templates com seleção automática por cenário (local, financeiro e intro Flora).
- regra de intro: primeira automação `com_flora`, depois `sem_oi_flora`, com reapresentação após 180 dias sem automação.

## Documentação

- Índice de docs: `docs/README.md`
- Matriz canônica de documentação: `docs/DOCUMENTATION_CANONICAL_MATRIX.md`
- Arquivo legado da fase Agenda V1 UI: `docs/legacy/agenda-v1-ui/LEGACY_REFERENCE_INDEX.md`
- Prontidão de skills Codex: `docs/CODEX_SKILLS_READINESS.md`

## Codex Skills (check rápido)

```powershell
powershell -ExecutionPolicy Bypass -File scripts/codex/check-skills-readiness.ps1
.\scripts\codex\load-gh-token.ps1
```

Skill de repositorio (repo-first):
- `.agents/skills/estudio-repo-context`

Arquivos de agente no repositorio:
- `AGENTS.md` (instrucoes globais)
- `.codex/config.toml` (config de projeto do Codex)
- `apps/web/AGENTS.override.md` (regras locais do app web)
- `supabase/functions/AGENTS.override.md` (regras locais das edge functions)

Referencias oficiais OpenAI:
- `https://developers.openai.com/codex`
- `https://developers.openai.com/codex/skills`
- `https://developers.openai.com/codex/config-basic`
- `https://developers.openai.com/codex/config-reference`

## Vercel (3 ambientes)

Fluxo recomendado:

1. Development (local) via `vercel dev` com env Development.
2. Preview (branch) com env Preview e `WHATSAPP_PROFILE=preview_real_test`.
3. Production (`main`) com env Production e `WHATSAPP_PROFILE=prod_real`.

Padrão profile-first (WhatsApp):

1. `WHATSAPP_PROFILE` define o comportamento-base por ambiente.
2. `WHATSAPP_AUTOMATION_RECIPIENT_MODE` define se envia para `test_recipient` (fixo) ou `customer` (cliente real).
3. `WHATSAPP_AUTOMATION_PROFILE` continua aceito por compatibilidade.
4. Flags legadas continuam compatíveis, mas não são o caminho principal.

Comandos:

```powershell
pnpm vercel:env:audit
pnpm vercel:dev
pnpm vercel:deploy:preview
pnpm vercel:deploy:prod
```

Templates versionados de env:

- `vercel/env-import/vercel-development-required.env.example`
- `vercel/env-import/vercel-preview-required.env.example`
- `vercel/env-import/vercel-production-required.env.example`

## VS Code Test Explorer

Se o painel de testes mostrar apenas Playwright, falta a extensão do Vitest.

1. Instale a extensão `vitest.explorer`.
2. Recarregue o VS Code.
3. Rode `pnpm --filter web test:unit` para confirmar discovery dos testes unitários.
