# Matriz de Documentacao Canonica (v2)

Data de referencia: 2026-03-23  
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

### `MANUAL_RAPIDO.md`

- Categoria: canonico.
- Tema: operacao local, comandos e setup.
- Fonte de verdade: parcial.
- Status: atual.

### `apps/web/README.md`

- Categoria: ativo.
- Tema: escopo do app web e scripts.
- Fonte de verdade: parcial.
- Status: atual.

## 2) Documentacao ativa (operacao e integracoes)

### Nucleo de negocio

- `docs/README.md`: canonico, indice e governanca.
- `docs/REGRAS_DE_NEGOCIO_E_FLUXOS.md`: canonico para regras de negocio.
- `docs/apis/API_GUIDE.md`: ativo para contratos de rotas `/api`.

### Integracoes

- `docs/integrations/INTEGRATIONS_GUIA_OPERACIONAL.md`: canonico operacional.
- `docs/integrations/INTEGRATIONS_TECNICO.md`: canonico tecnico.
- `docs/integrations/WEBHOOK_OPERACIONAL.md`: canonico para webhook MP.

### Engenharia e governanca

- `docs/engineering/MODULARIZATION_CONVENTIONS.md`: canonico.
- `docs/engineering/PR_CHECKLIST_REFACTOR.md`: canonico.
- `docs/engineering/AGENTS_GOVERNANCE.md`: canonico.
- `docs/engineering/AGENTS_PRECEDENCE_MAP.md`: canonico (gerado).
- `docs/engineering/AGENTS_CHANGELOG.md`: ativo (historico de regra).
- `docs/agents/AGENTS_TEMPLATE.md`: canonico.
- `docs/agents/AGENTS_LINT_RULES.md`: canonico.

### Runbooks ativos

- `docs/runbooks/TESTES_VALIDACAO_LOCAL_E_CI.md`: canonico.
- `docs/runbooks/WORKSPACE_MULTI_REPO_ANDROID_AWS_DB_2026-03-20.md`: canonico.
- `docs/runbooks/VERCEL_VSCODE_SEM_CONFLITO.md`: canonico.
- `docs/runbooks/WHATSAPP_PROFILE_FIRST_ENV_STRATEGY.md`: canonico.

### UI system e contrato visual

- `docs/ui-system/v2-component-surface-standards.md`: canonico para V2 visual.
- `docs/ui-system/*`: ativo; deve refletir tokens/componentes reais do codigo.

## 3) Planos e relatorios ativos

### Planos

- `docs/plans/PLANO_REESCRITA_REPO_ANDROID_NATIVO_2026-03-20.md`
  - Status: canonico.
  - Observacao: baseline atualizado em 2026-03-23.
- `docs/plans/ANEXO_PADRONIZACAO_HIGIENE_ERROS_LOADING_REESCRITA_2026-03-20.md`
  - Status: canonico.
  - Observacao: baseline atualizado em 2026-03-23.

### Relatorios de referencia ativa

- `docs/reports/AUDITORIA_REESCRITA_MIGRACAO_MOBILE_BASELINE_2026-03-23.md`
- `docs/reports/RELATORIO_AUDITORIA_COMPONENTES_BOTOES_V2_2026-03-22.md`
- `docs/reports/RELATORIO_PADRONIZACAO_COMPONENTES_REESCRITA_V2_2026-03-20.md`

Uso: apoiar estrategia, rollout e validacao.

## 4) Historico/legado

- `docs/legacy/**`
- planos/relatorios de ciclos encerrados sem impacto em runtime atual

Categoria: historico. Nao usar como fonte primaria de decisao.

## 5) Regra pratica de governanca

1. Em conflito entre doc e codigo, codigo vence.
2. Em conflito entre doc e ambiente real, ambiente real vence.
3. Documento canonico deve ser atualizado no mesmo bloco tecnico da mudanca.
4. Documento historico nao recebe regra nova de operacao.
