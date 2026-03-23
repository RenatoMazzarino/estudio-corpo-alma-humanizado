# AGENTS.override.md (apps/web/app/(dashboard))

Escopo: telas autenticadas do estudio.

## Contrato funcional

1. Manter fluxo operacional do estudio estavel:
   - agenda
   - atendimento
   - clientes
   - configuracoes
   - mensagens
2. Qualquer mudanca com impacto em operacao deve explicitar risco e rollback.

## Regras

1. Preservar guards de auth do dashboard.
2. Evitar regressao de UX em fluxo de alta frequencia (agenda/atendimento).
3. Manter consistencia visual com shell V2 (`header + content + footer rail`).
4. Para mudanca visual V2, seguir obrigatoriamente
   `docs/ui-system/v2-component-surface-standards.md`.
5. Nao criar variacao local de header/card/modal sem antes tentar encaixar em:
   - Header de tela
   - Header de modal
   - Header de card 1 ou 2
   - Header de accordion 1 ou 2
6. Rodapes de modulo/modal devem usar contrato de `FooterRail` antes de criar
   variante local.

## Validacao recomendada

1. Testes unitarios afetados.
2. Fluxo manual rapido:
   - abrir agenda
   - abrir detalhe de atendimento
   - validar acoes de pagamento/mensagem no escopo alterado.

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
