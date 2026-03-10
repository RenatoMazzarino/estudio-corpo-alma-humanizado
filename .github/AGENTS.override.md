# AGENTS.override.md (.github)

Escopo: configuracoes de automacao GitHub (`.github/*`).

## Objetivo

1. Garantir CI/CD previsivel, auditavel e seguro.
2. Evitar quebra operacional por segredos/variaveis mal classificados.

## Regras

1. Workflow critico deve explicitar:
   - gatilho
   - dependencia de `secrets` e `vars`
   - comportamento em ausencia de segredo
2. Nao mover valor sensivel para `vars`.
3. Nao expor token/secret em log.
4. Mudanca de automacao de deploy/cron exige atualizacao de runbook e docs
   operacionais.

## Regra de maturidade (V1 final de producao)

1. Nao aceitar workflow "best effort" sem tratamento de erro e idempotencia.
2. Nao manter automacao opaca: logs devem permitir diagnostico sem revelar
   segredo.
3. Toda alteracao de CI/CD deve prever rollback operacional.
