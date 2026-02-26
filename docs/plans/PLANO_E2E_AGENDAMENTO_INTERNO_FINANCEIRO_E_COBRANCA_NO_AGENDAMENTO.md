# Plano E2E: Agendamento Interno com Etapa Financeira e Cobranca no Agendamento

## Objetivo

Implementar um fluxo completo de agendamento interno com:

- etapa financeira dedicada no formulario `/novo`
- opcao de `cobrar agora` ou `cobrar no atendimento`
- confirmacao final em modal bottom sheet
- integracao com checkout/pagamento (PIX, cartao/Point, dinheiro)
- disparo correto de mensagens (manual e automacao) conforme momento financeiro
- consistencia entre financeiro do agendamento e checkout do atendimento

## Principios (decisoes ja alinhadas)

1. Se a opcao for `cobrar agora`, o agendamento e criado no inicio do fluxo de cobranca.
2. Se a cobranca nao for concluida, o agendamento permanece criado com status financeiro pendente.
3. Pagamento em dinheiro (cobrar agora) registra pagamento imediatamente no valor configurado.
4. Fluxo manual de WhatsApp deve continuar existindo como fallback.
5. Automacao e envio manual devem respeitar o momento correto (confirmacao do agendamento vs confirmacao do pagamento).

## Escopo desta iniciativa

### Incluido

- Refatoracao do formulario interno `/novo`
- Nova etapa `Financeiro`
- Novo modal de confirmacao (bottom sheet)
- Integracao com cobranca no agendamento
- Reaproveitamento de componentes/estilo do checkout do atendimento
- Ajuste de disparo de mensagens (manual + automacao)
- Ajuste de conteudo das mensagens (incluindo valores)
- Ajuste de recibo/voucher conforme pagamento no agendamento
- Regras de status financeiro (pendente/parcial/pago/waived)
- Testes manuais E2E em DEV

### Fora de escopo (fase posterior)

- Portal do cliente com login/senha/OTP
- Reestruturacao total da RPC `create_public_appointment`
- Refatoracao completa dos templates Meta (submissao/aprovacao final) sem validacao em piloto

## Estado atual relevante (base)

- O repo ja cria/agrega checkout de atendimento (`appointment_checkout`, `appointment_checkout_items`)
- O repo ja suporta desconto no checkout do atendimento
- O repo ja suporta pagamentos via PIX/Point/registro manual
- O repo ja tem automacao WhatsApp e fallback manual
- O repo ja suporta `waived` (cortesia)

## Resultado esperado (UX)

### Fluxo do formulario `/novo`

1. Cliente
2. Dados do agendamento (servico, local, data, horario)
3. Finalizacao (operacional)
4. Financeiro (novo)
5. Confirmacao (bottom sheet)

### Etapa 4: Financeiro (novo)

Deve permitir:

- editar itens financeiros
  - servico
  - taxa de deslocamento (quando domiciliar)
  - itens adicionais
- aplicar desconto
- visualizar subtotal e total
- escolher estrategia de cobranca:
  - `Cobrar no atendimento`
  - `Cobrar agora`
- se `Cobrar agora`, selecionar forma de pagamento:
  - PIX
  - Cartao (Point)
  - Dinheiro
- definir valor a cobrar agora:
  - integral
  - sinal
  - personalizado (se aprovado)

### Confirmacao (bottom sheet)

Resumo:

- cliente
- servico
- data/horario
- local
- resumo financeiro completo
- indicacao de estrategia financeira escolhida

Botoes dinamicos:

- `Cobrar no atendimento`: `Agendar` + `Cancelar`
- `Cobrar agora`: `Cobrar` + `Cancelar`

## Arquitetura funcional proposta

### 1. Separar "configuracao financeira" de "execucao da cobranca"

No formulario `/novo`, manter estado local de `draft financeiro`:

- itens
- desconto
- total
- estrategia (`now` / `at_attendance`)
- forma de pagamento (quando `now`)
- valor a cobrar agora

Esse draft alimenta:

- o modal de confirmacao
- a criacao do agendamento
- o checkout inicial do atendimento

### 2. Criacao do agendamento (momento unico)

Quando usuario confirma (Agendar ou Cobrar):

- cria agendamento
- inicializa checkout (`appointment_checkout` + `appointment_checkout_items`)
- grava desconto configurado
- grava metadados do plano de cobranca no evento/log (se necessario)

Se `Cobrar no atendimento`:

- encerra na criacao (pagamento pendente/parcial conforme configuracao)

Se `Cobrar agora`:

- segue para execucao da cobranca imediatamente

### 3. Cobranca no agendamento (execucao)

#### Dinheiro

- registra pagamento imediatamente
- recalcula status financeiro
- segue para pos-confirmacao

#### PIX

- cria ordem PIX (MP)
- exibe QR Code
- acompanha confirmacao
- quando confirmado:
  - registra pagamento no agendamento
  - recalcula status financeiro
  - segue para pos-confirmacao

#### Cartao / Point

- inicia fluxo Point
- aguarda retorno/status
- quando confirmado:
  - registra pagamento
  - recalcula status financeiro
  - segue para pos-confirmacao

### 4. Pos-confirmacao (mensagens)

#### Se `Cobrar no atendimento`

