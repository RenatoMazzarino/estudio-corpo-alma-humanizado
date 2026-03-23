# Plano de Reescrita do Repo para Android Nativo

Status: ativo (baseline auditado em 2026-03-23)
Data base: 2026-03-23
Escopo: reescrever o produto web atual para Android nativo
Backend alvo: AWS + Aurora PostgreSQL
Perfil: producao enterprise (sem MVP)

## 0) Resumo executivo

Este plano foi reestruturado para remover partes remendadas e ficar
100% orientado a execucao.

O que esta fechado:

1. repo mobile/backend ja existe em:
   - `C:\Users\renat\Projetos_Dev\estudio-platform`
2. repo web segue como baseline funcional em:
   - `C:\Users\renat\Projetos_Dev\estudio-corpo-alma-humanizado`
3. stack alvo sem troca futura de base:
   - app: Kotlin + Jetpack Compose
   - backend: Fastify + TypeScript em ECS
   - banco: Aurora PostgreSQL
4. white-label e obrigatorio desde a primeira entrega funcional.
5. criterio final e paridade de resultado de negocio com o web atual.

## 0.1) Delta de baseline confirmado em 2026-03-23

Auditoria integral realizada no repo web para reduzir risco de drift na
reescrita mobile/backend.

Inventario validado:

1. rotas dashboard (`apps/web/app/(dashboard)`): 13 paginas (`page.tsx`).
2. rotas publicas (`apps/web/app/(public)`): 4 paginas (`page.tsx`).
3. endpoints internos/webhooks (`apps/web/app/api/**/route.ts`): 22.
4. loading pages oficiais (`apps/web/app/**/loading.tsx`): 11.
5. modulos de dominio ativos (`apps/web/src/modules`): 14.

Modulo com maior maturidade de reescrita visual/estrutural:

1. agenda
2. novo agendamento
3. atendimento

Modulo ainda com concentracao de legado visual/estrutural:

1. clientes
2. catalogo
3. configuracoes

## 0.2) Matriz de prioridade real para a fase de migracao

Classificacao atual (fonte: codigo em `main` na data de auditoria):

1. `agenda`: alto nivel de V2 no web, pronto para virar baseline de paridade.
2. `novo`: alto nivel de V2 no web, com fluxo financeiro/cobranca consolidado.
3. `atendimento`: V2 parcial-alta, exige fechamento do checkout unificado e
   hardening final.
4. `clientes`: fluxo funcional, padrao visual/estrutura ainda heterogeneos.
5. `catalogo`: fluxo funcional, ainda com pontos de UX legada e confirmacoes
   inline.
6. `configuracoes`: funcional, mas com tela extensa e acoplamento alto.

## 0.3) Escopo restante obrigatorio para reescrita sem regressao

A partir desta auditoria, a trilha de migracao fica granular em 5 frentes:

1. fechar `atendimento` V2 no web como baseline definitivo (checkout, evolucao,
   agenda da cliente e modais auxiliares) e congelar contrato.
2. reescrever `clientes` no web V2 para eliminar legado visual/composicional e
   travar contrato funcional para mobile.
3. reescrever `catalogo` no web V2 e remover variacoes locais fora do contrato.
4. refatorar `configuracoes` em modulos menores antes da migracao 1:1 para
   Android.
5. atualizar docs canonicos de UI + governanca a cada bloco concluido para
   evitar divergencia entre codigo e plano.

## 0.4) Regra de congelamento de baseline por fase

Para cada frente acima:

1. so migrar para Android/backend apos validacao de paridade no web V2.
2. cada fase fecha com checklist de aceite (funcional, visual, contratos,
   loading, erros).
3. proibido iniciar migracao de modulo com contrato visual/fluxo ainda em
   mudanca semanal.

## 1) O que foi corrigido nesta versao do plano

Problemas do plano anterior:

1. mistura de historico de execucao com plano de entrega.
2. pouca rastreabilidade de conversao por arquivo.
3. gates de fase sem contrato operacional unico.

Melhorias desta versao:

1. separacao clara entre:
   - baseline atual
   - contrato de conversao de arquivos
   - fases de entrega
   - criterios de aceite
2. matriz deterministica de conversao:
   - `origem web -> destino mobile/backend`
3. backlog faseado com teste obrigatorio por modulo.
4. regra de "nenhum arquivo sem destino".

## 2) Baseline real de origem e destino

### 2.1 Web de origem (fonte canonica)

1. rotas e telas:
   - `apps/web/app` (`~235` arquivos)
2. dominios de negocio:
   - `apps/web/src/modules` (`~129` arquivos)
