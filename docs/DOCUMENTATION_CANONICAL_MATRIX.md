# Matriz de Documentação Canônica (v2)

Data de referência: 2026-03-10  
Escopo desta v2: `docs/**/*.md` + `README.md` + `MANUAL_RAPIDO.md` + `apps/web/README.md`

## Objetivo

Reduzir ambiguidade de onboarding e manutenção documental, classificando:

- quais arquivos são canônicos
- quais são ativos mas parciais
- quais são apenas referência
- quais são históricos/legados

## Regra de leitura (hierarquia de fonte de verdade)

1. Código atual do repo
2. Migrations / schema / contratos de runtime
3. Configuração real de ambiente/deploy (Vercel, Supabase, Meta etc.)
4. Documentação ativa
5. Documentação legada / relatórios históricos

## Legenda rápida

- `fonte de verdade?`
: `sim` = canônico no seu tema/documentação; `parcial` = útil, mas não substitui código/env; `não` = histórico/referência apenas
- `status`
: `atual`, `parcialmente desatualizado`, `desatualizado`

## 1) Entrada / Onboarding

| arquivo | categoria | tema | fonte de verdade? | status | observação | ação recomendada |
|---|---|---|---|---|---|---|
| `README.md` | `canônico` | Setup geral do repo e visão macro | `parcial` | `atual` | Bom ponto de entrada do monorepo; não descreve tudo do produto | Manter como entrypoint e atualizar quando mudar stack/setup |
| `MANUAL_RAPIDO.md` | `canônico` | Operação local (Windows), setup, Supabase, comandos | `parcial` | `atual` | Muito útil para operação prática; foco Windows | Manter alinhado a versões, comandos e fluxos reais |
| `apps/web/README.md` | `ativo` | Escopo do app `web`, auth, scripts e referências | `parcial` | `atual` | Documento local do app; complementar ao `README.md` raiz | Manter enxuto e alinhado ao app/router/auth |

## 2) Documentação Ativa (geral / integrações / operações)

