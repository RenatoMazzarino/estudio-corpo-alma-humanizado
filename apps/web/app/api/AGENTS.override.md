# AGENTS.override.md (apps/web/app/api)

Escopo: APIs internas do app (`/api/*`).

## Contrato de endpoint

1. Definir claramente:
   - metodo permitido
   - auth esperada (publica, sessao, bearer secret)
   - formato de resposta e erro
2. Preservar idempotencia em webhooks/processadores quando aplicavel.
3. Em falha externa, retornar erro tratavel e log com contexto sem segredo.

## Integracoes criticas neste escopo

1. Mercado Pago webhook.
2. WhatsApp webhook/processador/cron.
3. Spotify OAuth/player.
4. Google Maps e busca de endereco.

## Mudou rota ou contrato?

1. Atualizar `docs/apis/API_GUIDE.md`.
2. Atualizar docs de integracao relacionadas.
