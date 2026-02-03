# REPORT — Execução do Plano Nova Aparência/UX v1.0 (Produção)

## 1) Resumo executivo
- Agenda: linha de “horário atual” posicionada corretamente e atualização em tempo real; sync de data via querystring.
- Agenda: tabs DIA/SEMANA/MÊS com sync de URL (sem reset para “DIA”).
- Shell: BottomNav fixa e regras de visibilidade por rota aplicadas (inclui /clientes/novo, exclui /clientes/[id], /novo e /atendimento).
- Shell: moldura fixa do “celular” com scroll apenas interno.
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
- `0f93f8b` — docs: atualiza notas de sql e report
- `f187f2c` — fix(ui): ajustes de navegação e moldura
- `dce4907` — fix(agenda): tipagem e sync de data
- `b56e0dd` — refactor(atendimento): ajustes e limpeza
- `6a0bf8a` — feat(clientes): telas e dados estruturados
- `27a1775` — feat(agendamento): retorno, buffers e override
- `4518348` — feat(db): enderecos, contatos e buffers
- `2b5e5a3` — fix(agenda): linha de horario atual dinamica
- `712d116` — fix(shell): bottom-nav fixa e regras por rota

## 5) Arquivos/pastas principais alterados
- `apps/web/app/(dashboard)/clientes/*` (lista, novo, detalhe)
- `apps/web/app/(dashboard)/novo/*` (form de agendamento interno)
- `apps/web/components/mobile-agenda.tsx`
- `apps/web/src/modules/clients/*`
- `apps/web/src/modules/appointments/*`
- `apps/web/app/(dashboard)/configuracoes/*`
- `apps/web/components/ui/*` (mantido como base visual)
- `supabase/migrations/*` (novas migrations acima)

## 6) Como rodar migrations localmente
```bash
supabase db push --local
```

## 7) Como testar manualmente (roteiro rápido)
- Agenda DIA: linha vermelha move e posiciona; trocar tabs; clicar em “Hoje”.
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
