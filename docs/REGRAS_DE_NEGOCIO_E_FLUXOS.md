# Regras de Negocio e Fluxos (Referencia Operacional)

## Objetivo

Consolidar as regras de negocio que hoje estao implementadas no repo para reduzir ambiguidade operacional, onboarding e regressao em ajustes futuros.

## Fonte de verdade (ordem de prioridade)

1. Codigo atual do repo (comportamento real)
2. Migrations / schema / contratos de runtime
3. Configuracao real de ambiente (Vercel, Supabase, Meta, Mercado Pago)
4. Documentacao ativa
5. Documentacao historica/legada (contexto, nao canonica)

Em conflito entre este documento e o codigo, o codigo vence.

## Escopo desta referencia

- Agendamento (criacao, estados e regras principais)
- Atendimento (fluxo operacional e finalizacao)
- Pagamentos (checkout, sinal, parcial, total, liberado, estorno)
- Mensagens (manual + automacao WhatsApp/Meta coexistindo)
- IDs e codigos (UUIDs, provider refs, codigo de atendimento)

## Identificadores e codigos

### IDs internos (UUID)

- `appointments.id`: ID canonico do agendamento
- `clients.id`: ID canonico do cliente
- `appointment_payments.id`: ID interno do pagamento registrado no sistema
- `notification_jobs.id`: job de automacao WhatsApp
- `appointment_messages.id`: log de mensagens manuais/automaticas por agendamento

### IDs externos / provider refs

- `appointment_payments.provider_ref`: referencia externa do pagamento (ex.: ID do pagamento no Mercado Pago)
- `appointment_payments.provider_order_id`: ID da Orders API do Mercado Pago

Observacao importante:
- A rota de recibo por pagamento (`/comprovante/pagamento/[paymentId]`) aceita tanto o ID interno (`appointment_payments.id`) quanto `provider_ref` (Mercado Pago), para manter compatibilidade com links antigos.

### Codigo de atendimento (persistido em banco)

Campo:
- `appointments.attendance_code` (persistido no banco)

Formato atual:
- `SS-CTOKEN-YYMMDD-NNNNNN`

Onde:
- `SS`: referencia curta do servico (2 caracteres)
- `CTOKEN`: identificacao compacta do cliente
  - `N..` = baseado em nome (iniciais)
  - `T....` = baseado em telefone (ultimos 4 digitos)
  - `A...` = fallback de apoio
- `YYMMDD`: data de entrada/geracao do codigo (base BR, usando `created_at`)
- `NNNNNN`: sequencia global persistida (nao reutilizavel)

Regras do codigo:
- gerado automaticamente no banco (trigger)
- unico por agendamento
- quando campos-chave mudam (cliente/servico/data), um novo codigo e gerado
- o codigo antigo nao e reaproveitado (sequencia global)
- o sequencial global segue ordem de geracao/entrada (nao a data do atendimento)

Nota sobre o `##` mencionado antes:
- no modelo provisoriamente calculado na UI, `##` era a ordem sequencial do mesmo servico no mesmo dia (`01`, `02`, ...)
- agora o bloco final persistido virou `NNNNNN` (sequencia global) para garantir unicidade e nao reuso

## Regras de agendamento (criacao e salvamento na agenda)

### Quando o agendamento e salvo na agenda

#### Agendamento publico

Arquivo principal:
- `apps/web/src/modules/appointments/public-booking.ts`

Regra:
- o agendamento e considerado criado/salvo apos sucesso da RPC `create_public_appointment`
- apos criar, o sistema agenda automacoes de lifecycle (criacao + lembrete 24h)

#### Agendamento interno (dashboard)

Arquivo principal:
- `apps/web/src/modules/appointments/actions.ts`

Regra:
- o agendamento e considerado criado/salvo apos sucesso da RPC `create_internal_appointment`
- apos criar, o sistema agenda automacoes de lifecycle (criacao + lembrete 24h)
- se o usuario enviar mensagem manual de criacao, isso e logado em `appointment_messages`

## Status de agendamento (appointments.status)