3. camada compartilhada:
   - `apps/web/src/shared`
4. componentes e shell visual:
   - `apps/web/components`
5. APIs internas e webhooks:
   - `apps/web/app/api`
6. schema e automacoes:
   - `supabase/migrations`
   - `supabase/functions`

### 2.2 Destino da reescrita

1. app Android:
   - `app/src/main/java/com/erpagendamentos/app`
2. backend AWS:
   - `backend/src`
3. infraestrutura e dados:
   - `infra/terraform`

## 3) Contrato de conversao por familia de arquivos

Regra central:

1. toda origem web deve cair em destino mobile, backend ou ambos.

### 3.1 Paginas de dashboard

Origem:

1. `apps/web/app/(dashboard)/**/page.tsx`

Destino:

1. app:
   - `app/.../features/<modulo>/presentation/<Screen>.kt`
2. backend (quando houver dados):
   - `backend/src/routes/<modulo>.ts`

Regra:

1. UI vira Compose.
2. leitura/escrita sai de Server Actions para API HTTP.

### 3.2 Loading states do dashboard

Origem:

1. `apps/web/app/(dashboard)/**/loading.tsx`

Destino:

1. `app/.../core/designsystem/states/*`

Regra:

1. loading vira estado padrao reutilizavel.
2. proibido spinner ad-hoc por tela.

### 3.3 Paginas publicas

Origem:

1. `apps/web/app/(public)/**/page.tsx`
2. `/pagamento`, `/voucher`, `/comprovante`

Destino:

1. app:
   - `app/.../features/public/*`
2. backend:
   - `backend/src/routes/public-*.ts`

Regra:

1. fluxos obrigatorios: `agendar`, `pagamento`, `voucher`, `comprovante`.

### 3.4 Endpoints Next (`route.ts`)

Origem:

1. `apps/web/app/api/**/route.ts`

Destino:

1. `backend/src/routes/*`
2. `backend/src/services/*`

Regra:

1. endpoint interno Next deixa de ser runtime final.

### 3.5 Dominios de negocio

Origem:

1. `apps/web/src/modules/<dominio>/**`

Destino:

1. app:
   - `app/.../features/<dominio>/{domain,data,presentation}`
2. backend:
   - `backend/src/routes/<dominio>.ts`
   - `backend/src/services/<dominio>/*`

Regra:

1. regra de negocio deve ser mantida, sem simplificacao funcional.

### 3.6 Shared e design system

Origem:

1. `apps/web/src/shared/**`
2. `apps/web/components/ui/**`
3. `apps/web/components/app-shell.tsx`
4. `apps/web/components/ui/bottom-nav.tsx`

Destino:

1. `app/.../core/*`
2. `app/.../core/designsystem/components/*`
3. `app/.../core/navigation/*`

Regra:

1. contrato comum e sem duplicacao por feature.

### 3.7 Banco, funcoes e testes

Origem:

1. `supabase/migrations/*.sql`
2. `supabase/functions/**`
3. `apps/web/tests/**`

Destino:

1. `backend/src/db/migrations/*.sql`
2. `backend/src/webhooks/*`
3. `backend/src/jobs/*`
4. `app/src/test/**`
5. `app/src/androidTest/**`
6. `backend/tests/**`

Regra:

1. migracoes no Aurora sem dual-write permanente.
2. edge functions viram servicos AWS com idempotencia.
3. testes de paridade por fluxo critico sao obrigatorios.

### 3.8 Navegacao, deeplink e comportamento de back (obrigatorio)

Origem:

1. navegacao App Router em `apps/web/app/**`
2. links publicos com parametros:
   - `/agendar/[slug]`
   - `/pagamento/[id]`
   - `/voucher/[id]`
   - `/comprovante/*`

Destino:

1. `app/.../core/navigation/*`
2. contratos de deeplink por feature em `app/.../features/*/navigation/*`

Regra:

1. toda rota da matriz 1:1 deve ter rota mobile correspondente e deeplink definido.
2. o comportamento de voltar (back stack) deve ser explicito por fluxo.
3. proibido depender de navegacao implicita sem contrato documentado.

### 3.9 Contrato de identificadores canonicos (anti-retrabalho)

1. `applicationId` canonico do app: `com.erpagendamentos.app`.
2. qualquer mudanca de `applicationId`, package raiz ou assinatura
   so com decisao formal registrada.
3. nome de repositorio nao substitui `applicationId`.
4. naming de recursos (AWS, bundle, flavor) deve herdar prefixo
   controlado por ambiente e tenant.

## 4) Matriz de paridade por modulo

