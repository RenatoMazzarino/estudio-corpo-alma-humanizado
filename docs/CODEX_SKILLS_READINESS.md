# Codex Skills Readiness

Este documento explica quais habilidades de Codex estao preparadas neste
ambiente e como validar rapidamente.

## Padrao OpenAI (estrutura e configuracao)

Links oficiais (Codex Agent Skills):

1. Visao geral Codex (modo agente): <https://developers.openai.com/codex>
2. Estrutura e funcionamento de skills:
   <https://developers.openai.com/codex/skills>
3. Criacao de skill (seccao ancora):
   <https://developers.openai.com/codex/skills#create-a-skill>
4. Configuracao basica do Codex:
   <https://developers.openai.com/codex/config-basic>
5. Referencia de configuracao (`skills.config`):
   <https://developers.openai.com/codex/config-reference>

Resumo aplicado neste repo:

1. Skills de repositorio ficam em `.agents/skills`
2. Cada skill possui `SKILL.md` com `name` e `description`
3. `agents/openai.yaml` e opcional, mas recomendado para metadados de
   UI/policy/dependencias
4. Instrucoes globais do agente em `AGENTS.md`
5. Config de projeto do Codex em `.codex/config.toml`
6. Overrides locais em `AGENTS.override.md` por area critica
7. Politica de subagentes fica em `AGENTS.md`; habilitacao tecnica compartilhada
   fica em `.codex/config.toml`

## Escopo atual (habilidades instaladas/esperadas)

1. GitHub Address Comments
2. GitHub Fix CI
3. Playwright CLI Skill
4. Playwright Interactive
5. Screenshot Capture
6. Security Best Practices
7. Security Threat Model
8. Skill Creator
9. Skill Installer
10. Vercel Deploy
11. Yeet

Qualquer skill fora dessa lista deve ser tratada como "nao instalada" neste
ambiente, ate nova confirmacao.

## Skills versionadas no repo (.agents/skills)

Atualmente:

1. `estudio-repo-context`
2. Caminho: `.agents/skills/estudio-repo-context`
3. Validacao: `quick_validate.py` da skill `skill-creator` (status atual: OK)

## Estrutura de agente no repo (status)

Atualmente:

1. `AGENTS.md` na raiz: presente
2. `.codex/config.toml` no repo: presente
3. `apps/web/AGENTS.override.md`: presente
4. `supabase/functions/AGENTS.override.md`: presente
5. `multi_agent` habilitado no config do repo: presente

## Nao instalado (exemplos relevantes)

No momento, estas skills nao estao instaladas neste ambiente:

1. `figma`
2. `figma-implement-design`
3. `cloudflare-deploy`
4. `netlify-deploy`
5. `render-deploy`
6. `linear`
7. `sentry`

## Verificacao automatica

Rode:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/codex/check-skills-readiness.ps1
```

O script valida:

1. CLIs base (`node`, `pnpm`, `python`, `gh`, `bash`)
2. Presenca dos SKILL.md esperados em `~/.codex/skills`
3. Vercel CLI no workspace (`pnpm exec vercel --version`)
4. Playwright CLI wrapper e pacote Playwright em `apps/web`
5. Configuracoes do Codex (`js_repl`, MCP Vercel e MCP Playwright)
6. Autenticacao GitHub para skills via `GH_TOKEN` (carregado do Git Credential
   Manager)

## Bootstrap de autenticacao GitHub para skills

Quando abrir uma nova sessao PowerShell, rode:

```powershell
.\scripts\codex\load-gh-token.ps1
gh auth status
```

Esse fluxo nao escreve token no repo e usa o Git Credential Manager local.

## Notas praticas

1. Se `gh auth status` mostrar falta de scope `read:org`, PRs e checks podem
   funcionar, mas alguns cenarios de organizacao podem falhar.
2. Se `vercel` nao estiver no PATH da sessao atual, use `pnpm exec vercel ...`
   no repo.
3. Se `Playwright Interactive` estiver habilitado no config (`js_repl = true`),
   reinicie a sessao do Codex para a lista de tools refletir a mudanca.
4. Trusted project com caminho absoluto local deve ser configurado em
   `~/.codex/config.toml`; isso nao deve ser versionado neste repo.
