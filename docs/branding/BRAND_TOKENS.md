# Brand Tokens (Oficial)

Data de referência: 2026-02-13

## Cores oficiais
- Verde principal da marca: `#5d6e56`
- Roxo de atendimento em domicílio: `#c0a4b0`

## Onde essas cores estão definidas no código
- Arquivo-fonte de tokens do app:
  - `apps/web/app/globals.css`
- Tokens principais:
  - `--color-studio-green: #5D6E56`
  - `--color-dom: #C0A4B0`
  - `--color-dom-strong: #8F7483` (variante de contraste para texto)

## Como usar (regra prática)
- Studio/fluxo padrão:
  - usar classes baseadas em `studio-green` (`bg-studio-green`, `text-studio-green`, `border-studio-green`).
- Atendimento em domicílio:
  - usar classes baseadas em `dom` (`bg-dom/...`, `border-dom/...`, `text-dom-strong`).

## Logos oficiais
- Logo quadrado:
  - `apps/web/public/brand/logo.png`
- Logo horizontal:
  - `apps/web/public/brand/logo-horizontal.png`

## Observação de manutenção
- Evitar novos hardcodes com `purple-*` e `green-*` fora dos tokens do projeto.
- Preferir sempre classes derivadas dos tokens acima para evitar regressão visual.