### 4.1 Dashboard interno

Baseline confirmado no web (`13` paginas reais em `main`):

1. `/(dashboard)` -> app `features/operations`; backend `routes/dashboard.ts`;
   status `em mapeamento`.
1. `/(dashboard)/novo` -> app `features/appointments`; backend
   `routes/appointments.ts`; status `em validacao` (V2 web alta maturidade).
1. `/(dashboard)/atendimento/[id]` -> app `features/attendance`; backend
   `routes/attendance.ts`; status `em implementacao` (V2 web parcial-alta).
1. `/(dashboard)/clientes` -> app `features/clients`; backend
   `routes/clients.ts`; status `em implementacao`.
1. `/(dashboard)/clientes/novo` -> app `features/clients`; backend
   `routes/clients.ts`; status `em implementacao`.
1. `/(dashboard)/clientes/[id]` -> app `features/clients`; backend
   `routes/clients.ts`; status `em implementacao`.
1. `/(dashboard)/clientes/[id]/editar` -> app `features/clients`; backend
   `routes/clients.ts`; status `em implementacao`.
1. `/(dashboard)/clientes/[id]/prontuario` -> app `features/clients`; backend
   `routes/clients.ts`; status `em implementacao`.
1. `/(dashboard)/catalogo` -> app `features/services`; backend
   `routes/services.ts`; status `em implementacao`.
1. `/(dashboard)/configuracoes` -> app `features/settings`; backend
   `routes/settings.ts`; status `em implementacao`.
1. `/(dashboard)/mensagens` -> app `features/messages`; backend
   `routes/messages.ts`; status `em mapeamento`.
1. `/(dashboard)/caixa` -> app `features/finance`; backend
   `routes/finance.ts`; status `em mapeamento`.
1. `/(dashboard)/menu` -> app `features/menu`; backend `routes/menu.ts`;
   status `em mapeamento`.

Rotas removidas da matriz por nao existirem no baseline atual:

1. `/(dashboard)/bloqueios`
2. `/(dashboard)/admin`

### 4.2 Fluxos publicos obrigatorios

1. `/(public)/agendar/[slug]` -> app `features/public_booking`; backend
   `routes/appointments.ts`; status `em mapeamento`.
1. `/pagamento` e `/pagamento/[id]` -> app `features/payments`; backend
   `routes/payments.ts` (criar); status `em mapeamento`.
1. `/voucher/[id]` -> app `features/voucher`; backend `routes/payments.ts` e
   `routes/public-artifacts.ts` (criar); status `em mapeamento`.
1. `/comprovante/[id]` e `/comprovante/pagamento/[paymentId]` -> app
   `features/receipt`; backend `routes/payments.ts` e
   `routes/public-artifacts.ts` (criar); status `em mapeamento`.
1. paginas legais -> app `features/legal`; backend opcional estatico; status
   `em mapeamento`.

### 4.3 Integracoes obrigatorias

1. WhatsApp Meta -> origem `app/api/whatsapp/meta/webhook/route.ts`;
   backend alvo `routes/webhooks-whatsapp.ts` e
   `jobs/whatsapp-automation.ts`; criterio: automacao, status e retry
   equivalentes.
1. Mercado Pago -> origem `app/api/mercadopago/webhook/route.ts`; backend alvo
   `routes/webhooks-mercadopago.ts` e `services/payments/*`; criterio:
   idempotencia e conciliacao equivalentes.
1. Push -> origem `app/api/push/*`; backend alvo `routes/push.ts` e
   `services/push/*`; criterio: inscricao e entrega equivalentes.
1. Google Maps -> origem `app/api/address-*`, `app/api/cep`,
   `app/api/displacement-fee`; backend alvo `routes/address.ts` e
   `services/maps/*`; criterio: endereco e deslocamento equivalentes.
1. Spotify -> origem `app/api/integrations/spotify/*`; backend alvo
   `routes/spotify.ts` e `services/spotify/*`; criterio: login e controle
   equivalentes.

### 4.4 Dicionario de status da matriz 1:1 (obrigatorio)

1. `nao iniciado`: sem contrato fechado de rota + dados + UX.
2. `em mapeamento`: origem web e destino mobile/backend catalogados.
3. `em implementacao`: codigo em progresso com contrato parcial.
4. `em validacao`: testes e evidencias de paridade em execucao.
5. `concluido com paridade`: aceite funcional + visual + tecnico aprovado.
6. `concluido com melhoria`: paridade aprovada e melhoria estrutural comprovada.

Regra:

1. nao usar status ambiguo como `iniciado` sem detalhar estado real.

