-- Criação da Tabela business_hours (caso não exista)
CREATE TABLE IF NOT EXISTS public.business_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (
        day_of_week BETWEEN 0 AND 6
    ),
    open_time TIME NOT NULL,
    close_time TIME NOT NULL,
    is_closed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, day_of_week)
);
-- Habilita RLS
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;
-- Política de Acesso (Simplificada para o MVP)
DROP POLICY IF EXISTS "Acesso total business_hours admin" ON business_hours;
CREATE POLICY "Acesso total business_hours admin" ON business_hours FOR ALL USING (
    tenant_id = 'dccf4492-9576-479c-8594-2795bd6b81d7'
);
-- Inserindo Horários de Funcionamento Padrão para o Tenant Fixo
-- 0 = Domingo, 1 = Segunda, ... 6 = Sábado
INSERT INTO public.business_hours (
        tenant_id,
        day_of_week,
        open_time,
        close_time,
        is_closed
    )
VALUES -- Segunda (1) a Sexta (5): 08:00 as 18:00
    (
        'dccf4492-9576-479c-8594-2795bd6b81d7',
        1,
        '08:00:00',
        '18:00:00',
        false
    ),
    (
        'dccf4492-9576-479c-8594-2795bd6b81d7',
        2,
        '08:00:00',
        '18:00:00',
        false
    ),
    (
        'dccf4492-9576-479c-8594-2795bd6b81d7',
        3,
        '08:00:00',
        '18:00:00',
        false
    ),
    (
        'dccf4492-9576-479c-8594-2795bd6b81d7',
        4,
        '08:00:00',
        '18:00:00',
        false
    ),
    (
        'dccf4492-9576-479c-8594-2795bd6b81d7',
        5,
        '08:00:00',
        '18:00:00',
        false
    ),
    -- Sábado (6): 08:00 as 12:00
    (
        'dccf4492-9576-479c-8594-2795bd6b81d7',
        6,
        '08:00:00',
        '12:00:00',
        false
    ),
    -- Domingo (0): Fechado
    (
        'dccf4492-9576-479c-8594-2795bd6b81d7',
        0,
        '00:00:00',
        '00:00:00',
        true
    ) ON CONFLICT (tenant_id, day_of_week) DO
UPDATE
SET open_time = EXCLUDED.open_time,
    close_time = EXCLUDED.close_time,
    is_closed = EXCLUDED.is_closed;