-- Limpa todos os bloqueios de disponibilidade (plantões) do tenant atual
DELETE FROM public.availability_blocks
WHERE tenant_id = 'dccf4492-9576-479c-8594-2795bd6b81d7';