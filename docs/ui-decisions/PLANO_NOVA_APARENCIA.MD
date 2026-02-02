
# 0) Objetivo do plano

**Meta:** transformar os HTMLs de referência em uma implementação real no app, com:

* UI/UX **padronizada** (sem “salada visual”)
* Componentes reutilizáveis
* Fluxos de negócio completos (agendamento → pré → sessão → checkout → pós)
* DB, RLS, actions e validações sólidas
* Observabilidade (logs/eventos) e testes mínimos de produção
* Sem gambiarras (principalmente em timer, checkout e mensageria)

---

# 1) Fonte de verdade (referência visual)

Arquivos (no repo):

* `docs/ui-decisions/Visão da Nova Tela Agenda.htm`
* `docs/ui-decisions/Visão da Nova Tela de Fomulário Agendamento Interno.htm`
* `docs/ui-decisions/Visão da Nova Tela de Atendimento.htm`
* `docs/ui-decisions/Visão da Nova Telas de Lista de Clientes e Detalhes de Clientes.htm`
* `docs/ui-decisions/Visão da Nova Tela de Novo Cliente.htm`

**Regra:** esses HTMLs são **documentos de design**, não implementação final. A implementação deve **copiar tokens, layout, hierarquia** e **padrões de interação**, mas virar componentes e páginas reais.

---

# 2) Padronização oficial de UI (Design System V1)

Antes de mexer em telas, precisamos “congelar” a base visual para que o app não vire um Frankenstein.

## 2.1 Tipografia (decisão final)

Você pediu para eu escolher e padronizar:

* **Fonte base (texto/UI):** `Lato`
* **Fonte de títulos / identidade:** `Playfair Display`

**Regras práticas**

* `Playfair Display`: somente em **H1/H2 e títulos “de marca”** (ex.: título da tela).
* `Lato`: todo o resto (labels, botões, campos, chips, textos longos).
* Escala consistente:

  * H1 (título de tela): `text-2xl` / `font-serif` / `font-bold`
  * H2 (seção): `text-sm` / `font-sans` / `font-extrabold` / `tracking-widest` / `uppercase`
  * Corpo: `text-sm` ou `text-xs` dependendo de densidade
  * Microcopy: `text-[10px]` (somente quando necessário)

## 2.2 Cores (tokens semânticos)

Padronizar em **semânticas**, não “cor solta”.

**Base**

* `paper`: `#FAF9F6` (fundo)
* `surface`: `#FFFFFF` (cards/headers)
* `text.main`: `#2C3333`
* `text.muted`: `#868E96`

**Marca**

* `studio.green`: `#6A806C`
* `studio.dark`: `#4e5f50`
* `studio.light`: `#F3F6F4`
* `studio.accent`: `#D4A373`

**Estados**

* `success` (ok/concluído): use variação do verde (ex.: `studio.green`)
* `warning`: amarelo/laranja suave
* `danger`: `#DC2626`
* `info/dom`: `#A855F7` (domicílio / especial)

> **Regra:** “Domicílio” sempre roxo (`dom`), “Studio” sempre verde.

## 2.3 Raios, sombras, bordas (consistência)

* Cards principais: `rounded-3xl`
* Cards menores / inputs: `rounded-2xl`
* Chips/pílulas: `rounded-xl` ou `rounded-full` (apenas chips)
* `shadow-soft`: **única sombra oficial** para superfícies elevadas
* Bordas:

  * cards: `border border-white` (quando o fundo é paper)
  * inputs: `border border-gray-100/200` com `focus:ring-studio-green/20`

## 2.4 Componentes “canônicos” (não reinventar por tela)

Criar e usar sempre os mesmos:

1. **AppHeader**

* variação “grande com bandeira” (topo com background suave)
* variação “compacta sticky”
* slots: back, título, ações (ícones)
* (quando necessário) header colapsável ao scroll

2. **SurfaceCard**

* card padrão com padding, raio e sombra

3. **SectionTitle**

* label uppercase com tracking + cor muted

4. **PrimaryButton / SecondaryButton / IconButton**

* Primário: `bg-studio-green text-white`
* Secundário: `bg-paper border`
* Ícone: redondo/2xl, sem texto quando for ação óbvia (Whats/Mapa)

5. **FormField / Input / Textarea / Select**

* mesma altura, mesmo padding, mesma borda

6. **Chip / Badge**

* domicílio, duração, status, VIP, alertas

