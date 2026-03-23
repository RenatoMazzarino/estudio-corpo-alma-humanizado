# UI System - Estudio Corpo & Alma (V2)

Status: active  
Atualizado em: 2026-03-23

Este diretorio documenta o contrato visual V2 aplicado no dashboard e nos fluxos
principais do produto.

## Fonte canonica

1. `apps/web/app/globals.css` (tokens, tipografia, superficies, raio e footer rail)
2. `docs/ui-system/v2-component-surface-standards.md` (contrato de header/card/sheet/accordion)
3. componentes reais em `apps/web/components/**` e `apps/web/app/(dashboard)/**`

## Estrutura de leitura recomendada

1. `tokens.md`
2. `typography.md`
3. `colors.md`
4. `spacing-radius-shadow.md`
5. `components/*`
6. `patterns/*`
7. `v2-component-surface-standards.md`

## Regras de governanca

1. Nao criar variacao visual local fora das variantes V2 sem atualizar este diretorio.
2. Sempre sincronizar docs de UI no mesmo bloco tecnico da mudanca visual.
3. Em conflito entre doc e implementacao, prevalece `globals.css` + codigo em `main`.
