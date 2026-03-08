# AGENTS.override.md (shared)

Escopo: `apps/web/src/shared`.

## Papel da pasta

1. Utilitarios transversais (formatacao, env, validacao, helpers comuns).
2. Nenhuma regra de negocio altamente especifica de modulo.

## Regras

1. Evitar dependencias de `shared` para componentes de tela.
2. Evitar acoplamento de `shared` com fluxo unico de um modulo.
3. Qualquer utilitario de env deve respeitar separacao server/public.

## Qualidade

1. Mudanca em helper amplamente usado exige revisao de impacto multi-modulo.
2. Preferir testes para parsers/formatadores com risco de regressao.
