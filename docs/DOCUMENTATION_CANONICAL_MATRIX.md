# Matriz de Documentacao Canonica (v2)

Data de referencia: 2026-03-10  
Escopo: docs ativas, docs legadas, `README.md`, `MANUAL_RAPIDO.md` e
`apps/web/README.md`.

## Objetivo

Classificar o que e:

- canonico para decisao,
- ativo, mas parcial,
- historico (somente referencia).

## Regra de leitura (fonte de verdade)

1. Codigo atual do repo.
2. Migrations, schema e contratos de runtime.
3. Configuracao real de ambiente/deploy.
4. Documentacao ativa.
5. Documentacao historica.

## Legenda

- `sim`: documento canonico no tema.
- `parcial`: util, mas nao substitui codigo/env.
- `nao`: historico/referencia.

## 1) Entrada e onboarding

### `README.md`

- Categoria: canonico.
- Tema: setup geral e visao macro.
- Fonte de verdade: parcial.
- Status: atual.
- Acao: manter como entrypoint do monorepo.

### `MANUAL_RAPIDO.md`

- Categoria: canonico.
- Tema: operacao local, comandos e setup Windows.
- Fonte de verdade: parcial.
- Status: atual.
- Acao: atualizar sempre que stack e comandos mudarem.

### `apps/web/README.md`

- Categoria: ativo.
- Tema: escopo do app web, auth e scripts.
- Fonte de verdade: parcial.
- Status: atual.
- Acao: manter enxuto e alinhado ao app.

## 2) Documentacao ativa (operacao e integracoes)

### Nucleo de negocio

- `docs/README.md`: canonico, indice e governanca.
- `docs/REGRAS_DE_NEGOCIO_E_FLUXOS.md`: canonico para regras de negocio.
- `docs/apis/API_GUIDE.md`: ativo para contratos de rotas `/api`.

### Integracoes

- `docs/integrations/INTEGRATIONS_GUIA_OPERACIONAL.md`: canonico operacional.
- `docs/integrations/INTEGRATIONS_TECNICO.md`: canonico tecnico.
- `docs/integrations/WEBHOOK_OPERACIONAL.md`: canonico para runbook webhook MP.

### Engenharia e governanca

- `docs/engineering/MODULARIZATION_CONVENTIONS.md`: canonico.
- `docs/engineering/PR_CHECKLIST_REFACTOR.md`: canonico.
- `docs/engineering/AGENTS_GOVERNANCE.md`: canonico.
- `docs/engineering/AGENTS_PRECEDENCE_MAP.md`: canonico (gerado).
- `docs/engineering/AGENTS_CHANGELOG.md`: ativo (historico de regra).
- `docs/agents/AGENTS_TEMPLATE.md`: canonico.
- `docs/agents/AGENTS_LINT_RULES.md`: canonico.

### Runbooks ativos

- `docs/runbooks/WHATSAPP_PROFILE_FIRST_ENV_STRATEGY.md`: canonico.
- `docs/runbooks/VERCEL_VSCODE_SEM_CONFLITO.md`: canonico.
- `docs/runbooks/WORKSPACE_MULTI_REPO_ANDROID_AWS_DB_2026-03-20.md`: canonico.
- `docs/runbooks/TESTES_VALIDACAO_LOCAL_E_CI.md`: canonico.
- `docs/runbooks/WL5_WL10_ROLLOUT_REMOTE_MAIN_2026-03-19.md`: canonico.
- `docs/runbooks/WHITE_LABEL_TENANT_ONBOARDING_BACKOFFICE_2026-03-19.md`:
  canonico.

### Marca e UI system

- `docs/branding/BRAND_TOKENS.md`: canonico para identidade visual.
- `docs/ui-system/*`: referencia ativa para padrao de UI.

## 3) Relatorios e planos ativos/parciais

### Ativos

- `docs/plans/PLANO_ENTERPRISE_REALTIME_EDGE_PUSH_LOADING_2026-03-10.md`
- `docs/plans/PLANO_REESCRITA_REPO_ANDROID_NATIVO_2026-03-20.md`
- `docs/plans/ANEXO_PADRONIZACAO_HIGIENE_ERROS_LOADING_REESCRITA_2026-03-20.md`
- `docs/reports/VALIDACAO_E2E_TESTES_E_DOCUMENTACAO_2026-03-03.md`
- `docs/reports/WHATSAPP_TECH_PROVIDER_COEXISTENCE_READINESS_2026-02-23.md`

Uso: apoiar estrategia, rollout e validacao.

### Historicos

- `docs/plans/PLANO_IMPLANTACAO_ATENDIMENTO_V1_UNIFICADO.md`
- `docs/reports/ERROR_CATALOG_AGENDA_PAYMENTS_2026-02-13.md`
- Demais relatorios datados de execucao ja concluida.

Uso: referencia e rastreabilidade, nao decisao de runtime.

## 4) Legado (`docs/legacy/agenda-v1-ui`)

### Status geral

- Categoria: historico.
- Fonte de verdade: nao.
- Uso permitido: contexto, auditoria e trilha de evolucao.

### Indice canonico do legado

- `docs/legacy/agenda-v1-ui/LEGACY_REFERENCE_INDEX.md`

### Subgrupos legados

- `diagnostics/*`: auditorias, inventarios e planos antigos.
- `ui-decisions/*`: planos/relatorios de execucao visual antiga.
- `reports/*`: auditorias e rascunhos de PR da fase anterior.
- `MASTER_PLAN_ENTERPRISE.md` e `POST_EXECUTION_REPORT*.md`: historico.

## 5) Regra pratica de governanca

1. Em conflito entre doc e codigo, codigo vence.
2. Em conflito entre doc e ambiente real, ambiente real vence.
3. Documento canonico deve ser atualizado no mesmo PR da mudanca tecnica.
4. Documento historico nao deve receber regra nova de operacao.

## 6) Acoes recomendadas continuas

1. Sincronizar `INTEGRATIONS_*` e `API_GUIDE` quando mudar webhook/API.
2. Sincronizar `MANUAL_RAPIDO.md` quando mudar setup local.
3. Rodar `pnpm agents:check` ao alterar AGENTS/overrides.
4. Manter `docs/legacy` apenas como historico.
