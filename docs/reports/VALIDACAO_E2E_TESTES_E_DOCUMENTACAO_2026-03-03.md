# Validacao E2E - Testes e Documentacao

Data: 2026-03-03  
Branch: `main`  
Escopo: validacao tecnica completa disponivel no repo + atualizacao dos
documentos canônicos de orientação

## 1) Bateria de testes/validacoes executada

## `apps/web`

1. `pnpm --filter web lint` ✅
2. `pnpm --filter web lint:architecture` ✅
3. `pnpm --filter web check-types` ✅
4. `pnpm --filter web test:unit` ✅
5. `pnpm --filter web test:smoke` ✅
6. `pnpm --filter web exec playwright test --config playwright.config.ts --project=chromium`
   ✅
7. `pnpm --filter web build` ✅

## Monorepo (root / turbo)

1. `pnpm lint` ✅
2. `pnpm check-types` ✅
3. `pnpm build` ✅

## 2) Cobertura real atual (transparência)

1. Testes unitários cobrem helpers e regras críticas de:
   - pagamentos (Mercado Pago)
   - automação WhatsApp/webhooks
   - agenda/helpers
   - formatação/normalização compartilhada
2. Smoke E2E atual cobre rota pública legal com Playwright.
3. Fluxos end-to-end autenticados e integrações externas (Meta/MP/Spotify com
   credenciais reais) ainda dependem de validação manual em ambiente integrado.

## 3) Documentos canônicos atualizados neste ciclo

1. `README.md`
2. `MANUAL_RAPIDO.md`
3. `apps/web/README.md`
4. `docs/README.md`
5. `docs/DOCUMENTATION_CANONICAL_MATRIX.md`
6. `docs/REGRAS_DE_NEGOCIO_E_FLUXOS.md`
7. `docs/apis/API_GUIDE.md`
8. `docs/integrations/INTEGRATIONS_TECNICO.md`
9. `docs/integrations/INTEGRATIONS_GUIA_OPERACIONAL.md`
10. `docs/runbooks/TESTES_VALIDACAO_LOCAL_E_CI.md`
11. `docs/runbooks/PROGRAMA_MODULARIZACAO_OPERACAO.md`
12. `docs/plans/PLANO_E2E_ENTERPRISE_REPO_COMPLETO_2026-03-01.md`

## 4) Ajustes principais de documentação aplicados

1. Atualização da matriz de docs para versão de referência 2026-03-03.
2. Alinhamento de variáveis WhatsApp:
   - remoção de `WHATSAPP_AUTOMATION_MODE`/allowlist legados
   - inclusão de `WHATSAPP_AUTOMATION_GLOBAL_ENABLED` e
     `WHATSAPP_AUTOMATION_FORCE_DRY_RUN`
   - templates/idioma descritos como canônicos no banco (`settings` por tenant).
3. Alinhamento de referências de modularização:
   - foco em `appointment-form.composition.tsx` (não mais
     `appointment-form.screen.tsx` como hotspot principal).
4. Atualização de runbooks de teste com sequência completa (web + turbo) e
   transparência de cobertura.
5. Atualização de integrações para estado atual de Realtime/Edge e fronteiras
   operacionais.

## 5) Limites objetivos da garantia

1. A suíte automatizada do repo está verde e consistente.
2. Isso garante estabilidade técnica no que está coberto por
   lint/type/tests/build.
3. Garantia operacional de “100% de todos os fluxos reais” exige validação
   manual integrada com:
   - credenciais reais de provedores externos
   - dados reais de staging/prod
   - cenários de negócio completos no dashboard autenticado
