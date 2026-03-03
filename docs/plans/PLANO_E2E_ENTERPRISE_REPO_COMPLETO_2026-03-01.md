# Plano E2E Enterprise - Repo Completo

Status: concluido 100% (execucao E2E final fechada em 2026-03-02)  
Versao: 2026-03-01  
Escopo: repositorio completo (apps, modulos, docs e operacao)  
Base: consolidacao de backlog + auditoria + certificacao ja existentes

Atualizacao de auditoria aplicada neste arquivo: 2026-03-01

Fechamento de execucao aplicado: 2026-03-02

Nota de leitura:
1. Este arquivo mistura estado final e trilha histórica de execução.
2. Seções de "Registro de Execução" preservam contexto temporal e podem citar caminhos/flags já removidos no estado atual.
3. Para estado operacional vigente, priorize as seções de status executivo e snapshots atualizados deste próprio plano + relatórios de certificação/validação mais recentes.

## 0) Fechamento do Programa (2026-03-02)

1. Programa E2E encerrado com hardening ativo e modularizacao aplicada nos fluxos criticos.
2. Validacao tecnica final executada com sucesso:
   - `pnpm --filter web lint`
   - `pnpm --filter web lint:architecture`
   - `pnpm --filter web test:unit`
   - `pnpm --filter web test:smoke`
   - `pnpm --filter web check-types`
   - `pnpm --filter web build`
3. Estrutura final e status de certificacao consolidados em:
   - `docs/reports/CERTIFICACAO_FINAL_PROGRAMA_MODULARIZACAO_2026-03-02.md`
4. O repositorio segue com melhoria continua como rotina, mas sem pendencia bloqueante para operacao.
5. Fechamento final adicional aplicado no mesmo dia:
   - removidos fallbacks legados de tenant fixo (`DEFAULT_TENANT_ID`/`FIXED_TENANT_ID`) do codigo de runtime;
   - automacao WhatsApp movida para configuracao canônica por tenant no banco (templates/idioma/local e flag de habilitacao);
   - removido fallback cruzado de segredos na seguranca de lookup publico (captcha agora usa segredo dedicado);
   - migrations de realtime e configuracao canônica de WhatsApp aplicadas em local e remoto.

## 1) Objetivo em linguagem simples

Este plano existe para deixar o sistema:

1. Mais organizado por responsabilidade.
2. Mais facil de manter sem quebrar o que ja funciona.
3. Mais seguro em producao.
4. Mais previsivel para evoluir funcionalidades novas.

Em resumo: sair de "arquivos muito grandes e misturados" para "pecas menores, com dono claro e reutilizacao real".

## 2) Resultado final esperado

Ao final do programa:

1. Cada fluxo critico (agendamento, pagamento, WhatsApp, agenda) tera caminho unico de backend.
2. A interface continua com a mesma aparencia (sem redesign forçado durante refatoracao).
3. Mudancas pequenas vao tocar poucos arquivos, com menos risco de regressao.
4. Testes minimos automatizados vao cobrir o que mais impacta receita e operacao.
5. Documentacao operacional ficara sincronizada com o codigo.

## 3) Fotografia real do repo hoje (hotspots atuais)

Atualizado em 2026-03-03 apos consolidacao final dos recortes de modularizacao.

Maiores arquivos de codigo versionado no `apps/web`:

1. `apps/web/lib/supabase/types.ts` - 1785 linhas (gerado por tipagem do banco)
2. `apps/web/app/(dashboard)/novo/appointment-form.composition.tsx` - 990 linhas
3. `apps/web/app/(dashboard)/novo/hooks/use-appointment-confirmation-flow.ts` - 643 linhas
4. `apps/web/app/(public)/agendar/[slug]/hooks/use-public-booking-flow-controller-deps.ts` - 529 linhas
5. `apps/web/app/(dashboard)/atendimento/[id]/components/use-attendance-payment-modal-controller.ts` - 515 linhas
6. `apps/web/app/(public)/agendar/[slug]/hooks/use-public-booking-identity.ts` - 512 linhas
7. `apps/web/app/(dashboard)/novo/components/appointment-confirmation-sheet.tsx` - 510 linhas
8. `apps/web/app/(dashboard)/atendimento/[id]/attendance-page.tsx` - 496 linhas
9. `apps/web/components/agenda/appointment-details-active-view.tsx` - 466 linhas
10. `apps/web/app/(public)/agendar/[slug]/public-actions/clients.ts` - 464 linhas

Observacao importante:
1. `apps/web/lib/supabase/types.ts` continua fora do alvo de modularizacao manual por ser arquivo gerado.
2. Os hotspots acima estao abaixo do patamar inicial do programa e seguem sem bloqueio tecnico de operacao.

## 3.1) Achados de convergencia confirmados (auditoria adicional)

1. Webhook Mercado Pago foi desacoplado em modulos dedicados:
   - `apps/web/app/api/mercadopago/webhook/route.ts`
   - `apps/web/app/api/mercadopago/webhook/mercadopago-webhook.helpers.ts`
   - `apps/web/app/api/mercadopago/webhook/mercadopago-webhook.provider.ts`
