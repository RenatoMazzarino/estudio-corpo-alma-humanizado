# AGENTS.override.md (supabase/functions)

Escopo: tudo dentro de `supabase/functions`.

## Runtime e fronteira

1. Runtime alvo: Deno (Edge Functions).
2. Essas funcoes fazem borda/proxy de integracoes; regra de negocio principal permanece no app web.

## Regras tecnicas

1. Nao usar APIs Node-only dentro das funcoes edge.
2. Preservar forwarding de headers e querystring quando a funcao atua como proxy.
3. Manter segredos em variaveis de ambiente da plataforma, nunca hardcoded.

## Validacao minima

1. `deno check --config supabase/functions/deno.json supabase/functions/mercadopago-webhook-proxy/index.ts supabase/functions/whatsapp-automation-processor/index.ts supabase/functions/whatsapp-meta-webhook/index.ts`

## Endpoints sensiveis

1. `whatsapp-meta-webhook`
2. `whatsapp-automation-processor`
3. `mercadopago-webhook-proxy`