Status operacionais encontrados no codigo/UI:

- `pending` (agendado / pendente de confirmacao)
- `confirmed` (confirmado)
- `in_progress` (em andamento)
- `completed` (concluido)
- `canceled_by_client` (cancelado pelo cliente)
- `canceled_by_studio` (cancelado internamente/estudio)
- `no_show` (nao compareceu)

Observacoes:
- na agenda mobile, itens cancelados/no-show sao ocultados da visualizacao principal por regra de UI
- "reagendado" hoje nao e um `appointments.status` canonico no repo (estado primario)
- reagendamento hoje acontece como alteracao de horario/dados + logs/eventos/mensagens

## Fluxo de atendimento (operacional)

Arquivo principal:
- `apps/web/app/(dashboard)/atendimento/[id]/actions.ts`

Fluxo macro:

1. Confirmacao/pre-atendimento (`confirmed`)
2. Inicio de sessao (`in_progress`)
3. Checkout/registro financeiro (manual e/ou MP)
4. Finalizacao do atendimento (`completed`)
5. Pos-atendimento (pesquisa/evolucao/observacoes)

Regra importante:
- ao finalizar o atendimento (`completed`), o status financeiro e recalculado novamente
- isso garante que pagamento parcial (sinal) vire `pending` se o servico foi prestado e ainda restou saldo

## Regras de pagamento (appointments.payment_status)

Status financeiros suportados no repo (atual):

- `pending` = pendente / a receber
- `partial` = pago parcialmente (ex.: sinal pago antes do atendimento)
- `paid` = quitado integralmente
- `refunded` = estornado
- `waived` = pagamento liberado (decisao interna; nao contabilizar como pago)

### Regra canonica para calcular status financeiro

Fonte de regra centralizada:
- `apps/web/src/modules/payments/mercadopago-orders.ts` (`recalculateAppointmentPaymentStatus`)

Base de comparacao (valor devido):

1. usar `appointment_checkout.total` se existir (valor final com desconto aplicado)
2. fallback para `appointments.price_override`
3. fallback para `appointments.price`

Isso corrige o caso de desconto em checkout:
- Ex.: servico `150`, desconto `149`, total do checkout `1`
- se o cliente pagar `1`, o status correto e `paid` (quitado com desconto), nao `partial`

### Regra de parcial vs pendente (antes e depois do atendimento)

- Se existe pagamento > 0 mas ainda falta saldo:
  - **antes** de `completed` => `partial` (ex.: "Sinal pago")
  - **depois** de `completed` => `pending` (saldo em aberto apos servico prestado)

### Regra de "Liberado" (`waived`)

- `waived` representa decisao interna de nao cobrar
- nao deve ser tratado como `paid`
- o recálculo automatico preserva `waived` (nao sobrescreve)
- na tela de checkout interno o nome operacional sugerido e **Cortesia**

Observacao atual:
- o status `waived` ja esta suportado no schema e nas leituras/UI principais
- a acao/toggle operacional para marcar manualmente como `waived` ainda pode ser evoluida em tarefa dedicada

### Regra de estorno (`refunded`)

- `refunded` e status legado/operacional valido no repo
- o recálculo preserva `refunded` quando nao ha valor pago remanescente

## Sinal / reserva vs pagamento integral

Interpretacao operacional atual:

- `partial` = geralmente usado como "sinal pago" enquanto ainda existe saldo e o atendimento nao foi concluido
- `paid` = valor devido totalmente quitado (considerando desconto do checkout)
- `pending` = sem pagamento, ou saldo restante em aberto apos conclusao do atendimento

## Regras de mensageria (manual + automacao coexistindo)

Principio arquitetural:
- automacao nao substitui fluxo manual
- automacao e fluxo manual coexistem

### Manual (dashboard)

Pontos de uso:
- atendimento e modal de detalhes da agenda

Comportamento:
- o sistema monta a mensagem com templates internos de texto
- abre fluxo manual (ex.: WhatsApp/wa.me) quando aplicavel
- registra log em `appointment_messages` com status manual (`sent_manual`, etc.)

