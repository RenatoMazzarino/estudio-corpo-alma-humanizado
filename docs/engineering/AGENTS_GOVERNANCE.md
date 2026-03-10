# AGENTS Governance

Status: active
Owner: engenharia de plataforma
Ultima revisao: 2026-03-10

## Objetivo

Definir como escrever, revisar e manter `AGENTS.md` e `AGENTS.override.md` com padrao de producao.

## Principios

1. Regra global no `AGENTS.md` da raiz.
2. Regra local em `AGENTS.override.md` apenas quando ha risco/complexidade especifica do caminho.
3. Evitar duplicacao textual extensa entre overrides.
4. Priorizar clareza operacional: o arquivo deve dizer o que aplicar, o que nao aplicar e como validar.

## Estrutura minima recomendada para override

1. Titulo com caminho do escopo.
2. Linha `Escopo:`.
3. `## Objetivo`.
4. `## Regras`.
5. `## Aplica / Nao aplica` (quando fizer sentido no escopo).
6. `## Checklist minimo de validacao`.
7. `## Risco de regressao` (quando o escopo for critico).
8. `## Regra de maturidade (V1 final de producao)`.

## Quando criar um novo override

Crie `AGENTS.override.md` novo quando as tres condicoes abaixo forem verdadeiras:

1. O caminho tem responsabilidade propria de negocio/operacao.
2. O risco de regressao local nao e coberto bem pelo global.
3. Existe checklist local de validacao diferente do restante do repo.

## Quando NAO criar um novo override

1. O caminho so possui arquivos de apoio sem regra propria.
2. As regras locais seriam copia literal do arquivo pai.
3. O risco pode ser tratado apenas por documentacao canonica ja existente.

## Processo de revisao

1. Atualizar arquivos de agente.
2. Rodar `pnpm agents:check`.
3. Conferir mapa de precedencia em `docs/engineering/AGENTS_PRECEDENCE_MAP.md`.
4. Atualizar `docs/engineering/AGENTS_CHANGELOG.md` com resumo da mudanca.

## Definition of Done para governanca de agentes

1. Sem override orfao.
2. Sem arquivo de agente sem escopo declarado.
3. Sem regra que conflita com `AGENTS.md` raiz sem justificativa local.
4. Mapa de precedencia atualizado.