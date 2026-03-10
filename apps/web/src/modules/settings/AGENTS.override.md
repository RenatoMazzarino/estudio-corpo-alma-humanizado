# AGENTS.override.md (apps/web/src/modules/settings)

Escopo: configuracoes operacionais do sistema e preferencias do estudio.

## Objetivo

1. Garantir que configuracoes tenham efeito previsivel e auditavel.
2. Evitar mistura de configuracao de ambiente com preferencia de negocio.

## Regras

1. Parametro sensivel nao pode ser salvo em configuracao funcional de usuario.
2. Mudanca de configuracao com impacto externo deve ter validacao de
   consistencia.
3. Nao criar fallback oculto para configuracao ausente em fluxo critico.
4. Toda config operacional deve ter estado explicito (ativo/inativo) quando
   aplicavel.

## Aplica / Nao aplica

1. Aplica em leitura/escrita de settings do app.
2. Nao aplica em preferencia puramente visual local.

## Checklist minimo de validacao

1. Testar persistencia e leitura de configuracao alterada.
2. Testar bloqueio quando configuracao critica estiver inconsistente.
3. Validar impacto em automacoes ativas.

## Risco de regressao

1. Configuracao salva sem efeito.
2. Ambiente parcialmente configurado sem fail-safe.
3. Comportamento divergente entre preview e producao.

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
