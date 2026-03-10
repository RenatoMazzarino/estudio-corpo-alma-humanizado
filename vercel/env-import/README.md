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

Profile-first strategy (recommended):

1. Defina o perfil por ambiente:
   - `dev_sandbox`
   - `preview_real_test`
   - `prod_real`
2. Controle de destinatário via:
   - `WHATSAPP_AUTOMATION_RECIPIENT_MODE=test_recipient` (fixo)
   - `WHATSAPP_AUTOMATION_RECIPIENT_MODE=customer` (real)
3. `WHATSAPP_AUTOMATION_PROFILE` permanece apenas por compatibilidade.
4. Flags legadas (`WHATSAPP_AUTOMATION_GLOBAL_ENABLED`, `WHATSAPP_AUTOMATION_FORCE_DRY_RUN`, `WHATSAPP_AUTOMATION_META_FORCE_TEST_RECIPIENT`) continuam suportadas por transição, mas não são mais o caminho principal.

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
