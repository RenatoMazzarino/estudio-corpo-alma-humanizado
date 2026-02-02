# UI System — Estúdio Corpo & Alma (v1.0)

Este diretório transforma as referências visuais (HTMLs e Auditoria Visual PDF) em um guia técnico reutilizável.

Referências obrigatórias:
- `docs/ui-decisions/Auditoria Visual – Estúdio Corpo & Alma Humanizado.pdf`
- HTMLs em `docs/ui-decisions/`

Regra-mãe:
- UI só usa dados persistidos ou derivados determinísticos.
- Tokens, tipografia, spacing, radius e sombras devem ser consistentes com o PDF.

Arquivos principais:
- `tokens.md`: mapeamento de tokens e variáveis reais no código.
- `typography.md`: escala tipográfica e usos.
- `colors.md`: paleta oficial com hex e usos.
- `spacing-radius-shadow.md`: espaçamentos, raios e sombras.
- `components/*`: componentes canônicos.
- `patterns/*`: padrões de tela e estados.
