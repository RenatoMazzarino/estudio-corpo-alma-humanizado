# AGENTS.override.md (packages/ui)

Escopo: biblioteca de UI compartilhada.

## Regras

1. Componentes aqui devem ser genericos e reutilizaveis.
2. Nao incluir regra de negocio de dominio do estudio.
3. Preservar acessibilidade basica e tipos claros.

## Impacto de mudanca

1. Qualquer alteracao pode afetar multiplos consumidores.
2. Validar app consumidor apos mudanca de componente base.

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
