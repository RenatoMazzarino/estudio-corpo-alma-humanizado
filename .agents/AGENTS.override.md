# AGENTS.override.md (.agents)

Escopo: configuracao de habilidades de agente versionadas no repo.

## Regras

1. Manter estrutura compativel com padrao OpenAI de skills.
2. Cada skill deve ter `SKILL.md` valido.
3. `agents/openai.yaml` e opcional, mas recomendado quando houver
   metadados/policy/deps.

## Governanca

1. Alterou skill versionada? atualizar docs de readiness se houver impacto
   operacional.
2. Nao adicionar skill sem descricao clara de quando usar e quando nao usar.

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
