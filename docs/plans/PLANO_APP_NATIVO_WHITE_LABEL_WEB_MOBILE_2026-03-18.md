# Plano do App Nativo White-Label + Plataforma Web/Mobile Unificada

Status: planejamento consolidado  
Data base: 2026-03-18  
Escopo: produto futuro `app nativo + SaaS web` com base compartilhada  
Perfil de entrega: producao enterprise  
Premissa do sponsor: nao usar empacotamento web
(`Capacitor`, `WebView app shell` ou equivalente)

## 0) Objetivo executivo

Este plano consolida a direcao para transformar o sistema atual em uma
plataforma white-label com:

1. app Android nativo como primeira entrega;
2. trilha clara para iOS nativo depois;
3. futura versao web integrada ao mesmo backend e mesma fonte de dados;
4. operacao white-label para multiplos clientes/empresas;
5. base clinica reaproveitavel para prontuario, mapa corporal 2D e evolucao 3D.

## 1) Decisoes ja tomadas

## 1.1 App e stack de cliente

1. Android inicial: `Kotlin + Jetpack Compose`.
2. iOS futuro: `Swift + SwiftUI`.
3. Compartilhamento futuro de logica: permitido via `Kotlin Multiplatform`,
   mas apenas para dominio/contratos/client SDK quando fizer sentido.
4. Nao adotar UI compartilhada como estrategia principal.
5. Nao adotar `Capacitor`, empacotamento web ou "site dentro do app".

## 1.2 Dados e backend

1. Banco principal: `PostgreSQL`.
2. Modelo de dados unico para web + mobile.
3. `Supabase` permanece como base mais aderente no curto/medio prazo.
4. Nao migrar para `Firebase` como banco principal.
5. Fluxos criticos devem passar por backend controlado, nao por acesso direto
   do cliente a toda regra de negocio.

## 1.3 Produto white-label

1. O produto deve nascer como plataforma generica.
2. `Estudio Corpo & Alma Humanizado` sera o primeiro tenant/aplicacao do
   produto, nao uma excecao hardcoded.
3. Branding, configuracoes, politicas e canais devem ser modelados por tenant.
4. White-label nao significa uma conta cloud por cliente neste primeiro momento.
5. White-label inicial deve ser logico/configuravel; flavours por cliente
   podem vir depois.
6. A etapa de white-label desta fase sera considerada concluida quando um novo
   tenant puder ser ativado sem fork do produto, sem ajuste manual em codigo e
   sem novo deploy estrutural.
7. O objetivo desta fase nao e vender "um app diferente por cliente", e sim um
   produto unico com identidade, canais e regras configuraveis por tenant.

## 1.4 Cloud e operacao

1. Direcao recomendada de plataforma: `AWS`.
2. `Vercel` pode continuar servindo a web no curto prazo, mas nao deve ser a
   base definitiva de backend do produto web+mobile.
3. A conta `Para Estudio` fica como conta de gerenciamento/governanca.
4. A conta `estudio-prod` fica como conta operacional da aplicacao.
5. Cloud deve ser preparada para backend, filas, scheduler, storage e
   observabilidade, nao apenas deploy de frontend.

## 1.5 Mapa corporal e 3D

1. Caminho preferido para produto: `SVG/RN-SVG segmentado`.
2. `3D` fica como trilha premium futura, nao como primeira interface de
   operacao clinica.
3. O dado clinico deve ser independente da camada de visualizacao.
4. A camada 2D/3D so pode evoluir sem refazer prontuario e persistencia.

## 2) Diagnostico do repositorio atual

## 2.1 O que ja existe e ajuda

1. Monorepo organizado com `apps/web`, `src/modules`, `src/shared`,
   `supabase/migrations` e `supabase/functions`.
2. Uso forte de `tenant_id` e `tenants` em partes do dominio.
3. Integracoes reais ja operacionais:
   - Supabase
   - Google Maps Platform
   - Mercado Pago
   - WhatsApp Meta Cloud API
   - Spotify
4. Fluxos de agenda, atendimento, clientes, pagamento e notificacoes ja existem.
5. Prototipos reais de mapa corporal no repo com:
   - `SVG com hotspots`
   - `RN-SVG segmentado`
   - `3D interativo`

## 2.2 O que ainda nao esta pronto para white-label real

