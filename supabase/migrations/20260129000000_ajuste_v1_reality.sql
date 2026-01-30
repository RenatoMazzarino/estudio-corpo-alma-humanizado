-- 📌 MÓDULO 0.2: Configurações Globais do Estúdio
-- Armazena os tempos padrão de buffer e configurações gerais
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'dccf4492-9576-479c-8594-2795bd6b81d7',
    -- Alterado de 'demo-tenant' para o ID real
    default_studio_buffer INTEGER DEFAULT 30,
    -- Tempo padrão de limpeza
    default_home_buffer INTEGER DEFAULT 60,
    -- Tempo padrão de deslocamento
    whatsapp_notification_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Habilita RLS para settings
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
-- Política simples para o tenant fixo (Módulo 0.1)
-- REMOVE POLÍTICAS ANTIGAS SE EXISTIREM PARA EVITAR ERRO DE DUPLICIDADE
DROP POLICY IF EXISTS "Acesso total settings admin" ON settings;
CREATE POLICY "Acesso total settings admin" ON settings FOR ALL USING (
    tenant_id = 'dccf4492-9576-479c-8594-2795bd6b81d7'
);
-- 📌 MÓDULO 2.2: Bloqueios de Plantão (Availability Blocks)
-- Tabela para bloquear dias inteiros (Plantão 24h) ou faixas específicas
CREATE TABLE IF NOT EXISTS availability_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'dccf4492-9576-479c-8594-2795bd6b81d7',
    title TEXT NOT NULL DEFAULT 'Bloqueio',
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    reason TEXT,
    -- Ex: "Plantão Hospital", "Folga"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Habilita RLS para availability_blocks
ALTER TABLE availability_blocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total blocks admin" ON availability_blocks;
CREATE POLICY "Acesso total blocks admin" ON availability_blocks FOR ALL USING (
    tenant_id = 'dccf4492-9576-479c-8594-2795bd6b81d7'
);
-- 📌 MÓDULO 1.1: Atualização da Tabela de Serviços (Refatorado)
-- Adiciona suporte a atendimento domiciliar e buffer personalizado
ALTER TABLE services
ADD COLUMN IF NOT EXISTS accepts_home_visit BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS home_visit_fee DECIMAL(10, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS custom_buffer_minutes INTEGER,
    ADD COLUMN IF NOT EXISTS description TEXT;
-- Adicionado campo description
-- Null usa o global
-- ATENÇÃO: CORREÇÃO DE RLS PARA SERVIÇOS
-- Removemos qualquer política anterior que pudesse estar conflitanto ou restrita demais
DROP POLICY IF EXISTS "Acesso total services admin" ON services;
-- Criamos uma política permissiva para o nosso tenant fixo
CREATE POLICY "Acesso total services admin" ON services FOR ALL USING (
    tenant_id::text = 'dccf4492-9576-479c-8594-2795bd6b81d7'
);
-- 📌 MÓDULO 1.3: Atualização da Tabela de Clientes (Livre e Completo)
-- Adiciona campos granulares e tags de saúde
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS email TEXT,
    ADD COLUMN IF NOT EXISTS data_nascimento DATE,
    ADD COLUMN IF NOT EXISTS cpf TEXT,
    ADD COLUMN IF NOT EXISTS endereco_completo TEXT,
    -- Rua, número, bairro, etc num campo ou JSON
ADD COLUMN IF NOT EXISTS profissao TEXT,
    ADD COLUMN IF NOT EXISTS como_conheceu TEXT,
    ADD COLUMN IF NOT EXISTS observacoes_gerais TEXT,
    ADD COLUMN IF NOT EXISTS health_tags TEXT [] DEFAULT '{}';
-- Array de tags: ["Alergia", "Gestante"]
-- 📌 MÓDULO 2.3 e 2.4: Atualização de Agendamentos (Transactions e Status)
-- Prepara para o fluxo financeiro e domiciliar
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS is_home_visit BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS total_duration_minutes INTEGER,
    -- Tempo total ocupado (Serviço + Buffer)
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' CHECK (
        payment_status IN ('pending', 'paid', 'partial', 'refunded')
    );
-- Criação da tabela de Transações Financeiras (Módulo 6.1 - Adiantando estrutura básica)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'dccf4492-9576-479c-8594-2795bd6b81d7',
    appointment_id UUID REFERENCES appointments(id) ON DELETE
    SET NULL,
        description TEXT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
        category TEXT,
        -- "Serviço", "Produto", "Aluguel"
        payment_method TEXT,
        -- "Pix", "Dinheiro", "Cartão"
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total transactions admin" ON transactions;
CREATE POLICY "Acesso total transactions admin" ON transactions FOR ALL USING (
    tenant_id = 'dccf4492-9576-479c-8594-2795bd6b81d7'
);