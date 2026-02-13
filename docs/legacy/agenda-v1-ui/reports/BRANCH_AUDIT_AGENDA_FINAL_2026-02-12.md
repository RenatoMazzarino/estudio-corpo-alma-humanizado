# Auditoria Final da Branch agenda-v1-ui (Atualizada)
Data de referencia: 2026-02-13  
Escopo: auditoria da branch `agenda-v1-ui` contra `main`, com foco em prontidao de merge e producao.

## 1) Snapshot da branch
- Commits no delta `main..HEAD`: **299**
- Arquivos alterados no delta: **208**
- Delta aproximado: **+29.342 / -3.418 linhas**

Comando base:
```powershell
git rev-list --count main..HEAD
git diff --name-only main...HEAD
git diff --shortstat main...HEAD
```

## 2) Validacoes tecnicas executadas nesta auditoria
```powershell
pnpm --filter web lint
pnpm --filter web build
```
Resultado: **OK** (sem erros) em 2026-02-13.

## 3) Estado funcional consolidado

## 3.1 Agenda interna e disponibilidade
- Agenda dia/semana/mes consolidada.
- Gestao de disponibilidade inteligente (bloqueios + escala) integrada.
- Fluxos principais com shell mobile padronizado.

## 3.2 Agendamento publico
- Jornada por etapas com identificacao por WhatsApp.
- Coleta de email no fluxo publico para reduzir falhas em pagamento.
- Escolha de metodo (Pix/cartao) movida para etapa de confirmacao.

## 3.3 Mercado Pago e webhook
- Modelo correto do projeto: **Checkout Transparente** (Orders API + webhook).
- Eventos processados no sistema: `payment` e `order`.
- Webhook com validacao de assinatura e reconciliacao de status financeiro.

## 3.4 Voucher e branding
- Layout novo do voucher aplicado.
- Tokens oficiais de marca definidos e documentados.
- Download de voucher em imagem funcionando no fluxo.

## 3.5 Banco de dados
- Migrações recentes para slug canonico e email no agendamento publico.
- Correção de ambiguidade de assinatura da RPC `create_public_appointment`.

## 4) Revisao de PR (postura revisor externo)

## Achados
1. **Media** - Fluxo de renovacao de Pix pode confundir o usuario  
Arquivo: `apps/web/app/(public)/agendar/[slug]/booking-flow.tsx:753`  
Arquivo: `apps/web/app/(public)/agendar/[slug]/booking-flow.tsx:2139`  
Arquivo: `apps/web/app/(public)/agendar/[slug]/public-actions/payments.ts:577`  
Detalhe: o texto da UI orienta "voltar uma etapa para gerar outro Pix", mas a geracao depende de estado local (`pixPayment`) e usa chave de idempotencia fixa por agendamento/valor. Isso pode gerar comportamento inesperado em tentativa de novo QR code no mesmo agendamento.

2. **Baixa** - Ajuste visual residual no voucher (recorte/layer)  
Arquivo: `apps/web/app/(public)/agendar/[slug]/components/voucher-overlay.tsx:68`  
Detalhe: os recortes laterais ainda dependem de cor semitransparente fixa (`notchCutout`), o que pode variar visualmente conforme backdrop do overlay.

## 5) Correcoes aplicadas durante esta auditoria
- Removido fallback inseguro no lookup de cliente por telefone (evita sugerir cliente nao confirmado por "primeiro candidato" da lista).  
Arquivo: `apps/web/app/(public)/agendar/[slug]/public-actions/clients.ts`

## 6) Status de prontidao
- **Pronta para PR review/merge com ressalva operacional**.
- Nao foi identificado bloqueio de build/lint.
- Os riscos atuais sao de comportamento/UX (nao de quebra estrutural de deploy).

## 7) Checklist final recomendado antes do merge
- [ ] Validar UX de renovacao de Pix em expiracao real.
- [ ] Revisar visual final do recorte do voucher em diferentes dispositivos.
- [ ] Executar smoke test final: agendar -> pagar -> webhook -> status -> voucher.
- [ ] Confirmar configuracao MP por ambiente:
  - Dev: `https://dev.public.corpoealmahumanizado.com.br/api/mercadopago/webhook`
  - Producao: `https://public.corpoealmahumanizado.com.br/api/mercadopago/webhook`
  - Eventos: `payment` e `order` apenas.

