# AGENTS.override.md (apps/web/app/(dashboard)/atendimento)

Escopo: composicao de tela do atendimento no dashboard.

## Objetivo

1. Manter experiencia de atendimento confiavel e sem perda de contexto.
2. Preservar consistencia com regras do modulo `attendance`.

## Regras

1. UI nao deve reimplementar regra de negocio que existe em
   `src/modules/attendance`.
2. Acao critica (finalizar, cobrar, estornar) deve ter estado de loading/erro
   claro.
3. Realtime deve evitar refresh global quando patch local for suficiente.

## Checklist minimo de validacao

1. Testar fluxo completo de atendimento.
2. Testar fallback de erro em acao critica.
3. Testar atualizacao concorrente em duas abas quando aplicavel.

## Regra de maturidade (V1 final de producao)

1. Este escopo nao aceita entrega em mentalidade MVP ou "so para funcionar".
2. Toda mudanca deve mirar padrao de producao: robustez, modularizacao,
   observabilidade e manutencao previsivel.
3. Nao introduzir gambiarra, duplicacao oportunista, fallback sem governanca ou
   acoplamento oculto.
4. Solucoes devem incluir:
   - tratamento de erro explicito
   - contratos claros de entrada/saida
   - testes proporcionais ao risco
   - documentacao operacional quando houver impacto de runtime
5. Em conflito entre velocidade e qualidade estrutural, priorizar qualidade
   estrutural e registrar tradeoff.
