# Docs Index

Atualizado em: 2026-03-10

Este diretório foi organizado em duas camadas:

## 1) Documentação ativa (uso atual do produto/repo)

- `README.md` (raiz): setup e visão geral.
- `MANUAL_RAPIDO.md`: comandos operacionais (dev, build, migrations, deploy).
- `docs/DOCUMENTATION_CANONICAL_MATRIX.md`: classificação canônica
  (ativo/legado/histórico) e regra de leitura.
- `docs/REGRAS_DE_NEGOCIO_E_FLUXOS.md`: referência operacional das regras de
  negócio (agendamento, atendimento, pagamentos, mensagens, IDs/códigos).
- `docs/apis/API_GUIDE.md`: APIs internas do app.
- `docs/integrations/INTEGRATIONS_TECNICO.md`: arquitetura e requisitos técnicos
  das integrações.
- `docs/integrations/INTEGRATIONS_GUIA_OPERACIONAL.md`: operação de produção.
- `docs/integrations/WEBHOOK_OPERACIONAL.md`: runbook operacional do webhook
  Mercado Pago (produção).
- `docs/runbooks/WHATSAPP_PROFILE_FIRST_ENV_STRATEGY.md`: estratégia oficial
  profile-first para automação WhatsApp por ambiente.
- `docs/runbooks/VERCEL_VSCODE_SEM_CONFLITO.md`: runbook para operar Vercel no
  VS Code sem conflito de extensoes.
- `docs/runbooks/WORKSPACE_MULTI_REPO_ANDROID_AWS_DB_2026-03-20.md`: runbook
  oficial para operar os dois repos no mesmo VS Code, com escopo de extensoes,
  papel do Android Studio e acesso seguro ao Aurora via SSM.
- `docs/runbooks/WL5_WL10_ROLLOUT_REMOTE_MAIN_2026-03-19.md`: runbook de
  rollout remoto das fases white-label WL-5..WL-10.
- `docs/runbooks/WHITE_LABEL_TENANT_ONBOARDING_BACKOFFICE_2026-03-19.md`:
  checklist operacional de onboarding de tenant sem SQL manual recorrente.
- `docs/plans/PLANO_ENTERPRISE_REALTIME_EDGE_PUSH_LOADING_2026-03-10.md`: plano
  enterprise de implementacao para realtime, edge functions, push notifications
  e padronizacao de loading UX.
- `docs/plans/PLANO_REESCRITA_REPO_ANDROID_NATIVO_2026-03-20.md`: plano
  detalhado fase a fase para reescrita do produto como app Android nativo em
  repo separado, mantendo backend e operacao white-label.
- `docs/plans/ANEXO_PADRONIZACAO_HIGIENE_ERROS_LOADING_REESCRITA_2026-03-20.md`:
  anexo tecnico obrigatorio da reescrita com regras de higiene estrutural,
  padronizacao de loading, catalogo de erros v2 e trilha anti-gambiarra.
- `docs/reports/WHATSAPP_TECH_PROVIDER_COEXISTENCE_READINESS_2026-02-23.md`:
  documento canônico de roadmap/readiness WhatsApp/Meta/coexistência
  (estratégia, não runtime).
- `docs/ui-system/*`: design system e padrões canônicos de UI.
- `docs/sql/README.md`: orientação para snapshots SQL de auditoria.
- `docs/engineering/MODULARIZATION_CONVENTIONS.md`: convenções técnicas de
  modularização e fronteiras de camada.
- `docs/engineering/PR_CHECKLIST_REFACTOR.md`: checklist obrigatório para blocos
  de refatoração/hardening.
- `docs/engineering/AGENTS_GOVERNANCE.md`: governanca de `AGENTS.md` e
  `AGENTS.override.md`.
- `docs/engineering/AGENTS_PRECEDENCE_MAP.md`: mapa de heranca dos overrides
  (gerado por script).
- `docs/engineering/AGENTS_CHANGELOG.md`: historico de mudancas de governanca
  dos agentes.
- `docs/agents/AGENTS_TEMPLATE.md`: template padrao para novos overrides.
- `docs/agents/AGENTS_LINT_RULES.md`: regras validadas por `pnpm agents:check`.
- `docs/reports/CERTIFICACAO_FINAL_PROGRAMA_MODULARIZACAO_2026-03-02.md`:
  certificação final consolidada do programa.
- `docs/reports/FALLBACK_INVENTARIO_2026-03-02.md`: inventário canônico de
  fallbacks (mantidos/removidos).
- `docs/reports/VALIDACAO_E2E_TESTES_E_DOCUMENTACAO_2026-03-03.md`: execução da
  bateria de validação e atualização documental.
- `docs/reports/WL5_WL10_EXECUCAO_LOCAL_2026-03-19.md`: evidências técnicas da
  execução local ponta a ponta WL-5..WL-10.

## 2) Legado da branch Agenda V1 UI (histórico fechado)

Todo o material de planejamento, referência visual, auditorias e rascunhos dessa
fase foi consolidado em:

- `docs/legacy/agenda-v1-ui/LEGACY_REFERENCE_INDEX.md`

Inclui:

- HTMLs/HTMs de referência visual usados na execução.
- PDF de auditoria visual.
- planos e reports da fase.
- diagnósticos técnicos (audit logs, migration plan, db diff, route map, repo
  inventory).

## Regra de manutenção

- Novas branches não devem usar arquivos de legado como fonte primária.
- Para decisões novas, usar a documentação ativa e criar novos artefatos fora de
  `docs/legacy/`.
- Em conflito entre documentação e comportamento implementado: validar
  `código + migrations + env real`.
