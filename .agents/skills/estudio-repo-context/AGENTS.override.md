# AGENTS.override.md (estudio-repo-context skill)

Escopo: somente a skill `estudio-repo-context`.

## Regras

1. Manter o `SKILL.md` focado em contexto do repo, nao em instrucoes genericas.
2. Atualizar referencias quando comandos/docs canonicas mudarem.
3. Evitar duplicar instrucoes completas do `AGENTS.md` raiz; aqui so
   complementar o uso da skill.

## Validacao

1. Sempre que alterar a skill, validar sintaxe/estrutura da skill com tooling
   disponivel.

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
