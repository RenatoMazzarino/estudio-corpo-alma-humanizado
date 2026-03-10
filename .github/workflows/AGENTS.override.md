# AGENTS.override.md (.github/workflows)

Escopo: workflows do GitHub Actions.

## Regras especificas

1. Segredos de autenticacao externa sempre em `secrets.*`.
2. Chaves booleanas de controle de comportamento em `vars.*`.
3. Nomes de variaveis devem refletir ambiente e finalidade (`DEV`, `PREVIEW`, `PROD`).
4. Cron de producao deve ter gate explicito por variavel de habilitacao.
5. Todo workflow deve definir `permissions` minimas necessarias.
6. Workflow critico deve definir bloco `concurrency` para evitar corrida operacional.

## Padrao para cron do WhatsApp

1. `WHATSAPP_CRON_DEV_SECRET` -> `secret`.
2. `WHATSAPP_CRON_PROD_SECRET` -> `secret`.
3. `WHATSAPP_CRON_ENABLE_PROD` -> `variable` com valor `true`/`false`.

## Qualidade obrigatoria

1. Workflow nao pode falhar por segredo ausente sem mensagem explicita de diagnostico.
2. Toda chamada externa deve validar codigo HTTP e falhar com exit code apropriado.
3. Evitar passos que dependam de estado interativo.
4. Definir estrategia de reexecucao/falha no proprio passo (retry limitado ou fail fast explicito).

## Regra de maturidade (V1 final de producao)

1. Nao aceitar automacao "manual dependente" para fluxo recorrente critico.
2. Nao aceitar cron sem controle de concorrencia, retries e logs auditaveis.