### 4.5 Criterio de aceite por rota/modulo da matriz

Uma linha da matriz so pode mudar para `concluido com paridade` quando:

1. fluxo principal da rota passa no app Android sem fallback no web.
2. contratos HTTP do backend estao versionados e validados.
3. estados de loading/erro/vazio/sucesso estao aplicados no padrao canonico.
4. navegacao e retorno (back) estao consistentes com o fluxo esperado.
5. evidencias de paridade visual foram anexadas (capturas e checklist).
6. qualidade automatizada minima da fase ficou verde.

### 4.6 Evidencias obrigatorias por linha da matriz

1. video curto ou capturas do web e do app lado a lado.
2. checklist de paridade preenchido para a rota.
3. payload de request/response de pelo menos um caso feliz e um caso de erro.
4. log com `correlationId` de uma execucao real no backend.

## 5) Conversao por padrao de arquivo

### 5.1 Rotas de pagina (`page.tsx`)

1. identificar rota em `apps/web/app/**/page.tsx`.
2. criar `FeatureScreen` em Compose no modulo correspondente.
3. separar estado, caso de uso e chamada HTTP.
4. mover acao de servidor para endpoint backend versionado.
5. adicionar teste unitario do caso de uso e teste de UI da tela critica.

### 5.2 Endpoints (`route.ts`)

1. catalogar endpoint atual e payload.
2. mover logica para `backend/src/services/<dominio>`.
3. criar rota em `backend/src/routes/<dominio>.ts`.
4. padronizar auth, tenant, erro e correlation_id.
5. adicionar teste de contrato HTTP.

### 5.3 Regras em `src/modules/*`

1. extrair regra para caso de uso no app em `feature/<dominio>/domain`.
2. garantir regra de persistencia no backend.
3. remover dependencia de runtime Next client-side.
4. manter validacoes e erros equivalentes ao web.

### 5.4 Shared/UI

1. mapear `src/shared/*` para `app/core/*`.
2. mapear `components/ui/*` para `app/core/designsystem/*`.
3. bloquear duplicacao por checklist de PR.

## 6) Fases de execucao ponta a ponta

Regra operacional:

1. ao concluir um gate, seguir automaticamente para a fase seguinte.

### Fase 0 - Inventario tecnico fechado

Objetivo:

1. congelar mapa completo de origem web e destino mobile/backend.

Entregaveis:

1. matriz atualizada de rotas, modulos e integracoes.
2. backlog tecnico priorizado por risco.

Gate de saida:

1. 100% dos fluxos core com dono e destino.

### Fase 1 - Fundacao Android + backend

Objetivo:

1. manter build/release Android e backend com base estavel.

Entregaveis:

1. CI Android verde.
2. backend Fastify com health e auth baseline.

Gate de saida:

1. `assembleDebug`, `lintDebug`, testes unitarios e health `200`.

### Fase 1.5 - AWS + Aurora

Objetivo:

1. tornar AWS/Aurora ambiente canonico da reescrita.

Entregaveis:

1. infra Terraform em `dev` aplicada.
2. schema inicial no Aurora.
3. API conectada ao Aurora.

Gate de saida:

1. migrations aplicadas e leitura/escrita validada no banco.

### Fase 2 - Core platform

Objetivo:

1. fechar auth, sessao, cliente HTTP e observabilidade.

Entregaveis:

1. `BackendApiClient`.
2. `SessionRepository`.
3. `SecureSessionStore`.
4. logs com tenant e correlation_id.

Gate de saida:

1. login, refresh e logout sem quebra.

### Fase 3 - Contratos mobile-first

Objetivo:

1. fechar API de referencia para os modulos.

Entregavel:

1. contratos HTTP versionados com testes.
2. contrato de navegacao/deeplink/back por rota da matriz 1:1.
3. dicionario de acoes por modulo (create/update/delete/confirm/cancel/etc).

Gate de saida:

1. clientes, agenda, atendimento e pagamentos com contrato fechado.
2. cada rota core com comportamento de back definido e validado.
3. contratos de erro (`code`, `userMessage`, `correlationId`) aplicados.

### Fase 4 - Shell e design system

Objetivo:

1. padronizar UI nativa mantendo identidade do estudio.

Entregavel:

1. shell, navegacao e estados padronizados.
2. contrato de tokens visuais (cor, tipografia, espacamento, raio, elevacao).
3. API canonica de componentes base e variantes (Button/Input/Card/Sheet/Toast/Dialog).
4. biblioteca de estados canonicos (loading/empty/error/success) reutilizavel.