2. Controlador do agendamento online foi fatiado por responsabilidade:
   - estado: `use-public-booking-flow-state.ts`
   - dependencias/orquestracao: `use-public-booking-flow-controller-deps.ts`
   - montagem final de retorno: `use-public-booking-flow-controller-result.ts`
3. Controlador da agenda mobile foi dividido em blocos de comportamento:
   - `use-mobile-agenda-search-effect.ts`
   - `use-mobile-agenda-day-navigation.ts`
   - `use-mobile-agenda-derived-data.ts`
4. Realtime esta ativo em fluxos operacionais (agenda/atendimento) com refresh direcionado.
5. Edge Functions estao versionadas no repo e publicadas para fluxos assincronos criticos.
6. Persistem pontos de concentracao media (nao bloqueantes) em:
   - `appointment-form.composition.tsx`
   - `use-appointment-confirmation-flow.ts`
   - `use-public-booking-flow-controller-deps.ts`
7. CI segue com gate tecnico ativo para `lint`, `check-types`, `build`, `test:unit` e `test:smoke`.

## 3.2) Diagnostico de variaveis de ambiente (env)

Inventario atual no codigo `apps/web`:

1. Total de variaveis usadas via `process.env`: 50
2. Distribuicao principal:
   - `WHATSAPP_*`: 22
   - `NEXT_PUBLIC_*`: 8
   - `GOOGLE_*`/`GEMINI_*`/`FLORA_*`: 5
   - `MERCADOPAGO_*`: 3
   - `SPOTIFY_*`: 3
3. Ja existe padrao por prefixo (isso e normal em sistema enterprise).
4. Ponto de melhoria real:
   - existem alias/fallbacks em alguns fluxos que aumentam confusao operacional.
   - exemplo de fallback sensivel: captcha reaproveitando secrets de outras finalidades.
5. Gap de governanca:
   - nao existe ainda um schema unico tipado de env obrigatorias/opcionais por ambiente.
   - sem esse schema, o risco e detectar erro de configuracao apenas em runtime.

## 3.3) O que faz sentido ficar em variavel e o que nao faz

Regra enterprise adotada para este plano:

1. Variavel de ambiente deve ser usada para:
   - segredo/token/chave
   - credencial de provedor externo
   - parametro de infraestrutura/deploy
   - feature flag operacional de ambiente (com baixo volume)
2. Configuracao de negocio nao deve ficar em env quando muda por tenant ou por operacao diaria.
3. Quanto maior a chance de crescer em quantidade (ex.: varios templates), menos sentido usar env.

Classificacao dos pontos que voce citou:

1. Nome do template de mensagem:
   - estado atual: env
   - alvo: banco (configuracao por tipo de evento)
   - motivo: escala melhor e evita mar de variaveis
2. Linguagem do template:
   - estado atual: env
   - alvo: banco
   - motivo: pode variar por tenant/campanha sem redeploy
3. Timezone do sistema:
   - estado atual: `APP_TIMEZONE` em env
   - alvo recomendado: manter fallback global em env e preparar override por tenant em banco (quando necessario)
4. Captcha secret:
   - estado atual: env com fallback em cadeia
   - alvo: env dedicado unico (sem fallback para outros segredos)
   - motivo: segredo de seguranca deve ter finalidade unica

Conclusao objetiva:
- sua percepcao esta correta: para templates/language, env nao escala e vira bagunca.
- para segredos (captcha/token/webhook), env continua sendo o caminho correto.

## 3.4) Achados adicionais de convergencia (varredura repo inteiro)

1. Acoplamento single-tenant ainda muito espalhado:
   - `FIXED_TENANT_ID` em diversos fluxos de app e modulos.
   - UUID fixo tambem aparece em varias migrations/policies historicas.
   - impacto: reduz portabilidade para multi-tenant real.
2. Acesso ao banco direto na camada `app/*` ainda relevante:
   - ocorrencias de `createServiceClient(` em `app/*`: 27
   - ocorrencias de `createServiceClient(` em `src/modules/*`: 82
   - impacto: regra de negocio fica misturada com entrega de tela/rota.
3. Casts amplos (`as unknown as`) ainda presentes:
   - 25 ocorrencias no repo.
   - existem em rotas/telas relevantes (nao apenas teste).
   - impacto: enfraquece garantias de tipo e aumenta risco silencioso.
4. Duplicacoes pontuais confirmadas:
   - `normalizeClient` em `voucher/comprovante/repository`
   - `formatCurrency` em agenda/comprovante/checkout
   - validacao de email em helpers paralelos de interno/publico
5. CI ainda sem gate de `test:unit` e `test:smoke` no workflow principal.

## 3.5) Topologia de dominio (site institucional x sistema)

Recomendacao canonica para separar produto e marketing:

1. Dominio raiz (`corpoealmahumanizado.com.br`) aponta para site institucional.
2. Sistema fica em subdominio dedicado:
   - producao: `app.corpoealmahumanizado.com.br` (ou manter `public...` se preferir continuidade)
   - homolog/dev: `dev.app.corpoealmahumanizado.com.br` (ou padrao equivalente)
