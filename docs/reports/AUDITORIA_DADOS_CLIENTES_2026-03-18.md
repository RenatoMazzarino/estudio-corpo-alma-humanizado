# Auditoria de Dados de Clientes 2026-03-18

Status: reference  
Data: 18/03/2026  
Ambiente auditado: código local do repo + schema tipado Supabase (`apps/web/lib/supabase/types.ts`)

## 1. Fato: dados persistidos do cliente no banco

### 1.1 Tabela `clients`

Campos identificados:

- `id`
- `tenant_id`
- `name`
- `phone`
- `email`
- `cpf`
- `birth_date`
- `data_nascimento`
- `initials`
- `public_first_name`
- `public_last_name`
- `internal_reference`
- `is_vip`
- `needs_attention`
- `marketing_opt_in`
- `is_minor`
- `guardian_name`
- `guardian_phone`
- `guardian_cpf`
- `observacoes_gerais`
- `notes`
- `preferences_notes`
- `contraindications`
- `clinical_history`
- `anamnese_url`
- `health_tags`
- `avatar_url`
- `endereco_completo`
- `address_cep`
- `address_logradouro`
- `address_numero`
- `address_complemento`
- `address_bairro`
- `address_cidade`
- `address_estado`
- `profissao`
- `como_conheceu`
- `created_at`

### 1.2 Tabela `client_phones`

Campos identificados:

- `id`
- `client_id`
- `tenant_id`
- `label`
- `number_raw`
- `number_e164`
- `is_primary`
- `is_whatsapp`
- `created_at`
- `updated_at`

### 1.3 Tabela `client_emails`

Campos identificados:

- `id`
- `client_id`
- `tenant_id`
- `label`
- `email`
- `is_primary`
- `created_at`
- `updated_at`

### 1.4 Tabela `client_addresses`

Campos identificados:

- `id`
- `client_id`
- `tenant_id`
- `label`
- `is_primary`
- `address_cep`
- `address_logradouro`
- `address_numero`
- `address_complemento`
- `address_bairro`
- `address_cidade`
- `address_estado`
- `referencia`
- `created_at`
- `updated_at`

### 1.5 Tabela `client_health_items`

Campos identificados:

- `id`
- `client_id`
- `tenant_id`
- `label`
- `type`
- `created_at`
- `updated_at`

## 2. Fato: dados de atendimento e prontuário já ligados ao cliente

### 2.1 Tabela `appointments`

Campos usados hoje para leitura clínica/histórica do cliente:

- `id`
- `client_id`
- `client_address_id`
- `service_id`
- `service_name`
- `start_time`
- `finished_at`
- `status`
- `payment_status`
- `attendance_code`
- `is_home_visit`
- `internal_notes`
- `price`
- `price_override`
- `displacement_fee`
- `displacement_distance_km`
- snapshot de endereço:
  - `address_cep`
  - `address_logradouro`
  - `address_numero`
  - `address_complemento`
  - `address_bairro`
  - `address_cidade`
  - `address_estado`

### 2.2 Tabela `appointment_evolution_entries`

Campos identificados:

- `id`
- `appointment_id`
- `tenant_id`
- `evolution_text`
- `created_by`
- `created_at`

### 2.3 Tabela `appointment_checkout`

Campos úteis para resumo financeiro:

- `appointment_id`
- `subtotal`
- `total`
- `discount_type`
- `discount_value`
- `discount_reason`
- `confirmed_at`

### 2.4 Tabela `appointment_payments`

Campos úteis para resumo financeiro:

- `id`
- `appointment_id`
- `amount`
- `method`
- `status`
- `paid_at`
- `created_at`
- `card_mode`

### 2.5 Tabela `transactions`

Campos úteis para fallback financeiro:

- `id`
- `appointment_id`
- `amount`
- `payment_method`
- `type`
- `created_at`
- `description`

## 3. Fato: dados derivados que já existem no repo, mas não são campos puros de banco

Mapeados a partir de `apps/web/src/modules/clients/profile-data.ts`:

- canal rápido principal do cliente:
  - telefone primário
  - telefone WhatsApp
  - quantidade de números
- resumo financeiro derivado:
  - total gasto lifetime
  - ticket médio
  - descontos concedidos
  - LTV estimado 12 meses
  - métodos de pagamento por participação
  - intervalo médio entre sessões
  - dias sem aparecer
  - fidelidade em estrelas
  - indicações feitas (heurística)
- prontuário derivado:
  - timeline de atendimentos já ocorridos
  - evolução mais recente por sessão
  - observações internas do atendimento
- snapshot de anamnese:
  - histórico clínico
  - contraindicações
  - preferências
  - observações gerais
  - notas legadas
  - link da anamnese
  - tags/itens de saúde

## 4. Inferência: gaps atuais do domínio de clientes

### 4.1 Pacotes adquiridos

Não existe hoje uma estrutura dedicada de pacotes no schema consultado.

Impacto:

- o campo pode ser exibido como contagem baseada em pagamentos com método
  `package/pacote`, mas isso não equivale a um módulo formal de pacotes.

### 4.2 Indicações feitas

Não existe hoje um relacionamento próprio de indicação entre clientes.

Impacto:

- a métrica atual só pode ser inferida por heurística usando `como_conheceu`,
  não como vínculo forte de banco.

### 4.3 Prontuário estruturado corporal

Hoje o prontuário estruturado de sinais corporais ainda não existe em schema.

Impacto:

- a base clínica atual é anamnese textual + evolução textual por sessão.

## 5. Recomendação

### Prioridade imediata

1. Refatorar a lista e o perfil de cliente usando somente os dados já auditados.
2. Exibir claramente no perfil os dados persistidos e os dados derivados.
3. Tratar pacotes e indicações como métricas limitadas pelo estado atual do banco.

### Próxima etapa

1. Evoluir o módulo `Pacientes`/prontuário com estrutura própria.
2. Só depois modelar mapa corporal e sinais estruturados por região.
