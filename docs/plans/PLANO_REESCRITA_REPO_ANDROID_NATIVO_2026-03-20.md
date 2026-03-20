# Plano de Reescrita do Repo para Android Nativo

Status: pronto para execucao  
Data base: 2026-03-20  
Escopo: reescrever o produto atual como app Android nativo em repo separado  
Perfil de entrega: producao enterprise, sem mentalidade MVP

## 0.0) Estado atual real (atualizado com execucao pratica)

Este plano ja possui bootstrap tecnico executado no repo Android separado.

Concluido em ambiente real:

1. repo Android criado e publicado no GitHub:
   - `https://github.com/RenatoMazzarino/app_erp_agendamentos`
   - pasta local: `C:\Users\renat\Projetos_Dev\estudio-platform`
2. Android Studio instalado e operando no projeto.
3. stack de build atualizada e validada:
   - AGP `9.1.0`
   - Gradle Wrapper `9.3.1`
   - JDK `21` (Android Studio JBR)
4. CI Android criada e versionada em:
   - `.github/workflows/android-ci.yml`
   - inclui: `assembleDebug`, `testDebugUnitTest`, `lintDebug`
5. build local validada com sucesso:
   - `clean`, `assembleDebug`, `installDebug`, `lintDebug`
6. emulador Android validado:
   - AVD: `Medium_Phone_API_36.1`
   - app instalado e aberto via `adb`.
7. padrao de line endings configurado com:
   - `.gitattributes`

Pendencia operacional conhecida (na maquina local):

1. garantir terminal novo reconhecendo `JAVA_HOME`/`java` sem depender da IDE.
2. manter `local.properties` fora de versionamento (ja coberto no `.gitignore`).

## 0) Objetivo executivo

Reescrever a aplicacao operacional atual para Android nativo, mantendo:

1. regras de negocio e contratos do backend atual;
2. operacao white-label por tenant;
3. integracoes criticas (WhatsApp, Mercado Pago, Google Maps, Push);
4. robustez, observabilidade e governanca de producao.

## 0.1) Premissas adotadas neste plano

1. stack mobile: `Kotlin + Jetpack Compose`.
2. backend alvo da reescrita: `AWS + Aurora PostgreSQL`.
3. o app web atual continua operando apenas durante a transicao,
   ate o cutover final para AWS + Aurora.
4. reescrita em repo novo, sem empacotar web em WebView.
5. execucao continua por gates tecnicos, sem sprint fixa obrigatoria.

## 0.2) Caminho do novo repo

Pasta base criada:

1. `C:\Users\renat\Projetos_Dev`

Repo criado e oficial:

1. `app_erp_agendamentos`
2. pasta local ativa: `C:\Users\renat\Projetos_Dev\estudio-platform`

## 0.3) Definicao de pronto (DoD final)

Esta trilha so termina quando:

1. app Android executa fluxos core de ponta a ponta em producao;
2. tenant principal opera sem dependencia funcional do front web;
3. tenant secundario de homologacao tambem opera no app;
4. app tem observabilidade, crash tracking e rollback de release;
5. publicacao na Play Store interna/fechada esta funcional;
6. runbooks operacionais de suporte mobile estao ativos.

## 0.4) Decisoes fechadas desta trilha

1. banco de dados alvo: `Aurora PostgreSQL` desde o inicio.
2. nuvem alvo: `AWS` como plataforma principal.
3. nao adotar estrategia "comeca em outro banco e migra depois".
4. migracao de dados do estado atual ocorre uma vez, com cutover controlado.
5. o desenho deve suportar:
   - varios tenants B2B
   - app Android do estudio
   - app iOS futuro
   - app do cliente final em fase posterior
6. o backend web atual e contingencia temporaria;
   backend canonico final da reescrita sera AWS + Aurora.

## 0.5) Decisoes operacionais ja fechadas

1. regiao AWS primaria: `sa-east-1` (Sao Paulo).
2. regiao secundaria de continuidade/DR: `us-east-1`.
3. IaC oficial: `Terraform` (sem adoc manual como caminho principal).
4. stack do backend novo: `TypeScript + Fastify` containerizado em `ECS Fargate`.
5. estrategia de autenticacao:
   - destino final: `Amazon Cognito`
   - transicao: convivencia curta com backend atual apenas durante cutover.
