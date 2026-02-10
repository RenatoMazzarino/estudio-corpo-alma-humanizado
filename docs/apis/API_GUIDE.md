# Guia de APIs (Next App Router)

Este documento descreve as rotas internas disponíveis em `apps/web/app/api`.

## Base
As rotas abaixo são atendidas pelo App Router e usam o caminho `/api/...` na aplicação web.

## Autenticação
As rotas listadas não exigem autenticação explícita e são usadas internamente pelo app. Não exponha publicamente sem um gateway ou proteção adicional.

## Variáveis de ambiente
`GOOGLE_MAPS_API_KEY` é obrigatória para rotas de busca de endereço via Google Places.

## Endpoints
1. `GET /api/search`
Parâmetros: `q` (mínimo 3 caracteres), `limit` (1–20, padrão 5).
Resposta: `{ appointments: [{ id, service_name, start_time, clients }], clients: [{ id, name, phone }] }`.
Notas: pesquisa em agendamentos (janela -365/+365 dias) e clientes pelo nome.

2. `GET /api/cep`
Parâmetros: `cep` (8 dígitos).
Resposta: JSON da BrasilAPI para o CEP.
Erros: `400` (CEP inválido), `404` (CEP não encontrado).

3. `GET /api/address-search`
Parâmetros: `q` (mínimo 3 caracteres).
Resposta: array de `{ id, placeId, label }`.
Notas: usa Google Places Autocomplete (New). Requer `GOOGLE_MAPS_API_KEY`.

4. `GET /api/address-details`
Parâmetros: `placeId`.
Resposta: `{ label, cep, logradouro, numero, bairro, cidade, estado }`.
Erros: `400` (placeId inválido), `500` (API key ausente), `4xx/5xx` (falha no provedor).
Notas: usa Google Places Details (New). Requer `GOOGLE_MAPS_API_KEY`.

## Testes rápidos (exemplos)
`/api/search?q=renato&limit=5`
`/api/cep?cep=01311000`
`/api/address-search?q=Rua%20das%20Acacias%20120%20Sao%20Paulo`
`/api/address-details?placeId=PLACE_ID_AQUI`
