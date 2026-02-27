# Convenções de Modularização (Padrão Enterprise)

Status: ativo  
Data: 2026-02-27  
Escopo: `apps/web` e módulos de suporte

## Objetivo

Padronizar evolução técnica do repo com separação real de responsabilidades e baixo risco de regressão.

## 1) Princípios obrigatórios

1. Modularizar por responsabilidade, não por tamanho.
2. Fluxo de dependência unidirecional:
  - `ui/hooks/actions` -> `application` -> `domain` -> `infrastructure`.
3. Regras de negócio críticas não ficam em componente visual.
4. `app/*` é camada de entrega (routing/auth/wiring), não de domínio.
5. Evitar duplicação de normalização/formatação em formulários.

## 2) Estrutura recomendada por feature

Para cada fluxo crítico:

1. `domain/`
2. `application/`
3. `infrastructure/`
4. `ui/`
5. `hooks/`
6. `actions/`

## 3) Limites técnicos (soft caps)

1. Componente UI: até 350 linhas.
2. Hook: até 250 linhas.
3. Action/orquestrador: até 450 linhas.
4. Exceção: permitida só com justificativa explícita no PR.

## 4) Regras de fronteira

1. Não usar `as unknown as` em caminhos críticos:
  - `src/modules/payments/*`
  - `src/modules/appointments/*`
  - `app/(dashboard)/atendimento/[id]/*`
2. Não criar imports relativos com mais de 5 subidas de pasta (`../../../../../..`).
3. Preferir aliases de path (`@src/*`, `@components/*`, `@app/*`, `@lib/*`) em código novo.

## 5) Centralização de utilitários transversais

Toda regra de formatação/normalização compartilhável deve ir para `src/shared`, por tema:

1. `src/shared/cpf.ts`
2. `src/shared/phone.ts`
3. `src/shared/address/cep.ts`
4. `src/shared/currency.ts`
5. `src/shared/datetime.ts`

## 6) Estratégia de refatoração segura

1. Quebra incremental em blocos pequenos.
2. Sem mudança visual durante refatoração estrutural.
3. Sem mudança de regra de negócio no mesmo bloco (exceto hardening aprovado).
4. Sempre preservar comportamento funcional do fluxo existente.

## 7) Validação obrigatória por bloco

1. `pnpm --filter web lint`
2. `pnpm --filter web lint:architecture`
3. `pnpm --filter web check-types`
4. `pnpm --filter web build`
5. Smoke manual do fluxo alterado

