# AGENTS.md

Projeto: `estudio-corpo-alma-humanizado`

Este arquivo define orientacoes para agentes no escopo do repositorio inteiro.
Quando existir `AGENTS.override.md` em subpastas, o override local tem prioridade para aquela area.

## Objetivo do produto

1. Operacao do estudio (agenda, atendimento, clientes, caixa e catalogo).
2. Fluxo publico de agendamento e pagamento.
3. Integracoes ativas: Supabase, Google Maps, Mercado Pago, WhatsApp (Meta Cloud API), Spotify.

## Fluxo base de trabalho

1. Instalar dependencias: `pnpm install`
2. Verificacoes principais:
   - `pnpm lint`
   - `pnpm --filter web lint:architecture`
   - `pnpm check-types`
   - `pnpm --filter web test:unit`
   - `pnpm --filter web test:smoke`
   - `pnpm build`
3. Sempre preferir comandos versionados no workspace (nao usar scripts fora do repo sem necessidade).

## Ambientes e deploy

1. Development: uso local com `pnpm vercel:dev` e variaveis de Development.
2. Preview: homologacao por branch com `pnpm vercel:deploy:preview`.
3. Production: `main` com `pnpm vercel:deploy:prod`.
4. Auditar pacotes de env antes de deploy: `pnpm vercel:env:audit`.

## Seguranca e segredos

1. Nunca commitar tokens/chaves em texto plano.
2. Nunca publicar conteudo completo de segredos em logs e respostas.
3. Manter segredos em:
   - `.vercel/env-import/*.env` (local, nao versionado)
   - variaveis na Vercel por ambiente
4. Nao usar comandos destrutivos de Git sem pedido explicito.

## Convencoes de integracao

1. WhatsApp: provider oficial atual e `meta_cloud`.
2. Dry run:
   - Development e Preview: recomendado `WHATSAPP_AUTOMATION_FORCE_DRY_RUN=true`
   - Production: recomendado `WHATSAPP_AUTOMATION_FORCE_DRY_RUN=false`
3. Mercado Pago: manter fluxo de Checkout Transparente (Orders API + webhook).

## Contexto Codex/skills

1. Skill de repositorio: `.agents/skills/estudio-repo-context`.
2. Health-check de skills:
   - `powershell -ExecutionPolicy Bypass -File scripts/codex/check-skills-readiness.ps1`
3. Auth GitHub para skills:
   - `.\scripts\codex\load-gh-token.ps1`
   - `gh auth status`

## Overrides locais

1. `apps/web/AGENTS.override.md`
2. `supabase/functions/AGENTS.override.md`
