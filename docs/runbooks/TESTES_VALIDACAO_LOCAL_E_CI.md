# Runbook - Testes e Validacao (Local + CI)

Status: ativo  
Versao: 2026-03-01

## 1) Objetivo

Padronizar como validar o sistema antes de merge/deploy.

## 2) Sequencia obrigatoria (local)

No terminal do VSCode, na raiz do repo:

```powershell
pnpm install
pnpm --filter web lint
pnpm --filter web lint:architecture
pnpm --filter web check-types
pnpm --filter web test:unit
pnpm --filter web test:smoke
pnpm --filter web build
pnpm lint
pnpm check-types
pnpm build
```

Observacao:
- `test:smoke` usa Playwright.
- se o navegador nao estiver instalado localmente, rode:

```powershell
pnpm --filter web exec playwright install chromium
```

## 3) Como rodar no VSCode (passo a passo simples)

1. Abrir o projeto no VSCode.
2. Abrir terminal integrado (`Terminal > New Terminal`).
3. Executar os comandos da secao 2 na ordem.
4. So considerar pronto se todos terminarem sem erro.

## 4) Como validar no GitHub Web

1. Abrir o repositorio no GitHub.
2. Ir na aba `Actions`.
3. Abrir o workflow `ci`.
4. Confirmar status verde dos jobs:
   - lint
   - lint architecture
   - typecheck
   - unit tests
   - build
   - smoke tests
5. Se falhar:
   - abrir job com erro
   - ler etapa exata que falhou
   - corrigir no codigo
   - novo commit e aguardar nova execucao

## 4.1) Cobertura atual da suíte (transparência)

1. `test:unit` cobre regras/helpers críticos (pagamento, automação, agenda, formatadores).
2. `test:smoke` cobre páginas legais e fluxo público essencial de checkout/comprovante/voucher (`@smoke`).
3. Fluxos E2E completos com autenticação e integrações externas (MP/Meta/Spotify) ainda dependem de validação manual guiada por ambiente.

## 5) Gate de PR

Toda PR deve estar com workflow `ci` verde para merge.

## 6) Regra operacional

Nunca publicar alteracao de fluxo critico sem:

1. validacao local completa
2. CI verde
3. smoke funcional do fluxo afetado

## 7) Validacao enterprise adicional (realtime + dispatcher + push)

1. Processar dispatcher interno (preview):

```powershell
curl -H "Authorization: Bearer <EVENT_DISPATCHER_SECRET>" https://dev.public.corpoealmahumanizado.com.br/api/internal/events/dispatch
curl -X POST -H "Authorization: Bearer <EVENT_DISPATCHER_SECRET>" -H "Content-Type: application/json" -d "{\"limit\":20}" https://dev.public.corpoealmahumanizado.com.br/api/internal/events/dispatch
```

2. Processar cron dispatcher (preview):

```powershell
curl -H "Authorization: Bearer <CRON_SECRET>" https://dev.public.corpoealmahumanizado.com.br/api/cron/event-dispatcher
```

3. Validar módulo Mensagens:
- fila/status/templates atualizando automaticamente sem recarregar manual.

4. Validar Configurações > Push:
- preferências carregam e persistem por evento.
- assinaturas ativas aparecem no card (`/api/push/subscriptions`).
- botão `Enviar push de teste` retorna sucesso e entrega notificação.