3. Beneficios:
   - operacao e deploy desacoplados
   - menos risco de regressao cruzada entre site e sistema
   - comunicacao comercial mais limpa

## 3.6) Matriz Edge x Realtime (analise do repo)

Realtime (decidido como adocao progressiva em fluxos de status):

1. Faz sentido aplicar:
   - status de pagamento (pix/cartao/dinheiro/cortesia)
   - timeline/status de mensagens (sent/delivered/read/failed)
   - atualizacao de card/agenda apos mudancas de atendimento/agendamento
2. Nao faz sentido aplicar primeiro:
   - paginas legais e conteudo estatico
   - configuracoes raramente alteradas

Edge Functions (analise de onde faz sentido):

1. Alto potencial de ganho:
   - ingestao/processamento de webhooks (Meta e Mercado Pago)
   - processador de fila de automacao WhatsApp
   - jobs cron de notificacao
2. Medio potencial:
   - validacao de identidade online (captcha + guard) quando quiser isolar risco
3. Baixo potencial / nao recomendado agora:
   - mover todo agendamento online para Edge de uma vez
   - motivo: alto risco de regressao e pouco ganho imediato frente ao custo de migracao

Decisao tecnica recomendada:

1. Nao migrar "tudo de agendamento online" para Edge agora.
2. Migrar primeiro partes assicronas e de integracao externa.
3. Manter criacao de agendamento no caminho atual (app + RPC) enquanto convergimos backend.

## 3.7) Auditoria detalhada de espelhamento DB local x remoto

Metodologia aplicada:

1. Comparacao de migrations aplicadas (`supabase migration list` local x remoto).
2. Dump completo do schema `public` local e remoto (`supabase db dump --local/--linked --schema public`).
3. Diff textual de schema dump local x remoto.

Resultado:

1. Migrations: espelhadas 1:1 (sem drift de versionamento).
2. Schema `public`: estrutura funcional equivalente.
3. Diferencas detectadas no diff:
   - tabela `public.clients` com ordem fisica diferente das colunas `notes` e `birth_date`.
   - nao houve diferenca de tipo, nulabilidade, constraints ou existencia de coluna.
4. Diff de schema completo (fora de `public`) apontou:
   - extensoes presentes no remoto e ausentes no local: `hypopg` e `index_advisor`.
   - diferencas residuais de espaco/quebra de linha sem impacto funcional.

Conclusao:

1. Local e remoto estao espelhados no que impacta comportamento/contrato.
2. Existe apenas diferenca de ordem fisica de coluna em `clients` (nao funcional).
3. Existe diferenca de extensoes auxiliares (`hypopg`/`index_advisor`) que deve ser alinhada para espelhamento 100%.
4. Este item deve ser registrado como drift cosmetico/infra ate a consolidacao final.

## 4) Glossario sem "deves"

Para voce acompanhar cada etapa sem depender de termos tecnicos:

1. `screen`: tela principal.  
   Exemplo: pagina de novo agendamento.
2. `action`: botao/acao do sistema no servidor.  
   Exemplo: salvar agendamento, confirmar pagamento.
3. `hook`: bloco de comportamento de tela.  
   Exemplo: controlar estados do formulario, carregamentos e validacoes.
4. `repository`: camada que fala com o banco.  
   Exemplo: ler/salvar cliente no Supabase.
5. `application`: camada que orquestra regras de negocio.  
   Exemplo: "se cobrar agora com Pix, criar pagamento e atualizar status".
6. `domain`: regras centrais de negocio (o "cerebro" da regra).  
   Exemplo: como calcular total, saldo, parcial, pago, cortesia.
7. `infrastructure`: integracoes externas.  
   Exemplo: Mercado Pago, Meta WhatsApp, Spotify, Supabase client.

## 5) Regras de ouro do programa

1. Nao quebrar fluxo manual existente (principalmente WhatsApp manual).
2. Nao refazer do zero o que ja esta funcionando.
3. Modularizar por responsabilidade, nao apenas por quantidade de linhas.
4. Evitar duplicacao: regra de negocio deve existir em um lugar principal.
5. Cada bloco termina com validacao obrigatoria:
   - `pnpm --filter web lint`
   - `pnpm --filter web lint:architecture`
   - `pnpm --filter web check-types`
   - `pnpm --filter web test:unit`
   - `pnpm --filter web build`
6. Commits em blocos logicos na `main`, com arvore limpa ao final de cada bloco.

## 6) Arquitetura alvo (traduzida para operacao)

Cada fluxo critico passara a ter pecas separadas:

1. Camada de tela: so desenha e captura cliques.
2. Camada de comportamento da tela: controla estado e validacoes de tela.
3. Camada de regra de negocio: decide calculos, status e regras.
4. Camada de banco/integracoes: grava em banco e chama APIs externas.

Direcao unica:
- Tela chama regra.
- Regra chama banco/integracao.
- Banco/integracao nao conhece tela.

Isso evita dependencia cruzada e reduz efeito cascata de bugs.

## 7) Plano E2E completo (ordem de execucao)

## Fase A - Fundacao, guardrails e seguranca

Objetivo:
- travar padrao para o repo nao voltar ao modelo "arquivo monstro misturado".

