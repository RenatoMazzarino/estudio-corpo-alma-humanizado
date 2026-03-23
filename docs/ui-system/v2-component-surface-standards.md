# Padrao V2 - Headers, Cards, Sheets e Accordions

Status: active

<!-- markdownlint-disable MD013 -->

Atualizado em: 2026-03-22  
Escopo: telas autenticadas do dashboard (`/agenda`, `/novo` e modais relacionados).

Objetivo:  
Definir um contrato unico de aparencia para evitar divergencia visual entre modulos.

## 1) Header de tela (Topo principal)

Uso:

- topo de `Agenda`
- topo de `Novo agendamento`

Contrato:

- fundo: `wl-sheet-header-surface`
- altura util visual: bloco principal + linha de tabs (sem blocos extras acima)
- titulo: `wl-typo-card-name-md` com cor branca
- botoes de icone: `wl-header-icon-button-strong`
- espacamento minimo: `safe-top`, `px-6`, `pb-0`

Nao pode:

- usar botao de icone com fundo/transparencia diferente do padrao
- misturar fonte de corpo no titulo principal

## 2) Sheet de navegacao no header de tela

Uso:

- linha de tabs no topo (ex.: `Dia/Semana/Calendario`, `Cliente/Servico/Agenda/Financeiro`)

Contrato:

- deve ficar no mesmo bloco do header principal
- divisor inferior obrigatorio (`border-b`)
- tipografia de tab: sans, peso 600, tamanho 13px
- estado ativo com sublinhado visivel

## 3) Header de modal (Modal Header 1)

Uso:

- modais de detalhe/agendamento
- modais de bloqueio e gerador de escala
- modal de revisao/finalizacao

Contrato:

- fundo: `wl-sheet-header-surface`
- sem borda branca externa no topo do modal
- tipografia de titulo: serif, negrito
- subtitulo/descricao: opacidade reduzida no mesmo eixo do titulo
- botoes de acao/fechar: `wl-header-icon-button-strong`

Nao pode:

- header com fundo igual ao corpo do modal
- botao de fechar fora do padrao de icone

## 4) Header de card 1 (Card Header alto)

Uso:

- cards das fases principais do `Novo agendamento`
- blocos de destaque funcional (etapas estruturais)

Contrato:

- fundo: `wl-surface-card-header`
- altura visual alvo: 48px (`h-12`), usando como base o cabecalho de cada dia da visao semana
- tipografia: serif + negrito
- fonte interna maior (mesma familia serif do nome de cliente)
- obrigatorio ter divisor para o corpo (`border-b`)

## 5) Header de card 2 (Card Header regular)

Uso:

- cards do calendario e listagens de dia/semana/mes
- cards auxiliares com menos hierarquia visual

Contrato:

- fundo: `wl-surface-card-header`
- altura visual alvo: 40px (`h-10`) ou `py-2.5`
- tipografia: serif + negrito, menor que Header 1

Regra:

- quando houver duvida entre Header 1 e Header 2, usar Header 2 por padrao.

## 6) Cards internos de modal

Uso:

- secoes internas de modal (logistica, comunicacao, financeiro, observacoes)

Contrato:

- estrutura obrigatoria: `Header -> Divisor -> Body`
- header: `wl-surface-card-header`
- body: `wl-surface-card-body`
- raio: seguir `--radius-card` (sem raio custom local)

Nao pode:

- bloco unico sem divisao quando o conteudo representa secoes diferentes
- cards internos com fundo aleatorio fora dos tokens

## 7) Header de accordion (2 niveis)

Accordion Header 1:

- para blocos com impacto de fluxo (ex.: selecao de dia, atendimento domiciliar)
- usar altura e destaque equivalente ao Header de card 1

Accordion Header 2:

- para opcoes auxiliares (ex.: desconto, item extra, cobranca)
- usar altura e destaque equivalente ao Header de card 2

Regra de estado:

- quando expandido, corpo deve manter o mesmo contexto de superficie do header
- ex.: `Integral/Sinal` + `Valor do sinal` no mesmo bloco visual

## 8) Checklist rapido de PR (UI V2)

Antes de aprovar PR com mudanca visual:

1. Header de tela segue contrato do item 1.
2. Tabs/sheet do header seguem item 2.
3. Modal segue item 3.
4. Card de etapa usa Header 1.
5. Card auxiliar usa Header 2.
6. Accordion segue nivel correto (1 ou 2).
7. Nao existe hardcode de cor/fonte fora dos tokens/classes WL.

## 9) Botoes canonicos (fluxo novo agendamento)

Uso:

- `appointmentFormButtonPrimaryClass`: acao principal (continuar, revisar, confirmar, salvar).
- `appointmentFormButtonSecondaryClass`: acao secundaria (voltar, cancelar, editar).
- `appointmentFormButtonInlineClass`: acoes compactas em cards e listagens (copiar, enviar, remover, adicionar).
- `appointmentFormHeaderIconButtonClass`: icones de cabecalho/card (fechar, limpar, expandir).
- `switch-toggle` (botao role switch): habilitar/desabilitar blocos accordion (domiciliar, desconto, cobrar agora etc.).

Regra:

- priorizar esses 5 tipos antes de criar variacao local.
- so criar excecao quando houver requisito funcional claro.

## 10) Footer Rail (rodapes padronizados)

Uso:

- `BottomNav` global
- rodapes de modais com acoes finais
- rodape do fluxo `Novo agendamento` (variante com resumo + acoes)

Contrato:

- usar `FooterRail` como componente base
- altura base do trilho: `--footer-rail-height`
- altura da linha de acao: `--footer-action-row-height`
- botoes de acao no rodape com altura uniforme

Variantes:

- `single-row`: uma linha de acoes (ex.: nav global, modal simples)
- `summary+actions`: resumo acima + linha de acoes (ex.: novo agendamento)

Regra de cor para botoes:

- acao positiva/confirmacao/avanco: verde (primary)
- cancelamento/exclusao/interrupcao: vermelho (danger)
- acao neutra de navegacao: secundario (branco com borda)
