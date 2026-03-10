# AGENTS.override.md (apps/web/app)

Escopo: rotas e paginas App Router.

## Regras de rota

1. Cada rota deve manter responsabilidade clara (UI, API ou auth).
2. Nao duplicar regra de dominio aqui se ela ja existe em `src/modules/*`.
3. Evitar side effects ocultos em componentes de pagina.

## Seguranca

1. Endpoint sensivel deve validar auth/sessao/segredo conforme tipo.
2. Nao expor segredos em `NEXT_PUBLIC_*`.

## Validacao

1. Rodar ao menos:
   - `pnpm --filter web lint`
   - `pnpm --filter web check-types`
   - `pnpm --filter web build`

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
