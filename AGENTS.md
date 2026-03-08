# AGENTS.md

Projeto: `estudio-corpo-alma-humanizado`

Este arquivo define orientacoes globais para qualquer agente trabalhando neste repositorio.
Ele e complementar ao codigo e aos documentos canonicos de operacao.

## 1) Escopo e objetivo

1. Escopo: repo inteiro (monorepo Turbo com app web, pacotes compartilhados, Supabase e docs operacionais).
2. Objetivo principal: manter o produto operacional com seguranca e previsibilidade.
3. Objetivo tecnico: evoluir funcionalidades sem quebrar fluxo de agenda, atendimento, pagamento e comunicacao.

## 2) Contexto funcional do produto

1. Dashboard interno do estudio:
   - agenda
   - atendimento
   - clientes
   - configuracoes
   - mensagens
   - caixa/catalogo
2. Fluxo publico:
   - agendamento online
   - pagamento
   - voucher/comprovante
3. Integracoes ativas:
   - Supabase
   - Google Maps Platform
   - Mercado Pago
   - WhatsApp Meta Cloud API
   - Spotify

## 3) Mapa macro do repositorio

1. `apps/web`: aplicacao Next.js principal.
2. `apps/web/app`: rotas App Router, paginas publicas/dashboard, APIs internas.
3. `apps/web/src/modules`: modulos de dominio (regra de negocio).
4. `apps/web/src/shared`: utilitarios transversais.
5. `apps/web/components`: composicao e componentes de interface.
6. `supabase/migrations`: historico de schema e regras SQL.
7. `supabase/functions`: edge functions (proxy/borda de integracoes).
8. `packages/*`: bibliotecas compartilhadas do monorepo.
9. `vercel/env-import`: templates de env por ambiente (versionados, sem segredo).
10. `.vercel`: metadata local de link/projeto e env local (nao versionada).
11. `docs/*`: guias tecnicos, runbooks, planos e historico.
12. `.agents/skills`: skills versionadas do repo.

## 4) Fonte de verdade (ordem de precedencia)

1. Codigo em producao no repositorio.
2. Migrations/contratos de banco e runtime.
3. Configuracao real de ambiente/deploy (Vercel, Supabase, Meta, MP).
4. Documentacao ativa.
5. Documentacao historica/legada.

## 5) Documentacao canonica para decisao

1. `README.md`
2. `MANUAL_RAPIDO.md`
3. `docs/DOCUMENTATION_CANONICAL_MATRIX.md`
4. `docs/REGRAS_DE_NEGOCIO_E_FLUXOS.md`
5. `docs/apis/API_GUIDE.md`
6. `docs/integrations/INTEGRATIONS_TECNICO.md`
7. `docs/integrations/INTEGRATIONS_GUIA_OPERACIONAL.md`
8. `docs/engineering/MODULARIZATION_CONVENTIONS.md`
9. `docs/engineering/PR_CHECKLIST_REFACTOR.md`
10. `docs/runbooks/TESTES_VALIDACAO_LOCAL_E_CI.md`

## 6) Contrato arquitetural global

1. Nao reintroduzir monolitos em arquivos centrais de fluxo.
2. Preservar separacao:
   - `app/*`: entrada de rota, composicao, handlers.
   - `src/modules/*`: regra de negocio por dominio.
   - `src/shared/*`: utilitarios transversais.
   - `components/*`: UI/composicao.
3. Nao migrar regra server-side para cliente sem necessidade.
4. Nao fazer refatoracao lateral fora do escopo sem alinhamento.
5. Toda mudanca estrutural deve manter observabilidade e rollback possivel.

## 7) Contrato de dados e banco

1. Mudanca de schema exige migration em `supabase/migrations`.
2. Nao editar migration historica ja aplicada em ambientes compartilhados.
3. Toda mudanca de status/regra de negocio com persistencia deve ter impacto mapeado.
4. Nao assumir bypass de RLS no cliente.
5. Scripts SQL de docs sao referencia de auditoria, nao fonte principal.

## 8) Contrato de API interna e webhooks

1. Endpoints em `apps/web/app/api/*` devem manter contratos de auth/segredo.
2. Webhooks devem permanecer idempotentes e verificaveis.
3. Mudou endpoint? Atualizar `docs/apis/API_GUIDE.md`.
4. Mudou fluxo webhook de integracao? Atualizar docs de integracao/runbook.

## 9) Contrato de integracoes externas

1. Supabase: base de dados, auth e realtime operacional.
2. Google Maps: busca de endereco e deslocamento.
3. Mercado Pago: Checkout Transparente (Orders API + webhook) como caminho oficial.
4. WhatsApp: provider oficial atual `meta_cloud`, coexistencia manual + automacao.
5. Spotify: OAuth + player state/control com guards de sessao.

## 10) Ambientes e deploy

1. Production:
   - branch `main`
   - domínios de produção
2. Preview:
   - branches de validacao/homologacao
