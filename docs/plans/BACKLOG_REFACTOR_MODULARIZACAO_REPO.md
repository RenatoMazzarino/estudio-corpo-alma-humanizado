# Backlog de Modularização do Repo

Status: pendente (registrado para próxima sessão)
Data de registro: 2026-02-26

## Objetivo

Reduzir arquivos "monstro" e modularizar o código para:

- facilitar alterações pequenas sem risco de quebrar fluxos grandes
- separar responsabilidades (UI, lógica, ações, persistência)
- reduzir acoplamento entre formulário/tela/modal
- melhorar legibilidade e manutenção

## Problemas observados (registrados)

- Há arquivos muito grandes com múltiplas responsabilidades no mesmo lugar.
- Existem componentes com:
  - formulário
  - lógica de estado
  - ações
  - persistência
  - renderização de modal
  tudo no mesmo arquivo.
- Pequenas mudanças (ex.: título/label) exigem mexer em arquivos extensos, aumentando risco de regressão.
- Há modais definidos dentro de arquivos grandes, o que aumenta o risco de quebrar a tela principal ao ajustar o modal.

## Diretriz de refatoração (decisão do usuário)

- Formularios devem ser separados em arquivos específicos por tipo/etapa.
- Modais devem ficar em arquivos próprios (quando fizer sentido).
- Separar:
  - aparência (componentes visuais)
  - lógica de estado/fluxo
  - ações server/client
  - persistência/acesso a dados
- Priorizar refatoração segura e incremental (sem reescrever tudo de uma vez).

## Próximas tarefas (macro)

1. Mapear arquivos grandes e classificar por risco/impacto.
2. Definir uma convenção de organização por módulo (UI, hooks, actions, repository, types).
3. Refatorar os formulários mais críticos em subcomponentes/arquivos menores.
4. Extrair modais embutidos para componentes dedicados.
5. Separar lógica de negócio de lógica de apresentação nos fluxos mais sensíveis.
6. Validar cada bloco com `lint` + `build` + teste manual do fluxo afetado.

## Alvos iniciais sugeridos (alta prioridade)

1. `apps/web/app/(dashboard)/novo/appointment-form.tsx`
2. `apps/web/app/(public)/agendar/[slug]/booking-flow.tsx`
3. `apps/web/app/(dashboard)/atendimento/[id]/components/attendance-payment-modal.tsx`
4. `apps/web/src/modules/appointments/actions.ts`

## Estratégia recomendada (para evitar quebra)

1. Quebrar por fronteiras visuais primeiro (subcomponentes de UI).
2. Depois extrair modais.
3. Depois extrair hooks/estado.
4. Por fim consolidar ações/regras compartilhadas.

## Critério de pronto por refatoração

- Mesmo comportamento funcional (sem regressão perceptível)
- `lint` e `build` passando
- Arquivo principal reduzido
- Responsabilidades separadas de forma auditável

