# Anexo de Padronizacao, Higiene, Erros e Loading da Reescrita

Status: ativo  
Data base: 2026-03-23  
Escopo: apoio obrigatorio ao plano principal de reescrita Android nativa

## 1) Objetivo deste anexo

1. garantir que a reescrita entregue paridade funcional sem copiar problemas antigos.
2. transformar o novo repo em base mais limpa, previsivel e reutilizavel.
3. servir como checklist tecnico de qualidade para cada fase.

## 1.1) Atualizacao de baseline (auditoria 2026-03-23)

Inventario reconfirmado no repo web:

1. `apps/web/app/(dashboard)`: 13 paginas reais.
2. `apps/web/app/(public)`: 4 paginas reais.
3. `apps/web/app/api/**/route.ts`: 22 endpoints.
4. `apps/web/app/**/loading.tsx`: 11 pontos oficiais de loading.
5. `apps/web/src/modules`: 14 modulos ativos.

Situacao macro de maturidade V2 no web:

1. alto: `agenda`, `novo`.
2. medio-alto: `atendimento`.
3. medio/heterogeneo: `clientes`, `catalogo`, `configuracoes`.

## 2) Inventario real da origem web (fonte de convergencia)

## 2.1) Modulos de dominio ativos em `apps/web/src/modules`

1. `agenda`
2. `appointments`
3. `attendance`
4. `auth`
5. `clients`
6. `events`
7. `finance`
8. `integrations`
9. `notifications`
10. `payments`
11. `push`
12. `services`
13. `settings`
14. `tenancy`

## 2.2) Componentes base em `apps/web/components/ui`

1. `app-header.tsx`
2. `bottom-nav.tsx`
3. `buttons.tsx`
4. `chip.tsx`
5. `floating-action-menu.tsx`
6. `form-section.tsx`
7. `inputs.tsx`
8. `loading-system.tsx`
9. `module-header.tsx`
10. `module-page.tsx`
11. `payment-method-icon.tsx`
12. `states.tsx`
13. `surface-card.tsx`
14. `toast.tsx`

## 2.3) Shared cross-cutting em `apps/web/src/shared`

Categorias obrigatorias para convergencia:

1. formatadores: `currency.ts`, `datetime.ts`, `phone.ts`, `cpf.ts`, `timezone.ts`
2. validacao: `validation/*`
3. erros: `errors/AppError.ts`, `errors/result.ts`, `errors/mapSupabaseError.ts`
4. env e feature flags: `env/*`, `feature-flags.ts`
5. address/displacement: `address/cep.ts`, `displacement/*`
6. realtime e sessao ativa: `realtime/*`, `timer/*`

## 2.4) Pontos oficiais de loading no App Router web

1. `apps/web/app/(dashboard)/loading.tsx`
2. `apps/web/app/(dashboard)/atendimento/[id]/loading.tsx`
3. `apps/web/app/(dashboard)/clientes/loading.tsx`
4. `apps/web/app/(dashboard)/mensagens/loading.tsx`
5. `apps/web/app/(dashboard)/novo/loading.tsx`
6. `apps/web/app/(public)/agendar/[slug]/loading.tsx`
7. `apps/web/app/pagamento/loading.tsx`
8. `apps/web/app/pagamento/[id]/loading.tsx`
9. `apps/web/app/voucher/[id]/loading.tsx`
10. `apps/web/app/comprovante/[id]/loading.tsx`
11. `apps/web/app/comprovante/pagamento/[paymentId]/loading.tsx`

## 2.5) Hotspots de legado/fallback para tratamento na migracao

Arquivos/padroes com sinal de legado/fallback que exigem revisao de convergencia:

1. `apps/web/src/modules/clients/profile-data.ts`
   (`legacyNotes`, `legacy-phone`, `legacy-email`)
2. `apps/web/app/(dashboard)/atendimento/[id]/actions/checklist-evolution.ts`
   (`legacyInsert`)
3. `apps/web/src/modules/notifications/whatsapp-automation-appointments.ts`
   (fallbacks e compatibilidade legada)
