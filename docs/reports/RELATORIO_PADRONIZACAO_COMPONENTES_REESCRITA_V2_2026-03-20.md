# RELATORIO_PADRONIZACAO_COMPONENTES_REESCRITA_V2_2026-03-20

Status: active  
Data/hora da auditoria: 2026-03-20 18:08:13 -03:00  
Ambiente: workspace local (`estudio-corpo-alma-humanizado`, branch `main`)

## Objetivo

Mapear componentes de UI e composicoes de tela que devem ser padronizados na
reescrita V2, com foco em eliminar codigo inline repetido, reduzir acoplamento
visual e consolidar design system.

## Escopo auditado

1. `apps/web/app/(dashboard)/*`
2. `apps/web/app/(public)/*`
3. `apps/web/components/*`
4. `apps/web/components/ui/*`

## Metodo

1. Inventario de componentes UI existentes.
2. Varredura de ocorrencias de tags inline (`button`, `input`, `textarea`, `select`).
3. Identificacao de overlays/modais feitos no arquivo.
4. Identificacao de arquivos inchados e helpers visuais locais.
5. Identificacao de duplicacao funcional entre componentes.

## Fatos (com evidencia)

### Fato 1: padrao de botao existe, mas esta subutilizado

1. Componentes padrao existentes:
   - `apps/web/components/ui/buttons.tsx`
2. Contagem:
   - `BUTTON_TAGS=277`
   - `UI_BUTTON_REFERENCES=8`

### Fato 2: padrao de input existe, mas esta subutilizado

1. Componentes padrao existentes:
   - `apps/web/components/ui/inputs.tsx`
2. Contagem:
   - `FORM_TAGS=196`
   - `UI_INPUT_REFERENCES=4`

### Fato 3: ha muitos overlays/modais com estrutura repetida

1. Contagem de padroes de overlay/modal inline:
   - `MODAL_OVERLAY_PATTERNS=27`
2. Exemplos:
   - `apps/web/app/(dashboard)/clientes/[id]/client-profile.tsx:248`
   - `apps/web/components/agenda/agenda-search-modal.tsx:58`
   - `apps/web/app/(dashboard)/novo/components/address-create-modal.tsx:112`

### Fato 4: existem componentes de detalhe de cliente locais e reutilizaveis

1. Helpers de UI locais no perfil de cliente:
   - `apps/web/app/(dashboard)/clientes/[id]/client-profile.tsx:117`
   - `apps/web/app/(dashboard)/clientes/[id]/client-profile.tsx:157`
   - `apps/web/app/(dashboard)/clientes/[id]/client-profile.tsx:182`
   - `apps/web/app/(dashboard)/clientes/[id]/client-profile.tsx:205`
   - `apps/web/app/(dashboard)/clientes/[id]/client-profile.tsx:232`
2. Esse bloco concentra componentes visuais que podem ser globais do modulo de
   detalhes.

### Fato 5: ha duplicacao de acao iconica de cliente

1. No perfil:
   - `apps/web/app/(dashboard)/clientes/[id]/client-profile.tsx:117`
2. Na lista:
   - `apps/web/app/(dashboard)/clientes/components/client-list-accordion-item.tsx:132`

### Fato 6: ha duplicacao estrutural de appointment card

1. Arquivos paralelos:
   - `apps/web/components/appointment-card.tsx`
   - `apps/web/components/agenda/appointment-card.tsx`

### Fato 7: ha composicoes inchadas que acumulam UI e regra local

1. Top arquivos por tamanho no `app`:
   - `apps/web/app/(dashboard)/novo/appointment-form.composition.tsx` (~33.6 KB)
   - `apps/web/app/(dashboard)/clientes/[id]/client-profile.tsx` (~30.4 KB)
   - `apps/web/app/(dashboard)/mensagens/messages-realtime-shell.tsx` (~21.4 KB)
   - `apps/web/app/(dashboard)/configuracoes/components/`
     `push-notifications-settings-card.tsx` (~16.5 KB)
   - `apps/web/app/(public)/agendar/[slug]/components/identity-step.tsx`
     (~16.7 KB)

### Fato 8: loading padrao existe, mas uso ainda e limitado

1. Componente padrao em `apps/web/components/ui/loading-system.tsx`.
2. Contagem:
   - `LOADING_COMPONENT_REFERENCES=7`
   - `INLINE_LOADING_MATCHES=173`

### Fato 9: fluxo publico tem prop drilling excessivo

1. Interface extensa e dispatcher por etapa:
   - `apps/web/app/(public)/agendar/[slug]/components/booking-step-content.tsx:18`
   - `apps/web/app/(public)/agendar/[slug]/components/booking-step-content.tsx:136`