| arquivo | categoria | tema | fonte de verdade? | status | observação | ação recomendada |
|---|---|---|---|---|---|---|
| `docs/README.md` | `canônico` | Índice de docs e regra de manutenção | `sim` | `atual` | Define separação ativo vs legado | Manter e referenciar novos docs ativos aqui |
| `docs/REGRAS_DE_NEGOCIO_E_FLUXOS.md` | `canônico` | Regras de negócio e fluxos operacionais (agendamento, atendimento, pagamentos, mensagens, IDs/códigos) | `parcial` | `atual` | Consolida regras do código para operação; não substitui runtime/schema | Atualizar quando regra de negócio mudar no código |
| `docs/apis/API_GUIDE.md` | `ativo` | Guia de rotas internas `/api` | `parcial` | `atual` | Cobertura atual dos endpoints do repo; ainda depende de envs e guards runtime | Revisar quando novas rotas `/api` forem criadas/alteradas |
| `docs/branding/BRAND_TOKENS.md` | `canônico` | Tokens oficiais de marca (cores/logos) | `parcial` | `atual` | Bom para evitar regressão visual e hardcodes | Manter alinhado com `globals.css` |
| `docs/integrations/INTEGRATIONS_GUIA_OPERACIONAL.md` | `canônico` | Operação diária de integrações | `parcial` | `atual` | Forte valor operacional; depende de envs reais | Atualizar quando mudar fluxo/rotina de produção |
| `docs/integrations/INTEGRATIONS_TECNICO.md` | `canônico` | Arquitetura técnica de integrações | `parcial` | `atual` | Referência técnica central de integrações | Atualizar quando mudar endpoints, envs ou provedores |
| `docs/integrations/WEBHOOK_OPERACIONAL.md` | `canônico` | Runbook do webhook Mercado Pago | `parcial` | `atual` | Muito útil para operação/painel MP; env/deploy real ainda vence | Manter com URLs e checklist por ambiente |
| `docs/runbooks/WHATSAPP_PROFILE_FIRST_ENV_STRATEGY.md` | `canônico` | Estratégia profile-first para automação WhatsApp por ambiente | `parcial` | `atual` | Define padrão operacional para reduzir flags manuais e confusão entre ambientes | Atualizar quando mudar perfis/política de destinatário |
| `docs/runbooks/VERCEL_VSCODE_SEM_CONFLITO.md` | `canônico` | Runbook de operacao Vercel no VS Code sem conflito de extensoes | `sim` | `atual` | Define setup unico de extensao e troubleshooting para painel em loading | Usar como referencia oficial de tooling Vercel no editor |
| `docs/sql/README.md` | `canônico` | Governança de dumps SQL de auditoria | `sim` | `atual` | Define corretamente que dumps não são fonte de verdade | Manter como regra da pasta `docs/sql` |
| `docs/engineering/MODULARIZATION_CONVENTIONS.md` | `canônico` | Convenções de modularização e fronteiras de camada | `sim` | `atual` | Define padrão técnico de evolução do repo e guardrails arquiteturais | Manter atualizado a cada ciclo de refatoração |
| `docs/engineering/PR_CHECKLIST_REFACTOR.md` | `canônico` | Checklist de qualidade para refatoração/hardening | `sim` | `atual` | Define gate obrigatório por bloco técnico | Usar em todos os blocos de refatoração na `main` |
| `docs/engineering/AGENTS_GOVERNANCE.md` | `canônico` | Regras de escrita e manutenção de AGENTS/overrides | `sim` | `atual` | Define padrão de governança para instruções de agente no repo | Atualizar quando surgirem novos escopos críticos |
| `docs/engineering/AGENTS_PRECEDENCE_MAP.md` | `canônico` | Mapa de precedência de AGENTS por caminho | `sim` | `atual` | Arquivo gerado automaticamente por script de consistência | Regenerar com `pnpm agents:check` após mexer em overrides |
| `docs/engineering/AGENTS_CHANGELOG.md` | `ativo` | Histórico de alterações na governança dos AGENTS | `parcial` | `atual` | Registro operacional de evolução das regras | Manter atualizado por rodada de governança |
| `docs/agents/AGENTS_TEMPLATE.md` | `canônico` | Template padrão para novos AGENTS.override.md | `sim` | `atual` | Evita drift de estrutura entre overrides | Reusar em todo novo escopo local |
| `docs/agents/AGENTS_LINT_RULES.md` | `canônico` | Regras validadas por lint/check de agentes | `sim` | `atual` | Explica critérios estruturais e comando de validação | Manter alinhado ao script `check-agents-consistency.ps1` |

## 3) Reports e Planos Ativos/Parciais

| arquivo | categoria | tema | fonte de verdade? | status | observação | ação recomendada |
|---|---|---|---|---|---|---|
| `docs/reports/WHATSAPP_TECH_PROVIDER_COEXISTENCE_READINESS_2026-02-23.md` | `canônico` | Estratégia/readiness Meta/WhatsApp/coexistência/Tech Provider | `parcial` | `atual` | Documento canônico de roadmap/readiness; não substitui código/env | Manter como referência estratégica única e atualizar por fase |
| `docs/reports/VALIDACAO_E2E_TESTES_E_DOCUMENTACAO_2026-03-03.md` | `canônico` | Evidência de validação técnica e atualização documental | `parcial` | `atual` | Registro objetivo da bateria de testes executada e docs alinhadas | Atualizar a cada rodada de validação ampla |
| `docs/plans/PLANO_ENTERPRISE_REALTIME_EDGE_PUSH_LOADING_2026-03-10.md` | `canônico` | Plano enterprise de evolução para realtime, edge, push e loading UX | `parcial` | `atual` | Plano de implementação multi-fase com baseline do repo e critérios de validação/rollout | Usar como referência principal desta trilha e atualizar a cada fase concluída |
| `docs/reports/ERROR_CATALOG_AGENDA_PAYMENTS_2026-02-13.md` | `histórico` | Catálogo de feedbacks UI (agenda/pagamentos) | `parcial` | `parcialmente desatualizado` | Útil para contexto de UX/IDs; datado | Manter como referência; consolidar se catálogo evoluir |
| `docs/plans/PLANO_IMPLANTACAO_ATENDIMENTO_V1_UNIFICADO.md` | `histórico` | Plano de implantação Atendimento V1 unificado | `não` | `desatualizado` | Plano de execução já absorvido em grande parte pelo código/commits | Manter arquivado; usar apenas para rastreabilidade |

