# Plano Mestre de Auditoria e Modularizacao Enterprise do Repositorio

Status: ativo  
Versao: 2026-02-27  
Escopo: repositorio completo (nao apenas commits recentes)  
Consolidacao: este documento unifica o backlog de modularizacao + a auditoria de producao de `docs/reports/AUDITORIA_MAIN_PROD_2026-02-27.md`.

## 1) Objetivo de negocio e engenharia

Transformar o repo para padrao enterprise, com modularizacao real por responsabilidade, previsibilidade de mudancas e menor risco de regressao em producao.

Nao e apenas quebrar arquivo grande em varios pequenos. O alvo e:

1. Fronteiras de modulo claras.
2. Fluxos previsiveis de dados (UI -> aplicacao -> dominio -> persistencia/adapters).
3. Menos acoplamento e menos duplicacao de regra.
4. Evolucao segura sem big-bang.
5. Base tecnica que passe auditoria de engenharia de empresa grande.

## 2) Inventario tecnico completo do repo

Base coletada em 2026-02-27:

- Arquivos versionados: `358`
- Distribuicao principal:
  - `.ts`: `90`
  - `.tsx`: `76`
  - `.sql`: `63`
  - `.md`: `59`
- Concentracao:
  - `apps/web`: `200` arquivos
  - `supabase/migrations`: `61` arquivos

Hotspots de tamanho (linhas):

1. `apps/web/app/(dashboard)/novo/appointment-form.tsx`: `4260`
2. `apps/web/app/(public)/agendar/[slug]/booking-flow.tsx`: `3105`
3. `apps/web/components/mobile-agenda.tsx`: `1851`
4. `apps/web/src/modules/notifications/whatsapp-automation.ts`: `1625`
5. `apps/web/src/modules/payments/mercadopago-orders.ts`: `1424`
6. `apps/web/app/(dashboard)/atendimento/[id]/actions.ts`: `1414`
7. `apps/web/src/modules/appointments/actions.ts`: `1313`
8. `apps/web/components/agenda/appointment-details-sheet.tsx`: `1285`
9. `apps/web/app/(dashboard)/atendimento/[id]/components/attendance-payment-modal.tsx`: `1230`

Distribuicao de linhas por area (app):

1. `dashboard/atendimento`: `5511`
2. `dashboard/novo`: `4952`
3. `public/agendar`: `4564`

## 3) Diagnostico global (repo inteiro)

## 3.1 Monolitos de UI e fluxo

Evidencias:

1. `apps/web/app/(dashboard)/novo/appointment-form.tsx`
- 4260 linhas
- 43 `useState`, 17 `useEffect`, 24 `useMemo`, 7 `useCallback`
- mistura: formulario, regras de negocio, estado de pagamento, disponibilidade, criacao de cliente, modal, toasts

2. `apps/web/app/(public)/agendar/[slug]/booking-flow.tsx`
- 3105 linhas
- 34 `useState`, 17 `useEffect`
- mistura: identificacao, seguranca anti-enumeracao, disponibilidade, endereco, pagamento, voucher

3. `apps/web/app/(dashboard)/atendimento/[id]/components/attendance-payment-modal.tsx`
- 1230 linhas
- fluxo de checkout + regras de desconto + UX de pagamento + acoes de pos-pagamento no mesmo componente

Impacto:

- Mudancas pequenas exigem tocar arquivo de alto risco.
- Revisao e teste ficam caros.
- Probabilidade maior de regressao cruzada.

## 3.2 Monolitos de server action / dominio

Evidencias:

1. `apps/web/app/(dashboard)/atendimento/[id]/actions.ts`
- 1414 linhas
- 29 `export async function`
- 21 chamadas `createServiceClient`
- mistura: sessao, checkout, pagamentos, mensagens, IA, status financeiro

2. `apps/web/src/modules/appointments/actions.ts`
- 1313 linhas
- 10 `export async function`
- 58 leituras de `formData.get(...)`
- mistura: validacao, composicao de fluxo, persistencia, integracoes e notificacoes

3. `apps/web/src/modules/notifications/whatsapp-automation.ts`
- 1625 linhas
- queue + envio + template + webhook status + webhook inbound + retries + poller local

4. `apps/web/src/modules/payments/mercadopago-orders.ts`
- 1424 linhas
- regras de valor, idempotencia, adaptacao de payload, polling, normalizacao de status, operacoes pix/card/point

Impacto:

- Dificulta ownership por dominio.
- Aumenta acoplamento entre regras independentes.
- Testabilidade limitada.

## 3.3 Fronteiras de camada ainda por consolidar

Observacoes:

1. Parte da logica de dominio ainda esta na camada `app/*` (acoes/rotas) em vez de ficar concentrada em `src/modules/*`.
2. Existem pontos com cast amplo (`as unknown as`) em fluxos criticos.
3. Regras de normalizacao (CPF/CEP/telefone) aparecem repetidas em varios lugares.

Evidencias de duplicacao:

1. `formatCpf` em:
  - `apps/web/app/(dashboard)/novo/appointment-form.tsx`
  - `apps/web/app/(public)/agendar/[slug]/booking-flow.tsx`
  - `apps/web/app/(dashboard)/clientes/novo/page.tsx`
2. `normalizeCpfDigits` em:
  - `apps/web/app/(dashboard)/novo/appointment-form.tsx`
  - `apps/web/app/(dashboard)/novo/appointment-actions.ts`
  - `apps/web/src/modules/clients/repository.ts`

## 3.4 Acoplamento de imports e navegacao estrutural

Sinal de acoplamento por caminho relativo profundo:

- diversos imports com `../../../../` e `../../../../../` em `app/*` e `src/modules/*`.

Impacto:

- baixa legibilidade de fronteira de modulo
- maior custo para mover arquivo/refatorar

## 3.5 Seguranca e operacao (status apos hardening recente)

Ja enderecado nesta rodada:

1. captcha de identidade online sem fallback inseguro em producao
2. recalculo de `payment_status` apos editar itens/desconto
3. correcoes de timezone em disponibilidade interna

Pendencias de decisao:

1. `GET` de runtime em `/api/internal/notifications/whatsapp/process` aberto sem bearer.
2. trade-off de UX vs privacidade no passo de identidade do agendamento online.

## 3.6 Governanca documental

Situacao:

1. base ativa melhorou, mas ainda coexistem docs legados extensos.
2. falta rotina formal de “doc drift control” para manter plano, codigo e operacao sincronizados.

## 4) Arquitetura alvo (padrao enterprise)

## 4.1 Principios

1. Modularizar por responsabilidade, nao por tamanho.
2. Cada fluxo critico com “orquestrador” explicito.
3. Camadas com direcao unica de dependencia.
4. Regras de negocio centralizadas e reutilizaveis.
5. UI desacoplada de persistencia.

## 4.2 Estrutura alvo por feature (padrao)

Para cada feature critica (ex.: internal-booking, attendance-checkout, public-booking, payments-mp, whatsapp-automation):

1. `domain/`  
  regras, tipos de negocio, calculos
2. `application/`  
  casos de uso e orquestracao
3. `infrastructure/`  
  adapters externos (Supabase, MP, Meta)
4. `ui/`  
  componentes visuais puros
5. `hooks/`  
  estado/efeitos de tela
6. `actions/`  
  server actions finas que delegam ao application

## 4.3 Guardrails tecnicos obrigatorios

1. Limites de arquivo (soft cap):
  - UI componente: 350 linhas
  - hook: 250 linhas
  - action/orquestrador: 450 linhas
  - excecao apenas com ADR curto no PR
2. Sem regra de negocio critica em componente visual.
3. Sem `as unknown as` em fluxo financeiro sem justificativa e teste.
4. Regras de formatacao/normalizacao centralizadas em `src/shared`.

## 5) Plano de correcao detalhado e completo

## Fase 0 - Fundacao de qualidade (curta, obrigatoria)

Objetivo: travar padrao antes da refatoracao pesada.

Tarefas:

1. Definir guideline de modularizacao e naming.
2. Criar checklist de PR arquitetural.
3. Adicionar lint rule de fronteira (ou script de verificacao de imports proibidos).
4. Padronizar path aliases para reduzir `../../../../`.

Saida:

- documento de convencao
- guardrails automatizados no CI

## Fase 1 - Consolidacao de utilitarios e contratos compartilhados

Objetivo: remover duplicacao de regra transversal.

Tarefas:

1. Centralizar CPF/CEP/telefone/currency em `src/shared`.
2. Unificar parse de valores financeiros.
3. Consolidar mensagens de erro padrao.

Saida:

- pacote utilitario unico por tema
- remocao de funcoes duplicadas em telas

## Fase 2 - Refatoracao do agendamento interno (`/novo`)

Objetivo: decompor fluxo mais critico do dashboard.

Escopo primario:

1. `apps/web/app/(dashboard)/novo/appointment-form.tsx`
2. `apps/web/app/(dashboard)/novo/appointment-actions.ts`
3. `apps/web/app/(dashboard)/novo/availability.ts`

Quebra sugerida:

1. `ui/steps/step-client.tsx`
2. `ui/steps/step-procedure-location.tsx`
3. `ui/steps/step-datetime.tsx`
4. `ui/steps/step-finance.tsx`
5. `ui/modals/create-client-modal.tsx`
6. `hooks/use-internal-booking-flow.ts`
7. `application/internal-booking-service.ts`

## Fase 3 - Refatoracao do agendamento online (`/agendar/[slug]`)

Objetivo: separar seguranca, disponibilidade e pagamento do componente unico.

Escopo primario:

1. `apps/web/app/(public)/agendar/[slug]/booking-flow.tsx`
2. `apps/web/app/(public)/agendar/[slug]/public-actions/*`
3. `apps/web/app/(public)/agendar/[slug]/availability.ts`

Quebra sugerida:

1. `ui/steps/ident-step.tsx`
2. `ui/steps/service-step.tsx`
3. `ui/steps/datetime-step.tsx`
4. `ui/steps/location-step.tsx`
5. `ui/steps/payment-step.tsx`
6. `hooks/use-public-booking-identity-guard.ts`
7. `hooks/use-public-booking-availability.ts`
8. `application/public-booking-payments-service.ts`