- automacao: pode disparar na confirmacao do agendamento
- manual fallback: pergunta "enviar aviso manual?" logo apos confirmar agendamento

#### Se `Cobrar agora`

- automacao: dispara somente apos pagamento confirmado
- manual fallback: pergunta "enviar aviso manual?" somente apos pagamento confirmado

Se pagamento foi iniciado e nao concluido:

- nao enviar fluxo de "agendamento pago"
- opcional: mensagem especifica de agendamento criado com pagamento pendente (decidir)

## Regras de mensagens (novo comportamento)

## Aviso de agendamento (todos os casos)

Incluir dados financeiros:

- servico
- taxa de deslocamento (se houver)
- desconto (se houver)
- valor total
- status/estrategia financeira:
  - pagamento no atendimento
  - sinal pago (com saldo pendente)
  - pago integralmente

## Recibo / comprovante

Quando houver pagamento (no agendamento ou no atendimento):

- enviar comprovante de pagamento (recibo)
- manter voucher separado (comprovante do agendamento/servico)

Casos especiais:

- sinal pago: recibo deve indicar que e pagamento parcial/sinal
- opcional futuro: comprovante consolidado (multiplos pagamentos)

## Templates Meta / Templates internos

Precisam ser atualizados para refletir:

- valor
- status financeiro
- links (voucher / comprovante)
- variaveis novas

Observacao:

- alteracoes de conteudo em templates Meta podem exigir nova aprovacao.

## Impactos tecnicos (componentes/arquivos provaveis)

### Formulario interno /novo

- `apps/web/app/(dashboard)/novo/appointment-form.tsx`
- `apps/web/src/modules/appointments/actions.ts`

### Pagamentos / checkout / atendimento

- `apps/web/app/(dashboard)/atendimento/[id]/actions.ts`
- `apps/web/app/(dashboard)/atendimento/[id]/components/attendance-payment-modal.tsx`
- modulos MP/Point/Pix relevantes

### Mensagens / automacao

- modulos de templates internos
- `apps/web/src/modules/notifications/whatsapp-automation.ts`
- logs `appointment_messages` / eventos de atendimento

### Publicos (voucher/comprovante)

- rotas de comprovante/voucher (se precisar diferenciar recibo de sinal)

## Plano de implementacao por fases (recomendado)

### Fase 1 - Estrutura do fluxo (sem pagamento no agendamento)

- criar etapa 4 `Financeiro`
- mover itens/desconto/total para etapa 4
- trocar CTA para `Ir para confirmacao`
- criar bottom sheet de confirmacao
- suportar `Cobrar no atendimento`
- manter seed do checkout no create

Saida:

- fluxo novo funcionando com agendamento normal

### Fase 2 - Cobrar agora: Dinheiro (baixo risco)

- opcao `Cobrar agora`
- forma `Dinheiro`
- registrar pagamento no create/confirmacao
- acionar mensagens no momento correto

Saida:

- caso simples de cobranca no agendamento funcionando E2E

### Fase 3 - Cobrar agora: PIX

- integrar com fluxo PIX atual (reaproveitar componentes/estado)
- QR Code no formulario/confirmacao
- polling/confirmacao
- transicao de status automatica
- mensagens pos-pagamento

Saida:

- PIX no agendamento funcionando E2E

### Fase 4 - Cobrar agora: Cartao / Point

- integrar fluxo Point no novo contexto
- tratar pendencia/falha/cancelamento
- mensagens pos-pagamento

Saida:

- cartao no agendamento funcionando E2E

### Fase 5 - Templates e textos (interno + Meta)

- atualizar mensagens internas
- mapear templates Meta afetados
- preparar textos para aprovacao/ajuste

## Riscos e mitigacoes

### Risco 1: Duplicidade de criacao/cobranca

Mitigacao:

- travas de clique
- idempotencia por operacao
- logs/eventos por etapa

### Risco 2: Mensagem disparar antes da hora

Mitigacao:

- centralizar gatilhos por evento:
  - `appointment_created`
  - `payment_confirmed`
  - `payment_failed`

### Risco 3: Divergencia entre financeiro do agendamento e checkout do atendimento

Mitigacao:

- seed unico no create
- recalc padronizado no checkout
- testes especificos com desconto e taxa

### Risco 4: Complexidade excessiva no `/novo`

Mitigacao:

- extrair subcomponentes (etapa financeira / bottom sheet / cobranca)
- reaproveitar UI/logic do checkout existente

## Testes manuais E2E (checklist base)

### Agendar sem cobrar agora

- estudio / sem desconto
- domicilio / com taxa
- domicilio / taxa + desconto
- confirma que checkout do atendimento abriu com os mesmos itens/valores

### Cobrar agora (dinheiro)

- valor integral
- sinal
- valor personalizado (se habilitado)
- confirma status financeiro correto e mensagens no momento correto

### Cobrar agora (PIX)

- cria QR
- confirma pagamento
- confirma atualizacao automatica e status
- confirma disparo de aviso pos-pagamento

### Cobrar agora (cartao/Point)

- sucesso
- cancelamento
- falha
- pendencia

### Mensagens

- manual: com/sem envio
- automacao: no momento correto
- conteudo com valores e links

## Decisoes em aberto (para aprovacao)

Ver lista objetiva no chat (mantida fora deste arquivo para facilitar aprovacao rapida).

