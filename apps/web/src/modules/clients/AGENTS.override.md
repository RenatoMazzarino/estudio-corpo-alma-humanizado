# AGENTS.override.md (apps/web/src/modules/clients)

Escopo: regras de cadastro, consulta e historico de clientes.

## Objetivo

1. Manter dados de cliente consistentes e rastreaveis.
2. Evitar duplicidade de cadastro e conflito de contato.

## Regras

1. Normalizacao de telefone/email deve seguir utilitarios canonicos.
2. Nao duplicar regra de validacao entre modulo e formulario.
3. Alteracao de contrato de cliente deve preservar compatibilidade com agenda e
   mensagens.
4. Mudancas em consentimento/preferencia devem manter trilha de auditoria.

## Aplica / Nao aplica

1. Aplica em modelagem de cliente e validadores do modulo.
2. Nao aplica a estilizacao de cards/listas sem regra de negocio.

## Checklist minimo de validacao

1. Testar criar/editar cliente com contatos validos e invalidos.
2. Testar busca por nome/telefone.
3. Validar impacto na automacao de mensagens.

## Risco de regressao

1. Duplicidade de cliente.
2. Contato salvo em formato invalido.
3. Ruptura de integracao com agendamento/automacao.

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
