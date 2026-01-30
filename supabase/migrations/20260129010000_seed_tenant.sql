-- Garante que o Tenant Fixo exista para satisfazer a FK da tabela services e appointments
INSERT INTO public.tenants (id, name, slug)
VALUES (
        'dccf4492-9576-479c-8594-2795bd6b81d7',
        'Estúdio Corpo & Alma',
        'estudio-corpo-alma'
    ) ON CONFLICT (id) DO NOTHING;