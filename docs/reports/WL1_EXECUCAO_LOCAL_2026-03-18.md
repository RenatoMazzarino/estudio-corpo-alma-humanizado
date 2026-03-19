# WL-1 Execução Local

Status: executado localmente sem commit  
Data base: 2026-03-18  
Escopo: validar ponta a ponta a fase `WL-1` no Supabase local

## 0) Resultado

A `WL-1` foi validada com sucesso no ambiente local.

O ponto importante da execução foi este:

1. o banco local já estava saneado nas tabelas core alvo;
2. a migration criada passou a formalizar esse estado no histórico;
3. a prova funcional confirmou que não existe mais herança silenciosa de
   `tenant_id`.

## 1) Migration aplicada

Arquivo:

- `supabase/migrations/20260318213000_wl1_remove_hardcoded_tenant_defaults_and_policies.sql`

Aplicação local:

```powershell
pnpm exec supabase db push --local --dry-run
pnpm exec supabase db push --local --yes
```

Resultado:

1. a migration entrou no histórico local;
2. `supabase migration list --local` passou a mostrar a migration aplicada em
   `Local` e `Remote` do ambiente local.

## 2) Prova de antes/depois no banco local

### 2.1 Defaults hardcoded

Consulta executada:

```sql
select
  table_name,
  column_name,
  column_default
from information_schema.columns
where table_schema = 'public'
  and column_name = 'tenant_id'
  and coalesce(column_default, '') ilike '%dccf4492-9576-479c-8594-2795bd6b81d7%';
```

Resultado:

- zero linhas

### 2.2 Policies hardcoded

Consulta executada:

```sql
select
  schemaname,
  tablename,
  policyname
from pg_policies
where schemaname = 'public'
  and (
    coalesce(qual, '') ilike '%dccf4492-9576-479c-8594-2795bd6b81d7%'
    or coalesce(with_check, '') ilike '%dccf4492-9576-479c-8594-2795bd6b81d7%'
  )
order by tablename, policyname;
```

Resultado:

- zero linhas

## 3) Prova funcional da fase

Tabela usada na prova:

- `public.client_phones`

Por que essa tabela foi usada:

1. ela está dentro do escopo da `WL-1`;
2. exige `tenant_id` explícito;
3. permite validar isolamento sem ambiguidade.

### 3.1 Cenário validado

1. tenant A:
   - `dccf4492-9576-479c-8594-2795bd6b81d7`
2. tenant B:
   - criado temporariamente apenas para a prova local
3. dois clientes temporários criados, um em cada tenant
4. dois telefones criados com `tenant_id` explícito, um para cada tenant

### 3.2 Resultado observado

Mensagens de prova:

```text
NOTICE:  WL1 isolamento OK -> tenant_a dccf4492-9576-479c-8594-2795bd6b81d7, tenant_b 0d3ba87a-4aff-4e54-b70d-32be9101ecd3, phones_a 1, phones_b 1
NOTICE:  WL1 bloqueio OK -> insert sem tenant_id falhou como esperado: null value in column "tenant_id" of relation "client_phones" violates not-null constraint
```

Leitura correta:

1. inserts explícitos por tenant seguiram funcionando;
2. não houve cruzamento lógico entre tenant A e tenant B;
3. insert sem `tenant_id` não recebeu nenhum fallback silencioso.

## 4) Validação técnica do repo

Comandos executados:

```powershell
pnpm lint
pnpm --filter web lint:architecture
pnpm check-types
pnpm --filter web test:unit
pnpm build
```

Resultado:

1. todos passaram;
2. o saneamento da `WL-1` não quebrou o runtime atual.

## 5) Riscos residuais

1. a validação concluída aqui é local, não em ambiente compartilhado;
2. migrations históricas continuam documentando o passado single-tenant, mas
   sem serem mais a fonte operacional correta;
3. o banco local emitiu aviso de `collation version mismatch`, sem bloquear a
   execução da `WL-1`.

## 6) Próximo passo correto

Após a `WL-1`, a próxima etapa é a `WL-2`:

1. transformar `tenants` na raiz canônica de configuração;
2. modelar branding, domínios e status do tenant;
3. seguir sem criar nada que dependa estruturalmente do web atual.
