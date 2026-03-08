# AGENTS.override.md (apps/web/app/(public))

Escopo: experiencia publica (sem sessao do dashboard).

## Objetivo

1. Preservar jornada simples e confiavel para cliente final.
2. Priorizar clareza de estado (loading, erro, sucesso).

## Regras

1. Nao depender de estado de dashboard para funcionar.
2. Garantir compatibilidade mobile.
3. Nao quebrar URLs publicas canonicas:
   - `/agendar/[slug]`
   - `/pagamento/[id]`
   - `/voucher/[id]`
   - `/comprovante/[id]`
4. Mudanca em pagamento/agendamento deve validar ponta a ponta.

## Qualidade

1. Atualizar smoke test se comportamento publico mudar.
2. Validar ao menos rota principal de agendamento e pagina legal afetada.
