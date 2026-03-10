# AGENTS.override.md (apps/web/app/api)

Escopo: APIs internas do app (`/api/*`).

## Contrato de endpoint

1. Definir claramente:
   - metodo permitido
   - auth esperada (publica, sessao, bearer secret)
   - formato de resposta e erro
2. Preservar idempotencia em webhooks/processadores quando aplicavel.
3. Em falha externa, retornar erro tratavel e log com contexto sem segredo.

## Padrao obrigatorio (endpoints criticos)

1. Timeout explicito para chamada externa.
2. Retry com limite e backoff (nunca retry infinito).
3. Idempotency key para webhook/processamento assincrono.
4. Correlation id em log e resposta tecnica quando aplicavel.
5. Contrato de erro estavel:
   - codigo interno
   - mensagem publica
   - detalhe tecnico apenas para observabilidade

## Integracoes criticas neste escopo

1. Mercado Pago webhook.
2. WhatsApp webhook/processador/cron.
3. Spotify OAuth/player.
4. Google Maps e busca de endereco.

## Mudou rota ou contrato?

1. Atualizar `docs/apis/API_GUIDE.md`.
2. Atualizar docs de integracao relacionadas.

## Definition of Done local (api)

1. Endpoint com contrato deterministico de erro (status + payload previsivel).
2. Segredo/autorizacao validado antes de executar regra de negocio.
3. Logs com contexto tecnico suficiente e sem segredo sensivel.
4. Endpoint critico com teste de contrato quando houver alto risco.

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