7. **BottomNav (global do app)**

* Agenda / Clientes / Caixa / Menu
* sempre igual em todas telas “raiz”

8. **StageNav (apenas Atendimento)**

* navegação entre etapas + status visual (cinza / em andamento / concluído)

9. **Toast**

* feedback curto (salvo, erro, copiado)

10. **EmptyState**

* lista vazia, sem “layout quebrado”

---

# 3) Estrutura de documentação (pastas/arquivos oficiais)

Como você quer que disso nasça uma “base oficial” de UI/UX/front, recomendo:

```
docs/
  ui-decisions/
    Visão da Nova Tela Agenda.htm
    Visão da Nova Tela de Atendimento.htm
    ...
    Auditoria Visual – Estúdio Corpo & Alma Humanizado.pdf   (quando disponível)
  ui-system/
    00-visao-geral.md
    01-tokens.md                (cores, tipografia, spacing, radius, shadow)
    02-componentes.md           (o catálogo de componentes canônicos)
    03-padroes-de-layout.md     (headers, cards, listas, formulários, nav)
    04-padroes-de-interacao.md  (toasts, loading, empty, erros)
    05-acessibilidade.md        (foco, contraste, toque)
    06-estados-e-status.md      (status de agendamento, etapas, pagamentos)
    07-icone-e-ilustracao.md    (lucide, whatsapp, mapa, spotify)
    08-copywriting.md           (tom das mensagens e microcopy)
  workflows/
    atendimento.md              (pré → sessão → checkout → pós)
    agendamento.md
    clientes.md
```

E no código:

```
apps/web/
  components/ui/   (ou packages/ui se já existir e fizer sentido)
  styles/
    tokens.css (ou tailwind config consolidado)
```

---

# 4) Plano de implementação por módulo (UI + Backend + DB)

## 4.1 Módulo Agenda (lista + visão diária/semana)

### UI (o que deve existir)

* Visão **mobile-first** com:

  * header padrão
  * seletor de dia (rolagem horizontal estilo “Agenda dia”)
  * lista de horários/cards com estados (pendente, confirmado, em atendimento, concluído, cancelado)
  * CTA claro: **Novo agendamento**
  * acesso rápido ao atendimento quando estiver no horário/estado correto

### Backend / Actions

* `listAppointments(range, filters)` com:

  * intervalo por dia/semana
  * filtro por status
  * filtro por cliente/serviço (se existir busca)
* `updateAppointmentStatus(id, status)`
* `rescheduleAppointment(id, datetime)`
* `openAttendance(id)` (navega e garante registros de attendance)

### DB (validações e campos)

**Checar e ajustar** em `appointments`:

* `scheduled_at` (ou equivalente)
* `status` normalizado
* `client_id`, `service_id`
* `is_home_visit` + campos de endereço (já existem pelo que você descreveu)
* `internal_notes`
* `confirmation_status` (se não existir, criar)
* `reminder_24h_status` (se não existir, criar)

**Índices**

* `(scheduled_at)`
* `(status, scheduled_at)`
* `(client_id, scheduled_at)`

---

## 4.2 Agendamento Interno (formulário robusto)

### UI

* Form em “seções” claras (sem poluição):

  1. Cliente (buscar + selecionar + atalho “novo cliente”)
  2. Serviço (serviço, duração, preço base)
  3. Data/Hora
  4. Local (studio/domicílio) + endereço (se dom)
  5. Observações internas
  6. Confirmações (ex.: enviar msg inicial)

### Backend / Actions

* `createAppointment(payload)` com validação forte:

  * data/hora válida
  * conflito de horário (não criar sobreposto)
  * se domicílio: endereço mínimo obrigatório
* `quoteAppointment(payload)` opcional (retorna preço estimado, taxa, etc.)

### DB

* confirmar se existe tabela de `services` com duração/preço base
* confirmar política de conflito:

  * constraint lógica via query (não dá constraint pura simples sem range type, mas dá para validar na action)

---

## 4.3 Atendimento (etapas + timer + mensageria + checkout + pós)

**Nota:** isso já existe em UI V4, mas agora o plano é “refinar para produção” e “aderir ao HTML final”.

### UI

* Modelo **tela única** com:

  * header grande colapsável
  * rolagem horizontal entre etapas (estilo “dias” da agenda)
  * **StageNav inferior** pequena (não gigante)
  * Timer sempre acessível:

    * dentro do header compacto
    * bolha persistente aprimorada quando sair da tela / minimizar

