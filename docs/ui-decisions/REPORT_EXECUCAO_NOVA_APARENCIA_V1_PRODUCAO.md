# REPORT — Execução do Plano Nova Aparência/UX v1.0 (Produção)

## 1) Resumo executivo
- Agenda: header padronizado (saudação + mês clicável + tabs), correção de mês selecionado e troca de visão sem “pisca-pisca”.
- Agenda: busca em modal com resultados em tempo real (Agenda + Clientes) e CTA “Buscar”.
- Agenda: FAB inclui opção “Novo Cliente”.
- Shell/UI: padronização de layout em 3 partes (Header / Content / Navigation) com `ModulePage` e BottomNav fixa fora do scroll.
- Shell: BottomNav fixa e regras de visibilidade por rota aplicadas (inclui /clientes/novo, exclui /clientes/[id], /novo e /atendimento).
- Shell: moldura mobile agora ocupa toda a altura do viewport, sem cantos arredondados.
- Agenda: rolagem horizontal com drag em toda a área útil; cards com altura mínima e marcação de “Hoje”.
- Agenda: header colapsável, modal de busca com overlay, cards sem sobreposição e BottomNav mais compacta.
- Agenda: botão Hoje movido para o cabeçalho do dia, FAB menor/alinhada e menos padding inferior.
- Agenda: remoção do gap acima da BottomNav e ajuste de posição do FAB.
- Agenda: botão Hoje separado da tag e posicionado abaixo do cabeçalho.
- Agenda: cards com layout final (status, chips, botões de WhatsApp/GPS).
- Agenda: cards com altura mínima maior e indicador de conexão no header.
- Agenda: botão Hoje na linha do dia da semana; cards padronizados via componente único.
- Agenda: retorno do atendimento mantém dia/visão de origem.
- Agendamento online: fluxo público refeito em 4 etapas (WhatsApp, serviço/data/horário, revisão, pagamento Pix) com UI guiada pela Flora.
- Agendamento online: carrossel de datas, chips de horários, revisão tipo “ticket” e etapa de pagamento Pix integrada ao Mercado Pago (QR code, copiar e abrir Pix).
- Pagamentos MP: webhook interno criado (`/api/mercadopago/webhook`) para atualizar status e refletir no pagamento do agendamento.
- Agendamento online: busca de cliente por telefone com confirmação “Você é X?” + preenchimento automático.
- Agenda: central de mensagens automáticas via arquivo MD (templates editáveis sem mexer no código).
- TimerBubble: botão “X” para fechar contador flutuante.
- Agendamento interno (/novo): header padronizado, retorno para o dia correto, override de preço e buffers pré/pós configuráveis.
- Agendamento interno (/novo): seleção automática de cliente existente (anti-duplicidade), endereço domiciliar com busca por CEP ou texto e preenchimento inteligente.
- Agendamento interno (/novo): botões de busca de endereço com visual enterprise e persistência dos dados ao alternar local.
- Agendamento interno (/novo): botões "Buscar por CEP" e "Buscar endereço" com altura reduzida para otimizar o espaço.
- Agendamento interno (/novo): confirmação de envio da mensagem de agendamento com registro automático no modal.
- Clientes (lista/detalhe/novo): UI reescrita conforme HTML/PDF, header colapsável, índice A–Z completo, anti-duplicidade, múltiplos telefones/emails/endereço e saúde estruturada (alergias/condições + textos).
- Agenda: grade com meia-hora, horários menores por padrão e buffers de atendimento (pré/pós) visíveis.
- Agenda (Dia): escala **1 min = 2px** (slot 30 min = 60px), linhas tracejadas e altura dos cards alinhada exatamente à grade.
- Agenda (Dia): buffers com efeito “sanduíche” (listras diagonais + borda esquerda tracejada) e cards com layout elástico (pequeno/médio/grande) com botões adaptativos.
- Agenda (Dia): cards refatorados para exibir sempre 5 dados; versão compacta para 25–30min; status de agendamento como **dot** e status financeiro em **chip**.
- Agenda (Dia/Semana): cancelados ocultos na grade; cards domiciliares com cor correta; linhas de semana alinhadas ao padrão visual.
- Agenda: clique abre **Bottom Sheet** com gesto de arrastar para fechar e conteúdo dentro do frame.
- Agenda: bloqueios não impedem agendamento interno (apenas aviso no formulário); agendamento online continua respeitando bloqueios.
- Agenda (Dia/Semana): plantão agora aparece como **tag** no topo; bloqueios parciais seguem como cards com borda âmbar.
- Agenda: horário Brasil (America/Sao_Paulo) aplicado no cálculo de disponibilidade.
- UI: toast padrão para feedback de sucesso/erro.
- UI: módulos Financeiro (ex-Caixa) e Mensagens adicionados; FAB com ações financeiras em “em dev”.
- Atendimento: limpeza de debug, labels de observações ajustadas e nomenclatura sem “V4”.
- Atendimento: **pré-atendimento removido**, sessão vira etapa 1; checklist movido para a sessão; etapas reduzidas (sessão → checkout → pós).
- Atendimento: cancelamento de agendamento via modal com confirmação e refresh da agenda.
- Modal de detalhes: logística com mapa clicável; cabeçalho com badge de agendamento e chip financeiro; mensagens e observações ajustadas.
- Financeiro: seção de **Sinal/Reserva** no modal, com templates de WhatsApp e links públicos (pagamento + comprovante).
- Checkout: valor a cobrar considera sinal já pago (total restante).
- Gestão de Agenda: novo módulo de **Disponibilidade Inteligente** (macro calendário + micro detalhes), com gerador de escala, tipos de bloqueio e confirmação de conflitos.
- Gestão de Agenda: módulo integrado à visão **Mês** da Agenda (calendário + detalhes + “+ NOVO” + varinha), com remoção da tela `/bloqueios` e do atalho no FAB.
- Agenda: calendário mensal extraído para componente reutilizável (Agenda + Gestão de Agenda).
- Gestão de Agenda: layout refinado (cards compactos, calendário com legenda em pills e lista de bloqueios mais leve).
- Gestão de Agenda: modal de “Novo Bloqueio” redesenhado em bottom sheet com seleção de motivo, toggle e CTA fixo.
- Gestão de Agenda: resumo do mês removido; gerador automático compacto e ordem (escala → calendário → detalhes).
- Gestão de Agenda: gerador de escala virou botão que abre modal para mês + par/ímpar.
- Gestão de Agenda: botões do modal de escala renomeados para "Bloquear dias ímpares/pares".
- Gestão de Agenda: gerador automático virou botão compacto (ícone varinha) no cabeçalho da página.
- Calendário mensal: dia atual com círculo transparente e borda verde; dia selecionado com preenchimento verde.
- Gestão de Agenda: cores de bloqueio ajustadas (plantão vermelho, parcial âmbar) e dots com agendamentos/domicílio.
- Gestão de Agenda: legenda do calendário abaixo e detalhes do dia integrados no card do calendário.
- Gestão de Agenda: modais de **Novo Bloqueio** e **Gerador de Escala** reestilizados para seguir a mesma linguagem visual do modal de agendamento.
- Gestão de Agenda: card externo removido — calendário virou o único card, com legenda + divisor e detalhes do dia dentro dele.
- Gestão de Agenda: legenda do calendário voltou em formato de chip/card (pill) como no layout anterior.
- Gestão de Agenda: calendário com swipe horizontal entre meses; modais de bloqueio/escala com gesto de arrastar para fechar.
- Agenda: botão “+ NOVO” saiu do calendário e virou ação do FAB como **Bloquear horário** (abre modal com data editável).
- Gestão de Agenda: gerador de escala alerta quando já existe plantão no mês e solicita limpeza antes de gerar nova escala.
- Gestão de Agenda: título do modal de bloqueio acompanha a data selecionada no campo.
- Configurações: novo percentual de sinal e URL pública do estúdio; correção de exibição dos buffers (sem cache antigo).
- Público: página estática de pagamento “em produção” + imagem de comprovante adicionadas.
- DB: novas tabelas/colunas para endereços/contatos/saúde de clientes, buffers e price override, bucket de avatar e atualização da RPC de agendamento interno.
- DB: `availability_blocks` com `block_type` e `is_full_day` para suportar bloqueios inteligentes.
- Build: `useSearchParams` passou a rodar dentro de `<Suspense>` no layout do dashboard (fix de build em `/clientes/novo`).
- APIs internas: novas rotas para busca de endereço por texto (Google Places Autocomplete + Details) e guia de APIs.
- Repo/Docs: alinhamento de versões Node/pnpm, comandos de `next`/`turbo`/migrations e documentação de APIs.
- Repo/Docs: versão do Turbo ajustada para `2.8.3` (downgrade temporário para estabilidade do TUI no Windows).
- Dev: `pnpm dev` segue com o TUI padrão do Turbo (comportamento original).
- Dev/Editor: `$schema` removido do `turbo.json` para evitar aviso de schema não confiável no VSCode.
- Domínios: base pública padrão ajustada para `public.corpoealmahumanizado.com.br`.
- Build: ajuste de tipagem no RPC `create_internal_appointment` para evitar erro de build.
- Timezone: padronização para `America/Sao_Paulo` no app (via `APP_TIMEZONE`) e configuração do banco para evitar offsets.
- UX: remoção do envio automático de WhatsApp ao abrir modal; envio manual após agendar para evitar loops.
- UI: modais do formulário abrem dentro do frame do app; ajustes de classes canônicas e avisos de schema.

