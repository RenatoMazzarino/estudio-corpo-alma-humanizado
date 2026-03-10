# AGENTS.override.md (scripts)

Escopo: `scripts/*`.

## Diretriz

1. Scripts devem ser reexecutaveis e previsiveis.
2. Evitar side effects irreversiveis sem confirmacao explicita.

## Regras

1. Nao embutir segredo em script versionado.
2. Preferir mensagens claras de erro/resultado.
3. Se script alterar estado externo (deploy/env), documentar pre-condicoes.

## Scripts criticos atuais

1. `scripts/codex/check-skills-readiness.ps1`
2. `scripts/codex/load-gh-token.ps1`
3. `scripts/codex/vercel-env-audit.ps1`

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