Entregas:
1. Reforcar convencoes e checklist tecnico.
2. Fechar endpoints internos sensiveis com validacao de segredo.
3. Garantir regras de arquitetura no lint.
4. Revisar `next.config` para headers de seguranca (sem quebrar comportamento atual).
5. Subir gate de qualidade no CI para incluir teste unitario obrigatorio.
6. Definir regra de smoke automatizado para fluxos criticos em janela controlada.
7. Criar governanca canonica de env (nome, dono, ambiente, obrigatoriedade e seguranca).
8. Implementar validacao de env no boot (falha rapida quando faltar variavel obrigatoria).
9. Eliminar fallback cruzado de segredo (cada segredo com finalidade unica).
10. Adicionar gate de tipagem/arquitetura para reduzir `as unknown as` em caminhos de producao.

Arquivos foco:
1. `docs/engineering/MODULARIZATION_CONVENTIONS.md`
2. `docs/engineering/PR_CHECKLIST_REFACTOR.md`
3. `.github/workflows/ci.yml`
4. `apps/web/next.config.js`
5. rotas internas em `apps/web/app/api/internal/*`
6. novo modulo de env em `apps/web/src/shared/env/*`
7. `docs/runbooks/*` e `docs/integrations/*` para matriz canonica de env

## Fase B - Base compartilhada unica

Objetivo:
- parar de repetir normalizacao e formatacao em varios lugares.

Entregas:
1. Biblioteca unica para CPF/telefone/CEP/moeda/data.
2. Migracao dos consumidores para essa biblioteca.
3. Remocao de duplicacoes locais.
4. Remover helper paralelo em fluxo publico quando duplicar regra de `src/shared`.
5. Remover normalizacao local em `actions.helpers` quando ja existir funcao canonica.
6. Unificar leitura de env publica e privada via modulos centrais (sem leitura solta espalhada).

Arquivos foco:
1. `apps/web/src/shared/*`
2. `apps/web/app/(dashboard)/novo/*`
3. `apps/web/app/(public)/agendar/[slug]/*`
4. `apps/web/src/modules/clients/*`

## Fase C - Fluxo interno de novo agendamento

Objetivo:
- modularizar o maior hotspot do repo sem mudar visual.

Entregas:
1. Quebra de `appointment-form.composition.tsx` por etapas/sections.
2. Separacao de controle de estado, regra e UI.
3. Reuso do fluxo financeiro em caminho unico de backend.

Arquivos foco:
1. `apps/web/app/(dashboard)/novo/appointment-form.composition.tsx`
2. `apps/web/app/(dashboard)/novo/appointment-actions.ts`
3. `apps/web/app/(dashboard)/novo/components/*`
4. `apps/web/app/(dashboard)/novo/hooks/*`
5. `apps/web/src/modules/appointments/*`

## Fase D - Fluxo publico de agendamento online

Objetivo:
- deixar o fluxo online modular, rapido e previsivel.

Entregas:
1. Separar identidade, servico, data/hora, local, pagamento e sucesso.
2. Centralizar regra de disponibilidade por mes/dia (evitar recargas desnecessarias).
3. Manter o fluxo de seguranca ja definido para identidade.
4. Fazer o wrapper publico usar motor unico de disponibilidade, sem duplicar filtro em cadeia.
5. Preparar contrato para eventos de status em tempo real sem quebrar UX atual.

Arquivos foco:
1. `apps/web/app/(public)/agendar/[slug]/booking-flow*`
2. `apps/web/app/(public)/agendar/[slug]/public-actions/*`
3. `apps/web/src/modules/appointments/public-booking*`

## Fase E - Atendimento + checkout + pagamentos

Objetivo:
- garantir caminho unico e consistente para status financeiro.

Entregas:
1. Divisao da camada de atendimento em servicos menores.
2. Modal de checkout com controller separado e UI pura.
3. Recalculo de status financeiro consistente em todos os gatilhos.
4. Fechar duplicidades entre fluxo interno e publico de pagamento.
5. Consolidar webhook MP como "entrada de evento" e mover regra financeira para servico unico.
6. Garantir funcao unica de formatacao de moeda em telas de comprovante, agenda e checkout.
7. Publicar eventos de status financeiro para consumo Realtime.

Arquivos foco:
1. `apps/web/app/(dashboard)/atendimento/[id]/attendance-page.tsx`
2. `apps/web/app/(dashboard)/atendimento/[id]/actions.ts`
3. `apps/web/app/(dashboard)/atendimento/[id]/components/*`
4. `apps/web/src/modules/payments/*`
5. `apps/web/src/modules/appointments/*`

## Fase F - WhatsApp automacao + manual coexistente

Objetivo:
- separar pipeline de automacao sem interferir no envio manual.

Entregas:
1. Pipeline dividido por etapas: fila, processador, envio, webhook status, webhook inbound.
2. Contratos internos claros para mensagens e templates.
3. Logs operacionais mais claros para diagnostico.
4. Migrar configuracao de templates/language de env para banco.
5. Manter em env apenas segredos e dados de infraestrutura Meta.
6. Incluir flag por tenant no banco para ligar/desligar automacao sem redeploy.
7. Manter kill-switch global em env apenas para contingencia operacional.
8. Publicar eventos de status de mensagens para consumo Realtime no painel.

