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

## Regra de maturidade (V1 final de producao)

1. Este escopo nao aceita entrega em mentalidade MVP ou "so para funcionar".
2. Toda mudanca deve mirar padrao de producao: robustez, modularizacao,
   observabilidade e manutencao previsivel.
3. Nao introduzir gambiarra, duplicacao oportunista, fallback sem governanca ou
   acoplamento oculto.
4. Solucoes devem incluir:
   - tratamento de erro explicito
   - contratos claros de entrada/saida
   - testes proporcionais ao risco
   - documentacao operacional quando houver impacto de runtime
5. Em conflito entre velocidade e qualidade estrutural, priorizar qualidade
   estrutural e registrar tradeoff.
