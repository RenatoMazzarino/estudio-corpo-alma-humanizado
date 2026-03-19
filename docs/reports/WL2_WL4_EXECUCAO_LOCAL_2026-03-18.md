# Execucao Local WL-2 a WL-4

Status: executado localmente e pronto para rollout controlado  
Data base: 2026-03-18  
Ambiente validado: Supabase local + app web local

## 1) Escopo executado

As fases abaixo avancaram no ambiente local:

1. WL-2 - Tenant como raiz canônica de configuração
2. WL-3 - Resolução canônica de tenant em runtime
3. WL-4 - Desacoplamento dos hardcodes críticos de domínio/base URL

## 2) O que foi implementado

### 2.1 Banco

Migration criada:

- `supabase/migrations/20260318233000_wl2_tenant_runtime_configuration.sql`

Entregas:

1. evolução da tabela `tenants` com campos operacionais mínimos;
2. criação das tabelas:
   - `tenant_branding`
   - `tenant_domains`
   - `tenant_feature_flags`
3. triggers de `updated_at`;
4. índices únicos e de lookup;
5. backfill do tenant principal do estúdio;
6. seed dos domínios atuais:
   - `app.corpoealmahumanizado.com.br`
   - `public.corpoealmahumanizado.com.br`
   - `dev.public.corpoealmahumanizado.com.br`

### 2.2 Runtime

Módulos criados:

1. [defaults.ts](/c:/Users/renat/Projetos_Dev/estudio-corpo-alma-humanizado/apps/web/src/modules/tenancy/defaults.ts)
2. [runtime.ts](/c:/Users/renat/Projetos_Dev/estudio-corpo-alma-humanizado/apps/web/src/modules/tenancy/runtime.ts)
3. [http-origin.ts](/c:/Users/renat/Projetos_Dev/estudio-corpo-alma-humanizado/apps/web/src/modules/tenancy/http-origin.ts)

Entregas:

1. defaults do tenant principal centralizados;
2. normalização de domínio/base URL;
3. lookup de domínios configurados no banco;
4. resolução segura de origin para auth/Spotify;
5. fallback compatível com o tenant principal atual.

### 2.3 Core do app

Mudanças principais:

1. `shared/config.ts` passou a centralizar a base URL pública canônica;
2. auth (`google`, `callback`, `logout`, `dev-login`) deixou de repetir
   allowlists;
3. fluxo Spotify passou a reutilizar a mesma política de origin;
4. biblioteca local de templates WhatsApp deixou de montar links públicos com
   string fixa solta.

## 3) Preservação da identidade atual

O comportamento visível para a Jana foi preservado.

Mantido igual:

1. nome atual do estúdio nas telas;
2. domínios públicos atuais;
3. logotipos em `/brand/*`;
4. paleta atual (`#5D6E56`, `#C0A4B0`, `#D4A373`, `#FAF9F6`).

Conclusão:

- houve mudança estrutural de white-label;
- não houve rebranding visível do produto atual.

## 4) Evidências de validação

Comandos executados:

```powershell
pnpm exec supabase db push --local
pnpm supabase:types
pnpm lint
pnpm --filter web lint:architecture
pnpm check-types
pnpm --filter web test:unit
pnpm --filter web test:smoke
pnpm build
```

Resultado:

1. migration local aplicada com sucesso;
2. tipos Supabase regenerados;
3. lint OK;
4. typecheck OK;
5. unitários OK;
6. smoke tests OK;
7. build OK.

## 5) Pendência restante

O rollout ainda não foi promovido para ambiente compartilhado/remoto.

Isso ainda exige:

1. aplicar a migration no banco compartilhado;
2. validar a leitura das novas tabelas no runtime publicado;
3. só depois disso fazer push/deploy com segurança.

## 6) Próxima ação recomendada

Executar o runbook:

- [WHITE_LABEL_ROLLOUT_REMOTE_MAIN_2026-03-18.md](/c:/Users/renat/Projetos_Dev/estudio-corpo-alma-humanizado/docs/runbooks/WHITE_LABEL_ROLLOUT_REMOTE_MAIN_2026-03-18.md)