### Fluxo/Estado (state machine)

Etapas:

1. Pré-atendimento
2. Sessão
3. Checkout
4. Pós

Status por etapa:

* `not_started` (cinza)
* `in_progress` (verde pulsante)
* `done` (verde sólido)

Regras:

* não pode `checkout` antes de `sessão` começar
* pós só depois de checkout confirmado (ou pelo menos “checkout finalizado”)

### Timer (produção, sem drift)

* Fonte de verdade híbrida:

  * **DB** guarda: `timer_started_at`, `timer_paused_at`, `paused_total_seconds`, `actual_seconds`
  * **Client** calcula elapsed por `Date.now()` para UI suave
* Sincronização:

  * throttle (ex.: a cada 10–30s) + sempre em pause/resume/finish
* Anti-duplicação:

  * 1 ticker global (Provider)
  * 1 sessão ativa por vez

### Checkout (corrigir duplicação e travar pós-pagamento)

Regras:

* Itens do checkout precisam ser **idempotentes**:

  * “serviço” não pode ser inserido 2x
  * “taxa deslocamento” não pode duplicar
* Depois de `payment_status = paid`:

  * tela vira **read-only**
  * botão “ver no Caixa” (por enquanto navega para `/caixa`)
* Desconto:

  * editável (input) + modo `%`/`R$` com validação e arredondamento claro

### Mensageria (base para WhatsApp)

Mesmo sem integração real, criar estrutura robusta:

* templates de mensagem (confirmar no ato / confirmar 24h / pós com pesquisa)
* log de envio manual (status: drafted/sent/failed)
* botão “Enviar” abre WhatsApp com texto pronto + marca status como “sent_manual” (após confirmação do usuário via UI)

### Backend / Actions (Atendimento)

Você já tem várias actions. Consolidar e completar:

* `getAttendance(appointmentId)` (já existe/planejado)
* `setStage(appointmentId, stage)` + validação
* `markStageDone(appointmentId, stage)`
* `startTimer/pauseTimer/resumeTimer`
* `saveEvolutionStructured(...)` (versões)
* `setCheckout(items, discount, ...)` (idempotente)
* `confirmPayment(method, amount, ...)`
* `sendMessage(type)` (manual agora, log + link)
* `savePost(surveyStatus, score, notes, followUpDueAt, ...)`
* `finishAttendance(appointmentId)` fecha tudo e registra KPIs

### DB (se já existe, validar e ajustar)

Como você já rodou migrations do atendimento, o plano aqui é **pente fino**:

1. `appointment_attendances`

* garantir:

  * `current_stage`
  * status por etapa
  * timer fields
  * `actual_seconds` final
  * índices em `(appointment_id)` e `(current_stage)`

2. `appointment_checkout_items`

* criar unique parcial ou lógica na action para impedir duplicação por `type`

  * (ex.: `type=service` unique por appointment)
  * (ex.: `type=fee:travel` unique por appointment)

3. `appointment_messages` (se não existir, criar)

* `appointment_id`
* `type` (created_confirmation | reminder_24h | post_survey)
* `status` (drafted | sent_manual | sent_auto | delivered | failed)
* `payload` (jsonb com texto, telefone, etc.)
* `sent_at`

4. `appointment_surveys` (opcional agora, mas bom já deixar pronto)

* `appointment_id`
* `score` 0–10
* `comment`
* `answered_at`

5. `appointment_events` (auditoria)

* logar transições críticas (timer, stage, checkout, pagamento)

### RLS (produção)

* **service_role nunca no client**
* actions server-side usando service_role apenas no servidor
* políticas:

  * leitura/escrita por usuário autenticado com role adequada (admin/therapist)
  * opcional: RLS por “owner” se houver multi-profissional

---

## 4.4 Clientes (lista, detalhe, novo cliente)

### UI Lista

* Estilo “lista de contatos”:

  * agrupamento por letra
  * busca no topo
  * chips (VIP, alerta)
  * toques grandes (44px+)

### UI Detalhe

* Header com avatar/monograma
* Ações rápidas (Whats, Ligar, Mapa) como **IconButton** (sem texto grande)
* Seções:

  * Sobre (telefone, nascimento, endereço)
  * Saúde & Cuidados (tags e observações)
  * Histórico (últimos atendimentos)
* CTA flutuante: novo agendamento para este cliente

