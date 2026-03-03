# Supabase Edge Functions (ingestão/proxy)

Estas funções foram adicionadas para endurecer a borda de integrações e separar o tráfego assíncrono do app principal, sem reescrever regra de negócio.

## Funções

1. `whatsapp-automation-processor`
- Encaminha `POST` para `/api/internal/notifications/whatsapp/process`.
- Injeta `Authorization: Bearer <WHATSAPP_AUTOMATION_PROCESSOR_SECRET>`.

2. `whatsapp-meta-webhook`
- Encaminha `GET/POST` para `/api/whatsapp/meta/webhook`.
- Preserva querystring de verificação (`hub.*`).

3. `mercadopago-webhook-proxy`
- Encaminha `POST` para `/api/mercadopago/webhook`.

## Variáveis necessárias (Edge Runtime)

1. `APP_BASE_URL`
- URL base do app web (ex.: `https://public.corpoealmahumanizado.com.br`).

2. `WHATSAPP_AUTOMATION_PROCESSOR_SECRET`
- Necessária para `whatsapp-automation-processor`.

3. `INTERNAL_EDGE_FORWARD_TOKEN` (opcional)
- Token opcional para validar origem de proxy no app.

## Observações

1. O comportamento de negócio continua no app (`apps/web/app/api/*`).
2. Este bloco só cria a borda de proxy/segurança para migração gradual.

## Validação local recomendada

```powershell
deno check --config supabase/functions/deno.json supabase/functions/mercadopago-webhook-proxy/index.ts supabase/functions/whatsapp-automation-processor/index.ts supabase/functions/whatsapp-meta-webhook/index.ts
```
