# AGENTS.override.md (supabase/functions)

Escopo: `supabase/functions/*`.

## Runtime e papel

1. Runtime: Deno Edge Functions.
2. Papel principal: borda/proxy de integracoes assincronas.
3. Regra de negocio principal continua no app web.

## Funcoes ativas

1. `whatsapp-meta-webhook`
2. `whatsapp-automation-processor`
3. `mercadopago-webhook-proxy`

## Regras tecnicas obrigatorias

1. Nao usar APIs Node-only.
2. Preservar forwarding de:
   - metodo
   - headers necessarios
   - querystring (especialmente verificacao de webhook)
   - body quando aplicavel
3. Nao hardcodar segredo/token.
4. Tratar timeout/falha de origem com resposta rastreavel.

## Seguranca

1. Nunca logar segredo completo.
2. Validar uso de tokens internos de forwarding quando configurados.
3. Preservar isolamento entre ambientes (dev/preview/prod).

## Validacao

1. `deno check --config supabase/functions/deno.json supabase/functions/mercadopago-webhook-proxy/index.ts supabase/functions/whatsapp-automation-processor/index.ts supabase/functions/whatsapp-meta-webhook/index.ts`
