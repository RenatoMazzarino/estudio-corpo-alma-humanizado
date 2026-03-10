# AGENTS.override.md (apps/web/app/api/whatsapp)

Escopo: endpoints WhatsApp (webhook, cron, envio/manual, status).

## Objetivo

1. Preservar confiabilidade de entrega e rastreabilidade operacional.
2. Garantir fail-safe quando configuracao estiver inconsistente.

## Regras

1. Webhook deve validar assinatura e manter idempotencia.
2. Processamento de fila deve registrar estado tecnico completo
   (queued/sent/failed).
3. Nao disparar envio real sem perfil de ambiente coerente e remetente valido.
4. Erros de provedor devem ser traduzidos para contrato interno padronizado.

## Checklist minimo de validacao

1. Testar webhook de message status.
2. Testar enfileirar -> enviar -> atualizar status.
3. Testar bloqueio fail-safe com configuracao invalida.

## Risco de regressao

1. Envio por numero/remetente incorreto.
2. Reprocessamento duplicado de evento.
3. Falha silenciosa de entrega.

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
