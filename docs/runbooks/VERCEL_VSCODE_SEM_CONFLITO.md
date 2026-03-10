# Runbook Vercel no VS Code (sem conflito)

Status: active  
Owner: engenharia de plataforma  
Ultima revisao: 2026-03-10

## O que e este runbook

Runbook e um guia operacional passo a passo para executar uma rotina sem
ambiguidade.

Este runbook cobre como operar Vercel no VS Code sem travar painel em
`Loading...`.

## Escopo

1. Extensao Vercel no VS Code.
2. Link do workspace com o projeto correto na Vercel.
3. Diagnostico rapido de problema comum.

## Regra principal (obrigatoria)

1. Manter **uma unica extensao Vercel ativa por vez**.
2. Motivo: extensoes diferentes podem registrar a mesma view
   (`vercel-deployments`) e gerar conflito.

Padrao deste repo:

1. Extensao recomendada: `aarondill.vercel-project-manager-vscode`.
2. Extensao nao recomendada em paralelo: `frenco.vscode-vercel`.

## Quando usar cada extensao

1. `Vercel Project Manager` (AaronDill): foco em Deployments + Environment
   Variables + link/deploy rapido.
2. `VSCode Vercel` (frenco): foco em Deployments + Projects + Files/Checks de
   deployment.

Se precisar usar a `frenco`, desative a `AaronDill` antes.

## Setup inicial (uma vez)

1. Confirmar CLI:
   - `pnpm exec vercel --version`
2. Login:
   - `pnpm exec vercel login`
3. Conferir conta:
   - `pnpm exec vercel whoami`
4. Link do repo ao projeto correto:
   - `pnpm exec vercel link --project estudio-corpo-alma-humanizado-web`
   - `--scope renato-mazzarinos-projects`

## Operacao diaria

1. Conferir envs:
   - `pnpm vercel:env:audit`
2. Deploy preview:
   - `pnpm vercel:deploy:preview`
3. Deploy production:
   - `pnpm vercel:deploy:prod`

## Troubleshooting rapido

### Sintoma: painel fica em `Loading...`

1. Verificar se duas extensoes Vercel estao ativas.
2. Deixar apenas uma ativa.
3. Rodar `Developer: Reload Window` no VS Code.
4. Conferir se o workspace esta linkado:
   - arquivo `.vercel/project.json` deve apontar para
     `estudio-corpo-alma-humanizado-web`.

### Sintoma: "The vercel CLI is required"

1. Confirmar `where vercel` no terminal integrado do VS Code.
2. Se nao achar, abrir novo terminal no VS Code (para recarregar PATH).
3. Repetir login com `pnpm exec vercel login`.

### Sintoma: dados de projeto/env nao aparecem

1. Conferir internet e autenticacao (`pnpm exec vercel whoami`).
2. Confirmar `scope` correto (`renato-mazzarinos-projects`).
3. Recarregar janela do VS Code.

## Evidencia tecnica do conflito (historico)

Log do VS Code registrou conflito de view id duplicada (`vercel-deployments`)
quando duas extensoes estavam ativas.

## Definition of Done deste runbook

1. Passos reproduziveis em maquina nova.
2. Sem dependencia de conhecimento informal.
3. Sem expor segredo em texto.
