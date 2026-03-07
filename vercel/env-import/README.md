# Vercel Environment Strategy (3 Stages)

This repository uses three Vercel environments:

1. Development
2. Preview
3. Production

Environment intent:

1. Development
   - Local workflow via `vercel dev` and `vercel pull --environment=development`.
   - Should be safe by default (`WHATSAPP_AUTOMATION_FORCE_DRY_RUN=true`).
2. Preview
   - Deployments from non-main branches.
   - Used for staging validation before production.
   - Should be safe by default (`WHATSAPP_AUTOMATION_FORCE_DRY_RUN=true`).
3. Production
   - Deployments from `main`.
   - Real sending enabled (`WHATSAPP_AUTOMATION_FORCE_DRY_RUN=false`).

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

