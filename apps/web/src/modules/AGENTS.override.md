# AGENTS.override.md (apps/web/src/modules)

Escopo: todos os modulos de dominio.

## Regras de modularizacao

1. Cada modulo deve ter responsabilidade de dominio clara.
2. Evitar acesso cruzado direto sem contrato explicito.
3. Preferir funcoes pequenas e previsiveis em fluxos criticos.

## Contratos esperados por modulo

1. `appointments`: agendamento e ciclo de vida.
2. `attendance`: operacao de atendimento.
3. `clients`: dados e perfil de cliente.
4. `payments`: cobranca/checkouts/webhook effects.
5. `notifications`: mensagens manuais + automacao WhatsApp.
6. `settings`: configuracoes operacionais.
7. `integrations`: conectores e guards externos.

## Validacao

1. Mudou regra de modulo? Atualizar teste unitario relacionado.
2. Mudou contrato de API/rotas? Atualizar docs canonicas.

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

