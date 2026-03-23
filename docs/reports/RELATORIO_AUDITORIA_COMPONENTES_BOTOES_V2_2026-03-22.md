# Relatorio - Auditoria V2 de Componentes e Botoes (Agenda + Novo)

Status: active

<!-- markdownlint-disable MD013 -->

Data: 2026-03-22  
Escopo:

1. `apps/web/app/(dashboard)/novo/components/*`
2. `apps/web/components/agenda/*`
3. `apps/web/components/availability/*`
4. `apps/web/components/availability-manager.tsx`

## 1) Resultado executivo

1. Os 5 cabecalhos principais de etapa do `novo agendamento` estao no padrao alto (`h-11`) e com estrutura consistente de `header + divisor + body`.
2. O switch de `Atendimento domiciliar` tambem esta no padrao alto (`h-11`).
3. O cabecalho interno de `Enderecos cadastrados` foi ajustado para o padrao menor (`h-10`) por ser subsecao.
4. Inventario de botoes V2:
   - 110 botoes mapeados
   - 83 assinaturas de `className` diferentes
   - conclusao: existe divergencia relevante de aparencia de botoes.

## 2) Novo agendamento - mapa de componentes

### 2.1 Componentes e status de padrao

1. `appointment-client-step.tsx`: conforme (header de etapa alto + corpo padrao).
2. `appointment-service-location-step.tsx`: conforme.
3. `appointment-when-step.tsx`: conforme.
4. `appointment-finance-step.tsx`: conforme.
5. `appointment-notes-and-submit.tsx`: conforme em header; botoes internos ainda com variacoes de estilo.
6. `appointment-home-visit-details.tsx`: conforme apos ajuste de header menor para subsecao de endereco.
7. `appointment-confirmation-sheet.tsx`: parcial (estrutura boa, mas ainda existe variedade de estilos de botoes internos).
8. `client-create-modal.tsx`: parcial (padrao geral ok, botoes ainda fora de uma variante canonica unica).
9. `address-create-modal.tsx`: parcial (header modal ok; tabs e botoes de acao ainda com variacoes locais).
10. `appointment-overlays.tsx`, `appointment-hidden-fields.tsx`, `appointment-form-sections.tsx`, `google-maps-address-button.tsx`: componentes de suporte/infra.

### 2.2 Regra de altura de cabecalhos (checagem objetiva)

Padrao alto (`h-11`):

1. Etapa 1 cliente:
   - `apps/web/app/(dashboard)/novo/components/appointment-client-step.tsx`
2. Etapa 2 servico:
   - `apps/web/app/(dashboard)/novo/components/appointment-service-location-step.tsx`
3. Etapa 3 dia:
   - `apps/web/app/(dashboard)/novo/components/appointment-when-step.tsx`
4. Etapa 4 financeiro:
   - `apps/web/app/(dashboard)/novo/components/appointment-finance-step.tsx`
5. Etapa 5 observacoes:
   - `apps/web/app/(dashboard)/novo/components/appointment-notes-and-submit.tsx`
6. Bloco `Atendimento domiciliar`:
   - `apps/web/app/(dashboard)/novo/components/appointment-service-location-step.tsx`

Padrao menor (`h-10`):

1. Cabecalho interno de enderecos:
   - `apps/web/app/(dashboard)/novo/components/appointment-home-visit-details.tsx`

## 3) Inventario de botoes V2

### 3.1 Onde esta a maior variacao

1. `apps/web/app/(dashboard)/novo/components/appointment-confirmation-sheet.tsx`
2. `apps/web/components/agenda/appointment-details-active-view.tsx`
3. `apps/web/components/agenda/appointment-details-completed-view.tsx`
4. `apps/web/components/agenda/mobile-agenda-header.tsx`
5. `apps/web/components/availability/availability-scale-sheet.tsx`
6. `apps/web/components/availability/availability-block-sheet.tsx`

### 3.2 Padrao recomendado de botoes (canonico V2)

1. `btn-icon-header`:
   - uso: icones no header de tela e header de modal.
   - visual: circular, fundo branco, icone na cor primaria.
2. `btn-icon-card`:
   - uso: icones em cabecalho de card/etapa.
   - visual: circular, borda discreta, fundo branco, hover suave.
3. `btn-primary`:
   - uso: acao principal de contexto.
   - visual: fundo verde primario, texto branco, `h-11`, canto padrao.
4. `btn-secondary`:
   - uso: acao secundaria.
   - visual: fundo claro do sistema, borda linha, texto forte.
5. `btn-danger`:
   - uso: acao destrutiva.
   - visual: vermelho solido, texto branco, mesmo shape do primario.
6. `btn-tab`:
   - uso: selecao tipo aba/sheet (`Dia/Semana/Calendario`, `Integral/Sinal`).
   - visual: base neutra + indicador de ativo.
7. `btn-menu-item`:
   - uso: itens de menu suspenso e action sheet.
   - visual: linha unica com icone + texto, hover discreto.
8. `btn-switch`:
   - uso: toggles de liga/desliga.
   - visual: trilho e thumb padronizados; sem texto redundante "ativado/desativado".

## 4) Mudancas aplicadas nesta rodada

1. Unificacao de icones de cabecalho no `novo` com classe compartilhada:
   - `appointmentFormHeaderIconButtonClass`
   - arquivo: `apps/web/app/(dashboard)/novo/appointment-form.styles.ts`
2. Aplicacao dessa classe em:
   - `appointment-client-step.tsx`
   - `appointment-service-location-step.tsx`
   - `appointment-when-step.tsx`
   - `appointment-home-visit-details.tsx`
3. Ajuste de hierarquia de cabecalho interno:
   - `appointment-home-visit-details.tsx` (`h-10` no header de endereco).

## 5) Proximo bloco recomendado (padronizacao total de botoes)

1. Criar variantes canonicas de botao em `components/ui` (sem hardcode local).
2. Migrar primeiro:
   - `appointment-confirmation-sheet.tsx`
   - `appointment-details-active-view.tsx`
   - `appointment-details-completed-view.tsx`
3. Migrar depois os sheets de bloqueio/escala.
4. Rodar auditoria automatica de `className` de botoes a cada PR de UI.