6. package id Android de producao (base plataforma):
   - `br.com.estudioplatform.operator`
   - branding por tenant permanece por configuracao.
7. politica de dados:
   - cutover unico para Aurora com reconciliacao completa.
8. politica de release:
   - Play Store via trilha interna/fechada antes de producao aberta.

## 1) Arquitetura alvo do app nativo

## 1.1) Camadas

1. `app`: inicializacao, DI, navegacao, shell de UI.
2. `core`: auth, networking, storage, observabilidade, design system.
3. `domain`: casos de uso e regras de negocio.
4. `data`: repositorios, DTOs, mappers, clients HTTP.
5. `feature/*`: modulos funcionais por contexto.

## 1.2) Principios tecnicos

1. regra de negocio fora da UI.
2. contratos de API versionados e testaveis.
3. estado previsivel por feature.
4. suporte offline parcial com fila de sincronizacao.
5. telemetria por tenant e por fluxo.

## 1.3) Arquitetura alvo de backend/cloud

1. API backend:
   - `ECS Fargate` com deploy containerizado
   - `ALB` para entrada HTTP
2. banco:
   - `Aurora PostgreSQL` (Multi-AZ)
3. autenticacao:
   - `Amazon Cognito`
4. filas e eventos:
   - `SQS` + `EventBridge`
5. storage de arquivos:
   - `S3`
6. segredos e configuracao:
   - `Secrets Manager` + `SSM Parameter Store`
7. observabilidade:
   - `CloudWatch` + traces (OpenTelemetry)

## 1.4) Regras de banco para evitar retrabalho

1. `Aurora PostgreSQL` e fonte canonica de dados desde o inicio da reescrita.
2. nao manter dual-write permanente entre bases.
3. migracao do estado atual para Aurora deve ter:
   - inventario de tabelas
   - script de carga inicial
   - reconciliacao de contagem e checksums
   - janela de cutover aprovada
4. rollback de cutover deve ter ponto de retorno definido antes da virada.

## 2) Estrategia de migracao

## 2.1) Modelo de transicao

1. migracao por dominio, nao por tela isolada.
2. cada fase entrega fluxo funcional e validado.
3. web segue em operacao durante migracao.
4. go-live mobile ocorre por rollout controlado.

## 2.2) Reuso do repo atual

1. contratos e regras existentes sao fonte inicial.
2. APIs internas atuais viram base de contrato mobile.
3. documentos canonicos do repo atual continuam referencia.
4. adaptacoes mobile-first entram em paralelo sem quebrar runtime atual.

## 2.3) Regra de transicao de dados (estado atual -> Aurora)

1. fase de leitura e mapeamento do schema atual.
2. construcao de schema alvo no Aurora.
3. carga inicial completa e validada.
4. teste de integridade por tenant.
5. cutover unico para Aurora com plano de reversao.
6. congelar escrita antiga no momento da virada.

## 3) Fase 0 - Kickoff tecnico e inventario

Objetivo:

1. congelar escopo de reescrita e baseline tecnica.

Escopo:

1. mapear modulos do web para modulos mobile.
2. mapear endpoints usados por fluxo core.
3. mapear eventos, webhooks e jobs que impactam mobile.
4. mapear lacunas de API mobile-first.

Entregaveis:

1. matriz `Fluxo -> Endpoint -> Dependencia`.
2. backlog tecnico priorizado por risco.
3. criterios de corte para primeira release Android.

Go/No-Go:

1. go se 100% dos fluxos core tiverem contrato mapeado.
2. no-go se existir fluxo core sem dono tecnico.

## 4) Fase 1 - Bootstrap do repo Android

Objetivo:

1. criar fundacao robusta do novo repo.

Escopo:

1. projeto Android com `Gradle Kotlin DSL`.
2. convencoes de modulo e lint.
3. CI inicial com build, lint e testes.
4. configuracao de ambientes `dev`, `preview`, `prod`.

Entregaveis:

1. estrutura base de modulos.
2. pipeline CI verde.
3. arquivo de configuracao por ambiente.
4. assinatura de build para canais internos.

Go/No-Go:

1. go se build debug/release funcionar no emulador.
2. no-go se nao houver reproducao local limpa.