Gate de saida:

1. nenhuma tela core com componente duplicado fora do design system.
2. nenhuma tela core sem estado visual padronizado.
3. checklist de paridade visual aprovado para os modulos migrados.

### Fase 5 - Clientes

Objetivo:

1. fechar lista, perfil, criacao, edicao e prontuario basico.

Gate de saida:

1. operacao real de cliente sem fallback no web.

### Fase 6 - Agenda

Objetivo:

1. criar/editar/cancelar agendamento com validacao de conflito.

Gate de saida:

1. regra de conflito e buffer igual ao web.

### Fase 7 - Atendimento e prontuario

Objetivo:

1. atendimento completo com evolucao e historico.

Gate de saida:

1. trilha de auditoria ativa para alteracoes clinicas.

### Fase 8 - Pagamentos, voucher e comprovante

Objetivo:

1. fluxo financeiro completo com reconciliacao.

Gate de saida:

1. status financeiro sem divergencia com backend.

### Fase 9 - Mensagens, WhatsApp e push

Objetivo:

1. comunicacao operacional completa no app.

Gate de saida:

1. push em dispositivo real e automacao WhatsApp observavel.

### Fase 10 - Offline e sync

Objetivo:

1. resiliencia em rede instavel.

Gate de saida:

1. fila local com reconciliacao sem perda de dado.

### Fase 11 - Seguranca e hardening

Objetivo:

1. reforcar seguranca de runtime e dados.

Gate de saida:

1. checklist de seguranca aprovado.

### Fase 12 - QA final e rollout

Objetivo:

1. liberar app com risco controlado.

Gate de saida:

1. beta interno sem P0/P1 abertos.
2. matriz 1:1 sem linhas em status ambiguo.
3. evidencias de paridade visual e funcional anexadas por modulo.

### Fase 13 - Cutover AWS/Aurora

Objetivo:

1. backend AWS e Aurora como runtime definitivo.

Gate de saida:

1. tenant principal e tenant secundario operando sem dependencia do web.

## 7) Criterio de pronto por item convertido

Um item so e considerado pronto quando:

1. origem web esta mapeada para destino mobile/backend.
2. regra de negocio equivalente foi implementada.
3. validacao automatizada minima existe.
4. observabilidade minima existe (erro e log).
5. doc operacional foi atualizada quando houve impacto runtime.
6. comportamento de navegacao/back/deeplink foi validado para o fluxo.
7. estado de loading, vazio, erro e sucesso foi padronizado.
8. nao existe duplicacao estrutural relevante naquele recorte.

## 8) Controle de risco e rollback

1. rollback de release Android por trilha da Play Store.
2. rollback de backend por deploy anterior no ECS.
3. rollback de dados por snapshot e restore ensaiado do Aurora.
4. fase seguinte bloqueada quando gate atual falhar.

## 9) Estado atual de execucao

Ja iniciado:

1. fundacao Android.
2. parte do backend (rotas base e auth).
3. infra AWS em andamento no repo `estudio-platform`.
4. modulo clientes iniciado no app.

Nao concluido:

1. paridade completa dos modulos operacionais.
2. fluxos publicos finais no app.
3. migracao e cutover final de dados para Aurora.

## 10) Proximo passo imediato de execucao

1. consolidar status real da matriz 1:1 com dicionario de status fechado.
2. fechar modulos:
   - `agenda`
   - `atendimento`
   - `mensagens`
   - `financeiro`
   - `servicos`
   - `settings`
   - `bloqueios`
   - `admin`
   - `menu`
3. fechar fluxos publicos `agendar`, `pagamento`, `voucher` e
   `comprovante` com paridade completa.
4. executar trilha paralela 12.x em cada modulo
   (tokens, componentes, erros, loading, navegacao, reuse-first).
5. so avancar para cutover final apos evidencias completas por modulo.

## 11) Decisoes fechadas e sem pendencia para inicio

1. banco alvo: Aurora PostgreSQL.
2. nuvem alvo: AWS.
3. regiao primaria: `sa-east-1`.
4. autenticacao alvo: Cognito.
5. white-label obrigatorio desde o inicio.
6. visual do estudio deve permanecer consistente para a Jana.
7. `applicationId` canonico Android: `com.erpagendamentos.app`.
8. package raiz mobile deve permanecer alinhado ao `applicationId`.
9. naming de ambiente deve seguir `dev`, `preview`, `prod` em app, backend e infra.

Com isso, o plano esta executavel sem nova decisao tecnica de base.

## 12) Trilha paralela obrigatoria: paridade + melhoria estrutural

Objetivo:

1. concluir a reescrita com paridade funcional 1:1 com o web.
2. sair com arquitetura melhor que a origem, sem reproduzir divida tecnica.

Regra inegociavel:

1. modulo migrado so fecha quando bater paridade e tambem melhorar higiene.
2. nao e permitido "copiar problema antigo" para o repo novo.

## 12.1) Escopo de melhoria obrigatoria por modulo migrado

Para cada modulo (clientes, agenda, atendimento, mensagens, financeiro, etc.):

1. mapear regra funcional atual no web.
2. mapear pontos de duplicacao e acoplamento escondido no web.
3. implementar no novo repo com:
   - separacao de camadas
   - reutilizacao real de componente/utilitario
   - contrato de erro padronizado
   - loading padronizado
4. remover legado sem dono
   (fallback improvisado, codigo morto, rota antiga sem uso).

Gate extra de saida:

1. se o modulo estiver funcional, mas com duplicacao estrutural
   relevante, fase nao fecha.

## 12.2) Estrutura alvo de reutilizacao (app + backend)

### App Android

1. `core/designsystem/components`: componentes base
   (botao, input, card, chip, sheet, toast, dialog).
2. `core/designsystem/states`: loading, empty, error, skeleton e retry.
3. `core/errors`: parser de erro HTTP, mapeador de codigo para
   mensagem e acao de UX.
4. `core/network`: cliente HTTP unico, interceptors, correlation id.
5. `core/session`: token, refresh, logout forcado e estado autenticado.
6. `features/<modulo>`: apenas composicao do modulo, sem utilitario global duplicado.

### Backend AWS

1. `routes/*`: apenas entrada/saida HTTP e validacao de request.
2. `services/*`: regra de negocio por dominio.
3. `db/*`: repositorios e acesso a dados.
4. `integrations/*`: adapters de provider (WhatsApp, MP, Maps, Spotify, Push).
5. `errors/*`: catalogo unico de erros, envelope e mapeamento para status HTTP.

Regra:

1. tela nao chama banco diretamente.
2. route nao concentra regra de negocio.
3. fallback tecnico so e aceito com telemetria e plano de remocao.

## 12.3) Catalogo de erros v2 (obrigatorio)

Padrao minimo do backend:

1. todo erro retornado deve conter:
   - `code`
   - `message`
   - `userMessage`
   - `correlationId`
   - `retryable`
2. formatar `code` em namespace por dominio:
   - `AUTH_*`
   - `CLIENTS_*`
   - `APPOINTMENTS_*`
   - `ATTENDANCE_*`
   - `FINANCE_*`
   - `INTEGRATIONS_*`
   - `INFRA_*`
3. cada `code` deve mapear acao de UX no app:
   - exibir toast
   - exibir tela de erro
   - solicitar reautenticacao
   - sugerir retry

Padrao minimo do app:

1. erro de rede, auth, validacao, conflito, integracao e
   indisponibilidade devem ter experiencia distinta.
2. mensagens tecnicas nao podem vazar para usuario final.

## 12.4) Padronizacao de loading v2 (obrigatoria)

Tipos canonicos de loading:

1. loading de bootstrap de tela.
2. loading de secao.
3. loading inline de acao.
4. loading bloqueante de submit.
5. loading de refresh/lista.
6. estado vazio de primeira carga.

Regra de implementacao:

1. todo ponto de carregamento mapeado no web deve existir no app com estado equivalente.
2. proibido spinner local improvisado quando existir estado canonico.

Inventario minimo de origem (web) para conversao:

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

## 12.5) Trilha anti-gambiarra e limpeza de legado

Objetivo:

1. usar a reescrita para resolver emenda antiga e nao carregar
   passivo para o novo repo.

Checklist por modulo:

1. auditar uso de `legacy*`, `fallback*`, caminhos temporarios e codigo morto.
2. decidir por item:
   - manter com contrato explicito
   - substituir por versao nova
   - remover
3. registrar no PR:
   - o que foi removido
   - o que ficou e por que
   - prazo de remocao do que ainda for temporario

No-go:

1. modulo nao fecha com `TODO/FIXME/HACK` sem dono e sem prazo.

## 12.6) Qualidade automatizada minima (novo repo)

App Android:

1. `:app:assembleDebug`
2. `:app:lintDebug`
3. `:app:testDebugUnitTest`
4. `:app:detekt` (obrigatorio ate Fase 4)
5. `:app:ktlintCheck` (obrigatorio ate Fase 4)

Backend:

1. `pnpm -C backend lint`
2. `pnpm -C backend check-types`
3. `pnpm -C backend test`
4. `pnpm -C backend build`