## 2) Checklist — Definition of Done (Produção v1.0)
- [x] Visual seguindo HTML + Auditoria Visual (tipografia, tokens, layout e hierarquia).
- [x] UI ↔ DB 1:1 (campos exibidos com backing no DB, dados novos persistidos).
- [x] Mutação via Server Actions (sem writes client-side).
- [x] Qualidade (pnpm lint/check-types/build).
- [x] Atendimento padrão sem fallback (UI antiga não usada).

## 3) Migrations adicionadas
1. `20260203100000_add_client_addresses.sql` — tabela `client_addresses` + backfill + `appointments.client_address_id`.
2. `20260203101000_add_client_contacts.sql` — tabelas `client_phones`/`client_emails` + `clients.extra_data`, `clients.avatar_url`, `clients.clinical_history`, `clients.anamnese_url`.
3. `20260203102000_add_buffers_and_price_override.sql` — buffers em `settings/services` + `appointments.price_override`.
4. `20260203103000_update_internal_appointment_rpc.sql` — RPC `create_internal_appointment` com endereço do cliente, buffers e override de preço.
5. `20260203104000_add_client_health_items.sql` — tabela `client_health_items` (alergias/condições).
6. `20260203105000_add_client_avatars_bucket.sql` — bucket `client-avatars` + policies.
7. `20260209090000_add_signal_percentage_to_settings.sql` — configura percentual de sinal no `settings`.
8. `20260209091000_add_public_base_url_to_settings.sql` — configura URL pública do estúdio no `settings`.
9. `20260210230000_update_availability_blocks_types.sql` — adiciona `block_type` + `is_full_day` em `availability_blocks`.
10. `20260211120000_backfill_client_phones.sql` — backfill de `clients.phone` para `client_phones` (sem duplicar).

