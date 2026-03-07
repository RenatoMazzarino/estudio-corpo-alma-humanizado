---
name: estudio-repo-context
description: Use when working in this repository and you need canonical project context (setup, run, docs map, integrations, or Codex skills readiness). Do not use for generic coding tasks that do not depend on repo conventions.
---

# Estudio Repo Context

Use this skill to align implementation and decisions with the repository standards.

## Quick Checks

1. Confirm toolchain versions from `README.md` and `MANUAL_RAPIDO.md`.
2. Prefer workspace commands:
   - `pnpm dev`
   - `pnpm lint`
   - `pnpm check-types`
   - `pnpm --filter web test:unit`
   - `pnpm --filter web test:smoke`
   - `pnpm build`
3. For local credentials in terminal sessions, load:
   - `.\scripts\codex\load-gh-token.ps1`

## Canonical References

1. Primary project README: `README.md`
2. Operations manual: `MANUAL_RAPIDO.md`
3. Integration docs:
   - `docs/integrations/INTEGRATIONS_TECNICO.md`
   - `docs/integrations/INTEGRATIONS_GUIA_OPERACIONAL.md`
4. API guide: `docs/apis/API_GUIDE.md`
5. Codex skills readiness: `docs/CODEX_SKILLS_READINESS.md`

## Skills and Agent Runtime

1. Validate readiness with:
   - `powershell -ExecutionPolicy Bypass -File scripts/codex/check-skills-readiness.ps1`
2. If GitHub skills fail due to auth, run:
   - `.\scripts\codex\load-gh-token.ps1`
   - `gh auth status`
3. If Codex config changes were made (`~/.codex/config.toml`), restart Codex.

## Scope Guardrails

1. Do not invent integrations that are not documented in `docs/integrations`.
2. Do not assume production credentials from local `.env.local`.
3. Prefer documented runbooks over ad-hoc commands when both exist.
