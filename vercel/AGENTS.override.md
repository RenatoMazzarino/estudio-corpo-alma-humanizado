# AGENTS.override.md (vercel)

Escopo: `vercel/*`.

## Objetivo

1. Manter estrategia de env por ambiente clara e reproduzivel.

## Regras

1. Em `vercel/env-import`, versionar apenas `.example` sem segredos.
2. Arquivos reais de segredo ficam em `.vercel/env-import` (fora do Git).
3. Mudou pacote de env requerido:
   - atualizar templates
   - validar com `pnpm vercel:env:audit`
   - refletir mudanca em docs operacionais.

## Ambientes

1. Development: uso local.
2. Preview: homologacao de branch.
3. Production: `main`.

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