3. Development:
   - fluxo local via CLI (`vercel dev`)
4. Sequencia operacional recomendada:
   - Development -> Preview -> Production

## 11) Politica de variaveis de ambiente

1. Templates canonicos:
   - `vercel/env-import/vercel-development-required.env.example`
   - `vercel/env-import/vercel-preview-required.env.example`
   - `vercel/env-import/vercel-production-required.env.example`
2. Segredos reais:
   - apenas Vercel env por ambiente
   - arquivos locais `.vercel/env-import/*.env` (nao versionados)
3. Auditoria local de pacote:
   - `pnpm vercel:env:audit`
4. Nao manter variavel legada sem uso real no painel da Vercel.

## 12) Qualidade e validacao minima

Antes de considerar uma mudanca pronta:

1. `pnpm lint`
2. `pnpm --filter web lint:architecture`
3. `pnpm check-types`
4. `pnpm --filter web test:unit`
5. `pnpm --filter web test:smoke` quando impacto em fluxo publico/E2E
6. `pnpm build`

## 13) Politica de seguranca

1. Nunca commitar segredos/tokens/chaves.
2. Nunca publicar segredo completo em log, diff, doc ou resposta.
3. Nao usar comandos destrutivos de Git sem autorizacao explicita.
4. Em duvida de risco, preferir caminho conservador e explicitar tradeoff.

## 14) Politica de commits e arvore de trabalho

1. Commits em blocos logicos pequenos e auditaveis.
2. Evitar commit gigante misturando arquitetura + env + docs + fluxo sem necessidade.
3. Preservar alteracoes locais nao relacionadas do usuario.
4. Antes de editar:
   - `git branch --show-current`
   - `git status --short`

## 15) Politica de documentacao em mudancas

Atualizar documentacao quando mudar:

1. fluxo de negocio
2. contrato de API
3. integracao externa
4. processo de deploy/ambiente
5. estrutura de operacao do agente

Arquivos alvo comuns:

1. `README.md`
2. `MANUAL_RAPIDO.md`
3. `docs/CODEX_SKILLS_READINESS.md`
4. `docs/integrations/*`
5. `docs/apis/API_GUIDE.md`
6. `docs/REGRAS_DE_NEGOCIO_E_FLUXOS.md`

## 16) Politica de comunicacao de entrega

Toda entrega tecnica deve deixar claro:

1. o que mudou
2. onde mudou (arquivos)
3. como foi validado (comandos)
4. riscos residuais
5. pendencias manuais em paineis externos

## 17) Perfil de colaboracao esperado

1. Idioma: portugues-BR.
2. Resposta objetiva: primeiro decisao/resultado, depois detalhes.
3. Prioridade: execucao ponta a ponta quando pedido for de implementacao.
4. Evitar jargao desnecessario; traduzir impacto para operacao.

## 18) Overrides: conceito e precedencia

1. `AGENTS.md` da raiz vale para todo o repo.
2. `AGENTS.override.md` em uma pasta refina regras daquela pasta.
3. Se houver override local, usar:
   - regra global + regra local
   - com prioridade para a regra local em caso de conflito.

## 19) Overrides ativos no repositorio

1. `apps/AGENTS.override.md`
2. `apps/web/AGENTS.override.md`
3. `apps/web/app/AGENTS.override.md`
4. `apps/web/app/api/AGENTS.override.md`
5. `apps/web/app/(public)/AGENTS.override.md`
6. `apps/web/app/(dashboard)/AGENTS.override.md`
7. `apps/web/src/AGENTS.override.md`
8. `apps/web/src/modules/AGENTS.override.md`
9. `apps/web/src/modules/appointments/AGENTS.override.md`
10. `apps/web/src/modules/notifications/AGENTS.override.md`
11. `apps/web/src/modules/payments/AGENTS.override.md`
12. `apps/web/src/shared/AGENTS.override.md`
13. `apps/web/components/AGENTS.override.md`
14. `apps/web/tests/AGENTS.override.md`
15. `supabase/AGENTS.override.md`
16. `supabase/migrations/AGENTS.override.md`
17. `supabase/functions/AGENTS.override.md`
18. `docs/AGENTS.override.md`
19. `scripts/AGENTS.override.md`
20. `vercel/AGENTS.override.md`
21. `packages/AGENTS.override.md`
22. `packages/ui/AGENTS.override.md`
23. `.agents/AGENTS.override.md`
24. `.agents/skills/estudio-repo-context/AGENTS.override.md`

## 20) Comandos uteis de operacao do repo

1. `pnpm install`
2. `pnpm dev`
3. `pnpm lint`
4. `pnpm check-types`
5. `pnpm --filter web test:unit`
6. `pnpm --filter web test:smoke`
7. `pnpm build`
8. `pnpm codex:skills:check`
9. `pnpm vercel:env:audit`
10. `pnpm vercel:deploy:preview`
11. `pnpm vercel:deploy:prod`
