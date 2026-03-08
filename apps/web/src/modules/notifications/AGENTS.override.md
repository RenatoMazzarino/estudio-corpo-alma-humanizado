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
