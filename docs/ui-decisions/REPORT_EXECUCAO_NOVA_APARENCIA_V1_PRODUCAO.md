# REPORT — Execução do Plano Nova Aparência/UX v1.0 (Produção)

## 1) Resumo executivo
- Agenda: header padronizado (saudação + mês clicável + tabs), correção de mês selecionado e troca de visão sem “pisca-pisca”.
- Agenda: busca em modal com resultados em tempo real (Agenda + Clientes) e CTA “Buscar”.
- Agenda: FAB inclui opção “Novo Cliente”.
- Shell: BottomNav fixa e regras de visibilidade por rota aplicadas (inclui /clientes/novo, exclui /clientes/[id], /novo e /atendimento).
- Shell: moldura mobile agora ocupa toda a altura do viewport, sem cantos arredondados.
- Agenda: rolagem horizontal com drag em toda a área útil; cards com altura mínima e marcação de “Hoje”.
- Agenda: header colapsável, modal de busca com overlay, cards sem sobreposição e BottomNav mais compacta.
- Agenda: botão Hoje movido para o cabeçalho do dia, FAB menor/alinhada e menos padding inferior.
- Agenda: remoção do gap acima da BottomNav e ajuste de posição do FAB.
- Agendamento interno (/novo): header padronizado, retorno para o dia correto, domicílio com endereços do cliente (modal + cadastro), override de preço e buffers pré/pós configuráveis.
- Clientes (lista/detalhe/novo): UI reescrita conforme HTML/PDF, header colapsável, índice A–Z completo, anti-duplicidade, múltiplos telefones/emails/endereço e saúde estruturada (alergias/condições + textos).
- Atendimento: limpeza de debug, labels de observações ajustadas e nomenclatura sem “V4”.
- DB: novas tabelas/colunas para endereços/contatos/saúde de clientes, buffers e price override, bucket de avatar e atualização da RPC de agendamento interno.

## 2) Checklist — Definition of Done (Produção v1.0)
- [x] Visual seguindo HTML + Auditoria Visual (tipografia, tokens, layout e hierarquia).
- [x] UI ↔ DB 1:1 (campos exibidos com backing no DB, dados novos persistidos).
- [x] Mutação via Server Actions (sem writes client-side).
- [ ] Qualidade (pnpm lint/check-types/build) — **não concluído por problemas de ambiente**.
- [x] Atendimento padrão sem fallback (UI antiga não usada).

## 3) Migrations adicionadas
1. `20260203100000_add_client_addresses.sql` — tabela `client_addresses` + backfill + `appointments.client_address_id`.
2. `20260203101000_add_client_contacts.sql` — tabelas `client_phones`/`client_emails` + `clients.extra_data`, `clients.avatar_url`, `clients.clinical_history`, `clients.anamnese_url`.
3. `20260203102000_add_buffers_and_price_override.sql` — buffers em `settings/services` + `appointments.price_override`.
4. `20260203103000_update_internal_appointment_rpc.sql` — RPC `create_internal_appointment` com endereço do cliente, buffers e override de preço.
5. `20260203104000_add_client_health_items.sql` — tabela `client_health_items` (alergias/condições).
6. `20260203105000_add_client_avatars_bucket.sql` — bucket `client-avatars` + policies.

## 4) Commits (hash + objetivo)
- `f8ea4af` — feat(ui): header modulo e busca na agenda
- `e0358ba` — fix(agenda): header e cards
- `7d0642d` — fix(agenda): header e fab
- `1057116` — fix(agenda): remove gap e ajustar fab
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

## 5) Arquivos/pastas principais alterados
- `apps/web/app/(dashboard)/clientes/*` (lista, novo, detalhe)
- `apps/web/app/(dashboard)/novo/*` (form de agendamento interno)
- `apps/web/components/mobile-agenda.tsx`
- `apps/web/src/modules/clients/*`
- `apps/web/src/modules/appointments/*`
- `apps/web/app/(dashboard)/configuracoes/*`
- `apps/web/components/ui/*` (inclui ModuleHeader)
- `apps/web/app/api/search/route.ts` (busca global para o modal da Agenda)
- `supabase/migrations/*` (novas migrations acima)

## 6) Como rodar migrations localmente
```bash
supabase db push --local
```

## 7) Como testar manualmente (roteiro rápido)
- Agenda DIA: linha vermelha move e posiciona; trocar tabs; clicar em “Hoje”.
- Agenda: abrir modal de busca (ícone) e validar resultados em tempo real.
- /novo: header, voltar para o dia de origem, domicílio (modal), override de preço e buffers.
- /clientes: header colapsa, índice A–Z, filtros VIP/Atenção/Novos.
- /clientes/novo: importar contato, múltiplos telefones, saúde estruturada, salvar.
- /clientes/[id]: header colapsa, avatar, telefones/endereço, tags e histórico.

## 8) Testes e validações (execução)
Comandos tentados na raiz:
- `pnpm exec turbo run lint`
- `pnpm exec turbo run check-types`
- `pnpm exec turbo run build`

Resultado: **falharam por ambiente**.
- Turbo não encontrou binário Linux (node_modules com binário Windows).
- `pnpm install` falhou por permissão no WSL (`EACCES` ao renomear node_modules).

## 9) Pendências / próximos passos
- Reinstalar `node_modules` no WSL (ou rodar comandos no Windows nativo) para executar lint/check-types/build.
- Validar bucket `client-avatars` no Supabase (policies aplicadas) e upload real em produção.
- Revisar visual do atendimento para aderir ao HTML final (se necessário ajuste adicional).
