# Plano Enterprise - Realtime, Edge Functions, Push e Padronizacao de Loading

Status: proposto para execucao  
Data base: 2026-03-10  
Escopo: repo completo (`apps/web`, `supabase/functions`, `supabase/migrations`, `docs`)  
Ambientes alvo: `development -> preview -> production`  
Perfil de entrega: producao enterprise (sem abordagem MVP)

## 0) Premissas inegociaveis (execucao)

1. Este programa nao admite entrega "minimo viavel" para fluxo critico.
2. Cada fase deve entregar blocos completos de capacidade (codigo + testes + observabilidade + documentacao).
3. E proibido fechar fase com:
   - workaround manual recorrente
   - acoplamento oculto
   - fallback sem governanca
   - comportamento parcialmente confiavel em producao
4. Toda implementacao deve ser modular, rastreavel e com rollback definido.
5. Meta do programa: versao V1 final de producao com padrao profissional senior.

## 1) Objetivo executivo

Este plano define a evolucao arquitetural e operacional do sistema para:

1. Atualizacao em tempo real consistente nos modulos criticos.
2. Processamento assincrono robusto via Edge Functions.
3. Notificacao push para operacao da Jana no celular.
4. Padrao unico de loading UX (sem loaders fragmentados por tela).
5. Observabilidade, seguranca, rollback e governanca de nivel enterprise.

## 2) Metas de negocio e qualidade

## 2.1 Metas de negocio

1. Reduzir atraso operacional em agenda/atendimento/mensagens.
2. Diminuir risco de perda de eventos de pagamento e WhatsApp.
3. Melhorar tempo de resposta da operacao a cancelamentos e alteracoes.
4. Dar visibilidade em tempo real para status de automacoes e pagamentos.

## 2.2 Metas tecnicas (SLO alvo)

1. Atualizacao visual de eventos criticos <= 2s (P95).
2. Entrega de evento interno (outbox -> consumidor) <= 5s (P95).
3. Taxa de sucesso de processamento de fila >= 99.5%.
4. Duplicidade de processamento <= 0.1% (com idempotencia).
5. Taxa de erro de push critico <= 2% (com retry + DLQ).

## 3) Diagnostico atual (baseline real do repo)

## 3.1 Realtime atual

1. Realtime ativo em Agenda:
   - `apps/web/components/agenda/use-mobile-agenda-screen-controller.impl.ts`
2. Realtime ativo em Atendimento:
   - `apps/web/app/(dashboard)/atendimento/[id]/attendance-page.tsx`
3. Hook compartilhado existente:
   - `apps/web/src/shared/realtime/use-supabase-realtime-refresh.ts`
4. Publicacao realtime no banco ja habilitada para tabelas operacionais:
   - `supabase/migrations/20260302102000_enable_realtime_operational_tables.sql`
5. Modulo Mensagens ainda server-side sem assinatura realtime direta:
   - `apps/web/app/(dashboard)/mensagens/page.tsx`

## 3.2 Edge atual

Edge Functions existentes:

1. `supabase/functions/whatsapp-meta-webhook`
2. `supabase/functions/whatsapp-automation-processor`
3. `supabase/functions/mercadopago-webhook-proxy`

Conclusao:

1. Ja existe base de borda/proxy.
2. Falta consolidar uma arquitetura de eventos e fila unificada para todos os dominos criticos.

## 3.3 Push atual

1. Nao existe implementacao de push no repo no momento.
2. Nao existe camada de subscriptions de dispositivo.
3. Nao existe fila/canal dedicado para entrega push.

## 3.4 Auditoria de loading (repo inteiro)

Inventario automatizado executado no repo:

1. Arquivos `loading.tsx` (App Router): `0`
2. Ocorrencias de `fallback={null}`: `1`
   - `apps/web/app/(dashboard)/layout.tsx`
3. Ocorrencias de `router.refresh()`: `21`
4. Ocorrencias de `setInterval(...)`: `20`
5. Ocorrencias de `setTimeout(...)`: `29`
6. Ocorrencias de `animate-spin`: `9`
7. Ocorrencias de `useTransition(...)`: `2`
8. Componente canonico `LoadingState` existe, mas com adocao quase nula:
   - `apps/web/components/ui/states.tsx`

