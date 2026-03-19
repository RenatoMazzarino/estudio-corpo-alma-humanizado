# AGENTS.md

Projeto: `estudio-corpo-alma-humanizado`

Este arquivo define orientacoes globais para qualquer agente trabalhando neste
repositorio. Ele e complementar ao codigo e aos documentos canonicos de
operacao.

## 1) Escopo e objetivo

1. Escopo: repo inteiro (monorepo Turbo com app web, pacotes compartilhados,
   Supabase e docs operacionais).
2. Objetivo principal: manter o produto operacional com seguranca e
   previsibilidade.
3. Objetivo tecnico: evoluir funcionalidades sem quebrar fluxo de agenda,
   atendimento, pagamento e comunicacao.

## 2) Contexto funcional do produto

1. Dashboard interno do estudio:
   - agenda
   - atendimento
   - clientes
   - configuracoes
   - mensagens
   - caixa/catalogo
2. Fluxo publico:
   - agendamento online
   - pagamento
   - voucher/comprovante
3. Integracoes ativas:
   - Supabase
   - Google Maps Platform
   - Mercado Pago
   - WhatsApp Meta Cloud API
   - Spotify

## 3) Mapa macro do repositorio

1. `apps/web`: aplicacao Next.js principal.
2. `apps/web/app`: rotas App Router, paginas publicas/dashboard, APIs internas.
3. `apps/web/src/modules`: modulos de dominio (regra de negocio).
4. `apps/web/src/shared`: utilitarios transversais.
5. `apps/web/components`: composicao e componentes de interface.
6. `supabase/migrations`: historico de schema e regras SQL.
7. `supabase/functions`: edge functions (proxy/borda de integracoes).
8. `packages/*`: bibliotecas compartilhadas do monorepo.
9. `vercel/env-import`: templates de env por ambiente (versionados, sem
   segredo).
10. `.vercel`: metadata local de link/projeto e env local (nao versionada).
11. `docs/*`: guias tecnicos, runbooks, planos e historico.
12. `.agents/skills`: skills versionadas do repo.

## 4) Fonte de verdade (ordem de precedencia)

1. Codigo em producao no repositorio.
2. Migrations/contratos de banco e runtime.
3. Configuracao real de ambiente/deploy (Vercel, Supabase, Meta, MP).
4. Documentacao ativa.
5. Documentacao historica/legada.

## 5) Documentacao canonica para decisao

1. `README.md`
2. `MANUAL_RAPIDO.md`
3. `docs/DOCUMENTATION_CANONICAL_MATRIX.md`
4. `docs/REGRAS_DE_NEGOCIO_E_FLUXOS.md`
5. `docs/apis/API_GUIDE.md`
6. `docs/integrations/INTEGRATIONS_TECNICO.md`
7. `docs/integrations/INTEGRATIONS_GUIA_OPERACIONAL.md`
8. `docs/engineering/MODULARIZATION_CONVENTIONS.md`
9. `docs/engineering/PR_CHECKLIST_REFACTOR.md`
10. `docs/engineering/AGENTS_GOVERNANCE.md`
11. `docs/engineering/AGENTS_PRECEDENCE_MAP.md`
12. `docs/runbooks/TESTES_VALIDACAO_LOCAL_E_CI.md`

## 6) Contrato arquitetural global

1. Nao reintroduzir monolitos em arquivos centrais de fluxo.
2. Preservar separacao:
   - `app/*`: entrada de rota, composicao, handlers.
   - `src/modules/*`: regra de negocio por dominio.
   - `src/shared/*`: utilitarios transversais.
   - `components/*`: UI/composicao.
3. Nao migrar regra server-side para cliente sem necessidade.
4. Nao fazer refatoracao lateral fora do escopo sem alinhamento.
5. Toda mudanca estrutural deve manter observabilidade e rollback possivel.

## 7) Contrato de dados e banco

1. Mudanca de schema exige migration em `supabase/migrations`.
2. Nao editar migration historica ja aplicada em ambientes compartilhados.
3. Toda mudanca de status/regra de negocio com persistencia deve ter impacto
   mapeado.
4. Nao assumir bypass de RLS no cliente.
5. Scripts SQL de docs sao referencia de auditoria, nao fonte principal.

## 8) Contrato de API interna e webhooks

1. Endpoints em `apps/web/app/api/*` devem manter contratos de auth/segredo.
2. Webhooks devem permanecer idempotentes e verificaveis.
3. Mudou endpoint? Atualizar `docs/apis/API_GUIDE.md`.
4. Mudou fluxo webhook de integracao? Atualizar docs de integracao/runbook.

## 9) Contrato de integracoes externas

1. Supabase: base de dados, auth e realtime operacional.
2. Google Maps: busca de endereco e deslocamento.
3. Mercado Pago: Checkout Transparente (Orders API + webhook) como caminho
   oficial.
4. WhatsApp: provider oficial atual `meta_cloud`, coexistencia manual +
   automacao.
5. Spotify: OAuth + player state/control com guards de sessao.

