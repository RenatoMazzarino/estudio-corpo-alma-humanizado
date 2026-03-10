# Inventário de Fallbacks (revisão operacional)

Data: 2026-03-02 Escopo: `apps/web` + integrações/regras operacionais (tenant,
WhatsApp, Spotify, IA, booking público)

## Status executivo (atual)

- `DEFAULT_TENANT_ID`: **não encontrado** no código atual.
- Fallbacks legados prioritários mapeados: **5**.
- Fallbacks legados removidos nesta rodada: **5/5**.
- Fallbacks de segurança/resiliência mantidos: ativos por desenho.

## Removidos nesta rodada

1. Fallback de tenant por `demo-local`

- Arquivo: `apps/web/app/(public)/agendar/[slug]/page.tsx`
- Removido: seleção do primeiro tenant em dev quando slug não existe.
- Resultado: `tenant` agora é sempre resolvido por slug canônico.

1. Alias legado de playlist Spotify por env antigo

- Arquivos:
  - `apps/web/src/modules/integrations/spotify/config.ts`
  - `apps/web/app/(dashboard)/atendimento/[id]/components/session-stage.helpers.tsx`
- Removido: fallback para `NEXT_PUBLIC_SPOTIFY_PLAYLIST_URL`.
- Resultado: fonte canônica = `NEXT_PUBLIC_ATTENDANCE_SPOTIFY_PLAYLIST_URL` (ou
  settings).

1. Alias legado de IA

- Arquivo: `apps/web/src/shared/ai/flora.ts`
- Removido:
  - `GEMINI_MODEL` (permanece `FLORA_MODEL`)
  - `GOOGLE_API_KEY` (permanece `GEMINI_API_KEY`)

1. Full-scan fallback de CPF (busca pública)

- Arquivo: `apps/web/app/(public)/agendar/[slug]/public-actions/clients.ts`
- Removido: consulta ampla de até 5000 clientes quando mapa de candidatos vinha
  vazio.
- Resultado: apenas busca indexada/candidatos do fluxo atual.

1. Legado de automação WhatsApp por env (`MODE` + allowlist)

- Arquivos:
  - `apps/web/src/modules/notifications/automation-config.ts`
  - `apps/web/src/modules/notifications/whatsapp-automation-processor.ts`
  - `apps/web/src/modules/notifications/whatsapp-automation-queue.ts`
  - `apps/web/src/modules/notifications/whatsapp-automation-runtime.ts`
- Removido:
  - parsing de `WHATSAPP_AUTOMATION_MODE`
  - parsing de `WHATSAPP_AUTOMATION_ALLOWED_TENANT_IDS`
  - checks `tenant_not_allowed` por allowlist de env
- Resultado: habilitação por tenant passa a seguir settings do banco
  (`tenant_whatsapp_settings` / `settings`).

## Ajustes de env canônico aplicados

1. `apps/web/.env.local`

- removidos: `GEMINI_MODEL`, `WHATSAPP_AUTOMATION_MODE`,
  `WHATSAPP_AUTOMATION_ALLOWED_TENANT_IDS`
- adicionados: `WHATSAPP_AUTOMATION_GLOBAL_ENABLED`,
  `WHATSAPP_AUTOMATION_FORCE_DRY_RUN`

1. `.vercel/env-import/vercel-prod-and-dev-required.env`

- removidos: `GEMINI_MODEL`, `WHATSAPP_AUTOMATION_MODE`,
  `WHATSAPP_AUTOMATION_ALLOWED_TENANT_IDS`
- adicionados: `WHATSAPP_AUTOMATION_GLOBAL_ENABLED`,
  `WHATSAPP_AUTOMATION_FORCE_DRY_RUN`

## Fallbacks que devem permanecer

1. Segurança de redirect/login

- Arquivos: `apps/web/app/auth/*/route.ts`,
  `apps/web/src/modules/auth/dashboard-access.ts`
- Motivo: previne open redirect e mantém retorno seguro.

1. Defaults de parse/normalização

- Exemplos: parsing numérico/textual em pagamentos e repositórios.
- Motivo: robustez contra payload externo incompleto.

1. Fallback funcional da Flora (evolução)

- Arquivos: `apps/web/src/modules/attendance/evolution-format.ts` e uso em
  `checklist-evolution.ts`
- Motivo: continuidade quando IA estiver indisponível.

1. Fallback de UX para compartilhamento

- Arquivos de voucher/export.
- Motivo: compatibilidade em ambientes sem Web Share API completa.

1. Defaults explícitos de regra de negócio

- Exemplos: janelas online padrão (60/30) quando settings ainda não preenchidos.
- Motivo: comportamento determinístico inicial.

## Observações finais

- Nem todo fallback é dívida técnica.
- O alvo de limpeza foi legado/duplicidade operacional; fallback de
  segurança/resiliência foi preservado.
