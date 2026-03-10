# AGENTS.override.md (apps/web/src/modules/auth)

Escopo: autenticacao e autorizacao de acesso interno.

## Objetivo

1. Proteger sessao e limites de acesso por perfil.
2. Evitar regressao de seguranca por conveniencia de implementacao.

## Regras

1. Nao relaxar validacao de sessao para resolver bug pontual.
2. Mudanca de autorizacao deve ser explicitada em contrato de rota/acao.
3. Erro de auth deve retornar resposta previsivel e sem vazar detalhe sensivel.
4. Nao replicar regra de permissao em muitos pontos sem centralizacao.

## Aplica / Nao aplica

1. Aplica em auth guards, verificadores e utilitarios de sessao.
2. Nao aplica a copy visual de login sem efeito de seguranca.

## Checklist minimo de validacao

1. Teste de rota protegida e rota publica.
2. Validar expiracao e renovacao de sessao.
3. Validar logs sem segredos.

## Risco de regressao

1. Permissao indevida em area restrita.
2. Bloqueio indevido de fluxo legitimo.
3. Exposicao de detalhe tecnico sensivel.

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