-- Atualiza serviços que parecem ser domiciliares para ativar a flag e definir uma taxa padrão
UPDATE public.services
SET accepts_home_visit = true,
    home_visit_fee = 20.00,
    -- Define uma taxa padrão de R$ 20,00
    description = CASE
        WHEN description IS NULL
        OR description = '' THEN 'Atendimento realizado no conforto da sua casa.'
        ELSE description
    END
WHERE tenant_id = 'dccf4492-9576-479c-8594-2795bd6b81d7'
    AND (
        name ILIKE '%Domiciliar%'
        OR name ILIKE '%Home%'
    );