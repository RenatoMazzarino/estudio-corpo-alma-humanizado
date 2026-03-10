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

## Regra de maturidade (V1 final de producao)

1. Este escopo nao aceita entrega em mentalidade MVP ou "so para funcionar".
2. Toda mudanca deve mirar padrao de producao: robustez, modularizacao,
   observabilidade e manutencao previsivel.
3. Nao introduzir gambiarra, duplicacao oportunista, fallback sem governanca ou
   acoplamento oculto.
4. Solucoes devem incluir:
   - tratamento de erro explicito
   - contratos claros de entrada/saida
   - testes proporcionais ao risco
   - documentacao operacional quando houver impacto de runtime
5. Em conflito entre velocidade e qualidade estrutural, priorizar qualidade
   estrutural e registrar tradeoff.