1. Ainda existem sinais de single-tenant em migrations/policies/defaults.
2. A base atual nao deve ser tratada como multi-tenant enterprise concluida.
3. Parte do runtime ainda esta fortemente acoplada ao app web/Next.
4. Webhooks, filas e cron ainda pedem consolidacao fora do desenho atual
   centrado em Vercel + GitHub Actions.
5. O produto ainda nao tem uma API mobile-first formalizada.

## 3) Arquitetura alvo

## 3.1 Principios

1. Uma unica fonte de verdade para web e mobile.
2. Contratos de dominio acima da interface.
3. Cliente leve; regra critica no backend.
4. White-label governado por tenant e configuracao.
5. Realtime por evento de dominio, nao por refresh global.

## 3.2 Camadas alvo

1. Cliente Android nativo.
2. Cliente iOS nativo futuro.
3. Cliente web futuro/continuado.
4. API/backend central.
5. PostgreSQL como persistencia canonica.
6. Camada de realtime/eventos.
7. Camada de jobs/scheduler/webhooks.
8. Storage de arquivos/assets.

## 3.3 Regra de compartilhamento web + mobile

1. Web e mobile consultam a mesma base logica.
2. Toda acao relevante gera mudanca persistida e evento auditavel.
3. O evento alimenta:
   - realtime
   - filas
   - notificacoes
   - projections/paineis
4. Exemplo esperado:
   - pagamento confirmado no mobile
   - status gravado no backend
   - evento emitido
   - web atualizada quase em tempo real

## 4) Direcao de stack recomendada

## 4.1 Cliente mobile

1. Android:
   - `Kotlin`
   - `Jetpack Compose`
   - arquitetura por camadas/modulos
2. iOS:
   - `Swift`
   - `SwiftUI`
3. Futuro compartilhamento:
   - `Kotlin Multiplatform` apenas para blocos com ganho real

## 4.2 Backend e dados

1. Banco:
   - `PostgreSQL`
2. Plataforma base:
   - `Supabase` no curto prazo
3. Direcao de infraestrutura:
   - `AWS`
4. Componentes-alvo na AWS:
   - conta de gerenciamento
   - conta de workload
   - S3
   - ECR
   - compute containerizado
   - filas
   - scheduler
   - observabilidade

## 4.3 Provedores

Manter:

1. `Supabase`
2. `Google Maps Platform`
3. `Mercado Pago`
4. `WhatsApp Meta Cloud API`

Sob revisao:

1. `Spotify`
   - manter apenas se o encaixe comercial/juridico continuar valido para um
     produto white-label comercial

## 5) White-label: modelo alvo

## 5.0 Definicao de concluido para white-label inicial

White-label desta primeira fase sera considerado efetivamente pronto quando:

1. um novo tenant puder ser criado e configurado sem alterar codigo-fonte;
2. o tenant puder operar com branding proprio, links proprios e configuracoes
   operacionais proprias;
3. canais externos funcionarem por configuracao do tenant, e nao por hardcode;
4. o mesmo backend, a mesma base de dados e a mesma aplicacao atenderem mais de
   um tenant com isolamento logico consistente;
5. a publicacao de um novo tenant nao exigir fork do repositorio.

## 5.1 O que deve ser parametrizado por tenant

1. nome comercial
2. logo
3. paleta/branding
4. dominios/links publicos
5. timezone e localizacao-base
6. settings operacionais
7. permissoes e perfis
8. templates e canais de WhatsApp
9. chaves/config de pagamento
10. politicas de agenda/atendimento
11. preferencia de idioma e textos operacionais
12. remetentes/notificacoes/push por tenant
13. permissoes de features por tenant
14. assets publicos e documentos operacionais do tenant

## 5.2 O que nao deve ser hardcoded

1. tenant default permanente em regras centrais
2. slug fixo como premissa de runtime
3. templates unicos para todos os clientes
4. provider/payment settings unicos no codigo
5. textos de marca embutidos como contrato do sistema
6. menus, permissoes ou modulos inteiros presos ao primeiro cliente
7. dominios publicos como condicao fixa de funcionamento
8. regras de notificacao e automacao presas ao tenant inicial

## 5.3 O que fica explicitamente fora desta fase

Nao faz parte da conclusao do white-label inicial:

1. uma conta cloud separada por cliente;
2. um app nativo separado por cliente nas lojas;
3. um fork do produto por cliente;
4. infraestrutura isolada por tenant;
5. flavours/build variants por cliente logo na primeira entrega;
6. customizacao profunda de fluxo via codigo sob encomenda.

## 5.4 Modelo de publicacao

Fase inicial:

1. um produto white-label logico;
2. configuracao por tenant;
3. mesmo app/base operacional.

Fase posterior:

1. flavours/build variants por cliente;
2. app listing e identidade visual proprios quando houver demanda comercial.

## 5.5 Contrato operacional minimo por tenant

Cada tenant deve ter, no minimo:

1. identidade visual e nome comercial;
2. configuracao de dominio/links publicos;
3. timezone e cidade-base;
4. canais ativos de comunicacao;
5. configuracao de pagamento;
6. politicas de agenda e atendimento;
7. administradores/memberships;
8. templates ativos e documentos publicos;
9. flags de modulos/funcionalidades habilitadas;
10. trilha de auditoria de mudancas de configuracao.

## 5.6 Regra de rollout comercial

O rollout white-label deve seguir esta ordem:

1. primeiro tenant operando com tudo configurado sem hardcode;
2. segundo tenant de homologacao sem fork do produto;
3. validacao de onboarding, branding e canais por configuracao;
4. so depois liberar onboarding comercial recorrente.

## 5.7 Criterio de Go/No-Go da etapa white-label

Go:

1. onboarding de tenant concluido por configuracao;
2. branding e links publicos funcionando sem alterar codigo;
3. pagamentos, notificacoes e permissoes funcionando por tenant;
4. nenhum fluxo core depende do nome/slug do primeiro cliente.

No-Go:

1. novo tenant exige deploy estrutural;
2. novo tenant exige hardcode no codigo;
3. canais externos continuam presos ao tenant inicial;
4. configuracoes do tenant nao tem trilha auditavel.

## 6) Mapa corporal 2D/3D

## 6.1 Regra de produto

1. o prontuario e permanente;
2. o corpo 2D/3D e camada de visualizacao e captura;
3. a persistencia deve guardar regiao/intensidade/achado/sessao/profissional;
4. o modelo clinico nao pode depender da engine visual escolhida.

## 6.2 Ordem recomendada

1. estruturar prontuario textual + regioes corporais;
2. implementar `RN-SVG segmentado` como base do app;
3. estabilizar contrato de dados por regiao;
4. evoluir para `3D` como trilha premium depois.

## 6.3 Go/No-Go do 3D na fase inicial

Go:

1. para prototipo premium
2. para demonstracao de visao futura
3. para trilha de produto posterior

No-Go:

1. como tela clinica principal da primeira entrega
2. como dependencia critica da operacao inicial

## 7) Fases do programa

## Fase 0 - Preparacao e governanca

Entregas:

1. documento alvo da plataforma
2. definicao de stack e cloud
3. definicao de tenants e fronteiras
4. definicao de backlog de migracao

Validacao:

1. stack fechada
2. fonte de dados fechada
3. regra de white-label fechada

Go/No-Go:

1. sem decisao de banco
2. sem decisao de stack mobile
3. sem conta cloud operacional

## Fase 1 - Hardening multi-tenant

Entregas:

1. auditoria de schema e policies
2. remocao de defaults/single-tenant improprios
3. configuracoes por tenant formalizadas
4. contratos de acesso e membership revisados

Validacao:

1. nenhum fluxo critico depende de tenant fixo no core
2. migrations e RLS coerentes com multi-tenant

Rollback:

1. reverter migrations da fase
2. manter tenant unico temporario controlado

## Fase 2 - API e backend mobile-first

Entregas:

1. contratos de API para mobile/web
2. autenticacao de app nativo
3. webhooks/processadores desacoplados do frontend
4. trilha de eventos e realtime padronizada

Validacao:

1. app nativo consegue operar sem depender do runtime web
2. acao do cliente nao executa regra critica apenas no frontend

## Fase 3 - Fundacao Android nativo

Entregas:

1. app Android com login
2. shell principal
3. navegacao base
4. design system inicial
5. consumo da API real

Validacao:

1. app roda em emulador e dispositivo
2. fluxo de login e sessao estavel

## Fase 4 - Paridade funcional dos modulos core

Entregas:

1. agenda
2. clientes/pacientes
3. atendimento
4. pagamento
5. mensagens/avisos operacionais

Validacao:

1. app mobile executa fluxos principais sem dependencia da web
2. web e mobile refletem o mesmo estado de negocio

## Fase 5 - Mapa corporal e prontuario estruturado

Entregas:

1. prontuario textual estruturado
2. contrato de regioes corporais
3. componente `RN-SVG segmentado`
4. timeline clinica por sessao

Validacao:

1. persistencia consistente por regiao
2. leitura clinica clara em atendimento e prontuario

## Fase 6 - Web compartilhando a mesma plataforma

Entregas:

1. alinhamento definitivo da versao web ao backend unificado
2. estados em tempo real compartilhados
3. ajuste de operacao por tenant

Validacao:

1. web e mobile atualizam o mesmo dominio em quase tempo real
2. nenhum canal diverge em contrato central

## Fase 7 - White-label operacional

Entregas:

1. onboarding de tenant
2. branding/config por tenant
3. variacoes comerciais controladas
4. governanca de rollout por cliente
5. contrato minimo de configuracao por tenant fechado
6. playbook de ativacao de novo tenant

Validacao:

1. novo tenant sobe sem fork do produto
2. canais externos funcionam por configuracao e nao por hardcode
3. tenant novo opera sem alteracao estrutural de codigo
4. identidade e politicas do tenant refletem no app/web sem regressao cross-tenant

## 8) Testes e validacao

## 8.1 Cliente Android/iOS

1. previews locais de UI
2. emulador/simulador
3. testes de interface
4. testes instrumentados
5. dispositivo real apenas para:
   - deep link
   - push
   - biometria
   - camera
   - pagamento
   - background behavior

## 8.2 Backend e integracoes

1. testes unitarios de dominio
2. testes de integracao de API
3. testes de webhook
4. testes de fila/scheduler
5. testes E2E dos fluxos criticos

## 8.3 Criterio minimo por fase

1. sem regressao de agenda
2. sem regressao de pagamento
3. sem regressao de WhatsApp
4. observabilidade habilitada
5. rollback documentado

## 9) Riscos principais

1. achar que o app nativo e "conversao automatica"
2. forcar white-label sobre base ainda single-tenant
3. mover regra critica para o cliente
4. tratar 3D como requisito inicial de operacao
5. depender excessivamente do frontend atual para logica core
6. manter root/conta de gerenciamento como conta operacional

## 10) Mitigacoes

1. separar plataforma de app de cliente desde o inicio
2. endurecer multi-tenant antes de vender para mais de um cliente
3. consolidar backend e eventos antes da paridade completa mobile
4. priorizar 2D segmentado antes de 3D
5. usar conta de workload dedicada para a aplicacao

## 11) Rollback estrategico

1. Se a migracao mobile travar:
   - manter web como operacao principal
   - continuar backend unificado como entregavel valido
2. Se white-label ainda nao estiver seguro:
   - operar apenas o tenant do estudio
   - bloquear onboarding de novos tenants
3. Se 3D gerar complexidade precoce:
   - congelar na trilha premium
   - manter 2D segmentado como interface oficial

## 12) Go/No-Go geral

## Go quando

1. banco e stack estiverem fechados
2. multi-tenant estiver endurecido
3. backend mobile-first existir
4. Android nativo operar os fluxos principais
5. web e mobile compartilharem o mesmo dominio e os mesmos dados

## No-Go quando

1. houver dependencia estrutural de tenant unico
2. app nativo depender de gambiarra web
3. cloud de gerenciamento e cloud operacional estiverem misturadas
4. 3D estiver tentando substituir o prontuario/base clinica

## 13) Decisao final consolidada

A direcao recomendada para o produto e:

1. `Android nativo` agora com `Kotlin + Jetpack Compose`
2. `iOS nativo` depois com `Swift + SwiftUI`
3. `PostgreSQL + Supabase` como base atual
4. backend evoluindo para plataforma mais desacoplada e cloud-ready
5. `AWS` como direcao de infraestrutura
6. white-label por tenant desde a modelagem
7. mapa corporal inicial em `RN-SVG segmentado`
8. `3D` como trilha premium futura

## 14) Proximos passos sugeridos

1. auditoria de schema/policies/defaults para multi-tenant real
2. inventario de contratos que ainda dependem do runtime Next
3. desenho da API mobile-first
4. fundacao da conta `estudio-prod` na AWS
5. backlog fechado por fase do programa
