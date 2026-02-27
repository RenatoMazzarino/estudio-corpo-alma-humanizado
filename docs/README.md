# Docs Index

Este diretório foi organizado em duas camadas:

## 1) Documentação ativa (uso atual do produto/repo)

- `README.md` (raiz): setup e visão geral.
- `MANUAL_RAPIDO.md`: comandos operacionais (dev, build, migrations, deploy).
- `docs/DOCUMENTATION_CANONICAL_MATRIX.md`: classificação canônica (ativo/legado/histórico) e regra de leitura.
- `docs/REGRAS_DE_NEGOCIO_E_FLUXOS.md`: referência operacional das regras de negócio (agendamento, atendimento, pagamentos, mensagens, IDs/códigos).
- `docs/apis/API_GUIDE.md`: APIs internas do app.
- `docs/integrations/INTEGRATIONS_TECNICO.md`: arquitetura e requisitos técnicos das integrações.
- `docs/integrations/INTEGRATIONS_GUIA_OPERACIONAL.md`: operação de produção.
- `docs/integrations/WEBHOOK_OPERACIONAL.md`: runbook operacional do webhook Mercado Pago (produção).
- `docs/reports/WHATSAPP_TECH_PROVIDER_COEXISTENCE_READINESS_2026-02-23.md`: documento canônico de roadmap/readiness WhatsApp/Meta/coexistência (estratégia, não runtime).
- `docs/ui-system/*`: design system e padrões canônicos de UI.
- `docs/sql/README.md`: orientação para snapshots SQL de auditoria.
- `docs/engineering/MODULARIZATION_CONVENTIONS.md`: convenções técnicas de modularização e fronteiras de camada.
- `docs/engineering/PR_CHECKLIST_REFACTOR.md`: checklist obrigatório para blocos de refatoração/hardening.

## 2) Legado da branch Agenda V1 UI (histórico fechado)

Todo o material de planejamento, referência visual, auditorias e rascunhos dessa fase foi consolidado em:

- `docs/legacy/agenda-v1-ui/LEGACY_REFERENCE_INDEX.md`

Inclui:
- HTMLs/HTMs de referência visual usados na execução.
- PDF de auditoria visual.
- planos e reports da fase.
- diagnósticos técnicos (audit logs, migration plan, db diff, route map, repo inventory).

## Regra de manutenção

- Novas branches não devem usar arquivos de legado como fonte primária.
- Para decisões novas, usar a documentação ativa e criar novos artefatos fora de `docs/legacy/`.
- Em conflito entre documentação e comportamento implementado: validar `código + migrations + env real`.