Rollback:

1. manter tag `bootstrap-stable` para restauracao rapida.

Status da fase:

1. fase iniciada e tecnicamente fechada no baseline atual.
2. CI ja ativa no GitHub.
3. build debug validada em emulador.
4. falta apenas endurecimento incremental de qualidade conforme Fase 2+.

## 4.1) Fase 1.5 - Fundacao AWS + Aurora (gate obrigatorio)

Objetivo:

1. preparar infraestrutura definitiva antes da evolucao funcional mobile.

Escopo:

1. provisionar conta/projeto AWS operacional.
2. criar VPC, subnets, security groups e IAM base.
3. subir Aurora PostgreSQL com politicas de backup e HA.
4. subir stack base de API (ECS/ALB) e observabilidade.
5. preparar Secrets Manager e Parameter Store por ambiente.

Entregaveis:

1. ambiente `dev` AWS funcional.
2. ambiente `preview` AWS funcional.
3. Aurora provisionado com schema inicial.
4. pipeline de deploy backend funcional.

Go/No-Go:

1. go se ambiente subir com healthcheck e logs centralizados.
2. no-go se nao houver plano validado de backup e restore do Aurora.

## 5) Fase 2 - Core platform (auth, rede, storage, observabilidade)

Objetivo:

1. fechar o nucleo tecnico reutilizavel do app.

Escopo:

1. cliente HTTP com retries controlados.
2. camada de autenticacao e sessao.
3. storage local seguro para tokens e cache.
4. crash/error reporting e analytics tecnico.
5. logger com `tenant_id` e `correlation_id`.

Entregaveis:

1. SDK interno de API mobile.
2. interceptors de auth e telemetria.
3. modulo de erros padronizados.

Go/No-Go:

1. go se login e refresh token forem estaveis.
2. no-go se houver sessao invalida sem tratamento.

## 6) Fase 3 - Contratos API mobile-first

Objetivo:

1. consolidar contratos estaveis para app nativo.

Escopo:

1. auditar endpoints existentes do repo web.
2. criar ajustes de contrato quando necessario.
3. padronizar payload de erro e status.
4. padronizar idempotencia em acoes criticas.

Entregaveis:

1. guia de contratos mobile versionado.
2. testes de contrato para endpoints core.
3. lista de endpoints depreciados do web.

Go/No-Go:

1. go se clientes, agenda, atendimento e pagamento tiverem contrato fechado.
2. no-go se fluxo core depender de endpoint instavel.

Criterio adicional obrigatorio:

1. nenhum contrato novo pode acoplar o app Android ao runtime do web atual.

## 7) Fase 4 - Shell de UI nativa e design system

Objetivo:

1. criar fundacao de UI nativa consistente com a identidade atual.

Escopo:

1. navegacao principal do app.
2. temas e tokens visuais por tenant.
3. componentes base reutilizaveis.
4. estados de loading, empty e error padronizados.

Entregaveis:

1. design system Compose inicial.
2. shell com menu e rotas principais.
3. suporte a branding por tenant no app.

Go/No-Go:

1. go se shell estiver responsiva e consistente.
2. no-go se tema por tenant quebrar contraste/acessibilidade.

## 8) Fase 5 - Modulo Clientes (lista, perfil, edicao)

Objetivo:

1. entregar fluxo de clientes completo em nativo.

Escopo:

1. lista de clientes com busca e filtros.
2. perfil completo do cliente.
3. criacao e edicao de cliente.
4. acoes rapidas: ligar, WhatsApp, agendar.

Entregaveis:

1. telas e casos de uso de clientes.
2. testes de UI e unitarios do dominio de clientes.

Go/No-Go:

1. go se CRUD e acoes rapidas funcionarem ponta a ponta.
2. no-go se houver divergencia de dados vs backend.

## 9) Fase 6 - Modulo Agenda

Objetivo:

1. entregar visao operacional de agenda no Android.

Escopo:

1. agenda diaria/semanal.
2. criacao de agendamento interno.
3. edicao, cancelamento e status.
4. validacoes de conflito e buffer.

Entregaveis:

1. agenda nativa funcional.
2. testes de regras de conflito.

Go/No-Go:

1. go se fluxo de agendar/editar/cancelar estiver estavel.
2. no-go se conflito de horario nao for bloqueado corretamente.

