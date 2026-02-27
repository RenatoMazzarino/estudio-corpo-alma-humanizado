# AUDITORIA MAIN - PRODUCAO

Atualizacao de consolidacao (2026-02-27):

- Este relatorio original (foco no range recente da `main`) foi consolidado com o backlog de modularizacao no plano mestre:
  - `docs/plans/BACKLOG_REFACTOR_MODULARIZACAO_REPO.md`
- O plano mestre inclui auditoria do repo completo (nao apenas commits recentes), matriz de hotspots e roadmap detalhado de modularizacao enterprise.

Data: 2026-02-27
Escopo de commits auditado: `130085d..HEAD`
Branch: `main`

## 1. Metodologia aplicada
- Revisao de historico de commits e arquivos alterados no range (`git log`, `git diff --name-only`).
- Varredura de riscos operacionais e de seguranca no codigo (`DEV_`, `demo-local`, `dry_run`, `console`, fallbacks, flags de ambiente).
- Revisao manual dos fluxos criticos:
  - agendamento interno e online
  - checkout/pagamento e status financeiro
  - automacao WhatsApp
  - disponibilidade/bloqueios
  - links publicos (voucher/recibo)
- Validacao tecnica:
  - `pnpm --filter web lint` = OK
  - `pnpm --filter web build` = OK
  - `pnpm --filter web check-types` = OK
  - `pnpm --dir apps/web audit --prod` = sem vulnerabilidades conhecidas

## 2. Correcoes aplicadas durante esta auditoria

### 2.1 Recalculo de status financeiro apos editar itens/desconto
- Ja aplicado no commit `0d46fd0`.
- Ajuste: `setCheckoutItems` e `setDiscount` passaram a recalcular `payment_status` apos `recalcCheckoutTotals`.
- Arquivo: `apps/web/app/(dashboard)/atendimento/[id]/actions.ts`

### 2.2 Resiliencia no cadastro de cliente pelo modal de novo agendamento
- Ajuste: removida dependencia de leitura imediata (`getClientById`) apos insercao; retorno passa a usar dados validados + `id` criado.
- Efeito: evita falso negativo de UI quando o cliente foi criado, mas a leitura sequencial falha no mesmo request.
- Arquivo: `apps/web/app/(dashboard)/novo/appointment-actions.ts`

### 2.3 Hardening do captcha de validacao de identidade no agendamento online
- Ajuste: removido fallback inseguro em producao com segredo estatico conhecido.
- Nova regra:
  - usa `PUBLIC_BOOKING_LOOKUP_CAPTCHA_SECRET`, senao `CRON_SECRET`, senao `WHATSAPP_AUTOMATION_PROCESSOR_SECRET`, senao `SUPABASE_SERVICE_ROLE_KEY`;
  - em producao, sem segredo configurado, falha fechado (`CONFIG_ERROR`) ao inves de operar inseguro.
- Arquivo: `apps/web/app/(public)/agendar/[slug]/public-actions/clients.ts`

### 2.4 Alinhamento de timezone em disponibilidade interna
- Ajuste: alinhado uso de `BRAZIL_TZ_OFFSET` na resolucao de mes e status de bloqueio por data.
- Efeito: reduz risco de deslocamento de dia em borda de timezone.
- Arquivo: `apps/web/app/(dashboard)/novo/availability.ts`

### 2.5 Declaracao de env no Turbo
- Ajuste: adicionada env `PUBLIC_BOOKING_LOOKUP_CAPTCHA_SECRET` em `globalEnv` para eliminar warning de lint (`turbo/no-undeclared-env-vars`).
- Arquivo: `turbo.json`

## 3. Achados atuais (apos correcoes)

## Critico
- Nenhum critico aberto identificado no escopo revisado.

