# AGENTS.override.md (notifications)

Escopo: `apps/web/src/modules/notifications`.

## Responsabilidade

1. Mensageria manual do dashboard.
2. Automacao WhatsApp (fila, processador, runtime, webhook).
3. Biblioteca local de templates e mapeamento de payload.

## Regras criticas

1. Coexistencia manual + automacao e obrigatoria.
2. Provider oficial atual: `meta_cloud`.
3. Webhook status/inbound deve continuar registrando eventos operacionais.
4. Dry-run deve ser respeitado por ambiente quando configurado.
5. Nao reintroduzir provider alternativo sem decisao explicita.

## Contratos sensiveis

1. `whatsapp-meta-client.ts`
2. `whatsapp-automation-processor.ts`
3. `whatsapp-automation-runtime.ts`
4. `whatsapp-webhook-status.ts`
5. `whatsapp-webhook-inbound.ts`
6. `whatsapp-template-library.ts`

## Qualidade

1. Mudou payload/template/regra de envio: atualizar testes e docs relevantes.
2. Nao expor token/app secret em log.

## Definition of Done local (notifications)

1. Nenhum fluxo critico de envio fica dependente de ajuste manual ad-hoc.
2. Se houver fallback, ele precisa ser:
   - explicito
   - observavel
   - com criterio de desativacao/remocao
3. Mudou regra de selecao de template:
   - atualizar testes de selecao e render
   - atualizar catalogo/regras em docs tecnicas
4. Mudou webhook (status/inbound/template):
   - validar idempotencia
   - validar trilha no modulo de mensagens
   - validar impacto em fila/reprocessamento

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