## Fase 4 - Refatoracao do atendimento/checkout

Objetivo: isolar regras financeiras de sessao e UI.

Escopo primario:

1. `apps/web/app/(dashboard)/atendimento/[id]/actions.ts`
2. `apps/web/app/(dashboard)/atendimento/[id]/components/attendance-payment-modal.tsx`
3. `apps/web/app/(dashboard)/atendimento/[id]/components/session-stage.tsx`

Quebra sugerida:

1. `application/attendance-checkout-service.ts`
2. `application/attendance-session-service.ts`
3. `ui/payment/*`
4. `ui/session/*`

## Fase 5 - Refatoracao de pagamentos Mercado Pago

Objetivo: separar adaptador externo de regra de negocio interna.

Escopo:

1. `apps/web/src/modules/payments/mercadopago-orders.ts`

Quebra sugerida:

1. `infrastructure/mp-http-client.ts`
2. `infrastructure/mp-order-mappers.ts`
3. `application/mp-create-pix.ts`
4. `application/mp-create-card.ts`
5. `application/mp-sync-status.ts`
6. `domain/payment-status-policy.ts`

## Fase 6 - Refatoracao da automacao WhatsApp

Objetivo: separar pipeline de notificacao por responsabilidades.

Escopo:

1. `apps/web/src/modules/notifications/whatsapp-automation.ts`

Quebra sugerida:

1. `application/queue-enqueue.ts`
2. `application/queue-process.ts`
3. `infrastructure/meta-cloud-send.ts`
4. `application/template-builders.ts`
5. `application/webhook-status-handler.ts`
6. `application/webhook-inbound-handler.ts`
7. `application/local-poller.ts`

## Fase 7 - Refatoracao de agenda e detalhes

Objetivo: reduzir acoplamento entre visualizacao da agenda e detalhes operacionais.

Escopo:

1. `apps/web/components/mobile-agenda.tsx`
2. `apps/web/components/agenda/appointment-details-sheet.tsx`
3. `apps/web/components/agenda/appointment-card.tsx`

## Fase 8 - Limpeza de fronteiras em `app/*` e `src/modules/*`

Objetivo: tornar `app/*` camada de entrega, nao camada de negocio.

Tarefas:

1. mover regra de dominio de `app/*` para `src/modules/*`
2. manter em `app/*` apenas wiring, auth e serializacao de entrada/saida

## Fase 9 - Governanca continua

Objetivo: evitar regressao arquitetural.

Tarefas:

1. revisar docs canonicos por release
2. score de modularidade por sprint
3. controle de drift com checklist de PR

## 6) Backlog priorizado (execucao incremental)

Prioridade P0 (imediata):

1. ARQ-001: Fase 0 (guardrails)
2. ARQ-002: Fase 1 (shared validators/formatters)
3. ARQ-003: Fase 2 (split inicial do agendamento interno)
4. ARQ-004: Fase 3 (split inicial do agendamento online)

Prioridade P1:

1. ARQ-005: Fase 4 (atendimento/checkout)
2. ARQ-006: Fase 5 (pagamentos MP)
3. ARQ-007: Fase 6 (automacao WhatsApp)

Prioridade P2:

1. ARQ-008: Fase 7 (agenda/detalhes)
2. ARQ-009: Fase 8 (fronteiras finais app/modules)
3. ARQ-010: Fase 9 (governanca continua)

## 7) Criterios de aceite por bloco

Obrigatorio em cada bloco:

1. `pnpm --filter web lint` verde
2. `pnpm --filter web build` verde
3. `pnpm --filter web check-types` verde
4. sem regressao funcional no fluxo afetado (teste manual dirigido)
5. reducao auditavel de acoplamento (antes/depois no PR)

## 8) Decisoes que ainda dependem de voce

1. Privacidade do passo “Quem e voce” no agendamento online:
  - manter UX atual
  - ou resposta neutra para reduzir enumeracao
2. Proteger `GET /api/internal/notifications/whatsapp/process` com bearer:
  - sim
  - nao
3. Limite de rigidez para tamanho de arquivo:
  - aplicar como regra bloqueante
  - aplicar como alerta de arquitetura

## 9) Riscos e mitigacao

Riscos:

1. refatoracao funcional em area critica de pagamento/agendamento
2. regressao de UX em fluxo de conversao online
3. quebrar contratos de automacao WhatsApp

Mitigacao:

1. refatoracao por fatias pequenas
2. manter contrato de I/O estavel por fase
3. teste de smoke apos cada bloco
4. nao misturar refatoracao estrutural com mudanca de regra de negocio no mesmo PR

## 10) Proximo passo recomendado de execucao

Rodada seguinte (sem big-bang):

1. executar Fase 0 e Fase 1 completas
2. iniciar Fase 2 apenas com split do card 1 + modal de cliente do `/novo`
3. commitar em blocos logicos pequenos com validacao completa por bloco
