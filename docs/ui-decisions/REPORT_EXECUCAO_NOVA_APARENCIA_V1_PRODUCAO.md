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
- TimerBubble: botão “X” para fechar contador flutuante.
- Agendamento interno (/novo): header padronizado, retorno para o dia correto, override de preço e buffers pré/pós configuráveis.
- Agendamento interno (/novo): seleção automática de cliente existente (anti-duplicidade), endereço domiciliar com busca por CEP ou texto e preenchimento inteligente.
- Agendamento interno (/novo): confirmação de envio da mensagem de agendamento com registro automático no modal.
- Clientes (lista/detalhe/novo): UI reescrita conforme HTML/PDF, header colapsável, índice A–Z completo, anti-duplicidade, múltiplos telefones/emails/endereço e saúde estruturada (alergias/condições + textos).
- Agenda: grade com meia-hora, horários menores por padrão e buffers de atendimento (pré/pós) visíveis.
- Agenda (Dia): escala **1 min = 2px** (slot 30 min = 60px), linhas tracejadas e altura dos cards alinhada exatamente à grade.
- Agenda (Dia): buffers com efeito “sanduíche” (listras diagonais + borda esquerda tracejada) e cards com layout elástico (pequeno/médio/grande) com botões adaptativos.
- Agenda (Dia): cards refatorados para exibir sempre 5 dados; versão compacta para 25–30min; status de agendamento como **dot** e status financeiro em **chip**.
- Agenda (Dia/Semana): cancelados ocultos na grade; cards domiciliares com cor correta; linhas de semana alinhadas ao padrão visual.
- Agenda: clique abre **Bottom Sheet** com gesto de arrastar para fechar e conteúdo dentro do frame.
- Agenda: horário Brasil (America/Sao_Paulo) aplicado no cálculo de disponibilidade.
- UI: toast padrão para feedback de sucesso/erro.
- UI: módulos Financeiro (ex-Caixa) e Mensagens adicionados; FAB com ações financeiras em “em dev”.
- Atendimento: limpeza de debug, labels de observações ajustadas e nomenclatura sem “V4”.
- Atendimento: **pré-atendimento removido**, sessão vira etapa 1; checklist movido para a sessão; etapas reduzidas (sessão → checkout → pós).
- Atendimento: cancelamento de agendamento via modal com confirmação e refresh da agenda.
- Modal de detalhes: logística com mapa clicável; cabeçalho com badge de agendamento e chip financeiro; mensagens e observações ajustadas.
- Financeiro: seção de **Sinal/Reserva** no modal, com templates de WhatsApp e links públicos (pagamento + comprovante).
- Checkout: valor a cobrar considera sinal já pago (total restante).
- Configurações: novo percentual de sinal e URL pública do estúdio; correção de exibição dos buffers (sem cache antigo).
- Público: página estática de pagamento “em produção” + imagem de comprovante adicionadas.
- DB: novas tabelas/colunas para endereços/contatos/saúde de clientes, buffers e price override, bucket de avatar e atualização da RPC de agendamento interno.
- Build: `useSearchParams` passou a rodar dentro de `<Suspense>` no layout do dashboard (fix de build em `/clientes/novo`).
- APIs internas: novas rotas para busca de endereço por texto (Google Places Autocomplete + Details) e guia de APIs.
- Repo/Docs: alinhamento de versões Node/pnpm, comandos de `next`/`turbo`/migrations e documentação de APIs.

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

## 4) Commits (hash + objetivo)
- `af03117` — docs: add next/turbo and migration commands
- `c6f268c` — chore: align node/pnpm versions and deps
- `1ed83b7` — fix(ui): ajustar classes e agenda
- `da2b77f` — fix(agenda): aumenta a altura das horas na agenda para melhor visualização
- `0d988b2` — fix(agenda): ajusta altura das horas na agenda para melhor visualização
- `dd3a559` — fix(build): null-safe buffers in availability
- `4be823e` — docs(report): atualiza resumo e commits recentes
- `f8ea4af` — feat(ui): header modulo e busca na agenda
- `e0358ba` — fix(agenda): header e cards
- `18d7b3e` — fix(agenda): hoje confiavel e cards clicaveis
- `153063f` — fix(agenda): header hoje e card padrao
- `421430f` — fix(agenda): botoes no card e voltar correto
- `7b34813` — fix(lint): imagens e tipos de contatos
- `307e066` — fix(build): add STORAGE_ERROR code
- `2e00e41` — fix(build): annotate client repo return types
- `0f5e5c6` — fix(build): type supabase errors in client repo
- `24c1975` — fix(deps): atualizar versão do turbo para 2.8.3
- `7d0642d` — fix(agenda): header e fab
- `1057116` — fix(agenda): remove gap e ajustar fab
- `c9d6c5f` — fix(agenda): separa botao hoje
- `9364503` — feat(agenda): cards conforme layout
- `6e87a87` — fix(agenda): cards altos e status conexao
- `74dc683` — fix(agenda): header, busca e scroll
- `9a465a4` — docs(report): atualiza header e busca
- `e9d3d71` — docs(ui-system): documenta frame mobile
- `7989456` — fix(shell): frame ocupa altura total do viewport
- `706a9b7` — fix(shell): frame sem arredondamento e proporcao s25
- `8fe6319` — fix(shell): altura do frame galaxy s25
- `201b833` — fix(shell): moldura mobile com altura fixa
- `ca2547a` — docs(report): atualiza correcoes recentes
- `f187f2c` — fix(ui): ajustes de navegação e moldura
- `0cbad8c` — docs(report): atualiza execucao v1
- `0f93f8b` — docs: atualiza notas de sql e report
- `dce4907` — fix(agenda): tipagem e sync de data
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

## 5) Arquivos/pastas principais alterados
- `apps/web/app/(dashboard)/clientes/*` (lista, novo, detalhe)
- `apps/web/app/(dashboard)/novo/*` (form de agendamento interno)
- `apps/web/components/mobile-agenda.tsx`
- `apps/web/components/agenda/appointment-card.tsx`
- `apps/web/components/agenda/appointment-details-sheet.tsx`
- `apps/web/src/modules/clients/*`
- `apps/web/src/modules/appointments/*`
- `apps/web/app/(dashboard)/configuracoes/*`
- `apps/web/src/modules/settings/*`
- `apps/web/src/shared/config.ts`
- `apps/web/components/ui/*` (inclui ModuleHeader)
- `apps/web/components/ui/module-page.tsx` (layout em 3 partes: Header/Content)
- `apps/web/app/api/search/route.ts` (busca global para o modal da Agenda)
- `apps/web/app/api/address-search/route.ts` (Google Places Autocomplete)
- `apps/web/app/api/address-details/route.ts` (Google Places Details)
- `apps/web/public/assets/*` e `apps/web/public/pagamento-link.html`
- `supabase/migrations/*` (novas migrations acima)
- `docs/apis/API_GUIDE.md`

## 6) Como rodar migrations localmente
```bash
supabase db push --local
```

## 7) Como aplicar migrations no remoto (sem apagar dados)
```bash
supabase db push
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

## 12) Pendências / próximos passos
- Validar bucket `client-avatars` no Supabase (policies aplicadas) e upload real em produção.
- Revisar visual do atendimento para aderir ao HTML final (se necessário ajuste adicional).
- Configurar `GOOGLE_MAPS_API_KEY` nas variáveis de ambiente da Vercel (produção).