## 10) Ambientes e deploy

1. Production:
   - branch `main`
   - domínios de produção
2. Preview:
   - branches de validacao/homologacao
3. Development:
   - fluxo local via CLI (`vercel dev`)
4. Sequencia operacional recomendada:
   - Development -> Preview -> Production

## 11) Politica de variaveis de ambiente

1. Templates canonicos:
   - `vercel/env-import/vercel-development-required.env.example`
   - `vercel/env-import/vercel-preview-required.env.example`
   - `vercel/env-import/vercel-production-required.env.example`
2. Segredos reais:
   - apenas Vercel env por ambiente
   - arquivos locais `.vercel/env-import/*.env` (nao versionados)
3. Auditoria local de pacote:
   - `pnpm vercel:env:audit`
4. Nao manter variavel legada sem uso real no painel da Vercel.

## 12) Qualidade e validacao minima

Antes de considerar uma mudanca pronta:

1. `pnpm lint`
2. `pnpm --filter web lint:architecture`
3. `pnpm check-types`
4. `pnpm --filter web test:unit`
5. `pnpm --filter web test:smoke` quando impacto em fluxo publico/E2E
6. `pnpm build`

## 13) Politica de seguranca

1. Nunca commitar segredos/tokens/chaves.
2. Nunca publicar segredo completo em log, diff, doc ou resposta.
3. Nao usar comandos destrutivos de Git sem autorizacao explicita.
4. Em duvida de risco, preferir caminho conservador e explicitar tradeoff.

## 14) Politica de commits e arvore de trabalho

1. Commits em blocos logicos pequenos e auditaveis.
2. Evitar commit gigante misturando arquitetura + env + docs + fluxo sem
   necessidade.
3. Preservar alteracoes locais nao relacionadas do usuario.
4. Antes de editar:
   - `git branch --show-current`
   - `git status --short`

## 15) Politica de documentacao em mudancas

Atualizar documentacao quando mudar:

1. fluxo de negocio
2. contrato de API
3. integracao externa
4. processo de deploy/ambiente
5. estrutura de operacao do agente

Arquivos alvo comuns:

1. `README.md`
2. `MANUAL_RAPIDO.md`
3. `docs/CODEX_SKILLS_READINESS.md`
4. `docs/integrations/*`
5. `docs/apis/API_GUIDE.md`
6. `docs/REGRAS_DE_NEGOCIO_E_FLUXOS.md`

## 16) Politica de comunicacao de entrega

Toda entrega tecnica deve deixar claro:

1. o que mudou
2. onde mudou (arquivos)
3. como foi validado (comandos)
4. riscos residuais
5. pendencias manuais em paineis externos

## 17) Perfil de colaboracao esperado

1. Idioma: portugues-BR.
2. Resposta objetiva: primeiro decisao/resultado, depois detalhes.
3. Prioridade: execucao ponta a ponta quando pedido for de implementacao.
4. Evitar jargao desnecessario; traduzir impacto para operacao.

## 18) Overrides: conceito e precedencia

1. `AGENTS.md` da raiz vale para todo o repo.
2. `AGENTS.override.md` em uma pasta refina regras daquela pasta.
3. Se houver override local, usar:
   - regra global + regra local
   - com prioridade para a regra local em caso de conflito.

## 19) Governanca dos overrides

1. Nao manter lista manual de overrides no `AGENTS.md` raiz.
2. Fonte de verdade dos overrides ativos:
   `docs/engineering/AGENTS_PRECEDENCE_MAP.md`.
3. Para validar consistencia e regenerar mapa:
   - `pnpm agents:check`
4. Regras de escrita e manutencao:
   - `docs/engineering/AGENTS_GOVERNANCE.md`
   - `docs/agents/AGENTS_LINT_RULES.md`
   - `docs/agents/AGENTS_TEMPLATE.md`

## 20) Comandos uteis de operacao do repo

1. `pnpm install`
2. `pnpm dev`
3. `pnpm lint`
4. `pnpm check-types`
5. `pnpm --filter web test:unit`
6. `pnpm --filter web test:smoke`
7. `pnpm build`
8. `pnpm codex:skills:check`
9. `pnpm agents:check`
10. `pnpm vercel:env:audit`
11. `pnpm vercel:deploy:preview`
12. `pnpm vercel:deploy:prod`

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

## 21) Definition of Done (nivel producao)

Uma entrega so e considerada pronta quando:

1. arquitetura do trecho alterado ficou mais clara (nunca mais confusa);
2. nao houve aumento de acoplamento oculto, duplicacao oportunista ou fallback
   sem governanca;
3. contratos de API, banco, webhook e env ficaram consistentes entre codigo e
   docs;
4. validacao tecnica minima foi executada e registrada;
5. risco residual e plano de rollback foram explicitados quando houver mudanca
   critica.

## 22) Anti-gambiarra (regras de bloqueio)

Mudancas devem ser recusadas/adiadas quando:

1. exigem bypass permanente de validacao, auth, RLS ou verificacao de
   assinatura;