Distribuicao principal de polling (`setInterval`):

1. Fluxo publico de agendamento/pagamento: 5
2. Atendimento (checkout/pagamento): 4
3. Novo agendamento (interno): 3
4. Public checkout module: 4
5. Timer/agenda/outros: 4

Diagnostico objetivo:

1. Ha loading funcional, mas fragmentado.
2. Ha polling manual em excesso para casos que podem migrar para realtime/eventos.
3. Falta padrao de UX para loading por contexto (pagina, secao, inline, bloqueante).

## 4) Arquitetura alvo

## 4.1 Principios

1. Event-driven onde houver mudanca de estado critico.
2. Idempotencia obrigatoria em toda borda assincrona.
3. Fail-safe por configuracao (nao operar em modo inconsistente).
4. Observabilidade por correlation id de ponta a ponta.
5. UX sem refresh global desnecessario.

## 4.2 Camadas alvo

1. Camada de dominio (app/src/modules): gera eventos de negocio.
2. Camada de persistencia (Supabase): outbox + tabelas operacionais + projections.
3. Camada de execucao assincrona (Edge): ingestao, orquestracao, retry, reconciliacao.
4. Camada de apresentacao (UI): subscriptions realtime + patch local de estado.
5. Camada de notificacao (push): channel provider + preferencias + entrega auditavel.

## 4.3 Modelo de eventos (novo)

Eventos canonicos iniciais:

1. `appointment.created`
2. `appointment.updated`
3. `appointment.canceled`
4. `payment.created`
5. `payment.status_changed`
6. `whatsapp.job.queued`
7. `whatsapp.job.status_changed`
8. `whatsapp.template.status_changed`
9. `whatsapp.template.quality_changed`
10. `reminder.customer_response`

## 5) Workstreams de implementacao

## 5.1 Workstream A - Realtime enterprise

Objetivo: remover dependencia de refresh global e polling desnecessario.

Entregas:

1. Evoluir `use-supabase-realtime-refresh` para:
   - suporte a patch local
   - reconexao com backoff
   - debounce configuravel por modulo
   - health state do canal (connecting/ready/degraded)
2. Criar adapters por modulo:
   - Agenda adapter
   - Atendimento adapter
   - Mensagens adapter
   - Caixa adapter
   - Checkout publico adapter
3. Introduzir fallback controlado:
   - realtime indisponivel -> polling degradado temporario com telemetria
4. Remover `router.refresh()` em pontos elegiveis e substituir por atualizacao incremental.

## 5.2 Workstream B - Edge Functions e processamento assincrono

Objetivo: robustez operacional para webhooks, filas e reconciliacao.

Entregas:

1. Edge ingress padronizado para webhooks (Meta/MP):
   - validacao de assinatura
   - idempotency key
   - persistencia de evento bruto + normalizado
2. Edge dispatcher:
   - processa outbox
   - dispara automacao/push
   - controla retries exponenciais
3. Dead Letter Queue:
   - retencao de falhas nao recuperaveis
   - painel de reprocessamento
4. Jobs de manutencao:
   - stale jobs
   - limpeza controlada
   - reconciliacao de status de pagamento e WhatsApp

## 5.3 Workstream C - Push no celular (Jana)

Objetivo: alertar Jana em tempo real para eventos operacionais criticos.

Recomendacao de provider:

1. OneSignal (prioritario para velocidade operacional e multiplataforma).
2. Alternativa: FCM/APNs com maior custo de operacao.

Entregas:

1. Tabelas:
   - `push_subscriptions`
   - `user_notification_preferences`
   - `push_delivery_attempts`
2. Fluxo de inscricao:
   - permissao
   - registro de dispositivo
   - revogacao/expiracao
3. Matriz de notificacao:
   - agendamento criado/cancelado/alterado
   - pagamento aprovado/falhou
   - falha critica de automacao WhatsApp
4. Conteudo padronizado:
   - titulo curto
   - payload com deep-link interno
   - sem dado sensivel no corpo
5. Retentativa e auditoria:
   - retry exponencial
   - deduplicacao por evento+usuario+canal
   - DLQ de push

## 5.4 Workstream D - Sistema de Loading padronizado

Objetivo: experiencia consistente de loading em todo o sistema.

Entregas:

1. Criar biblioteca de loading canonica:
   - `Spinner`
   - `InlineLoading`
   - `SectionSkeleton`
   - `PageSkeleton`
   - `BlockingOverlay`
   - `TableSkeleton`
   - `CardSkeleton`
2. Definir contrato de uso:
   - quando usar skeleton vs spinner
   - duracao minima visual
   - comportamento de transicao
   - acessibilidade (`aria-busy`, `role=status`, reduced motion)
3. Introduzir `loading.tsx` para rotas criticas (App Router):
   - dashboard shell
   - mensagens
   - atendimento
   - clientes
   - novo agendamento
   - pagamento/comprovante/voucher
4. Substituir loaders ad-hoc por componentes canonicos.
5. Criar lint guideline para evitar novos loaders fora do padrao.

## 6) Fases de execucao (detalhado)

## Fase 0 - Preparacao e governanca

1. Definir RACI, owners por modulo e janelas de release.
2. Definir feature flags por workstream e por ambiente.
3. Publicar plano de rollback por modulo.
4. Aprovar SLO/SLI e alarmes.

Gate de saida:

1. Checklist de governanca aprovado.
2. Matriz de risco assinada.

## Fase 1 - Dados e contratos de evento

1. Criar migrations para outbox, dispatch log, push subscriptions, push attempts, DLQ.
2. Definir payload schema versionado.
3. Definir politica de retencao.

Gate de saida:

1. Migrations aplicadas local + preview.
2. Testes SQL de integridade aprovados.

## Fase 2 - Core Realtime

1. Hardening do hook realtime compartilhado.
2. Canal health monitor.
3. Patch local de estado para agenda e atendimento.

Gate de saida:

1. Remocao de refresh global em fluxos alvo da fase.
2. P95 de atualizacao <= 2s em preview.

## Fase 3 - Mensagens realtime first

1. Migrar modulo Mensagens para shell client com stream realtime.
2. Atualizacao em tempo real da fila/status/erros/templates.
3. Reprocessamento controlado no proprio modulo.

Gate de saida:

1. Sem reload manual para acompanhar status de envio.
2. Trilha de evento auditavel fim-a-fim.

## Fase 4 - Edge consolidado

1. Ingress unificado Meta/MP.
2. Dispatcher com idempotencia e retries.
3. DLQ + painel operacional.

Gate de saida:

1. Webhook duplicate-safe validado.
2. Reprocessamento funcional com trilha de auditoria.

## Fase 5 - Push para Jana

1. Implementar inscricao e preferencias.
2. Integrar eventos criticos ao canal push.
3. Validar deep-link para telas internas.

Gate de saida:

1. Entrega de push >= 98% em preview controlado.
2. Falhas com retry + log.

## Fase 6 - Loading padronizado

1. Implantar biblioteca de loading.
2. Aplicar em modulos criticos primeiro:
   - Agenda
   - Atendimento
   - Mensagens
   - Checkout publico/interno
3. Aplicar `loading.tsx` por rota critica.

Gate de saida:

1. Sem `fallback={null}` em rotas criticas.
2. Sem spinner ad-hoc fora da biblioteca canonica nos modulos migrados.

## Fase 7 - Hardening final e promocao

1. Teste de carga e chaos test.
2. Auditoria de seguranca (webhook, secrets, replay).
3. Canary em production com rollback automatico.

Gate de saida:

1. Go/No-Go aprovado.
2. Runbooks atualizados.

## 7) Estrutura de implementacao por modulo

## 7.1 Agenda

1. Migrar para patch local de eventos de `appointments` e `availability_blocks`.
2. Reduzir `router.refresh` para excecoes.
3. Aplicar `SectionSkeleton` para detalhes e transicoes.

## 7.2 Atendimento

1. Atualizacao realtime de checkout/pagamentos/jobs sem reload global.
2. Consolidar loading de acao (inline e bloqueante) em componentes canonicos.
3. Integrar eventos de pagamento ao painel da tela.

## 7.3 Mensagens

1. Tornar tela client-driven com realtime subscription.
2. Separar estado de fila, status Meta e erros operacionais.
3. Atualizar templates e qualidade em tempo real.

## 7.4 Caixa/Financeiro

1. Atualizar pagamentos e reconciliacao em tempo real.
2. Reduzir polling para fallback apenas.
3. Exibir loading/sync state padrao.