### UI Novo Cliente (form completo)

Seu HTML de novo cliente está bem completo; o plano é implementar com:

* validação
* máscaras (telefone, CPF, CEP)
* salvamento por seções (ou uma vez)
* suporte a menor de idade (responsável)

### Backend / Actions

* `listClients(query, letter, page)` com paginação real
* `getClientById(id)` com dados + histórico de atendimentos
* `createClient(payload)` valida tudo
* `updateClient(id, payload)`
* `linkClientToAppointment(clientId, appointmentId)` (quando necessário)

### DB (cliente robusto)

Se sua tabela `clients` ainda é “mínima”, evoluir para produção:

Campos recomendados (colunas ou JSONB bem controlado):

* `full_name` (obrigatório)
* `phone` (obrigatório)
* `whatsapp_enabled` (bool)
* `email` (opcional)
* `birth_date` (opcional)
* `cpf` (opcional)
* `address_*` (cep, street, number, complement, district, city, state)
* `tags` (ideal em tabela relacional `client_tags`, mas pode ser jsonb no começo)
* `health_flags` (tabela ou jsonb)
* `preferences` (texto)
* `internal_notes` (texto)
* `marketing_opt_in` (bool)
* `is_minor` + `guardian_name` + `guardian_phone`
* `consent_status` + `consent_at`

Índices:

* `clients(full_name)` (com trigram se usar busca melhor)
* `clients(phone)`
* `appointments(client_id, scheduled_at)`

---

# 5) Refatoração para evitar “salada” (arquitetura front)

## 5.1 Consolidar tokens (tailwind)

Hoje cada HTML tem um `tailwind.config` próprio. Na implementação real:

* centralizar tokens no `tailwind.config` do app (ou pacote `@repo/ui`)
* criar `theme.ts`/`tokens.ts` com constantes (opcional)

## 5.2 Componentização por padrão de tela

Páginas devem montar “blocos” reutilizáveis:

* `AppShellMobileFrame` (se vocês mantêm 414px fixo)
* `AppHeader`
* `BottomNav`
* `SurfaceCard`
* `FormSection`
* `StageCarousel` (Atendimento)
* `ClientListItem`
* `AppointmentCard`

## 5.3 Estados de carregamento

Padronizar:

* skeletons (cards cinza claro)
* empty state
* erro com CTA (tentar novamente)

---

# 6) Roadmap de execução (ordem ideal)

Você pediu “plano profundo”, mas sem entrar em PRs múltiplas (isso será instrução do comando do Codex depois). Ainda assim, a ordem lógica é:

1. **UI System V1**

   * tokens + componentes canônicos + padrões (sem mudar regra de negócio)
2. **Clientes**

   * lista + detalhe (read)
   * novo cliente (create)
3. **Agenda**

   * visão diária/semana
   * navegação para atendimento e agendamento
4. **Agendamento Interno**

   * create appointment robusto + validação de conflito
5. **Atendimento**

   * alinhar UI V4 ao HTML final (tela única + etapas horizontais)
   * corrigir checkout duplicado + desconto editável + travar pós-pago
   * mensageria base + logs
6. **Hardening**

   * RLS/policies
   * logs (events)
   * testes mínimos
   * build/CI

---

# 7) Critérios de pronto (produção)

## Visual/UI

* Mesmas fontes, cores, sombras, raios e botões em todas telas
* BottomNav igual em telas raiz
* StageNav apenas no Atendimento
* Sem duplicação de “estilos inventados” por tela

## Funcional

* Agendamento não cria conflito de horário
* Atendimento não duplica itens no checkout
* Desconto editável e correto
* Pagamento confirmado trava edição
* Timer consistente após reload
* Mensageria loga status (mesmo manual)

## Segurança

* service_role nunca exposto no client
* RLS consistente
* actions server-side com validação

## Qualidade

* `pnpm lint`, `pnpm check-types`, `pnpm build` passando
* Testes críticos (timer, checkout, criação de agendamento)

---

# 8) O que eu vou pedir ao Codex complementar depois (para validar o plano)

Como você disse que depois pedirá um comando para o Codex “validar e complementar”, o Codex deve:

* mapear paths reais do repo
* listar funções/actions existentes e apontar conflitos
* confirmar schema atual vs. proposto (migrations necessárias)
* validar onde colocar componentes (se já existe `@repo/ui`)
* garantir que a implementação siga os HTMLs como referência
