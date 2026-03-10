# AGENTS.override.md (apps/web/src/modules/finance)

Escopo: regras financeiras, caixa e consolidacao de valores.

## Objetivo

1. Preservar consistencia de calculos e status financeiros.
2. Evitar divergencia entre atendimento, checkout e relatacao.

## Regras

1. Regra de calculo monetario deve ser centralizada e testada.
2. Nao usar numero em ponto flutuante direto para valor final exibido/persistido.
3. Status financeiro deve ter transicao explicita e auditavel.
4. Mudou regra de pagamento? validar reflexo em mensagens e comprovante.

## Aplica / Nao aplica

1. Aplica em calculos, consolidadores e regras de status financeiro.
2. Nao aplica em visualizacao que nao altera regra financeira.

## Checklist minimo de validacao

1. Teste unitario de calculo de valores.
2. Teste de transicao de status (pendente, pago, estornado quando houver).
3. Validacao cruzada com checkout publico.

## Risco de regressao

1. Valor final incorreto.
2. Status de pagamento divergente.
3. Relatorio financeiro inconsistente.

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