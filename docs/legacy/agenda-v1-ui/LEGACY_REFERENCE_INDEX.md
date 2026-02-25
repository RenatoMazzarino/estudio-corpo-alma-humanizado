# Legacy Reference Index — Agenda V1 UI Branch

> **Status documental:** Indice canonico do bloco legado `agenda-v1-ui` (nao canônico para comportamento atual do produto).
> **Uso correto:** Este arquivo e a referencia para localizar artefatos historicos; para decisoes novas, use docs ativos e o codigo atual.

Este índice consolida os artefatos de referência usados na branch `agenda-v1-ui` e que agora ficam arquivados como legado.

## 1) Referências visuais HTML/HTM (por conteúdo)

- `docs/legacy/agenda-v1-ui/ui-decisions/Visão da Nova Tela Agenda.htm`
: Protótipo completo de Agenda (dia/semana/mês), cards, FAB e header mobile.
- `docs/legacy/agenda-v1-ui/ui-decisions/prancha-de-calendario.html`
: Prancha comparativa de decisões de calendário e comportamento de navegação entre datas.
- `docs/legacy/agenda-v1-ui/ui-decisions/Visão da Nova Tela de Fomulário Agendamento Interno.htm`
: Referência visual/UX do formulário interno de novo agendamento.
- `docs/legacy/agenda-v1-ui/ui-decisions/Visão da Nova Tela de Atendimento.htm`
: Referência de etapas do módulo de atendimento.
- `docs/legacy/agenda-v1-ui/ui-decisions/Visão da Nova Tela de Novo Cliente.htm`
: Referência de UI para cadastro de cliente.
- `docs/legacy/agenda-v1-ui/ui-decisions/Visão da Nova Telas de Lista de Clientes e Detalhes de Clientes.htm`
: Referência de lista e detalhe de clientes (hierarquia visual, densidade e componentes).

## 2) Referências visuais complementares

- `docs/legacy/agenda-v1-ui/ui-decisions/Auditoria Visual – Estúdio Corpo & Alma Humanizado.pdf`
: Base visual de tipografia, espaçamento, identidade e consistência.

## 3) Planos e decisões funcionais da branch

- `docs/legacy/agenda-v1-ui/ui-decisions/PLANO_NOVA_APARENCIA_V1_PRODUCAO.md`
- `docs/legacy/agenda-v1-ui/ui-decisions/REPORT_REVISAO_PLANO_V1_PRODUCAO.md`
- `docs/legacy/agenda-v1-ui/ui-decisions/AGENDA_V1_IMPLEMENTATION_NOTES.md`
- `docs/legacy/agenda-v1-ui/ui-decisions/PLAN_ATENDIMENTO_UIV4.md`
- `docs/legacy/agenda-v1-ui/ui-decisions/REPORT_EXECUCAO_NOVA_APARENCIA_V1_PRODUCAO.md`

## 4) Relatórios de execução/auditoria/pr

- `docs/legacy/agenda-v1-ui/reports/BRANCH_AUDIT_AGENDA_FINAL_2026-02-12.md`
- `docs/legacy/agenda-v1-ui/reports/PR_DRAFT_AGENDA_V1_UI.md`
- `docs/legacy/agenda-v1-ui/reports/REPORT_ATENDIMENTO_UIV4_EXECUTION.md`
- `docs/legacy/agenda-v1-ui/POST_EXECUTION_REPORT.md`
- `docs/legacy/agenda-v1-ui/POST_EXECUTION_REPORT_ADDENDUM.md`
- `docs/legacy/agenda-v1-ui/MASTER_PLAN_ENTERPRISE.md`

## 5) Diagnóstico técnico legado (análise por conteúdo)

- `docs/legacy/agenda-v1-ui/diagnostics/AUDIT_REPORT.md`
: Auditoria inicial de arquitetura, riscos funcionais e prioridades P0/P1.
- `docs/legacy/agenda-v1-ui/diagnostics/AUDIT_LOGS.md`
: Logs operacionais de execução de comandos em ambiente de auditoria.
- `docs/legacy/agenda-v1-ui/diagnostics/DB_CODE_DIFF.md`
: Mapa de uso código↔banco com divergências de colunas e semântica.
- `docs/legacy/agenda-v1-ui/diagnostics/DB_SCHEMA_REPORT.md`
: Snapshot descritivo do schema em fase inicial do projeto.
- `docs/legacy/agenda-v1-ui/diagnostics/MIGRATION_PLAN.md`
: Plano legado de migrações incrementais.
- `docs/legacy/agenda-v1-ui/diagnostics/ARCHITECTURE_TARGET.md`
: Visão-alvo de arquitetura modular para evolução do repo.
- `docs/legacy/agenda-v1-ui/diagnostics/REFACTOR_PLAN.md`
: Plano de refatoração faseado (higiene, modularização, DB e UI).
- `docs/legacy/agenda-v1-ui/diagnostics/ROUTE_MAP.md`
: Mapa de rotas e handlers da fase anterior de app/router.
- `docs/legacy/agenda-v1-ui/diagnostics/REPO_INVENTORY.md`
: Inventário técnico de estrutura e stack da fase Agenda V1.

## 6) Status

- Estes arquivos permanecem acessíveis para rastreabilidade histórica.
- Não devem ser usados como fonte primária para novas branches.
- Para continuidade técnica do produto, priorizar:
  - `README.md`
  - `MANUAL_RAPIDO.md`
  - `docs/integrations/*`
  - `docs/apis/API_GUIDE.md`
  - `supabase/migrations/*`
