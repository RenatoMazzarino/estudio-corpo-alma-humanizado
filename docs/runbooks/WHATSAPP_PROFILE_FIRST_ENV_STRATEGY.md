# Estratégia Profile-First (WhatsApp)

Data de referência: 2026-03-10

## Objetivo

Eliminar o cenário de "várias flags espalhadas" para alternar ambientes de
automação WhatsApp.

O padrão oficial passa a ser:

1. `WHATSAPP_PROFILE` para comportamento base.
2. `WHATSAPP_AUTOMATION_RECIPIENT_MODE` para política de destino.

## Perfis oficiais

1. `dev_sandbox`
   - modo: `dry_run`
   - destino: `test_recipient`
2. `preview_real_test`
   - modo: `enabled`
   - destino: `test_recipient`
3. `prod_real`
   - modo: `enabled`
   - destino: `customer`

## Política de destinatário

1. `test_recipient`
   - sempre envia para `WHATSAPP_AUTOMATION_META_TEST_RECIPIENT`
   - ideal para homologação controlada
2. `customer`
   - envia para telefone real da cliente
   - usa `client_phones` (prioriza `is_whatsapp`, depois `is_primary`) e
     fallback em `clients.phone`

## Configuração recomendada por ambiente

1. Development
   - `WHATSAPP_PROFILE=dev_sandbox`
   - `WHATSAPP_AUTOMATION_RECIPIENT_MODE=test_recipient`
2. Preview
   - `WHATSAPP_PROFILE=preview_real_test`
   - `WHATSAPP_AUTOMATION_RECIPIENT_MODE=test_recipient`
3. Production
   - `WHATSAPP_PROFILE=prod_real`
   - `WHATSAPP_AUTOMATION_RECIPIENT_MODE=customer`

## Política de legados

As chaves antigas de modo/roteamento foram descontinuadas e não devem ser
usadas.

## Auditoria operacional

Execute:

```powershell
pnpm vercel:env:audit
```

O auditor exige profile-first consistente nos 3 ambientes.
