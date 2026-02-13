-- G64: define sinal em 1% para testes de pagamentos em produção/prévia
-- Pode ser alterado depois em Configurações > Sinal (%)

UPDATE public.settings
SET signal_percentage = 1
WHERE signal_percentage IS DISTINCT FROM 1;

