# Card (V2)

Base canonica: `.wl-surface-card` + cabecalho/corpo separados quando necessario.

## Variantes praticas

1. Card com cabecalho tipo 1 (alto, destaque de etapa)
2. Card com cabecalho tipo 2 (regular, apoio)
3. Card sem cabecalho (caso simples de listagem)

## Estrutura recomendada

1. Cabecalho: `.wl-surface-card-header`
2. Divisor: `border-b` com `--color-line`
3. Corpo: `.wl-surface-card-body`

## Regras

1. Evitar card dentro de card sem motivo funcional.
2. Usar raio padrao de card (`--radius-card`).
3. Nao hardcodar cor de fundo fora dos tokens de superficie.