4. `apps/web/src/modules/tenancy/runtime.ts`
   (fallback canonico de runtime, manter governado)
5. `apps/web/app/api/mercadopago/webhook/mercadopago-webhook.helpers.ts`
   (fallback numerico/mensagem)
6. `apps/web/app/(dashboard)/catalogo/catalogo-view.tsx`
   (`window.confirm` em fluxo critico; migrar para dialog canonico)
7. `apps/web/app/(dashboard)/clientes/**`
   (uso recorrente de `router.refresh()` em cenarios que aceitam patch local)
8. `apps/web/app/(dashboard)/configuracoes/**`
   (acoplamento de muitos contextos/configs numa tela longa unica)

Regra:

1. fallback de seguranca/compliance pode permanecer com contrato explicito.
2. fallback de remendo tecnico deve ser removido ou substituido.

## 2.6) Inventario minimo de rotas para paridade 1:1

Dashboard (`apps/web/app/(dashboard)`):

1. `/(dashboard)`
2. `/(dashboard)/clientes`
3. `/(dashboard)/novo`
4. `/(dashboard)/atendimento/[id]`
5. `/(dashboard)/caixa`
6. `/(dashboard)/catalogo`
7. `/(dashboard)/mensagens`
8. `/(dashboard)/configuracoes`
9. `/(dashboard)/menu`
10. `/(dashboard)/clientes/novo`
11. `/(dashboard)/clientes/[id]`
12. `/(dashboard)/clientes/[id]/editar`
13. `/(dashboard)/clientes/[id]/prontuario`

Publico:

1. `/(public)/agendar/[slug]`
2. `/pagamento`
3. `/pagamento/[id]`
4. `/voucher/[id]`
5. `/comprovante/[id]`
6. `/comprovante/pagamento/[paymentId]`
7. paginas legais

## 2.7) Classificacao de maturidade V2 por modulo (web baseline)

1. `agenda`: V2 consolidada para cabecalho/cards/modais/rodape e loading de
   transicao.
2. `novo`: V2 consolidada para etapas, cards e fluxo de revisao/cobranca.
3. `atendimento`: V2 parcial-alta; falta consolidar todo o checkout no mesmo
   componente base de cobranca.
4. `clientes`: funcional, mas com heterogeneidade visual/composicional.
5. `catalogo`: funcional, mas com interacoes legacy e padrao visual antigo em
   pontos do fluxo.
6. `configuracoes`: funcional, mas com excesso de acoplamento e baixa
   modularidade de UI.

Regra de prioridade para migracao:

1. fechar baseline web V2 de `atendimento`.
2. reescrever `clientes`.
3. reescrever `catalogo`.
4. refatorar `configuracoes`.

## 3) Arquitetura de reutilizacao obrigatoria no novo repo

## 3.1) App Android (`estudio-platform/app`)

Estrutura alvo:

1. `core/designsystem/components`
2. `core/designsystem/states`
3. `core/errors`
4. `core/network`
5. `core/session`
6. `core/tenancy`
7. `features/<dominio>/{data,domain,presentation}`

Regras:

1. componente visual base nao pode nascer dentro de `features/*`.
2. tela nao pode conter regra de negocio de persistencia.
3. regra transversal (loading, erro, formatador) deve existir apenas uma vez.

## 3.2) Backend AWS (`estudio-platform/backend`)

Estrutura alvo:

1. `routes/*` (thin controllers)
2. `services/*` (use cases)
3. `db/*` (repositorios/migrations)
4. `integrations/*` (adapters externos)
5. `errors/*` (catalogo, mapper e envelope)
6. `types/*` (contratos comuns)

Regras:

1. rota sem regra de negocio pesada.
2. integracao externa sem espalhar logica por varias rotas.
3. resposta de erro com envelope unico.

## 3.3) Contrato de tokens visuais e API de componentes

Tokens obrigatorios:

1. cor: `primary`, `secondary`, `surface`, `background`,
   `success`, `warning`, `error`, `info`.