## 10) Fase 7 - Modulo Atendimento + Prontuario

Objetivo:

1. portar o fluxo clinico principal para o app.

Escopo:

1. abertura de atendimento.
2. evolucao textual estruturada.
3. prontuario consolidado por cliente.
4. anexos e observacoes internas.

Entregaveis:

1. atendimento e prontuario operacionais.
2. trilha de auditoria das alteracoes.

Go/No-Go:

1. go se evolucao e historico ficarem consistentes.
2. no-go se perder rastreabilidade de alteracoes.

## 11) Fase 8 - Modulo Pagamentos e comprovantes

Objetivo:

1. fechar fluxo financeiro no app nativo.

Escopo:

1. pagamento PIX/cartao via backend oficial.
2. status financeiro em tempo quase real.
3. acesso a voucher e comprovantes.
4. tratamento de falhas e retentativas seguras.

Entregaveis:

1. jornada de pagamento completa.
2. reconciliacao com webhook sem inconsistencias.

Go/No-Go:

1. go se status financeiro bater com backend em 100% dos testes.
2. no-go se houver risco de duplicidade de cobranca.

## 12) Fase 9 - Mensagens, WhatsApp e Push

Objetivo:

1. consolidar comunicacao operacional no app.

Escopo:

1. tela de mensagens e timeline.
2. estado de automacao WhatsApp por agendamento.
3. push por tenant com preferencia por usuario.
4. fluxo de inscricao e re-inscricao de push.

Entregaveis:

1. envio e monitoramento de comunicacao no app.
2. push funcional em dispositivo real Android.

Go/No-Go:

1. go se push e WhatsApp forem observaveis e confiaveis.
2. no-go se canal funcionar sem governanca de erro.

## 13) Fase 10 - Offline, sync e resiliencia

Objetivo:

1. garantir operacao robusta em condicao real de rede.

Escopo:

1. cache de leitura para telas criticas.
2. fila local de acoes com sincronizacao posterior.
3. politica de conflito e merge.
4. indicadores de estado de sincronizacao.

Entregaveis:

1. camada offline parcial para fluxos definidos.
2. testes de perda e retorno de conectividade.

Go/No-Go:

1. go se dados sincronizarem sem corrupcao.
2. no-go se acao critica ficar sem reconciliacao.

## 14) Fase 11 - Seguranca, compliance e hardening

Objetivo:

1. fechar requisitos de seguranca de producao.

Escopo:

1. armazenamento seguro de credenciais locais.
2. pinning e politicas de transporte quando aplicavel.
3. mascaramento de dados sensiveis em logs.
4. revisao de permissoes Android.

Entregaveis:

1. checklist de seguranca aprovado.
2. testes de regressao de auth e autorizacao.

Go/No-Go:

1. go se checklist de seguranca estiver aprovado.
2. no-go se houver vazamento de dado sensivel.

## 15) Fase 12 - QA final, rollout e operacao

Objetivo:

1. liberar app para uso real com risco controlado.

Escopo:

1. beta interno.
2. piloto com operacao real controlada.
3. correcoes de alta prioridade.
4. publicacao em trilha fechada da Play Store.
5. runbooks de suporte e incidente mobile.

Entregaveis:

1. release candidata aprovada.
2. release de producao publicada.
3. operacao monitorada com SLO inicial.

Go/No-Go:

1. go se incidentes P0/P1 estiverem zerados no piloto.
2. no-go se crash rate superar limite acordado.

## 15.1) Fase 13 - Cutover final para backend AWS/Aurora

Objetivo:

1. finalizar virada de operacao para stack definitiva.

Escopo:

1. executar carga final e reconciliacao.
2. comutar trafego para backend AWS.
3. validar fluxo E2E de tenant principal e secundario.
4. manter janela de observacao com rollback pronto.

Entregaveis:

1. backend AWS como runtime principal.
2. Aurora como base canonica ativa.
3. relatorio de cutover assinado.

Go/No-Go:

1. go se reconciliacao de dados estiver 100% aprovada.
2. no-go se houver divergencia funcional entre tenants.

## 16) Criterios de validacao por fase

Em todas as fases, executar no minimo:

1. lint e formatacao do repo Android.
2. testes unitarios da fase.
3. smoke test funcional da fase em emulador.
4. smoke test em dispositivo fisico (S24 Ultra).
5. validacao de logs sem segredo.

## 17) Riscos principais e mitigacoes

1. acoplamento com backend web atual:
   mitigacao: contratos mobile-first versionados.
2. regressao em fluxo financeiro:
   mitigacao: testes de reconciliacao e idempotencia.
3. divergencia de UX entre web e app:
   mitigacao: design system nativo com regra unica por tenant.
4. sobrecarga de escopo:
   mitigacao: gates tecnicos obrigatorios por fase.
5. risco de migracao de dados:
   mitigacao: cutover unico com reconciliacao e rollback ensaiado.
6. custo de cloud acima do previsto:
   mitigacao: chargeback por tenant e monitoramento de custo por servico.

## 18) Rollback de programa

1. rollback de release Android por track na Play Store.
2. web atual permanece como contingencia durante transicao.
3. qualquer fase bloqueada volta ao ultimo gate aprovado.
4. mudar para proxima fase sem gate aprovado e proibido.

## 19) Artefatos obrigatorios de governanca

1. runbook de build/release Android.
2. runbook de incidente mobile.
3. matriz de contratos API mobile.
4. checklist de onboarding de novo desenvolvedor mobile.
5. relatorio de validacao final por fase.
6. runbook de backup/restore Aurora.
7. runbook de cutover AWS.
8. relatorio mensal de custo por tenant.

## 20) Proximo passo imediato

Fase 0 e Fase 1 ja estao executadas no baseline inicial.  
Proximo passo imediato: iniciar Fase 1.5 e Fase 2 em sequencia com gate.

Passo imediato do backend/plataforma:

1. provisionar stack AWS base e Aurora em `dev`.
2. criar schema alvo e scripts de migracao inicial.
3. validar conectividade app -> API -> Aurora.

Passo imediato do app Android:

1. fechar auth/sessao e client HTTP padrao;
2. configurar storage seguro para credenciais;
3. incluir observabilidade tecnica baseline (crash + logs);
4. abrir primeiro modulo funcional (`clientes`) sobre o core pronto.

## 20.1) Modelo de custo por tenant (chargeback)

1. custo base de plataforma:
   - infra AWS compartilhada
2. custo por consumo:
   - Aurora (conexao/armazenamento)
   - S3 (storage/transferencia)
   - filas/eventos
   - provedores externos (Meta, push, mapas, pagamentos)
3. regra operacional:
   - registrar uso por tenant
   - consolidar custo mensal por tenant
   - aplicar politica comercial por pacote/overage

## 21) Passo a passo operacional ja validado (execucao local)

Objetivo: permitir repeticao do setup sem tentativa e erro.

1. abrir projeto Android em `C:\Users\renat\Projetos_Dev\estudio-platform`.
2. sincronizar Gradle e manter AGP/Wrapper atuais do repo.
3. garantir JDK 21 no Gradle (Android Studio JBR).
4. validar no terminal:
   - `.\gradlew.bat clean assembleDebug`
   - `.\gradlew.bat testDebugUnitTest`
   - `.\gradlew.bat lintDebug`
5. subir em emulador:
   - iniciar AVD `Medium_Phone_API_36.1`
   - `.\gradlew.bat installDebug`
6. abrir app instalado:
   - `adb shell monkey -p com.erpagendamentos.app`
   - `-c android.intent.category.LAUNCHER 1`

## 21.1) Acesso AWS no VS Code (padrao operacional validado)

1. extensao: AWS Toolkit conectada com profile local.
2. profile padrao: `profile:estudio_prod_admin`.
3. regiao padrao: `sa-east-1`.
4. conta alvo operacional: `8097-7210-6192` (`estudio-prod`).
5. role alvo: `AdministratorAccess`.
6. conexoes expiradas devem ser removidas no seletor de conexao
   para evitar alertas falsos.

Se `java` nao for reconhecido no terminal:

1. definir variavel de usuario:
   - `JAVA_HOME=C:\Program Files\Android\Android Studio\jbr`
2. adicionar `%JAVA_HOME%\bin` no `Path` de usuario.
3. fechar/reabrir terminal e validar com `java -version`.
