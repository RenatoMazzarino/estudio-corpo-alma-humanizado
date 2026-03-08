# AGENTS.md

Projeto: `estudio-corpo-alma-humanizado`

Este arquivo define o contrato operacional para agentes no escopo de todo o repositorio.
Quando existir `AGENTS.override.md` em subpastas, o override local tem prioridade para aquela area.

## 1) Missao do produto

1. Gerir operacao do estudio: agenda, atendimento, clientes, catalogo e caixa.
2. Suportar agendamento publico ponta a ponta (selecionar servico, reservar, pagar, receber voucher/comprovante).
3. Operar comunicacao WhatsApp em coexistencia:
   - manual pelo dashboard
   - automacao por Meta Cloud API com logs/status webhook.
4. Integracoes ativas e criticas:
   - Supabase
   - Google Maps Platform
   - Mercado Pago (Checkout Transparente / Orders API + webhook)
   - WhatsApp Meta Cloud API
   - Spotify (OAuth + player state/control)

## 2) Fonte de verdade e ordem de leitura

Em caso de conflito, usar esta prioridade:

1. Codigo atual do repo.
2. Migrations e contratos de runtime.
3. Configuracao real de ambiente (Vercel, Supabase, Meta, MP).
4. Documentacao ativa.
5. Documentacao legada/historica.

Documentos canonicamente relevantes:

1. `README.md`
2. `MANUAL_RAPIDO.md`
3. `docs/REGRAS_DE_NEGOCIO_E_FLUXOS.md`
4. `docs/apis/API_GUIDE.md`
5. `docs/integrations/INTEGRATIONS_TECNICO.md`
6. `docs/integrations/INTEGRATIONS_GUIA_OPERACIONAL.md`
7. `docs/engineering/MODULARIZATION_CONVENTIONS.md`
8. `docs/engineering/PR_CHECKLIST_REFACTOR.md`
9. `docs/DOCUMENTATION_CANONICAL_MATRIX.md`

## 3) Mapa do repositorio (resumo pratico)

1. `apps/web`
   - app Next.js (App Router), API routes internas, UI do dashboard, fluxo publico.
2. `apps/web/src/modules/*`
   - fronteiras de dominio apos modularizacao (appointments, notifications, payments, clients, etc.).
3. `supabase/migrations`
   - evolucao do schema e regras de banco.
4. `supabase/functions`
   - edge functions de borda/proxy (whatsapp/mercadopago).
5. `vercel/env-import`
   - templates versionados de variaveis por ambiente (sem segredo).
6. `.vercel/env-import`
   - variaveis locais reais (nao versionadas).
7. `.agents/skills`
   - skills versionadas no repo.
8. `.codex/config.toml`
   - defaults de projeto para Codex.

## 4) Regras de arquitetura obrigatorias

1. Nao reintroduzir monolitos grandes em componentes, actions ou handlers.
2. Preservar separacao de camadas:
   - `app/*` para rotas, composicao e pontos de entrada.
   - `src/modules/*` para regra de negocio por dominio.
   - `src/shared/*` para utilitarios transversais.
3. Nao mover logica sensivel para cliente quando existe caminho server-side.
4. Nao quebrar compatibilidade de API/DB sem migration e rollout controlado.
5. Manter padrao de modularizacao descrito em `docs/engineering/MODULARIZATION_CONVENTIONS.md`.

## 5) Fluxos de negocio que nao podem quebrar

1. Agendamento interno e publico devem persistir `appointments` corretamente.
2. Status financeiros devem seguir regra canonica (pendente/parcial/pago/liberado/estornado).
3. Distincao obrigatoria:
   - `voucher` = comprovante de agendamento/servico.
   - `comprovante` = recibo de pagamento.
4. Manual + automacao WhatsApp devem coexistir.
5. Painel `Mensagens` precisa refletir status webhook (`sent`, `delivered`, `read`, `failed`).

## 6) Integracoes (contratos minimos)

### 6.1 Supabase

1. Usado para dados, RPCs, auth e realtime operacional.
2. Alteracao de dados estruturais exige migration.
3. Nao assumir dados fora do tenant ativo.

### 6.2 Google Maps

1. Usado para busca/normalizacao de endereco e taxa de deslocamento.
2. Qualquer alteracao deve preservar fallback e validacao de endereco.

### 6.3 Mercado Pago

1. Modelo oficial do repo: Checkout Transparente (Orders API + webhook).
2. Nao migrar para Checkout Pro neste repo.
3. Webhook deve continuar idempotente e seguro.

### 6.4 WhatsApp (Meta Cloud API)

