# AGENTS.override.md (packages)

Escopo: `packages/*`.

## Diretriz

1. Pacotes sao compartilhados; evitar acoplamento com detalhes de `apps/web`.
2. APIs de pacote devem ser estaveis e versionadas no contexto do workspace.

## Regras

1. Mudou interface publica de pacote:
   - validar consumidores
   - ajustar tipos/imports no app.
2. Evitar dependencia circular entre pacotes.
3. Manter foco de cada pacote (UI, eslint config, tsconfig etc.).

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
