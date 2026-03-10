# AGENTS.override.md (apps/web)

Escopo: tudo em `apps/web`.

## Stack

1. Next.js App Router.
2. TypeScript estrito.
3. Vitest para unitarios.
4. Playwright para smoke E2E.

## Estrutura local obrigatoria

1. `app/*`: rotas, paginas e endpoints.
2. `src/modules/*`: regra de negocio por dominio.
3. `src/shared/*`: utilitarios cross-domain.
4. `components/*`: UI e composicao.

## Guardrails de implementacao

1. Nao colocar regra de negocio pesada direto em pagina/componente de rota.
2. Nao mover regra server-side para cliente sem motivo tecnico forte.
3. Nao quebrar fluxo publico por mudanca de dashboard e vice-versa.
4. Mudou env em runtime/build:
   - revisar `turbo.json`
   - revisar templates em `vercel/env-import`.
5. Em fluxo realtime, nao introduzir `router.refresh()` global sem justificativa tecnica e fallback medido.

## Integracoes sensiveis no app

1. WhatsApp:
   - `/api/whatsapp/meta/webhook`
   - `/api/internal/notifications/whatsapp/process`
   - `/api/cron/whatsapp-reminders`
2. Mercado Pago:
   - `/api/mercadopago/webhook`
3. Spotify:
   - `/api/integrations/spotify/*`
4. Google Maps:
   - `/api/address-*`, `/api/search`, `/api/cep`, `/api/displacement-fee`

## Validacao minima obrigatoria neste escopo

1. `pnpm --filter web lint`
2. `pnpm --filter web lint:architecture`
3. `pnpm --filter web check-types`
4. `pnpm --filter web test:unit`
5. `pnpm --filter web test:smoke` quando houver impacto em fluxo usuario ou rotas publicas.
6. `pnpm --filter web build` ou `pnpm build`

## Regra de maturidade (V1 final de producao)

1. Este escopo nao aceita entrega em mentalidade MVP ou "so para funcionar".
2. Toda mudanca deve mirar padrao de producao: robustez, modularizacao, observabilidade e manutencao previsivel.
3. Nao introduzir gambiarra, duplicacao oportunista, fallback sem governanca ou acoplamento oculto.
4. Solucoes devem incluir:
   - tratamento de erro explicito
   - contratos claros de entrada/saida
   - testes proporcionais ao risco
   - documentacao operacional quando houver impacto de runtime
5. Em conflito entre velocidade e qualidade estrutural, priorizar qualidade estrutural e registrar tradeoff.

