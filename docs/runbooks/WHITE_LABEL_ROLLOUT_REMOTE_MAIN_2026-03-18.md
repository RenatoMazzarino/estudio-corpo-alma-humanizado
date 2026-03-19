# Runbook de Rollout Remoto do White-Label

Status: pronto para execução manual controlada  
Data base: 2026-03-18

## 1) Objetivo

Promover para ambiente compartilhado/remoto as mudanças estruturais de
white-label sem alterar a aparência atual do estúdio.

## 2) Pré-condições

1. branch `main` com o bloco WL-2/WL-4 revisado;
2. Supabase remoto acessível com credenciais administrativas;
3. Vercel pronta para receber novo deploy;
4. smoke/local validation já concluída.

## 3) Ordem obrigatória

### Passo 1 - Aplicar migration no banco remoto

Aplicar:

- `supabase/migrations/20260318233000_wl2_tenant_runtime_configuration.sql`

Validação esperada:

1. tabelas novas criadas;
2. tenant principal com branding e domínios preenchidos;
3. `settings.public_base_url` preservado/normalizado.

### Passo 2 - Regenerar tipos locais se houver ajuste pós-rollout

Executar:

```powershell
pnpm supabase:types
```

### Passo 3 - Subir o código da `main`

Executar:

```powershell
pnpm lint
pnpm --filter web lint:architecture
pnpm check-types
pnpm --filter web test:unit
pnpm --filter web test:smoke
pnpm build
```

Depois:

```powershell
git push origin main
```

## 4) Validação remota pós-deploy

### Auth

Validar:

1. login Google no domínio atual do app;
2. logout no domínio atual do app;
3. login por email/senha em ambiente onde esse fluxo for permitido;
4. callback OAuth Spotify no domínio atual.

### Links públicos

Validar:

1. `/agendar/[slug]`
2. `/pagamento/[id]`
3. `/comprovante/[id]`
4. `/voucher/[id]`

Critério:

1. nenhum link pode montar domínio errado;
2. tudo deve continuar apontando para `public.corpoealmahumanizado.com.br`.

### WhatsApp

Validar:

1. biblioteca local de templates continua montando URLs com o domínio público
   atual;
2. painel `Mensagens` continua operando sem regressão.

## 5) Rollback

Se o runtime publicado quebrar antes da migração remota estar estável:

1. pausar deploys adicionais;
2. reverter o deploy da aplicação para a versão anterior;
3. manter o banco com a migration aplicada, se ela não tiver causado regressão
   funcional;
4. só considerar rollback SQL se houver impacto real em produção.

## 6) Observação importante

Este rollout muda a estrutura multi-tenant por trás dos panos.

Não deve mudar:

1. o branding visível do estúdio atual;
2. as cores atuais;
3. os domínios atuais do estúdio;
4. os textos atuais usados pela Jana no dia a dia.
