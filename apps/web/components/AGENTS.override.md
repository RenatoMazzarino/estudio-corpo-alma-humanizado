# AGENTS.override.md (components)

Escopo: `apps/web/components`.

## Diretriz

1. Componentes devem priorizar composicao, acessibilidade e previsibilidade
   visual.
2. Regra de negocio pesada deve ficar em `src/modules` ou hooks dedicados.

## Regras

1. Manter consistencia com design system local (`components/ui`, docs UI
   system).
2. Nao duplicar logica de dominio em multiplos componentes.
3. Evitar side effects inesperados em render.

## Qualidade

1. Mudou helper de componente? Cobrir com teste unitario quando houver risco
   funcional.
2. Nao quebrar compatibilidade mobile no fluxo principal.

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