Arquivos foco:
1. `apps/web/src/modules/notifications/whatsapp-*`
2. `apps/web/app/api/whatsapp/*`
3. `apps/web/app/api/internal/notifications/whatsapp/*`
4. `apps/web/src/modules/settings/*`
5. `supabase/migrations/*`

## Fase G - Agenda, detalhes e configuracoes

Objetivo:
- reduzir acoplamento da agenda e telas administrativas.

Entregas:
1. Modularizacao de `mobile-agenda.screen.tsx`.
2. Modularizacao de `appointment-details-sheet.tsx`.
3. Quebra de `availability-manager.tsx` e `settings-form.tsx` por secoes.
4. Reducao de complexidade em `mensagens/page.tsx` e `clientes/novo/page.tsx`.
5. Retirar consulta direta de banco nas telas e delegar para camada de modulo/repository.

Arquivos foco:
1. `apps/web/components/mobile-agenda.screen.tsx`
2. `apps/web/components/agenda/appointment-details-sheet.tsx`
3. `apps/web/components/availability-manager.tsx`
4. `apps/web/app/(dashboard)/configuracoes/settings-form.tsx`
5. `apps/web/app/(dashboard)/mensagens/page.tsx`
6. `apps/web/app/(dashboard)/clientes/novo/page.tsx`

## Fase H - Certificacao final e fechamento operacional

Objetivo:
- declarar o programa como pronto para operacao continua.

Entregas:
1. Auditoria final tecnica e funcional.
2. Atualizacao final de runbooks e docs canonicos.
3. Checklist de envs criticas e riscos residuais.
4. Relatorio final de pronto para producao.
5. Matriz de decisao "adotar ou nao" para Realtime/Edge, com criterio tecnico e custo operacional.
6. Certificacao de env:
   - sem variavel "zumbi" (declarada mas nao usada)
   - sem variavel usada fora da matriz canonica
   - sem segredo reutilizado para finalidades diferentes
7. Certificacao de convergencia:
   - sem duplicacao ativa de helper critico (moeda/cliente/email/cpf)
   - sem acesso direto a banco em telas que ja tenham modulo canônico
8. Certificacao de dominio:
   - dominio raiz institucional separado do dominio do sistema
9. Certificacao Realtime:
   - fluxos de status atualizando sem polling pesado onde aplicavel
10. Certificacao de testes:
   - CI com unit + smoke obrigatorios em PR
   - matriz de testes por dominio publicada e validada

## 7.1) Pacote de correcoes obrigatorias adicionado por esta auditoria

1. Unificar funcoes de CPF/telefone/email em `src/shared` e remover duplicacoes locais.
2. Unificar formatadores de moeda para agenda, comprovante e checkout.
3. Convergir disponibilidade para um unico motor e manter wrappers apenas para regra de contexto (interno/publico).
4. Encapsular regra de webhook MP em servico unico para evitar comportamento divergente.
5. Eliminar acesso direto a Supabase em tela quando existir camada de modulo.
6. Evoluir CI para travar qualidade com teste unitario obrigatorio.
7. Definir e documentar criterio formal para Realtime/Edge (nao obrigatorio, decisao guiada por ganho real).
8. Criar camada unica de leitura/validacao de env e descontinuar aliases desnecessarios.
9. Separar explicitamente variaveis:
   - publicas (`NEXT_PUBLIC_*`)
   - privadas de servidor
   - segredos de operacao (webhook/cron/processor)
10. Remover crescimento linear de env por template:
    - templates/language passam a ser configuracao em banco
    - env fica apenas com credencial e segredos do provider
11. Reduzir `as unknown as` em caminhos de producao para limite residual auditavel.
12. Consolidar `normalizeClient` e `formatCurrency` em modulos unicos reutilizados.
13. Criar trilha de migracao do `FIXED_TENANT_ID` para tenant resolvido por contexto de sessao.
14. Adotar Realtime em fluxos de status operacionais (pagamento, mensagens, agenda/atendimento).
15. Implantar gate obrigatorio de testes em PR (unit + smoke).

## 7.2) Matriz de migracao env -> banco (templates e automacao)

Migrar para banco (por tenant):

1. Template de aviso de agendamento.
2. Linguagem do template de aviso.
3. Template de lembrete 24h.
4. Linguagem do template de lembrete 24h.
5. Automacao ligada/desligada por tenant.
6. Parametros operacionais de automacao que sao de negocio (nao segredo).

Manter em env:

1. Access token da Meta.
2. App secret / verify token.
3. Segredo do processador interno.
4. Segredos de cron/webhook.
5. Chaves de provedores externos (MP/Google/Spotify/Supabase).

## 7.3) Trilha de tenant dinamico sem perda de dados (obrigatoria)

Objetivo:
- migrar de tenant fixo para tenant dinamico preservando 100% dos dados atuais da Jana/estudio.

Passos:

