# REPORT — Execução do Plano Nova Aparência/UX v1.0 (Produção)

## 1) Resumo executivo
- Design System v1 aplicado (tokens, fontes Playfair/Lato, componentes canônicos e documentação UI).
- Agenda mobile alinhada ao HTML/PDF com busca real (nome/telefone/serviço) e refinamentos de navegação.
- Agendamento interno (/novo) ajustado ao HTML final com layout consistente e preço somente leitura.
- Atendimento (UI v1-prod): layout refeito conforme HTML final (header colapsável, pager horizontal, stage bar) + timer bubble refinada.
- Clientes: lista/detalhe/novo cliente alinhados ao HTML/PDF com novos campos e validações.
- Migrations adicionadas para `appointment_messages` e campos de clientes (VIP/atenção/guardian/etc).

## 2) Checklist — Definition of Done (Produção v1.0)
- [x] Visual seguindo HTML + Auditoria Visual (fontes, tokens, layout e hierarquia).
- [x] UI ↔ DB 1:1 (todos os novos campos têm coluna / derivação determinística).
- [x] Mutação via Server Actions (sem writes client-side).
- [x] Feature flag mantida para Atendimento (NEXT_PUBLIC_ATTENDANCE_UIV4=1).
- [ ] Qualidade (pnpm lint/check-types/build) — **falhou por binário do Turbo (linux vs windows)**.
- [x] Rollback documentado via feature flag.

## 3) Commits (hash + objetivo)
- `6e9cde3` — feat(attendance): alinhar layout ao HTML final
  - Objetivo: reescrever tela de atendimento para o HTML v2 (header compacto/expandido, pager horizontal e stage bar).
- `eed8428` — docs(ui): plano v1 produção e revisão
  - Objetivo: consolidar plano oficial + revisão de gaps.
- `7bd409f` — clientes(v1): lista, detalhe e cadastro alinhados
  - Objetivo: UI/UX clientes com novos campos e validações (VIP/atenção/menor/etc).
- `af3f7fd` — atendimento(v1-prod): etapas, mensageria e checkout
  - Objetivo: UI etapas + logs de mensagens + checkout travado pós-pago.
- `c20411b` — chore(db): add attendance messages and client flags
  - Objetivo: migrations para mensagens do atendimento e flags de clientes.
- `30702d0` — agendamento-interno(ui): form alinhado ao HTML
  - Objetivo: refino do formulário /novo com layout v1.
- `eff58db` — agenda(ui): aderência ao HTML/PDF + busca real
  - Objetivo: agenda mobile com busca server-side e visual atualizado.
- `6542a34` — ui-system(v1): tokens, fonts, componentes canônicos e docs
  - Objetivo: base visual unificada (tokens, fontes, componentes, docs).

## 4) Arquivos/pastas criados
- `apps/web/components/ui/*` (AppHeader, SurfaceCard, Buttons, Chips, Inputs, States, BottomNav)
- `docs/ui-system/*` (tokens, typography, components, patterns)
- `docs/ui-decisions/PLANO_NOVA_APARENCIA_V1_PRODUCAO.md`
- `docs/ui-decisions/REPORT_REVISAO_PLANO_V1_PRODUCAO.md`

## 5) Migrations adicionadas
- `20260202120000_add_appointment_messages.sql`
- `20260202123000_add_client_flags.sql`

## 6) Como rodar migrations localmente
```bash
supabase db push --local
```

## 7) Como habilitar a UI do Atendimento v1-prod
Adicionar no `.env.local`:
```
NEXT_PUBLIC_ATTENDANCE_UIV4=1
```

## 8) Testes e validações (execução)
Comandos executados na raiz:
- `pnpm lint`
- `pnpm check-types`
- `pnpm build`

Resultado: **falharam** devido a erro do Turbo no ambiente Linux usando `node_modules` resolvido para Windows.

Erro principal (resumo):
```
Turborepo did not find the correct binary for your platform.
Detected linux 64, found turbo-windows-64/bin/turbo.exe
```

## 9) Pendências / próximos passos
- Ajustar ambiente do Turbo (instalar binário Linux ou reinstalar `node_modules` no WSL) e reexecutar:
  - `pnpm install`
  - `pnpm lint`
  - `pnpm check-types`
  - `pnpm build`
- Validar manualmente:
  - Agenda (tabs dia/semana/mês, seleção de mês, “Hoje”, clique no dia mensal)
  - Agendamento interno (estúdio x domicílio, envio completo)
  - Atendimento (mensageria + checkout travado pós-pago)
  - Clientes (VIP/atenção/menor + formulário completo)
