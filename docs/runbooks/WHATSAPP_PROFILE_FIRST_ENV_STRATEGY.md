# Estratégia Profile-First (WhatsApp)

Data de referência: 2026-03-10

## Objetivo

Eliminar o cenário de "várias flags espalhadas" para alternar ambientes de automação WhatsApp.

O padrão oficial passa a ser:

1. `WHATSAPP_AUTOMATION_PROFILE` para comportamento base.
2. `WHATSAPP_AUTOMATION_RECIPIENT_MODE` para política de destino.

## Perfis oficiais

1. `development_safe`
   - modo: `dry_run`
   - destino: `test_recipient`
2. `preview_safe`
   - modo: `dry_run`
   - destino: `test_recipient`
3. `preview_real_test`
   - modo: `enabled`
   - destino: `test_recipient`
4. `production_live`
   - modo: `enabled`
   - destino: `customer`

## Política de destinatário

1. `test_recipient`
   - sempre envia para `WHATSAPP_AUTOMATION_META_TEST_RECIPIENT`
   - ideal para homologação controlada
2. `customer`
   - envia para telefone real da cliente
   - usa `client_phones` (prioriza `is_whatsapp`, depois `is_primary`) e fallback em `clients.phone`

## Configuração recomendada por ambiente

1. Development
   - `WHATSAPP_AUTOMATION_PROFILE=development_safe`
   - `WHATSAPP_AUTOMATION_RECIPIENT_MODE=test_recipient`
2. Preview
   - `WHATSAPP_AUTOMATION_PROFILE=preview_real_test`
   - `WHATSAPP_AUTOMATION_RECIPIENT_MODE=test_recipient`
3. Production
   - `WHATSAPP_AUTOMATION_PROFILE=production_live`
   - `WHATSAPP_AUTOMATION_RECIPIENT_MODE=customer`

## Compatibilidade legada

As flags antigas continuam funcionando durante transição:

1. `WHATSAPP_AUTOMATION_GLOBAL_ENABLED`
2. `WHATSAPP_AUTOMATION_FORCE_DRY_RUN`
3. `WHATSAPP_AUTOMATION_META_FORCE_TEST_RECIPIENT`

Mas o uso novo recomendado é profile-first.

## Auditoria operacional

Execute:

```powershell
pnpm vercel:env:audit
```

O auditor aceita pacotes legados e também profile-first, para transição segura.
