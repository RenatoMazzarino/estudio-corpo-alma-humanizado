# AUDITORIA_REESCRITA_MIGRACAO_MOBILE_BASELINE_2026-03-23

Status: active  
Data/hora da auditoria: 2026-03-23 16:40 -03:00  
Ambiente: repo `estudio-corpo-alma-humanizado`, branch `main`

## Objetivo

Atualizar o baseline real da reescrita para app mobile nativo, reduzindo risco de
migrar contratos desatualizados e de perder paridade funcional.

## Escopo auditado

1. `apps/web/app/**`
2. `apps/web/src/modules/**`
3. `apps/web/components/**`
4. `supabase/migrations/**`
5. `docs/plans/**`
6. `docs/ui-system/**`
7. `docs/engineering/**` e `docs/*AGENTS*`

## Metodo

1. Inventario estrutural por contagem de rotas/pages/endpoints/loading.
2. Leitura dirigida de modulos com maior mudanca recente (`agenda`, `novo`, `atendimento`).
3. Revisao de docs canonicos de migracao e UI para detectar drift.
4. Classificacao por maturidade e risco de migracao modulo a modulo.

## Fatos (com evidencia)

### Fato 1: baseline de runtime web mudou e precisa refletir no plano

1. Dashboard possui 13 paginas reais (`apps/web/app/(dashboard)/**/page.tsx`).
2. Publico possui 4 paginas reais (`apps/web/app/(public)/**/page.tsx`).
3. API interna possui 22 endpoints (`apps/web/app/api/**/route.ts`).
4. Loading oficial possui 11 entradas (`apps/web/app/**/loading.tsx`).

### Fato 2: maturidade V2 esta concentrada em tres frentes

1. `agenda` com padrao V2 aplicado em header/card/sheet/calendar.
2. `novo` com fluxo em etapas, revisao e cobranca em V2.
3. `atendimento` com avancos V2 relevantes, mas ainda com fechamento de consolidacao.

Evidencia principal:

1. `apps/web/components/mobile-agenda.screen.tsx`
2. `apps/web/app/(dashboard)/novo/appointment-form.composition.tsx`
3. `apps/web/app/(dashboard)/atendimento/[id]/attendance-page.tsx`

### Fato 3: modulos de maior risco para migracao imediata

1. `clientes`: variacao visual e acoplamento de tela ainda altos.
2. `catalogo`: uso de confirmacao inline (`window.confirm`) em fluxo critico.
3. `configuracoes`: tela longa com multiplas responsabilidades.

### Fato 4: docs de UI estavam parcialmente defasados

Arquivos com drift encontrado nesta auditoria:

1. `docs/ui-system/README.md`
2. `docs/ui-system/tokens.md`
3. `docs/ui-system/colors.md`
4. `docs/ui-system/typography.md`
5. `docs/ui-system/spacing-radius-shadow.md`
6. `docs/ui-system/components/header.md`
7. `docs/ui-system/components/card.md`
8. `docs/ui-system/components/button.md`
9. `docs/ui-system/components/bottom-nav.md`
10. `docs/ui-system/components/input.md`
11. `docs/ui-system/components/chip.md`
12. `docs/ui-system/patterns/loading-states.md`

## Classificacao de maturidade para migracao

### Pronto para virar baseline de paridade mobile

1. `agenda` (alto)
2. `novo` (alto)

### Requer fechamento de consolidacao web V2 antes da migracao plena

1. `atendimento` (medio-alto)

### Requer reescrita/refatoracao web antes de migrar 1:1

1. `clientes` (medio)
2. `catalogo` (medio)
3. `configuracoes` (medio/alto risco de acoplamento)

## Riscos residuais

1. Migrar `clientes/catalogo/configuracoes` sem normalizar contrato visual e
   composicional aumenta retrabalho no app nativo.
2. Duplicacao de UX de cobranca entre fluxos pode reaparecer se a convergencia
   de componente unico nao for tratada como gate.
3. Realtime/loading pode divergir entre web e mobile se nao houver checklist
   por fluxo critico (agenda, novo, atendimento, pagamento).

## Recomendacoes (prioridade)

### P0 (obrigatorio)

1. Concluir consolidacao do checkout em `atendimento` com o mesmo contrato
   visual/funcional do fluxo de cobranca de `novo`.
2. Fechar e congelar baseline V2 dos componentes de superficie
   (header/card/sheet/accordion/footer rail).
3. Manter plano principal e anexo tecnicos sincronizados entre os dois repos
   via hardlink.

### P1

1. Reescrever `clientes` no web V2 e eliminar variacoes legacy principais.
2. Reescrever `catalogo` no web V2 removendo confirmacoes inline.

### P2

1. Refatorar `configuracoes` em blocos menores (estrutura por modulo interno)
   para diminuir risco na migracao Android.

## Criterio de aceite desta auditoria

1. Plano principal atualizado com delta de baseline 2026-03-23.
2. Anexo tecnico atualizado com inventario e hotspots reais.
3. Runbook de workspace atualizado para sincronizacao dos arquivos hardlinked.
4. Docs de UI e docs de governanca atualizados para refletir V2 real.
5. Matriz canonica/index de docs atualizados com os novos artefatos.

## Proxima acao recomendada

1. Executar fase dedicada de reescrita V2 em `clientes`.
2. Em seguida executar `catalogo`.
3. Fechar com refatoracao estrutural de `configuracoes`.
4. So entao abrir migracao 1:1 desses tres modulos para Android/backend.
