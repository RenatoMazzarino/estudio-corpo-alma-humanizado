# Checklist de PR — Refatoração e Hardening

Status: ativo  
Data: 2026-02-27

Use este checklist em todo PR/bloco de refatoração.

## 1) Escopo

1. O bloco tem foco único e objetivo claro?
2. O PR evita misturar refatoração estrutural com mudança funcional não planejada?
3. Em caso de mudança funcional, ela está descrita com motivo e impacto?

## 2) Arquitetura

1. A responsabilidade foi movida para a camada correta (`ui/hooks/actions/application/domain/infrastructure`)?
2. O componente visual ficou sem regra de negócio crítica?
3. Houve redução de acoplamento e/ou de duplicação?
4. Não houve introdução de import relativo profundo (`../../../../../..`)?
5. Não houve uso novo de `as unknown as` em caminhos críticos?

## 3) Segurança e operação

1. Endpoints internos exigem autenticação/segredo quando necessário?
2. Não foi introduzido fallback inseguro para produção?
3. Logs não expõem dados sensíveis?
4. Variáveis de ambiente novas estão declaradas no `turbo.json`?

## 4) Banco e compatibilidade

1. Se houve migration, ela é backward-compatible na primeira etapa?
2. Existe plano de rollback documentado no bloco?
3. Código permanece compatível durante transição de schema?

## 5) Qualidade

1. `pnpm --filter web lint` ✅
2. `pnpm --filter web lint:architecture` ✅
3. `pnpm --filter web check-types` ✅
4. `pnpm --filter web build` ✅
5. Testes automatizados do bloco criados/atualizados (quando aplicável)?
6. Smoke manual do fluxo alterado foi executado?

## 6) Documentação

1. Documentação canônica impactada foi atualizada?
2. Runbook operacional foi atualizado (quando necessário)?
3. Mudanças de API/contrato foram descritas de forma objetiva?

