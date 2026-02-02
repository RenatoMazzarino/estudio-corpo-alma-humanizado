# REPORT — Execução do Plano Nova Aparência/UX v1.0 (Produção)

## 1) Resumo executivo
- Design System v1 aplicado (tokens, fontes Playfair/Lato, componentes canônicos e documentação UI).
- Agenda mobile alinhada ao HTML/PDF com busca real (nome/telefone/serviço) e refinamentos de navegação.
- Agendamento interno (/novo) ajustado ao HTML final com layout consistente e preço somente leitura.
- Atendimento (UI v1-prod): layout refeito conforme HTML final (header colapsável, pager horizontal, stage bar) + timer bubble refinada + mensagens persistidas com payload.
- Clientes: lista/detalhe/novo cliente alinhados ao HTML/PDF com novos campos e validações + auditoria DB↔UI aplicada.
- Migrations adicionadas para `appointment_messages` e campos de clientes (VIP/atenção/guardian/etc).
- Inclusão de painel “Dados técnicos (DB)” para garantir visibilidade completa dos dados persistidos.

## 2) Checklist — Definition of Done (Produção v1.0)
- [x] Visual seguindo HTML + Auditoria Visual (fontes, tokens, layout e hierarquia).
- [x] UI ↔ DB 1:1 (todos os novos campos têm coluna / derivação determinística).
- [x] Mutação via Server Actions (sem writes client-side).
- [x] Feature flag mantida para Atendimento (NEXT_PUBLIC_ATTENDANCE_UIV4=1).
- [ ] Qualidade (pnpm lint/check-types/build) — **falhou por binário do Turbo (linux vs windows)**.
- [x] Rollback documentado via feature flag.

## 3) Auditoria DB ↔ UI (Clientes + Atendimento)
### Clientes — Lista
- UI: nome, iniciais, telefone, chips VIP/Atenção.
- DB: `clients.name`, `clients.initials`, `clients.phone`, `clients.is_vip`, `clients.needs_attention`.
- Derivação: “Última visita” obtida de `appointments.start_time`; “Sem visitas” quando não há registros.
- Garantia DB↔UI: painel “Dados técnicos (DB)” com JSON completo da listagem.

### Clientes — Detalhe
- UI: identificação, contato, endereço, tags de saúde, contraindicações, preferências, dados pessoais, flags e responsável.
- DB: `clients.*` (inclui `health_tags`, `contraindications`, `preferences_notes`, `observacoes_gerais`, `data_nascimento`, `cpf`, `profissao`, `como_conheceu`, `marketing_opt_in`, `guardian_*`, `address_*`).
- Histórico: `appointments.start_time`, `appointments.service_name`, `appointments.price`, `appointments.status`, `appointments.is_home_visit`.
- Garantia DB↔UI: painel “Dados técnicos (DB)” com JSON completo do cliente.

### Clientes — Novo
- UI: formulário completo refletindo colunas de `clients` (nome, telefone, email, data_nascimento, cpf, endereço, tags, contraindicações, preferências, flags VIP/atenção, marketing_opt_in, menor/guardião, observações).
- DB: `clients.*` com `endereco_completo` derivado dos campos de endereço.
- Campos do HTML **sem coluna** (ex.: consentimento, contato preferencial) **não foram exibidos** para manter 1:1.
- Garantia DB↔UI: “Prévia do payload (DB)” com o objeto completo a ser persistido.

### Atendimento — Etapas
- Pré: `appointments` (data, serviço, local, endereço), `appointment_attendances` (status, confirmação), `appointment_checklist_items` (label, source, completed), `appointment_messages` (status).
- Sessão: `appointment_evolution_entries` (summary/complaint/techniques/recommendations + sections_json). Presets exibidos **apenas** se vierem de `sections_json.presets`.
- Checkout: `appointment_checkout`, `appointment_checkout_items`, `appointment_payments`.
- Pós: `appointment_post` (kpi, survey, follow-up) + `appointment_messages` (texto da pesquisa via payload).
- Garantia DB↔UI: painel “Dados técnicos (DB)” por etapa com `appointment_events` e todos os dados agregados.

## 4) Commits (hash + objetivo)
- `2f83cad` — fix(build): ajustar payload da mensageria
  - Objetivo: corrigir tipagem do payload Json para build na Vercel.
- `9cae13c` — fix(build): importar zod no atendimento
  - Objetivo: corrigir build da Vercel (erro de `z` indefinido em actions).
- `72d1596` — docs(report): atualizar lista de commits
  - Objetivo: manter o relatório sincronizado com os commits recentes.
- `2ac687c` — docs(report): atualizar auditoria db ui
  - Objetivo: incluir auditoria DB↔UI e ajustes de relatório.
- `e68170b` — atendimento(v1): db audit e mensagens
  - Objetivo: remover placeholders, registrar payload de mensagens e expor dados técnicos (DB) por etapa.
- `22c5f57` — clientes(v1): ui alinhada e auditoria db
  - Objetivo: reescrita das telas de clientes + preview/painel DB e ajuste de tipagens.
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

## 5) Arquivos/pastas criados
- `apps/web/components/ui/*` (AppHeader, SurfaceCard, Buttons, Chips, Inputs, States, BottomNav)
- `docs/ui-system/*` (tokens, typography, components, patterns)
- `docs/ui-decisions/PLANO_NOVA_APARENCIA_V1_PRODUCAO.md`
- `docs/ui-decisions/REPORT_REVISAO_PLANO_V1_PRODUCAO.md`

## 6) Migrations adicionadas
- `20260202120000_add_appointment_messages.sql`
- `20260202123000_add_client_flags.sql`

## 7) Como rodar migrations localmente
```bash
supabase db push --local
```

## 8) Como habilitar a UI do Atendimento v1-prod
Adicionar no `.env.local`:
```
NEXT_PUBLIC_ATTENDANCE_UIV4=1
```

## 9) Testes e validações (execução)
Comandos executados na raiz:
- `pnpm lint`
- `pnpm check-types`
- `pnpm build`

Resultado: **falharam** devido a erro do Turbo no ambiente Linux usando `node_modules` resolvido para Windows.

Erro principal (resumo):
```
Turborepo did not find the correct binary for your platform.
Detected linux 64.
We were not able to find the binary at: turbo-linux-64/bin/turbo
We found these unnecessary binaries: turbo-windows-64/bin/turbo.exe
```

## 10) Pendências / próximos passos
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