## 4) Commits (hash + objetivo)
- `e1b8aa3` — docs(ui): add agenda v1 html specs
- `bf71ac9` — chore: update repo config
- `add7e08` — chore: update pnpm lockfile
- `401350e` — docs(ui): update agenda notes and add atendimento spec
- `548f574` — ui(agenda): refresh agenda layout and navigation
- `dfd4cb0` — ui(appointment): restyle internal appointment form
- `8ca4b9e` — feat(appointments): persist internal notes
- `c012498` — chore(ui): update favicon
- `c7afe75` — docs(plan): add atendimento ui v4 plan
- `a513493` — chore(db): add attendance tables and backfill
- `6787152` — feat(attendance): data layer and actions
- `8230e25` — feat(attendance): hub and stages shell
- `1697032` — feat(timer): global provider and bubble
- `9bcfda8` — chore(agenda): fix week header typing
- `e5669e6` — docs(report): execution report
- `1a5fcaa` — chore(package): update pnpm version to 10.28.2
- `7210b88` — Refactor code structure for improved readability and maintainability
- `0472d09` — feat: add new client list and details UI with responsive design
- `86699f8` — feat: adicionar novo documento de design para a nova aparência da UI
- `6542a34` — ui-system(v1): tokens, fonts, componentes canonicos e docs
- `eff58db` — agenda(ui): aderencia ao HTML/PDF + busca real
- `30702d0` — agendamento-interno(ui): form alinhado ao HTML
- `c20411b` — chore(db): add attendance messages and client flags
- `af3f7fd` — atendimento(v1-prod): etapas, mensageria e checkout
- `7bd409f` — clientes(v1): lista, detalhe e cadastro alinhados
- `eed8428` — docs(ui): plano v1 producao e revisao
- `d754e16` — docs(report): execucao nova aparencia v1
- `061770f` — fix(layout): ajustar peso da fonte Lato para incluir 300
- `6e9cde3` — feat(attendance): alinhar layout ao HTML final
- `0722ee1` — docs(report): atualizar atendimento v1-prod
- `22c5f57` — clientes(v1): ui alinhada e auditoria db
- `e68170b` — atendimento(v1): db audit e mensagens
- `2ac687c` — docs(report): atualizar auditoria db ui
- `72d1596` — docs(report): atualizar lista de commits
- `49fe6f4` — docs(report): atualizar resultados de testes
- `9cae13c` — fix(build): importar zod no atendimento
- `3fdd134` — docs(report): registrar fix do build
- `2f83cad` — fix(build): ajustar payload da mensageria
- `1fffc7f` — docs(report): registrar fix do payload
- `08a2b1e` — fix(build): proteger iniciais do cliente
- `2b8b052` — docs(report): registrar fix das iniciais
- `1119201` — fix(lint): clean imports and hooks
- `8790a11` — docs(report): registrar fix de lint
- `129522f` — fix(types): tornar clientes null-safe
- `ca4728b` — docs(report): registrar fix typecheck
- `3e98d65` — fix(types): tipar listAppointmentsForClients
- `7af4a74` — docs(report): registrar fix de tipos
- `e530103` — refactor(attendance): remover fallback e documentar sql
- `03a1dc7` — docs(report): registrar remoção do fallback
- `712d116` — fix(shell): bottom-nav fixa e regras por rota
- `2b5e5a3` — fix(agenda): linha de horario atual dinamica
- `4518348` — feat(db): enderecos, contatos e buffers
- `27a1775` — feat(agendamento): retorno, buffers e override
- `6a0bf8a` — feat(clientes): telas e dados estruturados
- `b56e0dd` — refactor(atendimento): ajustes e limpeza
- `dce4907` — fix(agenda): tipagem e sync de data
- `0f93f8b` — docs: atualiza notas de sql e report
- `0cbad8c` — docs(report): atualiza execucao v1
- `f187f2c` — fix(ui): ajustes de navegação e moldura
- `ca2547a` — docs(report): atualiza correcoes recentes
- `201b833` — fix(shell): moldura mobile com altura fixa
- `8fe6319` — fix(shell): altura do frame galaxy s25
- `706a9b7` — fix(shell): frame sem arredondamento e proporcao s25
- `7989456` — fix(shell): frame ocupa altura total do viewport
- `f8ea4af` — feat(ui): header modulo e busca na agenda
- `9a465a4` — docs(report): atualiza header e busca
- `e9d3d71` — docs(ui-system): documenta frame mobile
- `6a0074a` — docs(report): inclui commits recentes
- `74dc683` — fix(agenda): header, busca e scroll
- `297298a` — docs(report): registra ajustes da agenda
- `e0358ba` — fix(agenda): header e cards
- `1b310c9` — docs(report): registra ajustes de header e cards
- `a29de08` — fix(agenda): ajustes finais de layout
- `7d0642d` — fix(agenda): header e fab
- `a678796` — docs(report): registra ajustes do header agenda
- `1057116` — fix(agenda): remove gap e ajustar fab
- `0df8628` — docs(report): registra ajuste do gap
- `6e799ab` — fix(agenda): botao hoje e timer bubble
- `c9d6c5f` — fix(agenda): separa botao hoje
- `8090e36` — docs(report): registra botao hoje
- `9364503` — feat(agenda): cards conforme layout
- `bbe4ea9` — docs(report): registra cards agenda
- `6e87a87` — fix(agenda): cards altos e status conexao
- `fa7009d` — docs(report): registra status conexao
- `18d7b3e` — fix(agenda): hoje confiavel e cards clicaveis
- `153063f` — fix(agenda): header hoje e card padrao
- `421430f` — fix(agenda): botoes no card e voltar correto
- `7b34813` — fix(lint): imagens e tipos de contatos
- `307e066` — fix(build): add STORAGE_ERROR code
- `2e00e41` — fix(build): annotate client repo return types
- `0f5e5c6` — fix(build): type supabase errors in client repo
- `24c1975` — fix(deps): atualizar versão do turbo para 2.8.3
- `6875464` — docs(report): atualiza execucao e validacoes
- `bd176eb` — fix(agenda): nav fixa e feedback de clique
- `9254605` — fix(shell): nav fixa e scroll touch
- `49fec96` — fix(shell): scroll nativo e nav no fluxo
- `38d8c35` — fix(shell): min-h-0 para scroll estavel
- `1edb4e8` — fix(agenda): touch nativo e scroll unico
- `36f373e` — fix(agenda): scroll unico sem pointer
- `8b1a9f2` — chore(debug): overlay para detectar camada
- `3adfc71` — fix(agenda): fab nao bloqueia toques
- `97bad7b` — refactor(ui): module layout for agenda and clients
- `2a42447` — fix(layout): adiciona Suspense ao layout do dashboard
- `5000b42` — docs(ui): layout 3-partes e debug
- `abecd1d` — docs(report): registrar commit de layout
- `8bf85e4` — feat(ui): financeiro, mensagens e fab
- `5a38fd1` — fix(ui): ajusta comportamento de scroll horizontal no componente MobileAgenda
- `9f71cca` — fix(agenda): busca cliente e horarios
- `3d8056f` — fix(agenda): horario brasil e grade meia-hora
- `2d61bbb` — fix(ui): buffers e toasts
- `27ed47d` — feat(clients): importar contatos do dispositivo
- `c678b52` — feat(appointments): buffers, edicao e conflito de horarios
- `f9dd942` — feat(agenda): busca, buffers e interacoes
- `bc55607` — chore(lint): ajustar dependencias e imports
- `0301836` — fix(build): guard buffers and time parsing
- `4be823e` — docs(report): atualiza resumo e commits recentes
- `dd3a559` — fix(build): null-safe buffers in availability
- `0d988b2` — fix(agenda): ajusta altura das horas na agenda para melhor visualização
- `da2b77f` — fix(agenda): aumenta a altura das horas na agenda para melhor visualização
- `1ed83b7` — fix(ui): ajustar classes e agenda
- `c6f268c` — chore: align node/pnpm versions and deps
- `af03117` — docs: add next/turbo and migration commands
- `cf89097` — feat(attendance): simplificar fluxo e ajuste de checkout
- `b65f414` — feat(agenda): cards, modal e links financeiros
- `3a73a7e` — feat(settings): sinal e url publica
- `7bbb998` — docs(report): atualizar execucao v1
- `36d967a` — fix(agenda): tipagem do status financeiro no modal
- `0e25743` — feat(receipts): comprovante publico e pagina de pagamento
- `281eb00` — chore(config): atualizar url publica padrao
- `cea1941` — fix(receipts): ajustar lint e estilos de impressao
- `b6edbb2` — fix(receipts): liberar comprovante com base em pagamentos
- `e7bdafa` — docs(manual): comandos de update do supabase
- `92d804b` — feat(agenda): registrar pagamento manual e novo recibo
- `8446859` — fix(agenda): ajustar opcoes de registro manual
- `5e3bbac` — chore(agenda): reordenar secoes do modal
- `3dabdc5` — fix(agenda): sincronizar confirmacao com status
- `9f3fa59` — feat(receipts): ajustar layout do comprovante
- `e6c1254` — feat(ui): adicionar overlay no menu flutuante
- `9fa6533` — style(ui): refinar menu flutuante
- `9bfbe01` — chore(ui): ajustar ordem do menu flutuante
- `90db805` — style(appointments): alinhar visual do formulario
- `0a9f7f7` — feat(appointments): confirmar envio ao agendar
- `f47ad17` — feat(appointments): google places e melhorias no agendamento
- `7e81af0` — docs(report): atualizar execucao v1
- `cd94d3b` — fix(build): ajustar tipagem no create_internal_appointment
- `1191267` — fix(agenda): envio whatsapp manual e fluxo pos-agendar
- `6dd8a66` — docs(report): atualizar execucao v1
- `6c683e1` — fix(form): reduzir altura dos botoes de endereco
- `e997ce7` — chore(deps): atualizar turbo para 2.8.4
- `e86acc1` — docs: atualizar versao do turbo
- `7c4ef17` — docs(report): atualizar execucao v1
- `225a2cb` — chore(dev): usar turbo em modo stream
- `3137abd` — revert(dev): restaurar turbo tui no pnpm dev
- `982e37b` — docs(report): registrar ajuste do turbo dev
- `65fd940` — fix(dev): executar turbo sem daemon no pnpm dev
- `2e91dfc` — docs(report): registrar ajuste do daemon no dev
- `6799a0c` — chore(deps): atualizar turbo para 2.8.5
- `304b9fb` — docs: atualizar versao do turbo para 2.8.5
- `2902cda` — chore(dev): restaurar schema do turbo.json
- `87fd9f7` — docs(report): registrar schema do turbo
- `597fd3d` — chore(deps): fixar turbo em 2.8.3
- `fd4849a` — docs: registrar downgrade do turbo
- `ccdddd5` — docs(report): registrar downgrade turbo
- `ff5fe93` — revert(dev): restaurar config original do turbo
- `d5a8eb8` — docs(report): registrar revert do turbo
- `8bd573e` — feat(messages): centralizar templates automáticos
- `854cee3` — feat(agenda): gestao de disponibilidade inteligente
- `f1b9b63` — docs(report): atualizar gestao de agenda
- `f245daf` — docs(report): atualizar lista de commits
- `9b178e9` — fix(agenda): ajustar tipos do availability manager
- `9a7f31b` — docs(report): registrar ajuste de tipos
- `9a4d5c0` — fix(build): remover helper nao-async em server actions
- `2e9d1bd` — docs(report): registrar fix de build
- `e445ef0` — fix(ui): evitar keys duplicadas no calendario
- `14de14c` — docs(report): registrar fix de keys
- `1d0d6b4` — refactor(ui): padronizar calendario e layout da gestao
- `3e7f9f7` — docs(report): registrar padronizacao do calendario
- `c6ed720` — docs(report): atualizar lista de commits
- `c700723` — fix(ui): ajustar alinhamento do header na gestao
- `83e803a` — docs(report): registrar ajuste de layout
- `3d62dc1` — style(ui): refinar gestao de agenda
- `906f818` — docs(report): registrar refinamento da gestao
- `d6d5a3f` — style(ui): redesenhar modal de novo bloqueio
- `a4472b7` — docs(report): registrar modal de bloqueio
- `a332c1a` — style(ui): compactar escala e modal com titulo
- `4ea0495` — docs(report): registrar ajustes de agenda
- `855e7af` — docs(report): atualizar lista de commits
- `307a8fd` — style(ui): mover gerador de escala para modal
- `aa0ea53` — docs(report): registrar modal de escala
- `f1c910b` — fix(ui): renomear botoes do modal de escala
- `2fa080c` — docs(report): registrar renomeacao de botoes
- `d2fed94` — style(ui): mover gerador para botao no header
- `d857106` — docs(report): registrar botao do gerador
- `3631caf` — style(ui): ajustar destaque de dia atual
- `d52f05b` — docs(report): registrar ajuste do calendario
- `2486807` — style(ui): ajustar cores e dots do calendario
- `d83d56b` — docs(report): registrar cores do calendario
- `bcdda35` — style(ui): integrar detalhes ao calendario
- `97c48ca` — docs(report): registrar integracao de detalhes
- `8926463` — refactor(agenda): mover gestão para visão mês
- `c3ad877` — docs(report): atualizar gestão de agenda na visão mês
- `bffe3f9` — docs(report): registrar commits da gestão na visão mês
- `a7afc30` — style(agenda): alinhar modais da gestão ao modal do agendamento
- `875ecec` — docs(report): registrar atualização de modais
- `8ac6332` — docs(report): atualizar lista de commits
- `9ba185f` — refactor(ui): simplificar card do calendário na visão mês
- `869e122` — docs(report): registrar ajuste no card do calendário
- `a21ffc3` — docs(report): atualizar lista de commits
- `5f63161` — feat(agenda): permitir agendar internamente apesar de bloqueios
- `21ac653` — docs(report): registrar regra de bloqueios
- `831ca62` — docs(report): atualizar lista de commits
- `b2522cb` — fix(agenda): resetar aviso de plantão ao limpar data
- `16de473` — docs(report): atualizar lista de commits
- `e09d127` — style(ui): ajustar legenda do calendario em pill
- `ddb2ce3` — docs(report): registrar ajuste da legenda
- `a6d2506` — style(agenda): ajustar exibição de bloqueios na visão dia/semana
- `5581b8f` — docs(report): registrar ajuste de bloqueios
- `ebb317d` — feat(agenda): swipe de meses e bloqueio via FAB
- `6a47367` — docs(report): registrar swipe e bloqueio via fab
- `e09a28a` — docs(report): atualizar lista de commits
- `89fb043` — Fix availability manager errors and update manual

