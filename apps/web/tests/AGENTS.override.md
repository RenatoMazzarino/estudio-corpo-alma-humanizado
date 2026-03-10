# AGENTS.override.md (tests)

Escopo: `apps/web/tests`.

## Estrategia de testes

1. Smoke E2E com Playwright para fluxos essenciais.
2. Unitarios com Vitest ficam distribuídos no codigo (`*.test.ts`/`*.test.tsx`).

## Regras

1. Nao transformar smoke em suite pesada/lenta sem necessidade.
2. Sempre que fluxo publico critico mudar, revisar smoke.
3. Manter testes deterministas e sem segredos hardcoded.

## Comandos

1. Smoke: `pnpm --filter web test:smoke`
2. Unitarios: `pnpm --filter web test:unit`

## Regra de maturidade (V1 final de producao)

1. Este escopo nao aceita entrega em mentalidade MVP ou "so para funcionar".
2. Toda mudanca deve mirar padrao de producao: robustez, modularizacao, observabilidade e manutencao previsivel.
3. Nao introduzir gambiarra, duplicacao oportunista, fallback sem governanca ou acoplamento oculto.
4. Solucoes devem incluir:
   - tratamento de erro explicito
   - contratos claros de entrada/saida
   - testes proporcionais ao risco
   - documentacao operacional quando houver impacto de runtime
5. Em conflito entre velocidade e qualidade estrutural, priorizar qualidade estrutural e registrar tradeoff.