Infra:

1. `terraform fmt -check`
2. `terraform validate`
3. `terraform plan` por ambiente alvo

## 12.7) Definition of Better-than-Web (DoB)

O programa so fecha quando:

1. toda matriz 1:1 estiver em `Concluido com paridade`.
2. nenhum fluxo core depender de workaround sem governanca.
3. catalogo de erros v2 estiver aplicado nos modulos core.
4. loading canonico estiver aplicado em 100% dos pontos mapeados.
5. duplicacao estrutural relevante estiver tratada no app e backend novos.
6. docs de execucao, runbook e paridade estiverem sincronizados.

## 12.8) Contrato de tokens visuais (obrigatorio)

Objetivo:

1. impedir deriva visual entre telas e modulos durante a migracao.

Contrato minimo:

1. tokens de cor por semantica: `primary`, `secondary`, `surface`,
   `background`, `success`, `warning`, `error`, `info`.
2. tokens de tipografia: `display`, `title`, `body`, `label`, `caption`.
3. tokens de espacamento: escala unica (`xs/sm/md/lg/xl`).
4. tokens de raio e elevacao: escala unica para cards, sheets e dialogs.
5. tokens de estado interativo: `enabled`, `pressed`, `disabled`, `loading`.

Regra:

1. proibido hardcode de cor, fonte e espacamento em tela de feature
   sem passar pelo tema/token.

## 12.9) API canonica de componentes base

Objetivo:

1. evitar que cada feature invente API propria para componentes iguais.

Componentes base obrigatorios:

1. `AppButton`: variantes `primary`, `secondary`, `ghost`, `danger`, `loading`.
2. `AppInput`: estados `default`, `focused`, `error`, `disabled`, helper e hint.
3. `AppCard`: variantes `default`, `outlined`, `elevated`, `interactive`.
4. `AppSheet`: `modal` e `bottom`.
5. `AppToast`: `success`, `warning`, `error`, `info`.
6. `AppDialog`: confirmacao, alerta e acao destrutiva.

Regra:

1. nova tela so pode usar componentes fora desse contrato com
   justificativa arquitetural registrada.

## 12.10) Matriz de estados por acao (obrigatoria)

Toda acao critica deve declarar explicitamente:

1. estado inicial (idle).
2. estado de carregamento (loading).
3. estado de sucesso (success).
4. estado de erro recuperavel (error retryable).
5. estado de erro bloqueante (error blocking).

Acoes minimas que precisam da matriz:

1. login/refresh/logout.
2. create/update/delete de cliente.
3. create/update/cancel de agendamento.
4. salvar evolucao de atendimento/prontuario.
5. criar pagamento/confirmar status/emitir voucher e comprovante.

Regra:

1. toda acao sem matriz de estado e bloqueio de merge.

## 12.11) Navegacao e deep links: checklist de aceite

Para cada fluxo migrado:

1. entrada direta por deep link abre tela correta.
2. retorno pelo botao back segue caminho esperado.
3. retorno apos acao concluida nao volta para tela invalida.
4. abertura por notificacao/whatsapp/push resolve para destino unico.
5. parametros obrigatorios de rota sao validados.

## 12.12) Evidencia de paridade visual e funcional

Artefatos obrigatorios por modulo:

1. captura do web e do app no mesmo estado (loading, sucesso, erro, vazio).
2. video curto do fluxo principal ponta a ponta.
3. checklist de comparacao com veredito por item:
   - `igual`
   - `melhor`
   - `diferente justificado`
4. log de execucao backend com `correlationId` para o fluxo gravado.

Regra:

1. sem evidencia anexada, modulo nao muda para `concluido com paridade`.

## 12.13) Reuse-first policy (obrigatoria)

Perguntas de gate antes de criar novo codigo:

1. ja existe componente equivalente no `core/designsystem`?
2. ja existe utilitario equivalente em `core/*`?
3. ja existe caso de uso/repo que pode ser estendido sem duplicar?
4. ja existe contrato HTTP reutilizavel com pequena evolucao?

Se qualquer resposta for `sim`:

1. reutilizar/estender primeiro.
2. criar novo somente com justificativa explicita no PR.

## 12.14) Pacote de trabalho por arquivo (obrigatorio)

Para cada arquivo web convertido, abrir um pacote de trabalho com:

1. arquivo de origem no web.
2. arquivo(s) destino no app Android.
3. arquivo(s) destino no backend.
4. contrato de entrada e saida.
5. lista de estados de UX (loading/sucesso/erro/vazio).
6. teste minimo exigido.