## 5) Arquivos/pastas principais alterados
- `apps/web/app/(dashboard)/clientes/*` (lista, novo, detalhe)
- `apps/web/app/(dashboard)/novo/*` (form de agendamento interno)
- `apps/web/components/mobile-agenda.tsx`
- `apps/web/components/agenda/appointment-card.tsx`
- `apps/web/components/agenda/appointment-details-sheet.tsx`
- `apps/web/components/availability-manager.tsx`
- `apps/web/components/agenda/month-calendar.tsx`
- `apps/web/app/(public)/agendar/[slug]/booking-flow.tsx`
- `apps/web/app/(public)/agendar/[slug]/page.tsx`
- `apps/web/app/(dashboard)/admin/escala/actions.ts`
- `apps/web/app/(dashboard)/bloqueios/actions.ts`
- `apps/web/app/(dashboard)/novo/availability.ts`
- `apps/web/src/modules/clients/*`
- `apps/web/src/modules/appointments/*`
- `apps/web/src/modules/appointments/availability.ts`
- `apps/web/app/(dashboard)/configuracoes/*`
- `apps/web/src/modules/settings/*`
- `apps/web/src/shared/config.ts`
- `apps/web/src/shared/auto-messages.*`
- `apps/web/content/auto-messages.md`
- `apps/web/components/ui/*` (inclui ModuleHeader)
- `apps/web/components/ui/module-page.tsx` (layout em 3 partes: Header/Content)
- `apps/web/app/api/search/route.ts` (busca global para o modal da Agenda)
- `apps/web/app/api/address-search/route.ts` (Google Places Autocomplete)
- `apps/web/app/api/address-details/route.ts` (Google Places Details)
- `apps/web/app/api/mercadopago/webhook/route.ts` (webhook Mercado Pago)
- `apps/web/public/assets/*` e `apps/web/public/pagamento-link.html`
- `supabase/migrations/*` (novas migrations acima)
- `docs/apis/API_GUIDE.md`
- `MANUAL_RAPIDO.md`