## 4) UI System (ativo / referência)

### 4.1 Núcleo do UI System

| arquivo | categoria | tema | fonte de verdade? | status | observação | ação recomendada |
|---|---|---|---|---|---|---|
| `docs/ui-system/README.md` | `canônico` | Regras-mãe do UI system e frame mobile | `parcial` | `atual` | Boa referência de layout 3 partes e frame mobile | Manter alinhado com `AppShell`/`ModulePage` |
| `docs/ui-system/tokens.md` | `canônico` | Tokens visuais (Tailwind/CSS vars) | `parcial` | `atual` | Referencia `globals.css`, mas código ainda vence | Atualizar quando tokens mudarem |
| `docs/ui-system/colors.md` | `canônico` | Paleta oficial de UI | `parcial` | `atual` | Complementa branding e auditoria visual | Manter alinhado com tokens reais |
| `docs/ui-system/typography.md` | `canônico` | Tipografia (Playfair/Lato) e escala | `parcial` | `atual` | Base importante para consistência visual | Manter alinhado com implementação |
| `docs/ui-system/spacing-radius-shadow.md` | `canônico` | Espaçamento, raio e sombra | `parcial` | `atual` | Guia de padrões visuais | Atualizar quando houver refino de surfaces/layout |

### 4.2 Componentes (referência rápida)

| arquivo | categoria | tema | fonte de verdade? | status | observação | ação recomendada |
|---|---|---|---|---|---|---|
| `docs/ui-system/components/button.md` | `referência` | Botões canônicos | `parcial` | `atual` | Resumo curto; útil para padronização | Expandir exemplos quando houver refactor visual |
| `docs/ui-system/components/header.md` | `referência` | Headers (`AppHeader`, `ModuleHeader`) | `parcial` | `atual` | Importante para padrão sticky/header | Manter alinhado ao layout real |
| `docs/ui-system/components/card.md` | `referência` | Cards / `SurfaceCard` | `parcial` | `atual` | Curto, porém útil | Expandir usos e variações se necessário |
| `docs/ui-system/components/chip.md` | `referência` | Chips/Pills/status | `parcial` | `atual` | Reforça regra de cor (domicílio roxo) | Manter |
| `docs/ui-system/components/input.md` | `referência` | Inputs | `parcial` | `atual` | Guia visual resumido | Manter |
| `docs/ui-system/components/bottom-nav.md` | `referência` | BottomNav global | `parcial` | `atual` | Referência de navegação e estados | Atualizar se navegação mudar |
| `docs/ui-system/components/toast.md` | `referência` | Feedback visual curto | `parcial` | `atual` | Muito resumido | Expandir estados/variações se necessário |

### 4.3 Padrões de tela (referência rápida)

| arquivo | categoria | tema | fonte de verdade? | status | observação | ação recomendada |
|---|---|---|---|---|---|---|
| `docs/ui-system/patterns/forms.md` | `referência` | Padrões de formulários | `parcial` | `atual` | Resumo de spacing/sections | Manter |
| `docs/ui-system/patterns/lists.md` | `referência` | Padrões de listas | `parcial` | `atual` | Referência curta de itens/listas | Manter |
| `docs/ui-system/patterns/loading-states.md` | `referência` | Loading/skeleton | `parcial` | `atual` | Guia curto | Manter |
| `docs/ui-system/patterns/empty-states.md` | `referência` | Empty states | `parcial` | `atual` | Guia curto | Manter |
| `docs/ui-system/patterns/errors.md` | `referência` | Error states | `parcial` | `atual` | Guia curto | Manter |
| `docs/ui-system/patterns/permissions-rls.md` | `referência` | Convenções RLS/permissões na UI | `parcial` | `atual` | Bom lembrete arquitetural, não substitui policies/middleware | Manter e revisar se auth/rls mudar |

## 5) Legado (índice canônico do legado + material histórico)

### 5.1 Índice do legado