1. Fase de preparacao:
   - manter tenant atual como tenant oficial inicial (sem mover dados)
   - criar tabela de vinculo usuario->tenant (se necessario expandir)
2. Fase de compatibilidade:
   - resolver tenant por sessao/contexto
   - manter fallback temporario para tenant atual somente durante transicao
   - remover defaults fixos de `tenant_id` no schema para evitar gravacao acidental no tenant da Jana
   - remover politicas RLS hardcoded com UUID fixo e trocar por politicas orientadas a contexto
3. Fase de convergencia:
   - remover dependencias de `FIXED_TENANT_ID` do app/modulos
   - manter migrations historicas intactas (sem apagar historico de dados)
4. Fase de certificacao:
   - validar que usuario da Jana continua vendo os mesmos dados
   - validar isolamento de dados entre tenants novos e tenant original
   - validar backups e rollback antes de corte final

Garantia de preservacao:
- nenhuma estrategia do plano permite descarte de dados existentes.
- migracao e de "chave de acesso/contexto", nao de apagar/recriar base.

## 7.4) Normalizacao de campos com semantica duplicada (DB)

Objetivo:
- eliminar campos que representam a mesma informacao com nomes diferentes.

Lista inicial identificada:

1. `public.clients.data_nascimento` e `public.clients.birth_date`
   - mesma semantica (data de nascimento)
   - decisao de negocio: manter apenas `birth_date` (padrao em ingles do schema)

Lista de possiveis duplicidades semanticas (avaliacao dirigida):

1. `public.clients.phone` vs `public.client_phones.*`
2. `public.clients.email` vs `public.client_emails.*`
3. `public.clients.address_*`/`endereco_completo` vs `public.client_addresses.*`

Decisao de negocio:
1. manter caminho unico para telefone/email/endereco com suporte a multiplos por cliente.
2. canonico: `client_phones`, `client_emails`, `client_addresses`.
3. `clients.phone`, `clients.email`, `clients.endereco_completo`, `clients.address_*` viram legado de transicao e serao removidos ao final da trilha de migracao.

Resultado da auditoria de dados no remoto (base real):
1. `clients`: 15 registros.
2. `client_phones`: 8 registros (8 clientes distintos).
3. `client_emails`: 3 registros (3 clientes distintos).
4. `client_addresses`: 2 registros (2 clientes distintos).
5. lacunas de migracao detectadas:
   - telefone: 5 clientes com `clients.phone` sem registro correspondente em `client_phones`.
   - email: 0 lacunas.
   - endereco: 0 lacunas.

Uso atual no codigo (confirmado):
1. tabelas canonicas ja sao usadas em escrita/leitura:
   - `apps/web/src/modules/clients/repository.ts`
   - `apps/web/app/(public)/agendar/[slug]/public-actions/clients.ts`
   - `apps/web/src/modules/appointments/actions/create-internal-booking.ts`
2. colunas legadas em `clients` ainda sao amplamente usadas em busca e composicao de tela:
   - `apps/web/src/modules/appointments/repository.ts`
   - `apps/web/app/(dashboard)/novo/appointment-form.composition.tsx`
   - `apps/web/src/modules/notifications/whatsapp-automation-appointments.ts`
3. conclusao tecnica:
   - nao pode remover legado em um unico passo; precisa migracao por fases com troca progressiva de leitura.

Diretriz de execucao:
1. preencher primeiro as lacunas para tabelas canonicas.
2. trocar leitura/escrita da aplicacao para caminho canonico unico.
3. remover colunas legadas apenas depois de validar equivalencia local/remoto.

Arquivos foco:
1. `docs/reports/*`
2. `docs/runbooks/*`
3. `docs/plans/*`

## 8) O que muda para voce na pratica (sem codigo)

1. Menos risco de "mexi em um titulo e quebrou pagamento".
2. Correcao mais rapida quando aparece bug.
3. Evolucao de funcionalidade sem reabrir dezenas de arquivos.
4. Menos retrabalho e menos medo de deploy.
5. Mais previsibilidade para operacao diaria do estudio.

## 9) Riscos do programa e como controlar

1. Risco: regressao em fluxo de receita (pagamento/status).  
   Controle: testes de smoke obrigatorios por bloco + recalc de status sempre validado.
2. Risco: drift de documentacao.  
   Controle: atualizar doc canonica no mesmo bloco de codigo.
3. Risco: refatorar demais de uma vez.  
   Controle: blocos pequenos, deploy sob seu comando.
4. Risco: misturar regra nova com refatoracao estrutural.  
   Controle: freeze parcial de features durante fases criticas.
5. Risco: manter duas implementacoes do mesmo fluxo (ex.: pagamento/disponibilidade).  
   Controle: contrato unico de backend + checklist de convergencia por modulo.
6. Risco: adotar Realtime/Edge sem necessidade real e aumentar custo operacional.  
   Controle: adotar apenas por criterio de ganho (latencia/evento/escala), com piloto controlado.

## 10) Cronograma operacional sugerido

Cadencia:

1. Blocos curtos de 1 a 2 dias cada.
2. Sempre fechar bloco com gates tecnicos e smoke funcional.
3. Publicacao quando voce decidir, com checklist objetivo.

