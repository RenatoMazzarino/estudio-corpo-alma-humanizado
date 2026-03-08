# AGENTS.override.md (tests)

Escopo: `apps/web/tests`.

## Estrategia de testes

1. Smoke E2E com Playwright para fluxos essenciais.
2. Unitarios com Vitest ficam distribuídos no codigo (`*.test.ts`/`*.test.tsx`).

## Regras

1. Nao transformar smoke em suite pesada/lenta sem necessidade.
2. Sempre que fluxo publico critico mudar, revisar smoke.
3. Manter testes deterministas e sem segredos hardcoded.

## Comandos

1. Smoke: `pnpm --filter web test:smoke`
2. Unitarios: `pnpm --filter web test:unit`