| arquivo | categoria | tema | fonte de verdade? | status | observação | ação recomendada |
|---|---|---|---|---|---|---|
| `docs/legacy/agenda-v1-ui/LEGACY_REFERENCE_INDEX.md` | `legado` | Índice canônico dos artefatos da branch `agenda-v1-ui` | `sim` | `atual` | Canônico para localizar o material legado, não para decisões novas | Manter; usar apenas para rastreabilidade histórica |

### 5.2 Legado — planos, execução e pós-execução

| arquivo | categoria | tema | fonte de verdade? | status | observação | ação recomendada |
|---|---|---|---|---|---|---|
| `docs/legacy/agenda-v1-ui/MASTER_PLAN_ENTERPRISE.md` | `histórico` | Plano mestre enterprise (fase anterior) | `não` | `desatualizado` | Grande valor histórico; várias fases já executadas/evoluídas | Manter arquivado |
| `docs/legacy/agenda-v1-ui/POST_EXECUTION_REPORT.md` | `histórico` | Relatório pós-execução G0–G8 | `não` | `desatualizado` | Evidência de execução da fase antiga | Manter arquivado |
| `docs/legacy/agenda-v1-ui/POST_EXECUTION_REPORT_ADDENDUM.md` | `histórico` | Addendum pós-execução (G9+) | `não` | `desatualizado` | Histórico de polimentos e ambiente | Manter arquivado |

### 5.3 Legado — diagnostics (auditorias e planos técnicos)

| arquivo | categoria | tema | fonte de verdade? | status | observação | ação recomendada |
|---|---|---|---|---|---|---|
| `docs/legacy/agenda-v1-ui/diagnostics/AUDIT_REPORT.md` | `histórico` | Auditoria inicial de arquitetura/DB/código | `não` | `desatualizado` | Diagnóstico da fase anterior; muitos achados já tratados | Manter como histórico de baseline |
| `docs/legacy/agenda-v1-ui/diagnostics/AUDIT_LOGS.md` | `histórico` | Logs de auditoria (execução de comandos) | `não` | `desatualizado` | Log de ambiente antigo | Manter arquivado |
| `docs/legacy/agenda-v1-ui/diagnostics/ARCHITECTURE_TARGET.md` | `histórico` | Visão-alvo de arquitetura (fase agenda-v1-ui) | `parcial` | `parcialmente desatualizado` | Conceitos ainda úteis; estrutura real evoluiu | Reusar apenas conceito, não como mapa atual |
| `docs/legacy/agenda-v1-ui/diagnostics/DB_SCHEMA_REPORT.md` | `histórico` | Snapshot descritivo de schema (fase inicial) | `não` | `desatualizado` | Snapshot antigo; migrations atuais vencem | Manter arquivado |
| `docs/legacy/agenda-v1-ui/diagnostics/DB_CODE_DIFF.md` | `histórico` | Mapa DB↔código da fase inicial | `não` | `desatualizado` | Divergências já tratadas em boa parte | Manter arquivado |
| `docs/legacy/agenda-v1-ui/diagnostics/MIGRATION_PLAN.md` | `histórico` | Plano de migrations da fase enterprise | `não` | `desatualizado` | Plano executado/absorvido em histórico | Manter arquivado |
| `docs/legacy/agenda-v1-ui/diagnostics/REFACTOR_PLAN.md` | `histórico` | Plano de refatoração faseado | `não` | `desatualizado` | Documento de planejamento histórico | Manter arquivado |
| `docs/legacy/agenda-v1-ui/diagnostics/REPO_INVENTORY.md` | `histórico` | Inventário técnico de stack/estrutura | `parcial` | `parcialmente desatualizado` | Parte da stack ainda válida; inventário é de fase anterior | Atualizar só se virar inventário novo em outro arquivo |
| `docs/legacy/agenda-v1-ui/diagnostics/ROUTE_MAP.md` | `histórico` | Mapa de rotas da fase anterior | `não` | `desatualizado` | App Router e rotas evoluíram | Manter arquivado |

### 5.4 Legado — UI decisions / planos visuais / relatórios

