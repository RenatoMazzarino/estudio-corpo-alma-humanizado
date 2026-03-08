# AGENTS.override.md (components)

Escopo: `apps/web/components`.

## Diretriz

1. Componentes devem priorizar composicao, acessibilidade e previsibilidade visual.
2. Regra de negocio pesada deve ficar em `src/modules` ou hooks dedicados.

## Regras

1. Manter consistencia com design system local (`components/ui`, docs UI system).
2. Nao duplicar logica de dominio em multiplos componentes.
3. Evitar side effects inesperados em render.

## Qualidade

1. Mudou helper de componente? Cobrir com teste unitario quando houver risco funcional.
2. Nao quebrar compatibilidade mobile no fluxo principal.
