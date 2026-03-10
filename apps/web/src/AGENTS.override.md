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

## Regra de maturidade (V1 final de producao)

1. Este escopo nao aceita entrega em mentalidade MVP ou "so para funcionar".
2. Toda mudanca deve mirar padrao de producao: robustez, modularizacao, observabilidade e manutencao previsivel.
3. Nao introduzir gambiarra, duplicacao oportunista, fallback sem governanca ou acoplamento oculto.
4. Solucoes devem incluir:
   - tratamento de erro explicito
   - contratos claros de entrada/saida
   - testes proporcionais ao risco
   - documentacao operacional quando houver impacto de runtime
5. Em conflito entre velocidade e qualidade estrutural, priorizar qualidade estrutural e registrar tradeoff.

