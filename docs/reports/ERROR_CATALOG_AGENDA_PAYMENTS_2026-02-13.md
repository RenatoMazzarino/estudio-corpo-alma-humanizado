# Catalogo de feedbacks (Agenda + Pagamentos)

## Objetivo
Padronizar todas as mensagens visiveis para o usuario em um unico catalogo, com linguagem humana e sem texto tecnico cru na tela.

## Escopo desta camada
- Fluxo publico de agendamento (`/agendar/[slug]`)
- Pagamentos Checkout Transparente (Pix e Cartao)
- Agenda interna (detalhes, atendimento, bloqueios/escala)
- Formularios que ainda usavam `alert()` no modulo
- Atendimento V1 (sessao unificada + checkout modal + recibo)
- Integracao Spotify no atendimento (estado/controle)

## Como funciona
- Fonte unica de mensagens: `apps/web/src/shared/feedback/user-feedback.ts`
- Exibicao visual: `apps/web/components/ui/toast.tsx`
- Canais:
1. `toast`: aviso curto no rodape, auto fechamento rapido
2. `banner`: aviso sobreposto no topo, para casos mais importantes

Obs.: evoluimos a exibicao para estilo notificacao no topo da tela (inclusive avisos curtos), preservando o mesmo componente/camada.

## Regras aplicadas
1. Sem `alert()`/`window.alert()` no modulo agenda/pagamentos.
2. Erros tecnicos nao sobem direto para a UI.
3. Erros de backend/SDK passam por `feedbackFromError(...)`.
4. Mensagens de sucesso/aviso usam `feedbackById(...)`.

## Principais IDs do catalogo
- `booking_created`
- `booking_create_failed`
- `payment_pix_generated`
- `payment_pix_copy_success`
- `payment_pix_copy_unavailable`
- `payment_pix_expired_regenerating`
- `payment_pix_failed`
- `payment_card_declined`
- `payment_pending`
- `payment_recorded`
- `payment_already_settled`
- `payment_amount_outdated`
- `payment_point_not_configured`
- `payment_pix_key_not_configured`
- `payment_service_unavailable`
- `payment_credentials_invalid`
- `payment_invalid_amount`
- `payment_payer_validation`
- `address_search_failed`
- `address_details_failed`
- `address_cep_invalid`
- `address_cep_not_found`
- `address_cep_found`
- `displacement_calc_failed`
- `whatsapp_missing_phone`
- `contact_whatsapp_unavailable`
- `voucher_generation_failed`
- `agenda_stage_locked`
- `agenda_details_load_failed`
- `appointment_cancelled`
- `appointment_deleted`
- `message_recorded`
- `reminder_recorded`
- `client_confirmed`
- `generic_saved`
- `generic_unavailable`
- `generic_try_again`

## Mapeamento Mercado Pago (Checkout Transparente)
No backend de pagamentos (`public-actions/payments.ts`), respostas do MP sao traduzidas para mensagens de usuario:

- `invalid_credentials` -> servico indisponivel
- `high_risk` -> cartao recusado por seguranca
- `invalid_users_involved` -> revisar dados do pagador
- `invalid_transaction_amount` -> valor invalido
- `unsupported_properties` -> indisponibilidade temporaria
- `failed` (cartao/pix) -> mensagem de tentativa novamente

Detalhes tecnicos continuam apenas em logs de servidor para diagnostico.

## Arquivos principais alterados
- `apps/web/src/shared/feedback/user-feedback.ts`
- `apps/web/components/ui/toast.tsx`
- `apps/web/app/(public)/agendar/[slug]/booking-flow.tsx`
- `apps/web/app/(public)/agendar/[slug]/public-actions/payments.ts`
- `apps/web/components/mobile-agenda.tsx`
- `apps/web/app/(dashboard)/atendimento/[id]/attendance-page.tsx`
- `apps/web/app/(dashboard)/atendimento/[id]/components/attendance-payment-modal.tsx`
- `apps/web/components/agenda/appointment-details-sheet.tsx`
- `apps/web/components/availability-manager.tsx`
- `apps/web/components/shift-manager.tsx`
- `apps/web/components/service-form.tsx`
- `apps/web/components/appointment-card.tsx`
- `apps/web/app/(dashboard)/novo/appointment-form.tsx`

## Resultado esperado para o usuario final
- Mensagens consistentes
- Sem "erro tecnico" exposto
- Fluxo mais limpo (mensagens no topo, estilo notificacao, sem quebrar layout da tela)
