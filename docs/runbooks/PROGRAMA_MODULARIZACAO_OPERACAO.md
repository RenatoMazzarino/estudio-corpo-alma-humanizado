# Runbook de Operacao - Programa de Modularizacao

Data base: 2026-02-27  
Escopo: `apps/web` (modularizacao + hardening em blocos na `main`)

## 1. Limites Arquiteturais Obrigatorios

1. `app/*` fica como camada de entrega (rota, auth, composição de tela e delegação).
2. Regra de dominio deve viver em `src/modules/*` (`domain`, `application`, `infrastructure`).
3. Server actions em `app/*` devem ser finas e delegar para módulos.
4. UI complexa deve ficar em componentes dedicados (`components/*`), sem regra de persistência.
5. Utilitários transversais devem ser centralizados em `src/shared/*`.
6. Endpoints internos sensíveis devem exigir `Authorization: Bearer`.

## 2. Gate Tecnico Obrigatorio por Bloco

Executar sempre nesta ordem:

1. `pnpm --filter web lint`
2. `pnpm --filter web lint:architecture`
3. `pnpm --filter web check-types`
4. `pnpm --filter web test:unit`
5. `pnpm --filter web build`

## 3. Checklist de Publicacao

1. Confirmar `git status` limpo e commits em blocos lógicos.
2. Confirmar `DEV_PASSWORD_LOGIN_ENABLED=false` em produção.
3. Confirmar `WHATSAPP_AUTOMATION_PROCESSOR_SECRET` definido e válido.
4. Confirmar segredo de captcha do agendamento online (`PUBLIC_BOOKING_LOOKUP_CAPTCHA_SECRET`).
5. Validar se piloto WhatsApp continua em número de teste (`WHATSAPP_AUTOMATION_META_TEST_RECIPIENT`) ou produção real.
6. Smoke manual mínimo:
  - agendamento interno
  - cobrança no atendimento
  - cobrança imediata (pix/cartão/dinheiro/cortesia)
  - envio manual e automação WhatsApp coexistindo
  - agendamento online (cliente existente e novo)

## 4. Procedimento de Rollback

1. Identificar commit de bloco com falha.
2. `git revert <hash>` sem reescrever histórico.
3. Reexecutar gate técnico completo.
4. Publicar somente após smoke dos fluxos críticos.

## 5. Pendencias Estruturais Abertas (nao bloqueantes)

1. `src/modules/notifications/whatsapp-automation.ts` ainda grande.
2. `src/modules/payments/mercadopago-orders.ts` ainda grande.
3. `app/(public)/agendar/[slug]/booking-flow.tsx` ainda com fatiamento parcial.
4. `app/(dashboard)/atendimento/[id]/actions.ts` e `src/modules/appointments/actions.ts` já reduziram, mas ainda acima do alvo ideal.
