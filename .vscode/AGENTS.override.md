# AGENTS.override.md (.vscode)

Escopo: configuracoes locais do workspace VS Code.

## Objetivo

1. Manter ferramentas de analise e execucao alinhadas ao repo.
2. Reduzir falso positivo e comportamento inconsistente entre maquinas.

## Regras

1. Configuracao em `.vscode/*` nao deve conter segredo.
2. Mudancas em settings devem priorizar compatibilidade com:
   - TypeScript do workspace
   - ESLint do monorepo
   - Vitest/Playwright no fluxo atual
3. Nao incluir configuracao experimental que degrada estabilidade do time.
4. Separar configuracao de equipe (versionada) de preferencia pessoal (nao
   versionada).

## Extensoes e tooling

1. Extensao que depende de CLI externo deve ter CLI validado no PATH da sessao
   do VS Code.
2. Em conflito entre extensao e CLI oficial, priorizar diagnostico via CLI.

## Regra de maturidade (V1 final de producao)

1. Configuracao de editor deve suportar operacao profissional do repo, sem
   workaround fragil.
2. Mudanca de tooling local relevante deve ser documentada em `MANUAL_RAPIDO.md`
   quando impactar operacao.
