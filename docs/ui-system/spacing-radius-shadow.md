# Espacamento, Raio e Sombra (V2)

Fonte canonica: `apps/web/app/globals.css`.

## Espacamentos base

1. Header de tela: `safe-top` + `px-6`.
2. Conteudo de modulo: padding lateral consistente por tela (`px-4`/`px-5`).
3. Secoes internas: usar separacao por bloco em vez de nesting excessivo.

## Raios

1. Card principal: `--radius-card` (`wl-radius-card`).
2. Controle/botao/input: `--radius-control` (`wl-radius-control`).
3. Sheet bottom: `--radius-sheet` (`wl-radius-sheet`).

## Sombras

1. `--shadow-soft` para cards/superficies.
2. `--shadow-float` para overlays/fabs.

## Regra V2

1. Nao usar raio custom local fora dos tokens.
2. Nao misturar varios niveis de card aninhado sem necessidade funcional.