1. Provider atual canonicamente ativo: `meta_cloud`.
2. Webhook Meta: `/api/whatsapp/meta/webhook`.
3. Processador interno: `/api/internal/notifications/whatsapp/process`.
4. Config de templates canonica no banco (settings), nao em env legada.
5. Nao reintroduzir YCloud sem decisao explicita documentada.

### 6.5 Spotify

1. OAuth + estado/controle de player para atendimento/configuracoes.
2. Alteracoes devem manter guards de sessao.

## 7) Ambientes, deploy e variaveis

Modelo oficial em uso:

1. Development
   - local via `pnpm vercel:dev`
   - esperado `WHATSAPP_AUTOMATION_FORCE_DRY_RUN=true`
2. Preview
   - homologacao por branch (`pnpm vercel:deploy:preview`)
   - esperado `WHATSAPP_AUTOMATION_FORCE_DRY_RUN=true`
3. Production
   - branch `main` (`pnpm vercel:deploy:prod`)
   - esperado `WHATSAPP_AUTOMATION_FORCE_DRY_RUN=false`

Regras de env:

1. Templates versionados:
   - `vercel/env-import/vercel-development-required.env.example`
   - `vercel/env-import/vercel-preview-required.env.example`
   - `vercel/env-import/vercel-production-required.env.example`
2. Segredos reais fora do Git:
   - `.vercel/env-import/*.env`
3. Validacao local de pacote:
   - `pnpm vercel:env:audit`
4. Nao manter variavel legada sem uso na Vercel.

## 8) Comandos de validacao obrigatoria

Sequencia minima antes de subir mudanca relevante:

1. `pnpm lint`
2. `pnpm --filter web lint:architecture`
3. `pnpm check-types`
4. `pnpm --filter web test:unit`
5. `pnpm --filter web test:smoke` (quando tocar fluxo publico/rotas legais/E2E)
6. `pnpm build`

Check extra de skills/agent runtime:

1. `pnpm codex:skills:check`
2. `.\scripts\codex\load-gh-token.ps1`
3. `gh auth status`

## 9) Politica de banco e migrations

1. Mudanca de schema sempre por migration em `supabase/migrations`.
2. Nao editar historico de migration ja aplicada em ambientes compartilhados.
3. DDL/DML sensivel deve vir com validação de impacto.
4. Se alterar regras de status/financeiro, atualizar docs canonicos.

## 10) Politica de API interna

1. Endpoints publicos e protegidos devem manter contrato de autenticacao/segredo.
2. Webhooks e cron devem preservar assinatura/autorizacao.
3. Se criar/alterar rota em `app/api`, atualizar `docs/apis/API_GUIDE.md`.

## 11) Politica de documentacao

Obrigatorio atualizar documentacao quando houver mudanca real de:

1. Fluxo de negocio.
2. Contrato de API.
3. Integracao externa.
4. Processo de deploy/ambiente.
5. Estrutura operacional do agente.

Arquivos para revisar em toda mudanca estrutural:

1. `README.md`
2. `MANUAL_RAPIDO.md`
3. `docs/CODEX_SKILLS_READINESS.md`
4. `docs/DOCUMENTATION_CANONICAL_MATRIX.md` (se mudar classificacao/escopo)

## 12) Seguranca operacional

1. Nunca commitar token/chave/cookie/sessao.
2. Nunca expor segredo completo em log/resposta.
3. Nao usar comandos destrutivos de Git sem pedido explicito.
4. Em caso de duvida de seguranca, priorizar bloqueio conservador e registrar impacto.

## 13) Guardrails de mudanca

1. Evitar alterar muitas fronteiras de modulo em um unico commit sem necessidade.
2. Preferir commits por bloco de risco (arquitetura, env/deploy, docs, etc.).
3. Se encontrar mudancas inesperadas no working tree que nao pertencem ao escopo atual, parar e alinhar antes.

## 14) Estado atual relevante (snapshot tecnico)

1. Monorepo com Turbo + pnpm.
2. `apps/web` modularizado em dominios principais.
3. Suite de testes:
   - Vitest para unitarios (varios arquivos)
   - Playwright smoke com cobertura enxuta (1 teste ativo no momento)
4. Vercel CLI configurado no workspace.
5. Estrutura repo-first de skills ativa em `.agents/skills`.

## 15) Overrides locais

Arquivos de override atualmente ativos:

1. `apps/web/AGENTS.override.md`
2. `supabase/functions/AGENTS.override.md`

Use esses arquivos quando o trabalho estiver concentrado nessas areas, pois eles refinam regras do escopo global.