2. O arquivo roteia multiplas etapas com muitas props manuais.

## Inferencias

1. O design system base existe, mas a adocao operacional e baixa.
2. A maior parte da variacao visual vem de implementacao inline por tela, nao de
   variantes oficiais do design system.
3. Sem consolidacao de modal/sheet/loading/buttons/inputs, o custo de manutencao
   vai crescer na V2.
4. O modulo de clientes ja revela padroes maduros (cards, rows, quick actions)
   que podem virar biblioteca reutilizavel da V2.
5. O fluxo publico de agendamento precisa de camada de composicao mais canonica
   (context/store), reduzindo contrato gigante de props.

## Recomendacoes (priorizadas para a reescrita)

### P0 - base obrigatoria antes de reescrever telas

1. Consolidar `Button`, `Input`, `Textarea`, `Select`, `IconAction` em API
   unica do design system.
2. Criar `ModalShell`, `ConfirmDialog` e `BottomSheet` canonicos.
3. Criar `LoadingSurface` por contexto (`page`, `section`, `inline`,
   `blocking`).
4. Definir regra de bloqueio: tela nova nao entra com tag inline de botao/input
   sem justificativa tecnica.

### P1 - consolidacao por dominio com alto retorno

1. Extrair de clientes:
   - `DetailSectionCard`
   - `DetailRow`
   - `MetricCard`
   - `ActionIconLink`
2. Unificar `appointment-card.tsx` em um unico componente com variantes.
3. Extrair `RealtimeStatusCard` e `JobCard` de mensagens.
4. Extrair `SelectionModeHeader` e `LongPressSelectableCard` de catalogo.

### P2 - hardening de arquitetura de composicao

1. Reduzir prop drilling em booking publico com `BookingFlowContext`.
2. Mover runtime OneSignal de card para hooks dedicados:
   - `useOneSignalRuntime`
   - `usePushPreferences`
3. Criar guideline de tamanho/complexidade por arquivo para evitar novos
   monolitos de composicao.

## Backlog tecnico sugerido (execucao na V2)

1. WL-UI-01: unificar botao/input/loading/modal base.
2. WL-UI-02: extrair componentes de cliente reutilizaveis.
3. WL-UI-03: unificar appointment card em `components/agenda`.
4. WL-UI-04: modularizar mensagens (cards + status badges).
5. WL-UI-05: modularizar booking publico com context + contracts menores.

## Criterio de aceite para considerar "resolvido"

1. Uso de `button/input/textarea/select` inline reduzido em >= 70% nas telas
   migradas para V2.
2. 100% dos modais novos usando `ModalShell/BottomSheet` padrao.
3. 100% dos loadings novos usando `loading-system.tsx`.
4. Nenhuma duplicacao funcional de card principal de agenda/clientes.
5. Checklist de PR validando adocao de componentes canonicos.

## Proxima acao recomendada

1. Ao iniciar a reescrita de fato, abrir uma "Fase 0 de UI foundation" e matar
   P0 antes de migrar os modulos de negocio.
2. Em seguida atacar P1 por modulo (clientes -> agenda -> mensagens -> publico).

## Atualizacao Agenda V2 (2026-03-21)

### Escopo revisado

1. Visao Dia: `apps/web/components/agenda/mobile-agenda-day-section.tsx`
2. Visao Semana: `apps/web/components/agenda/mobile-agenda-week-section.tsx`
3. Visao Mes: `apps/web/components/availability-manager.tsx`
4. Calendario canonico: `apps/web/components/agenda/month-calendar.tsx`
5. Modal de agendamento: `apps/web/components/agenda/appointment-details-sheet.tsx`
6. Modal novo bloqueio: `apps/web/components/availability/availability-block-sheet.tsx`
7. Modal gerador de escala: `apps/web/components/availability/availability-scale-sheet.tsx`

### Novos componentes/padroes a canonizar

1. `CalendarMonthShell`: card do calendario mensal com:
   - cabecalho (mes + navegacao + acao de escala)
   - grid de dias com dots semanticos
   - legenda padronizada por cor
2. `SectionCard`:
   - cabecalho com titulo
   - divisor
   - corpo com lista/empty state
3. `BottomSheetHeaderV2`:
   - handle drag
   - cabecalho destacado (`bg-studio-light`)
   - botao fechar padrao
4. `AgendaDayBlockCard`:
   - item de bloqueio do dia sem duplicar tag/titulo
   - acao de exclusao compacta
5. `AgendaDayAppointmentMiniCard`:
   - item compacto de agendamento (nome, servico, horario, icone domiciliar)
6. `CalendarLegendV2`:
   - mapeamento fixo:
     - Atendimento = verde
     - Domicilio = dom
     - Plantao = vermelho
     - Parcial = ambar

