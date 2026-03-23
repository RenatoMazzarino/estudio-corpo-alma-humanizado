# Loading States (V2)

Objetivo: evitar `router.refresh()` visualmente agressivo e spinner ad-hoc.

## Contextos obrigatorios

1. Loading de pagina (entrada inicial)
2. Loading de secao
3. Loading bloqueante de acao critica
4. Loading de transicao entre tela e modal
5. Loading de polling/realtime de pagamento

## Regras

1. Fluxo critico nao pode usar `fallback={null}`.
2. Priorizar patch local de estado antes de refresh global.
3. Em navegacao com abertura de modal pesado, manter loading ate estado final pronto.
4. Usar componente de loading padronizado (`apps/web/components/ui/loading-system.tsx`).