| arquivo | categoria | tema | fonte de verdade? | status | observação | ação recomendada |
|---|---|---|---|---|---|---|
| `docs/legacy/agenda-v1-ui/ui-decisions/AGENDA_V1_IMPLEMENTATION_NOTES.md` | `histórico` | Notas de implementação da Agenda V1 | `não` | `desatualizado` | Mapeamento de fase anterior | Manter arquivado |
| `docs/legacy/agenda-v1-ui/ui-decisions/PLAN_ATENDIMENTO_UIV4.md` | `histórico` | Plano de Atendimento UI V4 (fase anterior) | `não` | `desatualizado` | Planejamento histórico; código atual já consolidou outra etapa | Manter arquivado |
| `docs/legacy/agenda-v1-ui/ui-decisions/PLANO_NOVA_APARENCIA_V1_PRODUCAO.md` | `histórico` | Plano oficial de nova aparência/UX v1 | `não` | `desatualizado` | Base de execução histórica | Manter arquivado |
| `docs/legacy/agenda-v1-ui/ui-decisions/REPORT_EXECUCAO_NOVA_APARENCIA_V1_PRODUCAO.md` | `histórico` | Relatório cumulativo de execução UI/UX v1 | `parcial` | `parcialmente desatualizado` | Muito rico para contexto; mistura histórico com estado final daquela branch | Consultar apenas como referência histórica |
| `docs/legacy/agenda-v1-ui/ui-decisions/REPORT_REVISAO_PLANO_V1_PRODUCAO.md` | `histórico` | Revisão do plano v1 produção | `não` | `desatualizado` | Complemento histórico de planejamento | Manter arquivado |

### 5.5 Legado — reports de branch / PR / execução

| arquivo | categoria | tema | fonte de verdade? | status | observação | ação recomendada |
|---|---|---|---|---|---|---|
| `docs/legacy/agenda-v1-ui/reports/BRANCH_AUDIT_AGENDA_FINAL_2026-02-12.md` | `histórico` | Auditoria final da branch `agenda-v1-ui` | `não` | `desatualizado` | Útil para contexto de merge/readiness daquela branch | Manter arquivado |
| `docs/legacy/agenda-v1-ui/reports/PR_DRAFT_AGENDA_V1_UI.md` | `histórico` | Rascunho de PR da branch `agenda-v1-ui` | `não` | `desatualizado` | PR draft histórico | Manter arquivado |
| `docs/legacy/agenda-v1-ui/reports/REPORT_ATENDIMENTO_UIV4_EXECUTION.md` | `histórico` | Relatório de execução da UI V4 de atendimento | `não` | `desatualizado` | Reflete fase de implementação anterior | Manter arquivado |

## 6) Observações de Governança (v2)

1. Em conflito entre documentação e comportamento implementado, `código + migrations + env real` vencem.
2. O arquivo `docs/reports/WHATSAPP_TECH_PROVIDER_COEXISTENCE_READINESS_2026-02-23.md` é canônico para **estratégia/readiness** de WhatsApp, mas não para inferir comportamento runtime sem validar o código.
3. `apps/web/README.md` foi saneado e agora descreve escopo/auth/scripts do app; manter enxuto para não competir com o `README.md` raiz.
4. O bloco `docs/legacy/agenda-v1-ui/*` deve permanecer acessível, com uso explícito de contexto histórico (e banners de status documental já aplicados).
5. Relatórios de certificação e inventário de fallback (`docs/reports/CERTIFICACAO_FINAL_PROGRAMA_MODULARIZACAO_2026-03-02.md` e `docs/reports/FALLBACK_INVENTARIO_2026-03-02.md`) passam a compor a trilha canônica de fechamento técnico.

## 7) Próximas Ações Recomendadas

1. Manter `INTEGRATIONS_*` e `API_GUIDE` sincronizados sempre que mudar webhook/cron/provedores/envs.
2. Revisar `MANUAL_RAPIDO.md` quando versões de Node/pnpm/Supabase CLI mudarem.
3. Refinar UX/estrutura das páginas legais públicas (backlog de conteúdo/apresentação, não bloqueante operacional).
4. Avaliar inclusão de documentos operacionais fora de `docs/` (ex.: `apps/web/content/auto-messages.md`) em uma próxima versão da matriz.