2. inserem flag/env temporaria sem plano de remocao;
3. dependem de ajuste manual recorrente para funcionar;
4. resolvem sintoma local criando regressao sistêmica em outro fluxo.

## 23) Diretrizes para realtime, edge e loading

1. Realtime:
   - preferir patch local de estado em vez de `router.refresh()` global;
   - manter fallback degradado com telemetria, nao fallback silencioso.
2. Edge Functions:
   - idempotencia obrigatoria;
   - retries com controle e trilha de auditoria;
   - segredo somente via env seguro.
3. Loading UX:
   - evitar spinner ad-hoc espalhado;
   - padronizar componentes de loading por contexto
     (pagina/secao/inline/bloqueante);
   - nunca deixar `fallback={null}` em fluxo critico de operacao.

## 24) Politica de subagentes (multi-agent)

1. O repo aceita uso de subagentes quando isso reduzir tempo de execucao sem
   perder coordenacao tecnica.
2. Subagentes devem ser usados para trabalho paralelo, delimitado e
   materialmente util.
3. O agente principal continua responsavel pelo resultado final, integracao,
   consistencia arquitetural e comunicacao com o usuario.
4. Nao usar subagentes como substituto de analise local do caminho critico.
5. Nao delegar tarefa vaga, aberta demais ou sem fronteira clara de arquivos,
   modulo ou pergunta.

## 25) Quando usar subagentes

Usar subagentes principalmente quando houver:

1. auditoria paralela de areas independentes do repo;
2. comparacao entre modulos, branches, logs ou contratos;
3. implementacoes em frentes separadas com baixo risco de conflito;
4. uma trilha de verificacao em paralelo a uma implementacao local;
5. necessidade de levantar contexto em um modulo enquanto o agente principal
   segue em outra frente.

## 26) Quando NAO usar subagentes

1. Mudanca pequena ou de um unico arquivo.
2. Bug cujo proximo passo depende imediatamente de um unico resultado local.
3. Refatoracao delicada com forte acoplamento em um mesmo conjunto de arquivos.
4. Situacao em que delegar aumentaria ruído, duplicacao de leitura ou conflito
   de escrita.

## 27) Contrato de delegacao

Sempre que subagentes forem usados:

1. definir objetivo concreto, escopo e entrega esperada;
2. atribuir ownership claro de arquivos/modulos quando houver edicao;
3. evitar sobreposicao de escrita entre agentes;
4. informar que ha outros agentes trabalhando no repo e que nao devem reverter
   mudancas de terceiros;
5. reservar para o agente principal a integracao final e a decisao de merge
   logico das mudancas;
6. validar localmente o resultado integrado antes de considerar concluido.

## 28) Padrao de uso neste repo

1. Em tarefas grandes, o agente principal deve primeiro identificar o caminho
   critico e manter localmente o que bloqueia o proximo passo.
2. Subagentes devem ficar com sidecars paralelos:
   - levantamento de contexto;
   - verificacao de risco;
   - implementacao em area isolada;
   - revisao de docs/testes.
3. Em escopos de producao, subagentes nao justificam relaxar validacao,
   observabilidade, testes ou documentacao.
4. Se houver conflito entre velocidade de paralelizacao e higiene estrutural,
   prevalece a higiene estrutural.

## 29) Limites do que fica versionado no repo

1. Regras de uso de subagentes devem ficar versionadas em `AGENTS.md` e docs de
   governanca.
2. Habilitacao de feature de projeto pode ficar em `.codex/config.toml` do
   repo, quando for compartilhavel com a equipe.
3. Configuracoes pessoais e especificas da maquina NAO devem ser versionadas no
   repo, por exemplo:
   - trusted projects com caminho absoluto local;
   - tokens locais;
   - auth pessoal do desktop/CLI.
4. O aviso de trusted project deve ser resolvido no arquivo do usuario
   `C:\\Users\\renat\\.codex\\config.toml`, nao neste repositorio.

## 30) Evolucao assistida de agentes e subagentes

1. Sempre que o agente identificar oportunidade benefica de evoluir a
   governanca de agentes/subagentes, deve avisar o usuario explicitamente.
2. Esse aviso deve cobrir qualquer uma das acoes abaixo:
   - criacao de arquivo de agente/override;
   - exclusao de arquivo de agente/override;
   - alteracao de regra, fluxo, padrao ou checklist;
   - ajuste em configuracao compartilhada de agente no repo;
   - reorganizacao de habilidades, politicas ou escopos de subagentes.
3. O agente nao deve assumir automaticamente esse tipo de mudanca como "detalhe
   interno irrelevante"; deve propor e pedir confirmacao.
4. A proposta deve ser objetiva e explicar:
   - o que vale criar, alterar ou remover;
   - por que isso melhora o fluxo;
   - se a mudanca e global ou local;
   - se algo deve ficar no repo ou apenas no config pessoal do usuario.
5. Se a mudanca for pequena e de baixo risco, o agente ainda deve avisar o
   usuario; a diferenca e que a proposta pode ser curta.
