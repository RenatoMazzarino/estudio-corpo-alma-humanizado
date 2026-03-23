# Bottom Nav / Footer Rail (V2)

## Componente base

1. `FooterRail` (`apps/web/components/ui/footer-rail.tsx`)
2. `BottomNav` (`apps/web/components/ui/bottom-nav.tsx`)

## Contrato

1. Altura governada por `--footer-rail-height`.
2. Linha de acao governada por `--footer-action-row-height`.
3. Visual de superficie pelo token do rail (`wl-footer-rail`).

## Regra

1. Rodape global e rodape de fluxo/modal devem usar o mesmo contrato base.
2. Diferencas entre telas entram por variante do `FooterRail`, nao por CSS solto.
