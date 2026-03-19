# WL-1 Validação de Isolamento por Tenant

Status: runbook local sem commit  
Data base: 2026-03-18  
Objetivo: validar que a fase `WL-1` removeu a herança estrutural de tenant fixo

## 0) Objetivo da validação

Comprovar três coisas:

1. tabelas core não criam mais registros no tenant original por `DEFAULT`;
2. policies `service_role` não dependem mais do UUID do tenant inicial;
3. o sistema continua operando com `tenant_id` explícito sem quebrar o runtime
   atual.

## 1) Checklist de validação de banco

### 1.1 Verificar se ainda existe `column_default` hardcoded

Rodar:

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

Esperado:

- zero linhas

### 1.2 Verificar se ainda existe policy hardcoded

Rodar:

```sql
select
  schemaname,
  tablename,
  policyname,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and (
    coalesce(qual, '') ilike '%dccf4492-9576-479c-8594-2795bd6b81d7%'
    or coalesce(with_check, '') ilike '%dccf4492-9576-479c-8594-2795bd6b81d7%'
  );
```

Esperado:

- zero linhas para as tabelas core da `WL-1`

## 2) Prova de criação sem tenant default

### 2.1 Criar registro de teste com tenant explícito

Escolher uma tabela operacional da `WL-1`, por exemplo `client_addresses`, e
executar com `tenant_id` explícito de um tenant de homologação.

Objetivo:

- provar que o fluxo continua funcionando quando o `tenant_id` é passado
  corretamente.

### 2.2 Garantir que insert sem `tenant_id` falha

Em ambiente de teste/local, tentar um `insert` na mesma tabela sem `tenant_id`.

Esperado:

- falha por coluna obrigatória sem default

Leitura correta:

- isso é desejado;
- obriga o runtime a sempre informar o tenant certo.

## 3) Prova de isolamento entre tenant A e tenant B

### 3.1 Preparação

1. criar ou usar dois tenants de teste:
   - tenant A
   - tenant B
2. inserir pelo menos um registro equivalente por tenant em tabelas core:
   - `clients`
   - `appointments`
   - `appointment_messages`
   - `client_addresses`

### 3.2 Validação

1. consultar por `tenant_id = tenant A`
2. consultar por `tenant_id = tenant B`
3. confirmar que não há cruzamento de linhas

## 4) Validação de compatibilidade com o runtime atual

Após aplicar a migration, executar:

```powershell
pnpm lint
pnpm --filter web lint:architecture
pnpm check-types
pnpm --filter web test:unit
pnpm build
```

Objetivo:

1. garantir que o app continua funcionando com `tenant_id` explícito no backend;
2. garantir que a remoção do default não quebrou o runtime atual.

## 5) Critério de aceite da `WL-1`

Aceitar a fase somente se:

1. não houver mais `DEFAULT tenant_id` hardcoded nas tabelas core alvo;
2. não houver mais policy core com UUID do tenant original;
3. inserts com `tenant_id` explícito continuarem operando;
4. inserts sem `tenant_id` falharem onde antes havia herança indevida;
5. validação técnica do repo continuar passando.
