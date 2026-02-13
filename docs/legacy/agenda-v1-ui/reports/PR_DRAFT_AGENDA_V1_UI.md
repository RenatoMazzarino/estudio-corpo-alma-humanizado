# PR — agenda-v1-ui (Agenda + Agendamento Publico + Pagamentos)

## Contexto
Esta PR consolida a branch `agenda-v1-ui` para o fluxo final de agenda interna e agendamento online.

Escopo principal:
- agenda interna (dia/semana/mes) com UX mobile padronizada;
- disponibilidade inteligente (bloqueios + gerador de escala);
- jornada publica de agendamento;
- pagamentos Mercado Pago no modelo **Checkout Transparente** (Orders API + webhook);
- voucher de servico com exportacao de imagem;
- hardening de dados de clientes (telefone e email).

## Regra de integracao Mercado Pago (fixa)
- Modelo do projeto: **Checkout Transparente**.
- Implementacao tecnica: **Orders API** para criacao de cobranca + webhook para reconciliacao.
- Fora de escopo: **Checkout Pro**.
- Topicos usados no webhook: **payment** e **order**.

## Entregas principais

## 1) Agenda interna e UX
- Cards de agenda com status de agendamento e financeiro.
- Bottom sheet de detalhes consolidado.
- Calendario mensal reutilizavel e padronizado.
- Melhorias de shell/navegacao/mobile frame.

## 2) Disponibilidade inteligente
- Gerador de escala (pares/impares).
- Bloqueio de dia inteiro/parcial com tipagem.
- Integracao com disponibilidade do agendamento online.

## 3) Agendamento publico
- Fluxo por etapas com revisao e confirmacao.
- Identificacao por WhatsApp com card "Ola".
- Coleta obrigatoria de email no fluxo publico.
- Escolha de forma de pagamento na etapa "Tudo certo?".
- Pix com QR + copia e cola + contador regressivo.
- Cartao com overlay de processamento em etapas.

## 4) Pagamentos e webhook
- Pix e cartao via Orders API.
- Validacao de assinatura do webhook (`x-signature` + HMAC).
- Suporte a eventos `payment` e `order`.
- Atualizacao de `appointment_payments` e recálculo de `appointments.payment_status`.
- Fluxo de confirmacao automatica apos webhook.

## 5) Voucher e branding
- Novo layout do voucher baseado no HTML de referencia.
- Tokens de marca com verde oficial `#5d6e56` e roxo oficial `#c0a4b0`.
- Assinatura ajustada e metadata de rodape.
- Exportacao de voucher via imagem (`html-to-image`).

## 6) Banco de dados
- Migracoes da branch para agenda/disponibilidade/pagamentos/deslocamento/clientes.
- Migracoes recentes desta fase:
  - `20260212234000_canonicalize_public_booking_slug.sql`
  - `20260213061500_public_booking_client_email.sql`
  - `20260213070000_fix_public_booking_email_rpc_ambiguity.sql`

## 7) Documentacao atualizada
- `docs/integrations/INTEGRATIONS_TECNICO.md`
- `docs/integrations/INTEGRATIONS_GUIA_OPERACIONAL.md`
- `docs/integrations/WEBHOOK_OPERACIONAL.md`
- `docs/branding/BRAND_TOKENS.md`
- `MANUAL_RAPIDO.md`
- `README.md`

## Validacoes executadas (estado atual)
```powershell
pnpm --filter web lint
pnpm --filter web build
```
Resultado: sem erros em 2026-02-13.

## Validacao operacional (manual)
- Simulacao de webhook `payment` no MP: `200`.
- Simulacao de webhook `order` no MP: `200`.
- Fluxo de pagamento com credenciais de producao: webhook recebendo no endpoint esperado.

## Checklist pre-merge
- [ ] Confirmar no painel MP os topicos `payment` e `order` (somente).
- [ ] Confirmar URL correta por ambiente:
  - Dev: `https://dev.public.corpoealmahumanizado.com.br/api/mercadopago/webhook`
  - Producao: `https://public.corpoealmahumanizado.com.br/api/mercadopago/webhook`
- [ ] Confirmar `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_PUBLIC_KEY` e `MERCADOPAGO_WEBHOOK_SECRET` no ambiente correto.
- [ ] Smoke test final ponta a ponta: agendar -> pagar -> webhook -> status -> voucher.

## Risco residual conhecido (nao bloqueante para abrir PR)
- Ajustes finos de UX visual ainda podem ser refinados no voucher/header sem impacto no fluxo transacional.

