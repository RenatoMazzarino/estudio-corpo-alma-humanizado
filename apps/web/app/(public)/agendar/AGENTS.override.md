# AGENTS.override.md (apps/web/app/(public)/agendar)

Escopo: fluxo publico de agendamento online.

## Objetivo

1. Preservar jornada simples, confiavel e mobile-first.
2. Evitar abandono por estado confuso de etapa/erro/loading.

## Regras

1. Estado de etapa deve ser previsivel e recuperavel.
2. Validacao de dados sensiveis (telefone, documento) deve usar utilitarios
   canonicos.
3. Nao enviar dados de checkout sem confirmar consistencia do agendamento.
4. Mensagens de erro devem ser compreensiveis para usuario final.

## Checklist minimo de validacao

1. Smoke test de agendamento publico.
2. Testar cenarios de endereco, horario indisponivel e falha de pagamento.
3. Testar responsividade mobile.

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
