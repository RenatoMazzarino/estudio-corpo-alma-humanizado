# Vercel Environment Strategy (3 Stages)

This repository uses three Vercel environments:

1. Development
2. Preview
3. Production

Environment intent:

1. Development
   - Local workflow via `vercel dev` and `vercel pull --environment=development`.
   - Use `WHATSAPP_PROFILE=dev_sandbox` (simulado + destinatário fixo de teste).
2. Preview
   - Deployments from non-main branches.
   - Used for staging validation before production.
   - Use `WHATSAPP_PROFILE=preview_real_test` para envio real controlado (destino fixo de teste).
3. Production
   - Deployments from `main`.
   - Use `WHATSAPP_PROFILE=prod_real` (envio real para cliente).
   - Use App OneSignal de produção (separado de preview/dev).

Profile-first strategy (recommended):

1. Defina o perfil por ambiente:
   - `dev_sandbox`
   - `preview_real_test`
   - `prod_real`
2. Controle de destinatário via:
   - `WHATSAPP_AUTOMATION_RECIPIENT_MODE=test_recipient` (fixo)
   - `WHATSAPP_AUTOMATION_RECIPIENT_MODE=customer` (real)
3. Não usar variáveis legadas de modo/roteamento (`WHATSAPP_AUTOMATION_PROFILE`, `WHATSAPP_AUTOMATION_GLOBAL_ENABLED`, `WHATSAPP_AUTOMATION_FORCE_DRY_RUN`, `WHATSAPP_AUTOMATION_META_FORCE_TEST_RECIPIENT`).

Push notifications (OneSignal):

1. Variáveis necessárias por ambiente:
   - `NEXT_PUBLIC_ONESIGNAL_APP_ID`
   - `NEXT_PUBLIC_ONESIGNAL_SAFARI_WEB_ID`
   - `ONESIGNAL_REST_API_KEY`
2. Recomenda-se app OneSignal separado para:
   - `development/preview` (homologação)
   - `production` (operação real)
3. Não commitar chave REST do OneSignal no repositório.

Feature flags e dispatcher:

1. Variáveis operacionais obrigatórias:
   - `EVENT_DISPATCHER_SECRET`
   - `FF_REALTIME_PATCH_MODE`
   - `FF_EDGE_DISPATCHER_V2`
   - `FF_PUSH_NOTIFICATIONS`
   - `FF_LOADING_SYSTEM_V2`
   - `FF_CANARY_PERCENT`
2. Padrão recomendado:
   - `development` e `preview`: `on`
   - `production`: `canary` com `FF_CANARY_PERCENT` progressivo
3. O `EVENT_DISPATCHER_SECRET` deve ser diferente por ambiente e nunca versionado.

Files in this folder are templates (no secrets):

1. `vercel-development-required.env.example`
2. `vercel-preview-required.env.example`
3. `vercel-production-required.env.example`

How to use:

1. Copy each `.example` file to a local secure file (not committed).
2. Fill secrets/tokens.
3. Configure values in Vercel dashboard for the matching environment.
4. Run `pnpm vercel:env:audit` to validate local env packs.

Recommended rollout:

1. `pnpm vercel:dev` (local verification)
2. `pnpm vercel:deploy:preview` (branch preview)
3. Promote and run `pnpm vercel:deploy:prod` (production)
