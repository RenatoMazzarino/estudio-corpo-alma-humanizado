# AGENTS.override.md (packages/ui)

Escopo: biblioteca de UI compartilhada.

## Regras

1. Componentes aqui devem ser genericos e reutilizaveis.
2. Nao incluir regra de negocio de dominio do estudio.
3. Preservar acessibilidade basica e tipos claros.

## Impacto de mudanca

1. Qualquer alteracao pode afetar multiplos consumidores.
2. Validar app consumidor apos mudanca de componente base.