Macro ordem:

1. Fase A e B
2. Fase C
3. Fase D
4. Fase E
5. Fase F
6. Fase G
7. Fase H

## 11) Checklist de "bloco pronto"

Um bloco so pode ser considerado pronto quando:

1. `git status` limpo.
2. lint, typecheck, testes unitarios e build passando.
3. smoke do fluxo afetado validado.
4. documentacao do bloco atualizada.
5. commit em bloco logico com mensagem clara.

## 11.1) Matriz de testes obrigatorios no programa

Obrigatorio em toda PR:

1. `pnpm --filter web lint`
2. `pnpm --filter web lint:architecture`
3. `pnpm --filter web check-types`
4. `pnpm --filter web test:unit`
5. `pnpm --filter web build`
6. `pnpm --filter web test:smoke`

Cobertura minima por dominio (incremental):

1. pagamentos: unit de regras + smoke de fluxo principal
2. agendamento interno: unit de validacao/calculo + smoke de criacao
3. agendamento online: smoke de jornada principal
4. whatsapp: unit de parser/mapeador + smoke de endpoint/webhook em ambiente controlado

## 12) Decisoes e pendencias

## 12.1) Decisoes ja fechadas e incorporadas no plano

1. Execucao incremental na `main`.
2. Coexistencia manual + automacao no WhatsApp.
3. Sem redesign visual durante modularizacao.
4. Seguranca de endpoint interno com Bearer.
5. Deploy sob decisao operacional sua.
6. Templates e linguagem de mensagens:
   - decidido: migrar para banco.
7. Automacao por tenant:
   - decidido: incluir liga/desliga no banco por tenant.
8. Timezone:
   - decidido: configurar por tenant no banco.
   - regra operacional atual: sistema deve operar em horario do Brasil.
9. Dominio:
   - decidido: reservar dominio raiz para site institucional e sistema em subdominio dedicado.
10. Realtime:
   - decidido: adotar em todos os fluxos de status onde fizer sentido operacional.
11. Testes em PR:
   - decidido: unit + smoke como obrigatorios na esteira.
12. Edge Functions:
   - decidido: iniciar por webhooks + fila WhatsApp + cron (nao migrar agendamento online inteiro agora).
13. Tenant dinamico:
   - decidido: implementar completo preservando dados e usuarios atuais da Jana/estudio.
14. Campo de nascimento canonico:
   - decidido: manter `birth_date` e descontinuar `data_nascimento`.
15. Contato/endereco canonico:
   - decidido: manter apenas caminho canonico por tabelas `client_phones`, `client_emails`, `client_addresses`.
16. Variaveis de ambiente:
   - decidido: aplicar formato final, limpar aliases desnecessarios e atualizar `.env.local` e `.vercel/env-import`.
   - decidido: remover arquivos temporarios de env em `.vercel` quando nao forem mais necessarios.

## 12.2) Decisoes pendentes (precisam da sua resposta antes da migration de limpeza)

1. Nenhuma pendencia funcional bloqueante nesta etapa.
2. Pendencias remanescentes passam a ser apenas de execucao tecnica por fases (sem nova decisao de negocio).

## 12.3) Decisoes ja tomadas, mas ainda sem execucao concluida

Atualizacao 2026-03-03:

1. Nao ha decisao de negocio pendente sem execucao tecnica.
2. Itens deste bloco foram executados no ciclo 2026-03-02/2026-03-03 e validados por `lint`, `lint:architecture`, `check-types`, `test:unit`, `test:smoke` e `build`.
3. O que permanece aberto daqui em diante e melhoria continua de granularidade (otimizacao incremental), nao pendencia bloqueante do programa.

## 12.4) Regras enterprise para variaveis (novas)

1. Cada variavel precisa ter:
   - finalidade unica
   - dono do modulo
   - classificacao de risco (publica, interna, segredo)
   - ambientes onde e obrigatoria (dev/preview/prod)
2. Proibido reutilizar segredo de uma finalidade em outra.
3. Toda variavel nova entra primeiro na matriz canonica de env e depois no codigo.
4. Toda variavel removida exige limpeza de:
   - codigo
   - CI/turbo
   - docs/runbooks
   - painel de ambiente
5. Proibido criar duas variaveis por template de mensagem quando a quantidade puder crescer.
6. Configuracao de conteudo operacional (templates, idioma padrao, textos de aviso) deve viver no banco e nao em env.

## 13) Referencias canonicas deste plano

1. `docs/plans/BACKLOG_REFACTOR_MODULARIZACAO_REPO.md`
2. `docs/reports/AUDITORIA_MAIN_PROD_2026-02-27.md`
3. `docs/reports/CERTIFICACAO_FINAL_PROGRAMA_MODULARIZACAO_2026-03-02.md`
4. `docs/runbooks/PROGRAMA_MODULARIZACAO_OPERACAO.md`
5. `docs/runbooks/TESTES_VALIDACAO_LOCAL_E_CI.md`

## 14) Modo de execucao continuo (E2E sem pausa)

Regra operacional deste programa:

1. execucao sequencial de todas as fases sem pausa por feedback intermediario.
2. cada fase roda com validacoes obrigatorias antes de avancar para a proxima.
3. se surgir bloqueio isolado que dependa de voce:
   - o ponto bloqueado e registrado em lista de intervencao.
   - os demais itens nao bloqueados continuam normalmente.
4. ao fim, sera entregue:
   - repo aplicado ponta a ponta.
   - lista curta do que exigiu intervencao sua (se houver).
   - status final de lint/build/testes.
   - checklist de deploy/publicacao.

## 15) Registro de Execucao (2026-03-02)

### 15.1 Banco local + remoto

1. Migration aplicada em local e remoto:
   - `supabase/migrations/20260302015802_enterprise_tenant_dynamic_clients_canonicalization.sql`
2. Entregas desta migration:
   - adiciona colunas de configuracao operacional por tenant em `settings` (timezone, flags e templates de automacao);
   - faz backfill de `clients.birth_date` a partir de `clients.data_nascimento`;
   - migra dados legados para tabelas canonicas `client_phones`, `client_emails`, `client_addresses`;
   - remove defaults hardcoded de `tenant_id`;
   - ajusta policy com hardcode de tenant para condicao por role apropriada.

### 15.2 Tenant dinamico (execucao parcial avancada)

1. `apps/web/lib/tenant-context.ts` passou a suportar fallback de tenant por env:
   - `DEFAULT_TENANT_ID`
   - `NEXT_PUBLIC_DEFAULT_TENANT_ID`
2. Páginas principais do dashboard passaram a usar tenant da sessao autenticada.
3. Acoes principais de dashboard (clientes/servicos/configuracoes/bloqueios/novo) passaram a usar `tenantId` da sessao.
4. Fluxo de atendimento teve propagacao de `tenantId` nos modulos de:
   - comunicacao;
   - checkout financeiro;
   - pagamento;
   - timer;
   - checklist/evolucao.
5. Operacoes de ciclo de agendamento/admin tambem foram preparadas para receber tenant por parametro.

### 15.3 Canonicalizacao de clientes

1. Validacao e persistencia migradas para `birth_date`.
2. Fallback de leitura de `data_nascimento` mantido nas actions para transicao sem quebra.

### 15.4 Tooling

1. `turbo.json` atualizado para declarar:
   - `DEFAULT_TENANT_ID`
   - `NEXT_PUBLIC_DEFAULT_TENANT_ID`

### 15.5 Validacao da execucao

1. `pnpm --filter web lint` ✅
2. `pnpm --filter web lint:architecture` ✅
3. `pnpm --filter web test:unit` ✅
4. `pnpm --filter web test:smoke` ✅
5. `pnpm --filter web check-types` ✅
6. `pnpm --filter web build` ✅

### 15.6 Fechamentos complementares (2026-03-02)

1. Realtime ativado em fluxos operacionais:
   - agenda (`apps/web/components/mobile-agenda.screen.tsx`)
   - atendimento (`apps/web/app/(dashboard)/atendimento/[id]/attendance-page.tsx`)
2. Criação de borda Edge para integrações assíncronas:
   - `supabase/functions/whatsapp-automation-processor/index.ts`
   - `supabase/functions/whatsapp-meta-webhook/index.ts`
   - `supabase/functions/mercadopago-webhook-proxy/index.ts`
   - `supabase/functions/README.md`
3. Templates e idioma da automação WhatsApp com resolução por tenant via `settings`:
   - novo módulo `apps/web/src/modules/notifications/tenant-whatsapp-settings.ts`
   - consumo aplicado em `apps/web/src/modules/notifications/whatsapp-automation-appointments.ts`
4. Convergência de configuração de ambiente:
   - `apps/web/src/shared/env/server-env.ts`
   - `apps/web/src/shared/env/public-env.ts`
   - uso consolidado em `apps/web/lib/supabase/client.ts`, `apps/web/lib/supabase/server.ts`, `apps/web/lib/supabase/service.ts`

### 15.7 Fechamento estrutural final (2026-03-02)

1. Tenant fallback legado removido do runtime:
   - `apps/web/lib/tenant-context.ts` removido.
   - `apps/web/src/modules/auth/dashboard-access.ts` sem bootstrap por tenant fixo.
2. Migração total de templates/idioma/local da automação WhatsApp para banco:
   - `apps/web/src/modules/notifications/tenant-whatsapp-settings.ts`
   - `apps/web/src/modules/notifications/whatsapp-automation-appointments.ts`
   - `apps/web/app/voucher/[id]/page.tsx`
   - `apps/web/app/(dashboard)/mensagens/message-jobs.ts`
3. Limpeza de fallback cruzado de segredo no lookup público:
   - `apps/web/app/(public)/agendar/[slug]/public-actions/client-lookup-security.ts`
4. Migrations aplicadas local + remoto para convergência final:
   - `supabase/migrations/20260302102000_enable_realtime_operational_tables.sql`
   - `supabase/migrations/20260302113500_whatsapp_settings_db_canonical.sql`
5. Edge Functions publicadas no remoto:
   - `whatsapp-automation-processor`
   - `whatsapp-meta-webhook`
   - `mercadopago-webhook-proxy`
