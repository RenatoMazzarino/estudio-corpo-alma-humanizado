# Agenda V1 — Notas de Implementação

## Mapeamento atual (rotas/arquivos)
- Tela de Agenda (home): `apps/web/app/(dashboard)/page.tsx`
  - Componente principal: `apps/web/components/mobile-agenda.tsx`
- Formulário de “Novo Agendamento Interno”: `apps/web/app/(dashboard)/novo/page.tsx`
  - Formulário client: `apps/web/app/(dashboard)/novo/appointment-form.tsx`

## Componentes a ajustar/reutilizar
- `apps/web/components/app-shell.tsx`
  - Ajustar para MOBILE-ONLY (sem toggle e sem moldura de telefone) e alinhar bottom nav ao spec.
- `apps/web/components/mobile-agenda.tsx`
  - Reestruturar layout para tabs DIA/SEMANA/MÊS, slider diário e FAB com menu.
  - Ajustes recentes: scroll fluido na visão DIA, seletor de mês/ano no cabeçalho, setas na visão SEMANA.
- `apps/web/app/(dashboard)/novo/page.tsx`
  - Novo header do formulário (voltar + status + título/subtítulo).
- `apps/web/app/(dashboard)/novo/appointment-form.tsx`
  - Reorganização visual em 3 cards/seções e toggle Estúdio/Domicílio com endereço colapsável.

## Principais diferenças entre estado atual e HTML spec
- Agenda
  - Hoje: layout tinha header simples e lista vertical; spec pede header com saudação/online, botão “Hoje”, botão buscar e mês clicável.
  - Mês clicável: agora abre seletor de mês/ano no cabeçalho.
  - Tabs: não existia; agora DIA/SEMANA/MÊS com segmented control e estados ativos.
  - Dia: trocar lista única por slider horizontal com snap, resumo do dia com “pílulas”, indicador de hora atual e linha “Livre”; scroll agora com debounce para fluidez.
  - Semana: adicionar cards verticais por dia (atendimentos, bloqueio, livre) + setas para navegar semanas.
  - Mês: calendário em card com navegação por setas; clique no dia leva para a visão DIA.
  - FAB: substituir botões circulares simples por menu com rótulos (Bloquear Plantão / Novo Agendamento).
  - Bottom nav: ajustar estilo para o visual do spec.

- Formulário interno
  - Header: sair do header simples para layout com voltar + status + título/subtítulo.
  - Seções: dividir em 3 cards (Cliente, O que e Onde?, Finalização) com numeração e headers.
  - Procedimento: mostrar duração/preço selecionado em card destacado.
  - Local: toggle estilizado (Estúdio x Domicílio) com endereço em accordion animado.
  - Finalização: valor final + data + grade de horários (estilo “grid de horários”) + observações.
  - CTA: botão grande “Confirmar Agendamento”.

## Observações técnicas (DB/Backend)
- “Observações Internas” agora é persistida em `appointments.internal_notes` via migration e novo parâmetro do RPC `create_internal_appointment`.