2. tipografia: `display`, `title`, `body`, `label`, `caption`.
3. espacamento: escala `xs/sm/md/lg/xl`.
4. raio/elevacao: escala unica por nivel.

Componentes base obrigatorios:

1. `AppButton` (`primary`, `secondary`, `ghost`, `danger`, `loading`).
2. `AppInput` (normal, foco, erro, desabilitado).
3. `AppCard` (default, outlined, elevated, interactive).
4. `AppSheet` (modal e bottom).
5. `AppToast` (success, warning, error, info).
6. `AppDialog` (confirmacao, alerta, destrutivo).

Regra:

1. feature nao pode criar variante local de componente base sem contrato.

## 3.4) Contrato de navegacao, deep link e back stack

1. cada rota da matriz deve ter destino mobile e deep link canonicamente definido.
2. cada fluxo deve documentar o comportamento do botao voltar.
3. parametros obrigatorios da rota devem ser validados.
4. abrir por notificacao/push/whatsapp deve cair no mesmo destino de deep link.

## 3.5) Identificadores canonicos de release

1. `applicationId` Android: `com.erpagendamentos.app`.
2. package raiz mobile deve permanecer alinhado ao `applicationId`.
3. alteracao desses identificadores exige decisao formal e plano de migracao.

## 4) Catalogo de erros v2 (padrao de produto)

## 4.1) Envelope obrigatorio do backend

Campos minimos:

1. `code`
2. `message`
3. `userMessage`
4. `correlationId`
5. `retryable`
6. `kind`

## 4.2) Namespace de codigos

1. `AUTH_*`
2. `CLIENTS_*`
3. `APPOINTMENTS_*`
4. `ATTENDANCE_*`
5. `FINANCE_*`
6. `MESSAGES_*`
7. `INTEGRATIONS_*`
8. `INFRA_*`
9. `SECURITY_*`

## 4.3) Mapeamento UX no app

Para cada erro:

1. definir se exibe toast, inline error, tela bloqueante ou prompt de login.
2. definir se existe retry automatico, retry manual ou bloqueio.
3. definir mensagem curta e mensagem detalhada para suporte.

## 4.4) Matriz minima code -> UX action (obrigatoria)

1. `AUTH_TOKEN_EXPIRED` -> renovar sessao; se falhar, forcar login.
2. `AUTH_FORBIDDEN` -> tela de acesso negado + contato suporte.
3. `CLIENTS_CONFLICT` -> erro inline com retry manual.
4. `APPOINTMENTS_CONFLICT` -> highlight de horario e sugestao de ajuste.
5. `FINANCE_PROVIDER_TIMEOUT` -> toast de indisponibilidade + retry.
6. `INTEGRATIONS_RATE_LIMIT` -> backoff + mensagem orientando tentativa futura.
7. `INFRA_UNAVAILABLE` -> tela de erro bloqueante com retry global.

## 5) Padronizacao de loading UX v2

## 5.1) Tipos de estado padrao

1. `PageLoadingState`
2. `SectionLoadingState`
3. `InlineActionLoadingState`
4. `BlockingSubmitLoadingState`
5. `RefreshLoadingState`
6. `EmptyFirstLoadState`
7. `ErrorWithRetryState`

## 5.2) Matriz de conversao web -> app (loading)

1. `/(dashboard)` -> `PageLoadingState` no Home Operacional
2. `/(dashboard)/atendimento/[id]` -> `PageLoadingState` +
   `SectionLoadingState` de prontuario
3. `/(dashboard)/clientes` -> `PageLoadingState` + `RefreshLoadingState` da lista
4. `/(dashboard)/mensagens` -> `PageLoadingState` + `RefreshLoadingState` da timeline
5. `/(dashboard)/novo` -> `PageLoadingState` +
   `BlockingSubmitLoadingState` em criar agendamento
6. `/(public)/agendar/[slug]` -> `PageLoadingState` +
   `InlineActionLoadingState` no funil
