# AGENTS.override.md (apps/web/src/modules/integrations)

Escopo: adaptadores e coordenacao de integracoes externas.

## Objetivo

1. Isolar variacao de provedores externos da regra de negocio interna.
2. Garantir observabilidade e tratamento robusto de falha externa.

## Regras

1. Toda chamada externa deve ter timeout e tratamento de erro categorizado.
2. Nao propagar resposta bruta do provedor para camadas de UI sem contrato local.
3. Segredos apenas por env seguro, nunca hardcoded.
4. Sempre registrar correlation id quando houver webhook/processamento assincrono.

## Aplica / Nao aplica

1. Aplica em clients/adapters de provedores e orquestracao de integracao.
2. Nao aplica em composicao visual de telas.

## Checklist minimo de validacao

1. Simular erro/timeout do provedor.
2. Testar contrato de entrada/saida local.
3. Validar logs operacionais sem segredo.

## Risco de regressao

1. Falha silenciosa em integracao critica.
2. Quebra de contrato por mudanca externa.
3. Dificuldade de diagnostico por falta de contexto de log.

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