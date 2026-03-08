# AGENTS.override.md (apps/web/src)

Escopo: codigo de dominio e utilitarios do app web.

## Principio

1. `src` e camada de negocio/utilitarios, nao de roteamento.
2. Regras aqui devem ser reutilizaveis por entradas de rota.

## Regras

1. `modules/*` para contexto de dominio.
2. `shared/*` para utilitario transversal.
3. Nao acoplar `shared/*` a detalhes de uma tela especifica.

## Qualidade

1. Mudanca de regra pura deve ter teste unitario quando houver risco funcional.
2. Nao introduzir dependencia ciclica entre modulos.
