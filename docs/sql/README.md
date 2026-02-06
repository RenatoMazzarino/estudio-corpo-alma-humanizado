# docs/sql

Esta pasta guarda *dumps* de schema usados para **documentação/auditoria**.
Eles **não** são fonte de verdade de evolução do banco.

Fontes de verdade do DB:
- `supabase/migrations/*` (migrations oficiais)
- `apps/web/lib/supabase/types.ts` (tipos gerados)

Quando usar:
- Comparar schema atual com o que a UI precisa (auditoria DB↔UI).
- Registrar snapshots pontuais para revisão/planejamento.

Por que existem arquivos aqui (ex.: `schema_dump_clients.sql`, `schema_dump_business_hours.sql`):
- São **snapshots** isolados, usados para auditoria e discussão de UI/DB.
- Não substituem migrations, nem devem ser aplicados diretamente no banco.

Quando **não** usar:
- Não aplicar diretamente em produção.
- Não substituir migrations por estes arquivos.

## Referências de UI
- Decisões de layout e padrões de tela: `docs/ui-decisions/REPORT_EXECUCAO_NOVA_APARENCIA_V1_PRODUCAO.md`.
