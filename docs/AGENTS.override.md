# AGENTS.override.md (docs)

Escopo: `docs/*`. Owner: engenharia de plataforma Ultima revisao: 2026-03-23

## Objetivo

1. Manter documentacao operacional e tecnica alinhada ao codigo real.
2. Diferenciar claramente:
   - canonicos ativos
   - referencia
   - historico/legado.

## Regras

1. Nao promover documento legado como fonte de verdade sem reclassificacao.
2. Em mudancas de API/integracao/regra de negocio, atualizar docs afetadas.
3. Preservar consistencia com `docs/DOCUMENTATION_CANONICAL_MATRIX.md`.
4. Nao incluir segredos em docs.
5. Documento ativo deve declarar status no topo (`active`, `reference` ou
   `legacy`) quando fizer sentido.
6. Mudanca estrutural de UI V2 em dashboard deve atualizar:
   - `docs/ui-system/*` relevante
   - `docs/ui-system/v2-component-surface-standards.md` quando houver nova variante
7. Mudanca em baseline de migracao mobile deve atualizar, no mesmo bloco:
   - `docs/plans/PLANO_REESCRITA_REPO_ANDROID_NATIVO_2026-03-20.md`
   - `docs/plans/ANEXO_PADRONIZACAO_HIGIENE_ERROS_LOADING_REESCRITA_2026-03-20.md`
   - indice/matriz canonica (`docs/README.md`, `docs/DOCUMENTATION_CANONICAL_MATRIX.md`)

## Arquivos de alto impacto

1. `docs/README.md`
2. `docs/REGRAS_DE_NEGOCIO_E_FLUXOS.md`
3. `docs/apis/API_GUIDE.md`
4. `docs/integrations/INTEGRATIONS_TECNICO.md`
5. `docs/integrations/INTEGRATIONS_GUIA_OPERACIONAL.md`

## Definition of Done local (docs)

1. Documento novo deve entrar no indice (`docs/README.md`) quando ativo.
2. Documento novo deve ser classificado na matriz canonica quando relevante.
3. Mudanca de comportamento em runtime deve refletir exemplos e passos
   operacionais.
4. Documento de plano deve ter:
   - fases
   - criterio de validacao
   - criterio de go/no-go
5. Auditoria de baseline deve registrar:
   - contagem de rotas/endpoints/loading
   - classificacao de maturidade por modulo
   - riscos residuais e proxima acao priorizada

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
