# AGENTS.override.md (apps/web/src/modules/services)

Escopo: regras de servicos ofertados, catalogo e parametros operacionais.

## Objetivo

1. Preservar consistencia entre catalogo, agenda e precificacao.
2. Evitar configuracao de servico invalida para atendimento.

## Regras

1. Alteracao de duracao/preco deve manter compatibilidade com agenda existente.
2. Nao duplicar regra de servico em varios componentes sem centralizacao.
3. Contrato de servico deve ser estavel para notificacoes e pagamentos.
4. Mudanca estrutural exige atualizar docs de regras de negocio.

## Aplica / Nao aplica

1. Aplica em modelagem e validacao de servicos.
2. Nao aplica em layout de listagem sem efeito de negocio.

## Checklist minimo de validacao

1. Testar criar/editar servico.
2. Testar impacto no novo agendamento e atendimento.
3. Testar impacto em templates/notificacoes quando houver.

## Risco de regressao

1. Servico invalido selecionavel.
2. Divergencia de preco/duracao entre modulos.
3. Quebra de fluxo de agendamento.

## Regra de maturidade (V1 final de producao)

1. Este escopo nao aceita entrega em mentalidade MVP ou "so para funcionar".
2. Toda mudanca deve mirar padrao de producao: robustez, modularizacao, observabilidade e manutencao previsivel.
3. Nao introduzir gambiarra, duplicacao oportunista, fallback sem governanca ou acoplamento oculto.
4. Solucoes devem incluir:
   - tratamento de erro explicito
   - contratos claros de entrada/saida
   - testes proporcionais ao risco
   - documentacao operacional quando houver impacto de runtime
5. Em conflito entre velocidade e qualidade estrutural, priorizar qualidade estrutural e registrar tradeoff.