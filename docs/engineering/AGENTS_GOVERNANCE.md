# AGENTS Governance

Status: active Owner: engenharia de plataforma Ultima revisao: 2026-03-10

## Objetivo

Definir como escrever, revisar e manter `AGENTS.md` e `AGENTS.override.md` com
padrao de producao.

## Principios

1. Regra global no `AGENTS.md` da raiz.
2. Regra local em `AGENTS.override.md` apenas quando ha risco/complexidade
   especifica do caminho.
3. Evitar duplicacao textual extensa entre overrides.
4. Priorizar clareza operacional: o arquivo deve dizer o que aplicar, o que nao
   aplicar e como validar.
5. Regras de subagentes devem ser globais por padrao; override local so quando
   um caminho tiver restricoes muito especificas de delegacao.

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

Crie `AGENTS.override.md` novo quando as tres condicoes abaixo forem
verdadeiras:

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

## Governanca de subagentes

Use `AGENTS.md` raiz para definir:

1. quando delegacao paralela e recomendada;
2. quando nao usar subagentes;
3. contrato minimo de delegacao;
4. responsabilidade do agente principal pela integracao final.

So coloque regra de subagente em `AGENTS.override.md` local quando houver:

1. limitacao real de ownership de arquivos;
2. risco alto de conflito de escrita naquela pasta;
3. exigencia local de revisao, compliance ou validacao adicional.

## Proposta obrigatoria de evolucao

Quando um agente identificar melhoria benefica em arquivos, regras ou
configuracoes de agentes/subagentes, ele deve:

1. avisar o usuario antes de mudar;
2. dizer se a sugestao e criacao, alteracao ou exclusao;
3. dizer se a mudanca e global, local ou pessoal da maquina;
4. pedir confirmacao antes de aplicar mudanca de governanca.

Isso vale inclusive para:

1. `AGENTS.md`;
2. `AGENTS.override.md`;
3. `.codex/config.toml` versionado no repo;
4. organizacao de skills e politicas de uso de subagentes.

## O que NAO versionar

Nao versionar em `AGENTS.md`, overrides ou `.codex/config.toml` do repo:

1. caminhos absolutos de trusted project do desktop/CLI;
2. credenciais pessoais;
3. preferencias que so fazem sentido para uma maquina especifica.

Esses itens pertencem ao arquivo do usuario em `~/.codex/config.toml`.

## Definition of Done para governanca de agentes

1. Sem override orfao.
2. Sem arquivo de agente sem escopo declarado.
3. Sem regra que conflita com `AGENTS.md` raiz sem justificativa local.
4. Mapa de precedencia atualizado.
