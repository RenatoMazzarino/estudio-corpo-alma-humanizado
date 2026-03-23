# UI System - Estudio Corpo & Alma (v1.0)

Este diretorio transforma referencias visuais (HTMLs e auditoria visual) em
guia tecnico reutilizavel.

Referencias obrigatorias:

- `docs/legacy/agenda-v1-ui/ui-decisions/`
  `Auditoria Visual - Estudio Corpo & Alma Humanizado.pdf`
- HTMLs em `docs/legacy/agenda-v1-ui/ui-decisions/`

Regra-mae:

- UI so usa dados persistidos ou derivados deterministicos.
- Tokens, tipografia, spacing, radius e sombras devem ser consistentes com a
  base oficial.

Frame mobile:

- O app sempre renderiza dentro de um frame centralizado (mobile-first).
- O frame ocupa 100% da altura util do viewport.
- Toda rolagem e interna ao frame.

Layout padrao de paginas (3 partes):

- **Header / Content / Navigation** como estrutura fixa.
- `AppShell` controla frame + scroll unico; `ModulePage` organiza header e
  conteudo.
- BottomNav fica fora do container de scroll para manter fixo e evitar area
  morta.

Arquivos principais:

- `tokens.md`: mapeamento de tokens e variaveis reais no codigo.
- `typography.md`: escala tipografica e usos.
- `colors.md`: paleta oficial com hex e usos.
- `spacing-radius-shadow.md`: espacamentos, raios e sombras.
- `v2-component-surface-standards.md`: contrato visual V2 para headers, cards,
  sheets e accordions.
- `components/*`: componentes canonicos.
- `patterns/*`: padroes de tela e estados.
