# Report — Revisão do Plano v1.0 Produção

> **Status documental:** Histórico/legado. Use apenas para contexto e rastreabilidade.
> **Nao canonico:** Para comportamento atual do sistema, valide `codigo + migrations + env real` e docs ativos (`README.md`, `MANUAL_RAPIDO.md`, `docs/integrations/*`, `docs/apis/API_GUIDE.md`).

## Resumo executivo (o que mudou do plano anterior)
- O plano anterior (`PLANO_NOVA_APARENCIA.MD`) estava vazio; foi **substituído** por um plano completo e alinhado ao repo.
- O novo plano (`PLANO_NOVA_APARENCIA_V1_PRODUCAO.md`) contém:
  - Mapeamento real do AS-IS (rotas, componentes, actions, repos, migrations).
  - GAPs por módulo e decisões de DB↔UI.
  - Estratégia de produção com design system e hardening.
- Acrescentou-se uma seção “0) Resultado esperado” com Definition of Done, rollback e regras de qualidade, além da diretriz de documentação `docs/ui-system/`.
- **Novo:** a Auditoria Visual PDF passou a ser **fonte obrigatória** de tipografia, paleta, layout e interações.

## Decisões tomadas
- **Atendimento:** manter o schema já criado (`appointment_*`) e refatorar UI para aderir ao HTML final.
- **Agenda:** preservar `mobile-agenda.tsx` como base, com ajustes visuais e busca real.
- **Clientes:** alinhar UI ao HTML via novos campos persistidos (VIP/atenção/preferências/guardião/marketing opt-in) **apenas se** permanecerem na UI final.
- **Design System:** consolidar tokens existentes (`globals.css`), migrar tipografia para Playfair/Lato e **alinhar paleta/spacing/shadows** à Auditoria Visual PDF.
- **Documentação:** proposto o repositório `docs/ui-system/` para transformar HTMLs/PDF em guia reutilizável.
- **Mensageria e observabilidade:** proposta de `appointment_messages`, `appointment_surveys`/`appointment_post`, ações `sendMessage`/`recordMessageStatus` e logs detalhados.

## Gaps corrigidos no plano
- **DB↔UI consistency:** cada campo da UI foi mapeado para coluna/tabela ou marcado como “derivação”.
- **RLS e service_role:** política atual documentada e confirmada.
- **Fluxos completos:** Agenda → Atendimento → Checkout → Pós.
- **Diretrizes visuais:** inclusão das regras de tipografia, cores, espaçamento, headers/nav e interações do PDF.

## Itens que exigem decisão de produto (propostas)
1. **Preço final no agendamento interno**
   - Opção A (recomendado): manter preço calculado pelo serviço.
   - Opção B: permitir override (exige coluna `price_override` + ajustes no RPC).
2. **VIP/Atenção em Clientes**
   - Criar flags explícitas (`is_vip`, `needs_attention`) ou derivar por tags.
3. **Preferências e contraindicações**
   - Persistir em colunas próprias (`preferences_notes`, `contraindications`) ou manter em `observacoes_gerais`.

## Arquivos principais impactados pelo plano
- `apps/web/app/(dashboard)/page.tsx`
- `apps/web/components/mobile-agenda.tsx`
- `apps/web/app/(dashboard)/novo/appointment-form.tsx`
- `apps/web/app/(dashboard)/atendimento/[id]/attendance-v4-page.tsx`
- `apps/web/app/(dashboard)/clientes/page.tsx`
- `apps/web/app/(dashboard)/clientes/[id]/client-profile.tsx`
- `apps/web/app/(dashboard)/clientes/novo/page.tsx`
- `apps/web/src/modules/appointments/*`
- `apps/web/src/modules/clients/*`
- `supabase/migrations/*`