## 7.5 Fluxo publico (agendar/pagamento/comprovante)

1. Substituir polling agressivo por eventos quando possivel.
2. Unificar loading de Pix/cartao em componentes canonicos.
3. Adicionar page-level loading para trocas de etapa critica.

## 8) Estrategia de testes e validacao

## 8.1 Testes obrigatorios por fase

1. Unit:
   - adaptadores de evento
   - deduplicacao/idempotencia
   - reducers de patch local
2. Integration:
   - edge ingress -> outbox -> dispatcher -> atualizacao de estado
3. E2E (Playwright):
   - agendamento -> fila -> envio -> status delivered/read
   - pagamento -> atualizacao caixa/atendimento
   - cancelamento -> notificacao push
4. Non-functional:
   - carga (burst de eventos)
   - resiliencia (queda de conexao/reconexao)
   - seguranca (assinatura webhook/replay attack)

## 8.2 Comandos de validacao (baseline)

1. `pnpm lint`
2. `pnpm --filter web lint:architecture`
3. `pnpm check-types`
4. `pnpm --filter web test:unit`
5. `pnpm --filter web test:smoke`
6. `pnpm build`

## 8.3 Validacoes operacionais em preview

1. Realtime ativo sem refresh manual nos modulos migrados.
2. Eventos de webhook com trilha completa.
3. Push recebido no celular da Jana com deep-link valido.
4. Sem regressao de UX de loading.

## 9) Observabilidade e operacao

## 9.1 Telemetria minima obrigatoria

1. Event lag (outbox -> dispatch).
2. Taxa de sucesso/falha por edge function.
3. Retries e DLQ por tipo de evento.
4. Realtime channel health por modulo.
5. Taxa de entrega push por provider.

## 9.2 Alertas

1. Erro webhook acima de limiar.
2. Crescimento anormal de fila.
3. Aumento de latencia de dispatch.
4. Queda de entrega push.
5. Falha de sincronizacao de templates Meta.

## 10) Rollout por ambiente

1. Development:
   - validacao tecnica e testes automatizados.
2. Preview:
   - validacao operacional com dados reais controlados.
   - canary por tenant/perfil.
3. Production:
   - habilitacao gradual por modulo.
   - monitoramento intensivo + rollback pronto.

## 11) Riscos e mitigacoes

1. Risco: duplicidade de evento.
   - Mitigacao: idempotency key + unique constraints + dedupe em consumidor.
2. Risco: realtime instavel.
   - Mitigacao: fallback degradado com telemetria.
3. Risco: ruido de push.
   - Mitigacao: preferencias por tipo/evento e rate limiting.
4. Risco: regressao UX de loading.
   - Mitigacao: biblioteca canonica + checklist de PR + testes visuais.
5. Risco: divergencia entre ambientes.
   - Mitigacao: profile-first, env audit, validacao de fail-safe.

## 12) Go/No-Go final para entrega

A entrega final enterprise so deve ser considerada pronta quando:

1. Workstreams A-D concluídos nos modulos prioritarios.
2. Push operacional ativo para eventos criticos.
3. SLOs atendidos por 7 dias em preview e 7 dias em production canary.
4. Runbooks e docs atualizados:
   - `docs/integrations/INTEGRATIONS_TECNICO.md`
   - `docs/integrations/INTEGRATIONS_GUIA_OPERACIONAL.md`
   - `docs/apis/API_GUIDE.md`
   - `docs/runbooks/TESTES_VALIDACAO_LOCAL_E_CI.md`
5. Checklist de rollback validado e testado.

## 13) Backlog de execucao sugerido (ordem)

1. Fase 0 e Fase 1 (dados + governanca).
2. Fase 2 (core realtime agenda/atendimento).
3. Fase 3 (mensagens realtime).
4. Fase 4 (edge consolidado).
5. Fase 6 (loading padronizado).
6. Fase 5 (push) em paralelo controlado apos base de eventos estabilizada.
7. Fase 7 (hardening + rollout final).

## 14) Decisao recomendada

Este plano deve ser aprovado como programa oficial de evolucao enterprise do repo, com execucao em blocos curtos e auditaveis, sem atalho de MVP para os fluxos criticos.