### Tokens de raio/cantos para unificar

1. `radius-card`: `rounded-xl` (padrao dos cards de agenda)
2. `radius-sheet`: `rounded-t-[26px]` (padrao dos modais bottom sheet)
3. `radius-control`: `rounded-lg` (inputs, toggles, botoes secundarios)

### Regras adicionadas ao backlog

1. WL-UI-06: extrair `SectionCard` e substituir blocos locais em Dia/Semana/Mes.
2. WL-UI-07: extrair `BottomSheetHeaderV2` para todos os sheets da agenda.
3. WL-UI-08: centralizar `CalendarLegendV2` e semantica de dots no calendario.

## Atualizacao de Inventario (2026-03-21 22:10 -03:00)

### Fato: Visao Mes padronizada em "card com titulo + corpo"

1. `Bloqueios do dia`:
   - shell com cabecalho e divisor
   - lista no corpo com empty state padrao
   - arquivo: `apps/web/components/availability-manager.tsx`
2. `Agendamentos do dia`:
   - shell com cabecalho e divisor
   - lista no corpo com empty state padrao
   - arquivo: `apps/web/components/availability-manager.tsx`
3. Ordem consolidada:
   - `Bloqueios do dia` antes de `Agendamentos do dia`.

### Fato: `MonthCalendar` atualizado e reutilizado como componente canonico

1. Componente atualizado:
   - `apps/web/components/agenda/month-calendar.tsx`
2. Integracao na visao mes:
   - `apps/web/components/availability-manager.tsx`
3. Legenda semantica fixa:
   - Atendimento = verde
   - Domicilio = dom
   - Plantao = vermelho
   - Parcial = ambar

### Fato: cabecalho dos 3 modais com superficie destacada

1. Modal de agendamento:
   - `apps/web/components/agenda/appointment-details-sheet.tsx`
2. Modal novo bloqueio:
   - `apps/web/components/availability/availability-block-sheet.tsx`
3. Modal gerador de escala:
   - `apps/web/components/availability/availability-scale-sheet.tsx`
4. Classe compartilhada aplicada:
   - `wl-sheet-header-surface` em `apps/web/app/globals.css`

### Fato: padrao de cantos auditado no escopo Agenda (Dia/Semana/Mes + 3 modais)

1. Card principal de agenda (referencia):
   - `apps/web/components/agenda/appointment-card.tsx`
   - raio: `rounded-xl`
2. Cards de conteudo (dia/semana/mes e secoes internas de modal):
   - raio: `rounded-xl` (alinhado ao card de agendamento)
3. Controles secundarios (inputs, chips, botoes secund):
   - raio: `rounded-lg` ou `rounded-md`
4. Bottom sheets:
   - raio: `rounded-t-[26px]` (token de sheet, nao de card)
5. Tokenizacao declarada em CSS global:
   - `--radius-card`
   - `--radius-control`
   - `--radius-sheet`

### Complemento (2026-03-21 23:05 -03:00)

1. Visao mes consolidada em container unico:
   - calendario + bloqueios + agendamentos no mesmo fundo principal
   - arquivo: `apps/web/components/availability-manager.tsx`
2. Estrutura de card reforcada com body em superficie propria:
   - `wl-surface-card-header`
   - `wl-surface-card-body`
3. Cabecalho dos 3 modais em superficie dedicada:
   - `wl-sheet-header-surface`
4. Visao semana atualizada para card com:
   - cabecalho + divisor + corpo
   - itens de agendamento com borda direita semantica
     - domicilio: `border-r-dom`
     - estudio: `border-r-studio-green`
   - arquivo: `apps/web/components/agenda/mobile-agenda-week-section.tsx`
5. `MonthCalendar` agora suporta modo sem moldura (`framed={false}`):
   - permite reuso dentro de container maior sem duplicar card
   - arquivo: `apps/web/components/agenda/month-calendar.tsx`

### Componentes-base criados nesta rodada

1. `SectionCard`, `SectionCardHeader`, `SectionCardBody`, `SectionCardEmptyState`:
   - arquivo: `apps/web/components/ui/section-card.tsx`
2. `CalendarLegendV2`:
   - arquivo: `apps/web/components/ui/calendar-legend-v2.tsx`
3. `IconActionButton`:
   - arquivo: `apps/web/components/ui/icon-action-button.tsx`
4. `BottomSheetHeaderV2`:
   - arquivo: `apps/web/components/ui/bottom-sheet-header-v2.tsx`
5. `StudioLogoLoader` para loading com identidade visual:
   - arquivo: `apps/web/components/ui/loading-system.tsx`
6. Animacao de desenho do logo:
   - classe: `wl-logo-draw`
   - arquivo: `apps/web/app/globals.css`
