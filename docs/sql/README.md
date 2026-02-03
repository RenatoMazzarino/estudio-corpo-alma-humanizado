# docs/sql

Esta pasta guarda *dumps* de schema usados para **documentação/auditoria**.
Eles **não** são fonte de verdade de evolução do banco.

Fontes de verdade do DB:
- `supabase/migrations/*` (migrations oficiais)
- `apps/web/lib/supabase/types.ts` (tipos gerados)

Quando usar:
- Comparar schema atual com o que a UI precisa (auditoria DB↔UI).
- Registrar snapshots pontuais para revisão/planejamento.

Quando **não** usar:
- Não aplicar diretamente em produção.
- Não substituir migrations por estes arquivos.
