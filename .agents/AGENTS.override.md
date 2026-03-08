# AGENTS.override.md (.agents)

Escopo: configuracao de habilidades de agente versionadas no repo.

## Regras

1. Manter estrutura compativel com padrao OpenAI de skills.
2. Cada skill deve ter `SKILL.md` valido.
3. `agents/openai.yaml` e opcional, mas recomendado quando houver metadados/policy/deps.

## Governanca

1. Alterou skill versionada? atualizar docs de readiness se houver impacto operacional.
2. Nao adicionar skill sem descricao clara de quando usar e quando nao usar.