## 6) Como rodar migrations localmente
```powershell
pnpm supabase start
pnpm supabase migration up
```

## 7) Como aplicar migrations no remoto (sem apagar dados)
```powershell
pnpm supabase login
pnpm supabase link --project-ref <seu_project_ref>
pnpm supabase db push
```

## 8) Como testar manualmente (roteiro rápido)
- Agenda DIA: linha vermelha move e posiciona; trocar tabs; clicar em “Hoje”.
- Agenda DIA: cards alinhados à grade de 30 min (60px), layout elástico (pequeno/médio/grande) e buffers em efeito sanduíche.
- Agenda: abrir modal de busca (ícone) e validar resultados em tempo real.
- Agenda: buffers pré/pós respeitam o tempo total e a grade de meia hora.
- /novo: header, voltar para o dia de origem, domicílio (modal), override de preço e buffers.
- /clientes: header colapsa, índice A–Z, filtros VIP/Atenção/Novos.
- /clientes/novo: importar contato, múltiplos telefones, saúde estruturada, salvar.
- /clientes/[id]: header colapsa, avatar, telefones/endereço, tags e histórico.
- /financeiro e /mensagens: telas base em “em dev” e navegação inferior.

## 9) Decisão de arquitetura — Layout em 3 partes (Header / Content / Navigation)
- **Padrão:** toda tela segue Header + Content + Navigation, com `AppShell` controlando o frame e `ModulePage` entregando o layout interno.
- **Scroll único:** o container `data-shell-scroll` é o único scroll vertical; BottomNav fica fora dele (grid row) para permanecer fixa sem “zonas mortas”.
- **FAB/overlays:** elementos flutuantes (ex.: FAB) ficam em overlay controlado, com posição relativa ao `--nav-height`.
- **Objetivo:** layout previsível, modular e pronto para animações de header colapsável.

