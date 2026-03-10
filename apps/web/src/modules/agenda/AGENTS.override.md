# AGENTS.override.md (apps/web/src/modules/agenda)

Escopo: regras de negocio da agenda operacional.

## Objetivo

1. Garantir consistencia de disponibilidade, bloqueios e horarios.
2. Evitar conflito de agenda por concorrencia ou atualizacao parcial.

## Regras

1. Toda regra de horario deve usar timezone canonico do projeto.
2. Nao duplicar regra de disponibilidade entre `modules/agenda` e componentes de
   UI.
3. Mudanca de regra de agenda deve preservar compatibilidade com fluxo publico e
   dashboard.
4. Atualizacao realtime deve preferir patch local com fallback observavel.

## Aplica / Nao aplica

1. Aplica em funcoes, services e helpers de agenda neste modulo.
2. Nao aplica a layout visual puro sem regra de negocio.

## Checklist minimo de validacao

1. Teste unitario para regra alterada.
2. Validar criacao/edicao de agendamento no dashboard.
3. Validar impacto no fluxo publico de agendamento quando houver.

## Risco de regressao

1. Horarios incorretos por timezone.
2. Conflito de disponibilidade em edicao concorrente.
3. Atualizacao realtime com refresh excessivo.

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