## Alto
1. Enumeracao por existencia de cadastro no passo de identidade online (trade-off de UX)
- Estado atual: o fluxo consegue inferir existencia de cliente por `whatsapp` antes de CPF.
- Onde: `apps/web/app/(public)/agendar/[slug]/booking-flow.tsx`, `apps/web/app/(public)/agendar/[slug]/public-actions/clients.ts`
- Risco: atacante pode confirmar se um numero esta cadastrado no estudio.
- Situacao: comportamento atualmente intencional para UX rapida.
- Recomendacao: decisao de produto/risco (ver secoes 5 e 6).

## Medio
1. Endpoint interno de processamento WhatsApp com `GET` aberto para runtime config
- Onde: `apps/web/app/api/internal/notifications/whatsapp/process/route.ts`
- Risco: exposicao de metadados operacionais (modo, provider, limites), mesmo sem expor secrets.
- Recomendacao: proteger `GET` com o mesmo bearer secret do `POST` ou restringir em ambiente.

2. Risco operacional por configuracao em producao
- `DEV_PASSWORD_LOGIN_ENABLED=true` habilita rota de login DEV.
- `WHATSAPP_AUTOMATION_MODE=dry_run` ou `WHATSAPP_AUTOMATION_META_TEST_RECIPIENT` ativo pode desviar envio real.
- Status: depende de configuracao de ambiente, nao do codigo.

## Baixo
1. Logs de console em modulos de automacao e UI
- Estado: usados para observabilidade e diagnostico.
- Risco: ruido de logs e custo operacional, sem impacto funcional direto.

2. Divida tecnica estrutural
- Arquivos grandes (especialmente `appointment-form.tsx`, `booking-flow.tsx`, `whatsapp-automation.ts`) concentram UI + regras + efeitos.
- Risco: manutencao lenta, maior chance de regressao em mudancas pequenas.

## 4. Verificacoes de consistencia de producao
- Links publicos unificados por `attendance_code`: implementado e ativo no codigo.
- Regra de valor minimo do MP: mantida como minimo (R$ 1,00), sem fixacao forçada de sinal em 1 real.
- Status financeiro (`paid/partial/pending/waived`) com recalculo apos edicoes de checkout: OK no fluxo revisado.
- Fluxo manual e automacao WhatsApp coexistindo: mantido.

## 5. Decisoes de produto/seguranca que ainda exigem sua aprovacao
1. Nivel de privacidade no "Quem e voce" (agendamento online)
- Opcao A: manter UX atual (detecta cliente por WhatsApp e pede CPF).
- Opcao B: mascarar resposta inicial (sempre mensagem neutra) e so revelar identificacao apos dupla validacao.

2. Endpoint `/api/internal/notifications/whatsapp/process` (GET)
- Opcao A: manter aberto para observabilidade rapida.
- Opcao B: exigir bearer no GET tambem.

3. Politica de logs em producao
- Opcao A: manter logs atuais.
- Opcao B: reduzir logs informativos e padronizar apenas warning/error estruturado.

## 6. Checklist operacional imediato (producao)
1. Garantir `DEV_PASSWORD_LOGIN_ENABLED=false`.
2. Garantir `PUBLIC_BOOKING_LOOKUP_CAPTCHA_SECRET` definido.
3. Garantir `WHATSAPP_AUTOMATION_PROCESSOR_SECRET` definido e rotacionado.
4. Revisar se `WHATSAPP_AUTOMATION_META_TEST_RECIPIENT` deve continuar em piloto ou migrar para envio real.
5. Validar `WHATSAPP_AUTOMATION_MODE` final desejado (`enabled` ou `disabled`, nao `dry_run` em go-live).

## 7. Conclusao executiva
- O codigo auditado esta funcionalmente estavel para os fluxos principais revisados e com build/lint/typecheck limpos.
- Nao foi encontrado bloqueador tecnico critico aberto apos as correcoes aplicadas neste ciclo.
- Existem pontos de decisao de produto/seguranca (enumeracao, exposicao de runtime config, politica de logs) que nao sao bug de implementacao, mas definem o nivel final de hardening em producao.