Formato obrigatorio do registro:

1. `origem`: caminho completo no web.
2. `destino_app`: caminho completo no Android.
3. `destino_backend`: caminho completo no backend.
4. `paridade`: `igual` ou `melhor`.
5. `evidencia`: link para captura/video/log.
6. `status`: valor do dicionario de status da matriz 1:1.

Regra:

1. modulo nao fecha com arquivo critico sem pacote preenchido.

## 12.15) Scorecard quantitativo de aceite (obrigatorio)

Cada modulo migrado deve fechar com score minimo:

1. paridade funcional: `>= 95%`.
2. paridade visual: `>= 90%`.
3. reutilizacao de componentes core: `>= 85%`.
4. cobertura de erros mapeados no catalogo v2: `100%`.
5. cobertura de pontos de loading mapeados: `100%`.

Regra:

1. score abaixo do minimo bloqueia status `concluido com paridade`.

## 12.16) Matriz de permissoes por acao (obrigatoria)

Toda acao critica deve declarar:

1. papeis autorizados (`owner`, `admin`, `staff`, `viewer`).
2. comportamento quando sem permissao.
3. codigo de erro retornado.
4. estado visual de bloqueio no app.

Acoes minimas com matriz obrigatoria:

1. editar/excluir cliente.
2. editar/cancelar agendamento.
3. alterar status financeiro.
4. disparar automacao sensivel (WhatsApp/push manual).
5. alterar configuracao de tenant.

## 12.17) Contrato de rastreabilidade de migracao

Cada PR da reescrita deve declarar no topo:

1. modulo alvo.
2. linhas da matriz 1:1 impactadas.
3. arquivos web substituidos.
4. arquivos Android criados/alterados.
5. arquivos backend criados/alterados.
6. evidencias anexadas.
7. scorecard do modulo apos o PR.

Regra:

1. PR sem rastreabilidade completa nao deve ser aprovado.

## 12.18) Integracoes com paridade real (hardening obrigatorio)

Objetivo:

1. garantir que integracoes do web continuem operando no mobile sem perda
   funcional.

Regra geral por integracao:

1. manter contrato funcional do web.
2. fechar teste de caso feliz, caso de erro e retentativa.
3. manter observabilidade com `correlationId`.
4. manter fallback governado com prazo e dono.

Spotify (obrigatorio):

1. autenticar com OAuth no backend (sem segredo no app).
2. armazenar e renovar token no backend.
3. manter comandos de player (`play`, `pause`, `next`, `previous`, volume).
4. validar comportamento em troca de rede e retomada de sessao.
5. mapear erros de provider no catalogo v2 (`INTEGRATIONS_SPOTIFY_*`).

## 12.19) Importacao de contatos no modulo Clientes (obrigatorio)

Escopo funcional:

1. importar contatos do dispositivo no app Android.
2. normalizar telefone, nome e email.
3. deduplicar por telefone normalizado.
4. criar cliente e contatos sem quebrar regras de validacao.

Escopo tecnico:

1. permissao Android `READ_CONTACTS` apenas sob demanda (nao no primeiro boot).
2. fluxo de UX para:
   - permissao concedida
   - permissao negada
   - permissao negada permanentemente
3. fallback manual: criar cliente sem importar contato.

Gate de aceite:

1. importar lote de contatos com sucesso.
2. rejeitar/ignorar contatos invalidos sem quebrar a operacao inteira.
3. exibir feedback claro de quantos contatos foram importados e quantos
   falharam.
4. logs com `correlationId` no backend para auditoria.

## 13) Arquivos afins obrigatorios desta empreitada

Este plano deve caminhar junto com:

1. `docs/plans/ANEXO_PADRONIZACAO_HIGIENE_ERROS_LOADING_REESCRITA_2026-03-20.md`
2. `docs/runbooks/WORKSPACE_MULTI_REPO_ANDROID_AWS_DB_2026-03-20.md`
3. `docs/plans/PLANO_ENTERPRISE_REALTIME_EDGE_PUSH_LOADING_2026-03-10.md`
4. `C:\Users\renat\Projetos_Dev\estudio-platform\docs\CLIENTES_PARIDADE_WEB_MOBILE.md`
5. `C:\Users\renat\Projetos_Dev\estudio-platform\docs\EXECUCAO_FASE_1_5_E_2_2026-03-20.md`

Regra de manutencao:

1. qualquer evolucao de fase deve atualizar plano + anexo + docs de execucao.
2. se houver conflito entre plano e execucao, atualizar imediatamente
   o plano com decisao explicita.