## 10) Debug — investigação de scroll/touch (detalhamento)
- **Sintomas:** metade inferior com scroll/clique ruim; “zonas mortas” em touch e atraso no gesto.
- **Hipóteses testadas:** pointer-capture indevido em touch; overlays invisíveis; múltiplos containers de scroll competindo.
- **Ferramentas:** `DebugPointerOverlay`, outlines de hitbox, inspeção de overlays e containers (AppShell + agenda).
- **Resultado:** padronização do scroll em um único container + layout 3-partes + FAB isolado em overlay sem capturar toque.

## 11) Testes e validações (execução)
Comandos executados na raiz:
- `pnpm lint` ✅
- `pnpm check-types` ✅
- `pnpm build` ✅
- `pnpm test` — **não existe script** no repo.
Última rodada:
- `pnpm lint` ✅
- `pnpm build` ✅

## 12) Pendências / próximos passos
- Validar bucket `client-avatars` no Supabase (policies aplicadas) e upload real em produção.
- Revisar visual do atendimento para aderir ao HTML final (se necessário ajuste adicional).
- Configurar `GOOGLE_MAPS_API_KEY` nas variáveis de ambiente da Vercel (produção).

## 13) Gestão de Disponibilidade Inteligente (novo módulo)
- **Posicionamento:** Gestão de Agenda foi incorporada diretamente na visão **Mês** da Agenda (sem rota própria), removendo `/bloqueios` e concentrando tudo no card do calendário.
- **Calendário reutilizável:** componente `MonthCalendar` virou peça única (Agenda + Gestão), com header/actions, dots por tipo e swipe horizontal entre meses.
- **Destaques do dia:** dia atual usa círculo transparente com borda verde; dia selecionado fica preenchido em verde com texto branco.
- **Legenda e detalhes:** legenda voltou ao formato de pill (chip) e fica dentro do card; detalhes do dia selecionado aparecem no mesmo card.
- **Indicadores visuais no mês:** dots para atendimentos (verde), domicílio (roxo), plantão (vermelho), parcial (âmbar) e demais tipos.
- **Gerador de escala (plantão):** botão de varinha abre modal; escolha do mês + “Bloquear dias ímpares/pares”.
- **Escala sem duplicidade:** se já houver plantão no mês, modal avisa e solicita apagar antes de gerar nova escala.
- **Limpeza inteligente:** ao gerar escala, remove apenas `shift` do mês, preservando bloqueios pessoais/administrativos/vacation.
- **Novo bloqueio (horário):** ação saiu do card e passou para o FAB como **Bloquear horário**.
- **Data editável:** modal abre com a data da visão atual (dia ou data selecionada) e permite alterar; título do modal acompanha a data escolhida no input.
- **Modal de bloqueio:** bottom sheet com motivo (ícones), toggle Dia Inteiro, horários quando parcial e campo de título.
- **Estética consistente:** modais de bloqueio/escala seguem o mesmo padrão visual do modal de agendamento (tipografia, seções, sombras, botões).
- **Conflitos controlados:** bloqueios sobrepostos são impedidos; se houver agendamentos no intervalo, sistema pede confirmação e mantém atendimentos.
- **Tipos de bloqueio:** `shift`, `personal`, `vacation`, `administrative` com cores/ícones consistentes (plantão vermelho, parcial âmbar).
- **Day/Week view:** plantão aparece como tag no topo com ícone de hospital; bloqueios parciais são cards com borda âmbar.
- **Agendamento interno:** bloqueios não impedem agendar; apenas avisam no formulário (plantão ou bloqueio parcial).
- **Agendamento online:** bloqueios continuam removendo horários da disponibilidade pública.
- **Disponibilidade:** cálculo de slots considera bloqueios via `availability.ts` (start/end time) e respeita buffers.
- **Estrutura de dados:** `availability_blocks` com `block_type` + `is_full_day` e backfill para registros antigos.
- **Fluxo público humanizado:** agendamento online em 4 etapas (WhatsApp → seleção → revisão → pagamento Pix) com UI guiada, carrossel de datas e ticket de confirmação.
- **Pagamento Pix integrado (MP):** criação de pagamento via API `v1/payments` com idempotência, retorno de `ticket_url`, `qr_code` e `qr_code_base64` para exibição/uso no checkout público.
- **Env do MP:** integração usa `MERCADOPAGO_ACCESS_TOKEN` (obrigatório) e `MERCADOPAGO_WEBHOOK_URL` (opcional).
- **Webhook MP:** rota pública `/api/mercadopago/webhook` consulta o pagamento no MP e atualiza `appointment_payments` + `appointments.payment_status`.
