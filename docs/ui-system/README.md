# UI System — Estúdio Corpo & Alma (v1.0)

Este diretório transforma as referências visuais (HTMLs e Auditoria Visual PDF) em um guia técnico reutilizável.

Referências obrigatórias:
- `docs/legacy/agenda-v1-ui/ui-decisions/Auditoria Visual – Estúdio Corpo & Alma Humanizado.pdf`
- HTMLs em `docs/legacy/agenda-v1-ui/ui-decisions/`

Regra-mãe:
- UI só usa dados persistidos ou derivados determinísticos.
- Tokens, tipografia, spacing, radius e sombras devem ser consistentes com o PDF.

Frame mobile:
- O app sempre renderiza dentro de um frame centralizado (mobile-only).
- O frame ocupa 100% da altura do viewport (sem bordas arredondadas).
- Toda rolagem é interna ao frame.

Layout padrão de páginas (3 partes):
- **Header / Content / Navigation** como estrutura fixa.
- `AppShell` controla frame + scroll único; `ModulePage` organiza header e conteúdo.
- BottomNav fica fora do container de scroll para manter fixo e evitar “zonas mortas”.

Arquivos principais:
- `tokens.md`: mapeamento de tokens e variáveis reais no código.
- `typography.md`: escala tipográfica e usos.
- `colors.md`: paleta oficial com hex e usos.
- `spacing-radius-shadow.md`: espaçamentos, raios e sombras.
- `components/*`: componentes canônicos.
- `patterns/*`: padrões de tela e estados.