7. `/pagamento` -> `PageLoadingState` + `BlockingSubmitLoadingState` no checkout
8. `/pagamento/[id]` -> `PageLoadingState` + `RefreshLoadingState` de status
9. `/voucher/[id]` -> `PageLoadingState`
10. `/comprovante/[id]` -> `PageLoadingState`
11. `/comprovante/pagamento/[paymentId]` -> `PageLoadingState` + `RefreshLoadingState`

Regra:

1. nenhum fluxo core pode ficar sem estado visual de carregamento explicito.

## 5.3) Matriz de estado por acao critica (obrigatoria)

Para cada acao abaixo, declarar:

1. `idle`
2. `loading`
3. `success`
4. `error retryable`
5. `error blocking`

- login, refresh e logout.
- criar/editar/excluir cliente.
- criar/editar/cancelar agendamento.
- salvar evolucao de atendimento/prontuario.
- iniciar pagamento, consultar status, emitir voucher/comprovante.

Regra:

1. nao existe acao critica sem transicoes de estado explicitas.

## 6) Trilha anti-duplicacao e anti-gambiarra

## 6.1) Gate por PR de migracao

Todo PR de modulo migrado deve responder:

1. que duplicacao foi eliminada.
2. que componente/utilitario foi centralizado.
3. que fallback antigo foi removido ou governado.
4. que erro/loading padrao foi aplicado.

## 6.2) Bloqueios de merge

Nao mergear quando:

1. novo componente base foi criado dentro de `features/*` sem justificativa arquitetural.
2. rota backend devolve erro sem `code` e `correlationId`.
3. tela core usa spinner improvisado ignorando estados canonicos.
4. existe `TODO/FIXME/HACK` sem dono e sem prazo.

## 7) Qualidade automatizada minima por fase

## 7.1) Android

1. `:app:assembleDebug`
2. `:app:lintDebug`
3. `:app:testDebugUnitTest`
4. `:app:detekt`
5. `:app:ktlintCheck`

## 7.2) Backend

1. `pnpm -C backend lint`
2. `pnpm -C backend check-types`
3. `pnpm -C backend test`
4. `pnpm -C backend build`

## 7.3) Infra

1. `terraform fmt -check`
2. `terraform validate`
3. `terraform plan`

## 8) Definition of Better-than-Web (DoB)

O novo repo so pode ser considerado superior ao web quando:

1. todos os fluxos da matriz 1:1 estiverem concluidos com paridade.
2. loading e erro estiverem padronizados em 100% dos fluxos core.
3. modulos migrados estiverem sem fallback tecnico sem governanca.
4. estrutura final reduzir duplicacao de componente e utilitario transversal.
5. runbooks e docs de execucao estiverem atualizados e coerentes com o runtime.

## 8.1) Evidencia obrigatoria de paridade por modulo

1. capturas web x app em estado de loading, sucesso, erro e vazio.
2. video curto do fluxo principal ponta a ponta.
3. checklist de paridade com veredito por item (`igual`, `melhor`, `diferente justificado`).
4. link para logs de backend com `correlationId` da execucao.

## 8.2) Gate de reuse-first por modulo

1. antes de criar novo componente/utilitario, verificar reaproveitamento em `core/*`.
2. se houver reaproveitamento possivel, estender o artefato existente.
3. novo artefato so com justificativa de escopo no PR.

## 9) Itens adicionais de excelencia (obrigatorios ate o fim do programa)

1. Acessibilidade:
   - contraste e legibilidade validos em telas core.
   - navegacao por foco e ordem de leitura consistente.
2. Performance:
   - medir baseline de cold start, troca de tela e listas criticas.
   - definir meta por fase e comparar evolucao em relatorio.
3. Observabilidade:
   - erros e eventos com `tenantId`, `userId` e `correlationId`.
   - dashboard operacional com alarmes de app, API e banco.
4. Seguranca:
   - credencial local sempre em storage seguro.
   - revisao de permissoes Android por release.
5. Rollout:
   - feature flags e kill switch por tenant para modulos de risco.
   - runbook de rollback testado antes de abrir trilha publica.

## 10) Template obrigatorio de pacote de trabalho por arquivo

Para cada arquivo critico migrado, registrar:

```md
origem_web:
  - apps/web/...
destino_app:
  - app/src/main/java/com/erpagendamentos/app/...
destino_backend:
  - backend/src/...
contratos:
  - request/response
  - erros (code, userMessage, correlationId)
estados_ux:
  - loading
  - success
  - error
  - empty
teste_minimo:
  - unit
  - integration ou ui
paridade:
  - igual | melhor
status_matriz_1_1:
  - nao iniciado
  - em mapeamento
  - em implementacao
  - em validacao
  - concluido com paridade
  - concluido com melhoria
evidencias:
  - captura/video
  - log com correlationId
```

Regra:

1. nao fechar modulo com arquivo critico sem template preenchido.

## 11) Scorecard quantitativo por modulo

Metrica minima por modulo:

1. paridade funcional: `>= 95%`.
2. paridade visual: `>= 90%`.
3. reutilizacao de `core/*`: `>= 85%`.
4. cobertura de erros v2 mapeados: `100%`.
5. cobertura de loading mapeado: `100%`.

Regra:

1. score abaixo do limite bloqueia aceite final do modulo.

## 12) Matriz de permissao por acao critica

Toda acao critica precisa declarar:

1. papel autorizado (`owner`, `admin`, `staff`, `viewer`).
2. resposta sem permissao (`code`, `userMessage`).
3. estado visual no app (toast, bloqueio, tela de acesso negado).
4. trilha de auditoria (quem tentou, quando, tenant, correlationId).

Acoes obrigatorias:

1. editar/excluir cliente.
2. editar/cancelar agendamento.
3. alterar status financeiro.
4. disparo manual de notificacao.
5. alteracao de configuracao de tenant.

## 13) Sequenciamento recomendado para reduzir retrabalho

Ordem recomendada de migracao:

1. contratos e estados (`erros`, `loading`, `navegacao`).
2. modulos internos (`clientes`, `agenda`, `atendimento`).
3. financeiro e integracoes (`pagamentos`, `mensagens`, `push`).
4. fluxos publicos (`agendar`, `pagamento`, `voucher`, `comprovante`).
5. hardening final (seguranca, performance, rollout, cutover).

Regra:

1. nao antecipar fluxo publico sem contrato interno consolidado.

## 14) Detalhe tecnico: Spotify na reescrita

Contrato minimo:

1. backend controla OAuth e tokens do Spotify.
2. app nunca armazena segredo de integracao.
3. comandos de player usam endpoint backend autenticado.
4. estado do player retorna com contrato estavel para UI.
5. erros mapeados no catalogo v2 (`INTEGRATIONS_SPOTIFY_*`).

Checklist de aceite:

1. conectar conta Spotify.
2. consultar estado do player.
3. executar `play`, `pause`, `next`, `previous`.
4. tratar token expirado sem travar a tela.
5. tratar indisponibilidade da API com UX de retry.

## 15) Detalhe tecnico: Importar contatos (Clientes)

Contrato funcional:

1. ler contatos do dispositivo com permissao sob demanda.
2. transformar para payload canonico de cliente/contato.
3. aplicar deduplicacao por telefone normalizado.
4. importar em lote com resultado parcial controlado.

Permissoes Android:

1. declarar `READ_CONTACTS` no manifesto.
2. solicitar permissao somente ao clicar em `Importar contatos`.
3. se negada, manter fluxo manual de cadastro funcionando.
4. se negada permanentemente, orientar abrir configuracoes do app.

Checklist de aceite:

1. permissao concedida e importacao funcionando.
2. permissao negada e fluxo manual preservado.
3. contatos invalidos nao derrubam o lote.
4. feedback final mostra sucesso, falhas e duplicados.

## 16) Momento de pedir permissoes no app

Regra de UX:

1. permissao sensivel nao deve ser pedida no boot.
2. pedir permissao apenas quando o usuario aciona a funcao correspondente.

Aplicacao inicial:

1. contatos: pedir quando clicar em `Importar contatos`.
2. notificacoes (push): pedir no fluxo de ativacao de push.
3. outras permissoes entram no mesmo padrao de \"just-in-time permission\".