Tipos manuais recorrentes:
- `created_confirmation`
- `reminder_24h`
- `payment_charge`
- `payment_receipt`
- `post_survey`

### Automacao WhatsApp (Meta Cloud API)

Arquivos principais:
- `apps/web/src/modules/notifications/whatsapp-automation.ts`
- `apps/web/app/api/whatsapp/webhook/route.ts` (webhook Meta)
- `apps/web/app/api/cron/whatsapp-reminders/route.ts` (cron endpoint)

Regras gerais:
- automacao usa fila (`notification_jobs`)
- processador envia e atualiza logs/status
- painel `Mensagens` exibe fila/status/timeline

### Quando usa template aprovado (Meta)

Automacoes de inicio de conversa / agendadas:
- `appointment_created`
- `appointment_reminder` (24h)

No fluxo atual, esses envios sao feitos como template da Meta (Cloud API), com nome/idioma configurados por env.

### Quando usa mensagem livre (session / janela 24h)

Exemplo atual:
- cancelamento automatico de agendamento (quando checkbox de aviso estiver marcado)

Regra:
- so envia automaticamente se a janela de atendimento (24h) estiver aberta
- se nao houver janela 24h aberta, loga `skipped_auto` com motivo amigavel

### Como a janela de 24h e verificada (regra atual)

Regra de MVP no repo:
- janela aberta = existe inbound do cliente correlacionado ao agendamento (via webhook/resposta) registrado no log de mensagens automaticas nas ultimas 24h

### Status operacionais de mensagens (logs)

Exemplos usados no repo:
- `queued_auto`
- `sent_auto`
- `sent_auto_dry_run`
- `provider_sent`
- `provider_delivered`
- `provider_read`
- `failed_auto`
- `skipped_auto`
- `sent_manual`
- `delivered`
- `failed`

### Modo seguro (piloto / dev)

Regras ja adotadas:
- pode enviar via numero de teste da Meta
- pode forcar destinatario de teste por env (`WHATSAPP_AUTOMATION_META_TEST_RECIPIENT`)
- isso pode permanecer ativo inclusive em prod (piloto controlado), por decisao operacional

## Voucher vs recibo (nao confundir)

- **Voucher** (`/voucher/[appointmentId]`): comprovante de agendamento/servico
- **Comprovante/Recibo** (`/comprovante/[id]` ou `/comprovante/pagamento/[paymentId]`): comprovante financeiro/pagamento

## Regras importantes de robustez operacional

- Mercado Pago usa Orders API (nao voltar para Payments API classica sem migracao consciente)
- Webhook MP trata eventos `payment` e `order`
- Cron frequente de lembretes na Vercel Hobby deve usar endpoint + GitHub Actions (nao depender de cron frequente da Vercel Hobby)
- Fluxo manual de WhatsApp deve continuar disponivel mesmo com automacao ativa

## Checklist de impacto quando alterar regras de negocio

Ao alterar regra de agendamento/pagamento/mensagem, revisar:

1. Schema/migration (constraint, coluna, trigger, RPC)
2. Server actions / webhooks (regras de calculo)
3. UI do dashboard (badges, labels, botoes)
4. Paginas publicas (voucher/comprovante)
5. Logs/auditoria (`appointment_events`, `appointment_messages`, `notification_jobs`)
6. Documentacao ativa (este arquivo + docs tecnicos/operacionais relevantes)

## Referencias de codigo (pontos principais)

- `apps/web/src/modules/payments/mercadopago-orders.ts`
- `apps/web/app/api/mercadopago/webhook/route.ts`
- `apps/web/app/(dashboard)/atendimento/[id]/actions.ts`
- `apps/web/lib/attendance/attendance-repository.ts`
- `apps/web/components/agenda/appointment-details-sheet.tsx`
- `apps/web/components/mobile-agenda.tsx`
- `apps/web/src/modules/appointments/actions.ts`
- `apps/web/src/modules/appointments/public-booking.ts`
- `apps/web/src/modules/notifications/whatsapp-automation.ts`
- `apps/web/content/auto-messages.md`
