# Docs Index

Atualizado em: 2026-03-23

Este diretorio esta organizado em duas camadas:

## 1) Documentacao ativa (uso atual do produto/repo)

- `README.md` (raiz): setup e visao geral.
- `MANUAL_RAPIDO.md`: comandos operacionais (dev, build, migrations, deploy).
- `docs/DOCUMENTATION_CANONICAL_MATRIX.md`: classificacao canonica
  (ativo/legado/historico) e regra de leitura.
- `docs/REGRAS_DE_NEGOCIO_E_FLUXOS.md`: regras de negocio operacionais.
- `docs/apis/API_GUIDE.md`: APIs internas e contratos de entrada/saida.
- `docs/integrations/INTEGRATIONS_TECNICO.md`: arquitetura tecnica de integracoes.
- `docs/integrations/INTEGRATIONS_GUIA_OPERACIONAL.md`: operacao de producao.
- `docs/integrations/WEBHOOK_OPERACIONAL.md`: runbook webhook Mercado Pago.
- `docs/runbooks/TESTES_VALIDACAO_LOCAL_E_CI.md`: validacao local e CI.
- `docs/runbooks/WORKSPACE_MULTI_REPO_ANDROID_AWS_DB_2026-03-20.md`:
  operacao multi-repo web + android/backend.
- `docs/plans/PLANO_REESCRITA_REPO_ANDROID_NATIVO_2026-03-20.md`:
  plano principal da reescrita mobile/backend (baseline atualizado em 2026-03-23).
- `docs/plans/ANEXO_PADRONIZACAO_HIGIENE_ERROS_LOADING_REESCRITA_2026-03-20.md`:
  anexo tecnico obrigatorio da reescrita (baseline atualizado em 2026-03-23).
- `docs/reports/AUDITORIA_REESCRITA_MIGRACAO_MOBILE_BASELINE_2026-03-23.md`:
  auditoria completa de baseline para migracao mobile.
- `docs/reports/RELATORIO_AUDITORIA_COMPONENTES_BOTOES_V2_2026-03-22.md`:
  auditoria V2 de componentes e botoes.
- `docs/ui-system/*`: design system e padroes visuais V2.
- `docs/ui-system/v2-component-surface-standards.md`: contrato visual V2
  (headers/cards/sheets/accordions/footer rail).
- `docs/engineering/MODULARIZATION_CONVENTIONS.md`: convencoes de arquitetura.
- `docs/engineering/PR_CHECKLIST_REFACTOR.md`: checklist tecnico de PR.
- `docs/engineering/AGENTS_GOVERNANCE.md`: governanca de agentes.
- `docs/engineering/AGENTS_PRECEDENCE_MAP.md`: mapa de heranca dos overrides.
- `docs/engineering/AGENTS_CHANGELOG.md`: historico de mudancas de governanca.
- `docs/agents/AGENTS_TEMPLATE.md`: template de overrides.
- `docs/agents/AGENTS_LINT_RULES.md`: regras validadas por `pnpm agents:check`.

## 2) Legado/historico

Material historico consolidado da fase Agenda V1 UI em:

- `docs/legacy/agenda-v1-ui/LEGACY_REFERENCE_INDEX.md`

Uso permitido:

1. contexto e rastreabilidade;
2. auditoria historica;
3. comparacao de evolucao.

Nao usar como fonte primaria para decisoes novas.

## Regra de manutencao

1. Novas decisoes devem atualizar docs ativas no mesmo bloco tecnico.
2. Em conflito entre doc e codigo: codigo + migrations + env real vencem.
3. Em mudanca de API/integracao/fluxo: atualizar docs de operacao no mesmo PR.
