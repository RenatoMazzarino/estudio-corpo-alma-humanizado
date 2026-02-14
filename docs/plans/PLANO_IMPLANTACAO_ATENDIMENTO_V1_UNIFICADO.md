# PLANO_IMPLANTACAO_ATENDIMENTO_V1_UNIFICADO

## Objetivo
Consolidar o Atendimento V1 em tela única de sessão, checkout em modal (Dinheiro, Pix e Point), e pós-atendimento dentro do modal do agendamento para status `completed`, mantendo Checkout Transparente (Orders API + webhook) e sem mudanças destrutivas de histórico.

## Escopo consolidado
- `/atendimento/[id]` como tela única: timer, checklist, evolução.
- Checkout em modal bottom-sheet com:
  - edição de itens;
  - desconto em valor e percentual;
  - Dinheiro;
  - Pix (QR + copia e cola + countdown + polling);
  - Cartão físico Point (débito/crédito) com cobrança no terminal.
- Modal de agendamento com dois modos:
  - não concluído: fluxo operacional atual;
  - concluído: logística, financeiro completo, pesquisa, follow-up e evolução.
- Recibo por pagamento (`/comprovante/pagamento/[paymentId]`) com envio por WhatsApp após confirmação.
- Webhook robusto para `order` e `payment`, com reconciliação e idempotência.

## Banco de dados (migrations idempotentes)
- `20260213103000_add_point_terminal_settings.sql`
  - adiciona `mp_point_*` em `settings`.
- `20260213104000_add_point_metadata_to_appointment_payments.sql`
  - adiciona `provider_order_id`, `point_terminal_id`, `card_mode` em `appointment_payments`.
  - cria índices por tenant/order e tenant/appointment/created_at.

## Backend
- Módulo compartilhado: `apps/web/src/modules/payments/mercadopago-orders.ts`
  - `createPixOrderForAppointment`
  - `createOnlineCardOrderForAppointment`
  - `createPointOrderForAppointment`
  - `getPointOrderStatus`
  - `listPointDevices`
  - `configurePointDeviceToPdv`
  - `recalculateAppointmentPaymentStatus`
- Ações de atendimento (`actions.ts`): Pix interno, Point, polling e eventos.
- Wrapper público (`public-actions/payments.ts`) usando o módulo compartilhado.
- Webhook (`api/mercadopago/webhook/route.ts`):
  - valida assinatura com fallback de `data.id` no body;
  - reconcilia `provider_order_id` e `card_mode`;
  - atualiza `appointments.payment_status`.

## Frontend
- Nova tela de atendimento unificada: `attendance-page.tsx`.
- Novo modal de checkout de atendimento: `attendance-payment-modal.tsx`.
- Modal do agendamento (`appointment-details-sheet.tsx`) com modo pós-atendimento para `completed`.
- `mobile-agenda.tsx` atualizado com callbacks de:
  - cobrança;
  - recibo;
  - pesquisa;
  - abertura de evolução.
- Configurações (`settings-form.tsx`) com gestão de terminal Point.

## Recibo e mensageria
- Nova rota: `app/comprovante/pagamento/[paymentId]/page.tsx`.
- Template de recibo por pagamento usando `ReceiptView`.
- Prompt de envio de recibo após pagamento confirmado no modal de checkout.
- Registro de envio/reenvio em `appointment_messages`.

## Critérios de aceite
- Tela única de sessão funcionando com timer e checklist.
- Modal checkout registra Dinheiro, gera Pix e cobra no Point.
- Desconto e itens alteram subtotal/total corretamente.
- Pagamento confirmado abre prompt de envio de recibo.
- Modal de concluído mostra logística/financeiro/pesquisa/follow-up.
- Webhook `payment`/`order` atualiza status sem duplicidade.
- Sem mensagens técnicas cruas para usuário final.

## Rollout
1. Aplicar migrations em local.
2. Aplicar migrations em preview.
3. Aplicar migrations em produção.
4. Configurar Point em Configurações.
5. Validar webhook `order` e `payment` em preview.
6. Smoke real em produção com valor baixo.

## Assumptions
- Modelo oficial: Checkout Transparente (Orders API + webhook).
- Cartão no atendimento interno: somente Point físico.
- Modal pós-atendimento aparece apenas para `completed`.
- Tenant fixo nesta fase (`FIXED_TENANT_ID`).
- Sem uso de Checkout Pro.
