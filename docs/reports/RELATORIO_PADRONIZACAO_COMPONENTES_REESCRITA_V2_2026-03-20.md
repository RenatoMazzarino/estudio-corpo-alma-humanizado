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
