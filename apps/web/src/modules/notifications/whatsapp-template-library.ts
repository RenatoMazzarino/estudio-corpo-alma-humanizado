import { META_TEMPLATE_PUBLIC_SAMPLE_CODE } from "../../shared/meta-template-demo";
import { buildPublicAppUrl } from "../../shared/config";

export type WhatsAppTemplateLibraryGroup =
  | "appointment_notice_variations"
  | "appointment_reminder_confirmation_24h"
  | "appointment_confirmation_reply";
export type WhatsAppTemplateStatus = "active" | "in_review";

export type WhatsAppTemplateVariableDefinition = {
  index: number;
  key: string;
  description: string;
  example: string;
};

export type WhatsAppTemplateButtonDefinition =
  | {
      type: "none";
    }
  | {
      type: "url_dynamic";
      buttonText: string;
      urlBase: string;
      variableName: string;
      sampleValue: string;
    }
  | {
      type: "quick_reply";
      buttons: Array<{
        id: string;
        text: string;
      }>;
    };

export type WhatsAppTemplateDefinition = {
  provider: "meta";
  status: WhatsAppTemplateStatus;
  statusLabel: "CRIADO E JÁ ATIVO" | "CRIADO E EM ANÁLISE";
  locale: "pt_BR";
  group: WhatsAppTemplateLibraryGroup;
  name: string;
  headerText?: string;
  body: string;
  footer: string;
  variables: WhatsAppTemplateVariableDefinition[];
  button: WhatsAppTemplateButtonDefinition;
  metaTestUrl: string;
};

const RECEIPT_URL_BASE = `${buildPublicAppUrl("/comprovante/pagamento")}/`;
const PAYMENT_URL_BASE = `${buildPublicAppUrl("/pagamento")}/`;
const VOUCHER_URL_BASE = `${buildPublicAppUrl("/voucher")}/`;
const FOOTER_AUTO_MESSAGE = "Mensagem automática. Não é necessário confirmar.";
const STATUS_ACTIVE_LABEL = "CRIADO E JÁ ATIVO" as const;
const STATUS_IN_REVIEW_LABEL = "CRIADO E EM ANÁLISE" as const;

const RECEIPT_BUTTON: WhatsAppTemplateButtonDefinition = {
  type: "url_dynamic",
  buttonText: "VER COMPROVANTE",
  urlBase: RECEIPT_URL_BASE,
  variableName: "receipt_payment_public_id",
  sampleValue: META_TEMPLATE_PUBLIC_SAMPLE_CODE,
};

const PAY_NOW_BUTTON: WhatsAppTemplateButtonDefinition = {
  type: "url_dynamic",
  buttonText: "PAGAR AGORA",
  urlBase: PAYMENT_URL_BASE,
  variableName: "payment_link_public_id",
  sampleValue: META_TEMPLATE_PUBLIC_SAMPLE_CODE,
};

const VOUCHER_BUTTON: WhatsAppTemplateButtonDefinition = {
  type: "url_dynamic",
  buttonText: "VER VOUCHER",
  urlBase: VOUCHER_URL_BASE,
  variableName: "voucher_public_id",
  sampleValue: META_TEMPLATE_PUBLIC_SAMPLE_CODE,
};

const RECEIPT_META_TEST_URL = `${RECEIPT_URL_BASE}${META_TEMPLATE_PUBLIC_SAMPLE_CODE}`;
const PAYMENT_META_TEST_URL = `${PAYMENT_URL_BASE}${META_TEMPLATE_PUBLIC_SAMPLE_CODE}`;
const VOUCHER_META_TEST_URL = `${VOUCHER_URL_BASE}${META_TEMPLATE_PUBLIC_SAMPLE_CODE}`;
const REMINDER_META_TEST_URL = buildPublicAppUrl("/mensagens");
const REMINDER_CONFIRMATION_BUTTONS = [
  { id: "confirmar", text: "CONFIRMAR" },
  { id: "reagendar", text: "REAGENDAR" },
  { id: "falar_com_a_jana", text: "FALAR COM A JANA" },
] as const;

const REMINDER_CONFIRMATION_BUTTON: WhatsAppTemplateButtonDefinition = {
  type: "quick_reply",
  buttons: [...REMINDER_CONFIRMATION_BUTTONS],
};

export const WHATSAPP_TEMPLATE_LIBRARY_APPOINTMENT_NOTICE_VARIATIONS: WhatsAppTemplateDefinition[] = [
  {
    provider: "meta",
    status: "active",
    statusLabel: STATUS_ACTIVE_LABEL,
    locale: "pt_BR",
    group: "appointment_notice_variations",
    name: "aviso_agendamento_no_estudio_com_sinal_pago_com_flora",
    body: `Olá, *{{1}}*! Tudo bem? Sou a Flora, Assistente Virtual do Estúdio Corpo & Alma Humanizado. 🌿

*✅ O seu momento de cuidado com a Jana está confirmado!*

✨ Seu cuidado é *{{2}}*. 
📅 Reservado para *{{3}}* às *{{4}}*.
📍 Nosso ponto de encontro é *no Estúdio: Rua Silva Pinto, 186, Centro Histórico, Amparo - SP, 13900-319.*

🧾 *Resumo Financeiro*
• *Valor Total:* R$ {{5}}
• *Sinal já pago:* R$ {{6}}
• *Pagamento no dia:* R$ {{7}}

_(O pagamento do saldo pode ser feito via Pix, cartão ou dinheiro no dia do atendimento)._

Se houver qualquer imprevisto e você precisar ajustar o seu horário, fique à vontade para me avisar por aqui.

Ah, para o seu controle, deixei o comprovante de pagamento do sinal disponível no botão logo abaixo. 👇

_Até breve._`,
    footer: FOOTER_AUTO_MESSAGE,
    variables: [
      { index: 1, key: "client_name", description: "Nome da cliente", example: "Maria" },
      { index: 2, key: "service_name", description: "Nome do cuidado", example: "Massagem Relaxante" },
      { index: 3, key: "date_label", description: "Data formatada", example: "12/03/2026" },
      { index: 4, key: "time_label", description: "Horário formatado", example: "18:30" },
      { index: 5, key: "total_amount", description: "Valor total sem prefixo monetário", example: "220,00" },
      { index: 6, key: "signal_paid_amount", description: "Valor do sinal já pago", example: "80,00" },
      { index: 7, key: "remaining_amount", description: "Valor restante para pagamento no dia", example: "140,00" },
      {
        index: 8,
        key: "receipt_payment_public_id",
        description: "Identificador público para abrir o comprovante de pagamento",
        example: META_TEMPLATE_PUBLIC_SAMPLE_CODE,
      },
    ],
    button: RECEIPT_BUTTON,
    metaTestUrl: RECEIPT_META_TEST_URL,
  },
  {
    provider: "meta",
    status: "active",
    statusLabel: STATUS_ACTIVE_LABEL,
    locale: "pt_BR",
    group: "appointment_notice_variations",
    name: "aviso_agendamento_no_estudio_com_sinal_pago_sem_oi_flora",
    body: `Olá, *{{1}}*! Tudo bem? ✨

*✅ O seu momento de cuidado com a Jana está confirmado!*

✨ Seu cuidado é *{{2}}*. 
📅 Reservado para *{{3}}* às *{{4}}*.
📍 Nosso ponto de encontro é *no Estúdio: Rua Silva Pinto, 186, Centro Histórico, Amparo - SP, 13900-319.*

🧾 *Resumo Financeiro*
• *Valor Total:* R$ {{5}}
• *Sinal já pago:* R$ {{6}}
• *Pagamento no dia:* R$ {{7}}

_(O pagamento do saldo pode ser feito via Pix, cartão ou dinheiro no dia do atendimento)._

Se houver qualquer imprevisto e você precisar ajustar o seu horário, fique à vontade para me avisar por aqui.

Ah, para o seu controle, deixei o comprovante de pagamento do sinal disponível no botão logo abaixo. 👇

_Até breve._`,
    footer: FOOTER_AUTO_MESSAGE,
    variables: [
      { index: 1, key: "client_name", description: "Nome da cliente", example: "Maria" },
      { index: 2, key: "service_name", description: "Nome do cuidado", example: "Massagem Relaxante" },
      { index: 3, key: "date_label", description: "Data formatada", example: "12/03/2026" },
      { index: 4, key: "time_label", description: "Horário formatado", example: "18:30" },
      { index: 5, key: "total_amount", description: "Valor total sem prefixo monetário", example: "220,00" },
      { index: 6, key: "signal_paid_amount", description: "Valor do sinal já pago", example: "80,00" },
      { index: 7, key: "remaining_amount", description: "Valor restante para pagamento no dia", example: "140,00" },
      {
        index: 8,
        key: "receipt_payment_public_id",
        description: "Identificador público para abrir o comprovante de pagamento",
        example: META_TEMPLATE_PUBLIC_SAMPLE_CODE,
      },
    ],
    button: RECEIPT_BUTTON,
    metaTestUrl: RECEIPT_META_TEST_URL,
  },
  {
    provider: "meta",
    status: "active",
    statusLabel: STATUS_ACTIVE_LABEL,
    locale: "pt_BR",
    group: "appointment_notice_variations",
    name: "aviso_agendamento_no_estudio_pago_integral_com_flora",
    body: `Olá, *{{1}}*! Tudo bem? Sou a Flora, Assistente Virtual do Estúdio Corpo & Alma Humanizado. 🌿

*✅ O seu momento de cuidado com a Jana está confirmado!*

✨ Seu cuidado é *{{2}}*.
📅 Reservado para *{{3}}* às *{{4}}*.
📍 Nosso ponto de encontro é *no Estúdio: Rua Silva Pinto, 186, Centro Histórico, Amparo - SP, 13900-319.*

🧾 *Resumo Financeiro*
• *Valor Total:* R$ {{5}}
• *Valor Pago:* R$ {{6}}

*_(Seu atendimento já está totalmente pago. É só vir relaxar!)_*

Se houver qualquer imprevisto e você precisar ajustar o seu horário, fique à vontade para me avisar por aqui.

Ah, para o seu controle, deixei o comprovante de pagamento disponível no botão logo abaixo. 👇

_Até breve._`,
    footer: FOOTER_AUTO_MESSAGE,
    variables: [
      { index: 1, key: "client_name", description: "Nome da cliente", example: "Maria" },
      { index: 2, key: "service_name", description: "Nome do cuidado", example: "Massagem Relaxante" },
      { index: 3, key: "date_label", description: "Data formatada", example: "12/03/2026" },
      { index: 4, key: "time_label", description: "Horário formatado", example: "18:30" },
      { index: 5, key: "total_amount", description: "Valor total sem prefixo monetário", example: "220,00" },
      { index: 6, key: "paid_amount", description: "Valor pago integralmente", example: "220,00" },
      {
        index: 7,
        key: "receipt_payment_public_id",
        description: "Identificador público para abrir o comprovante de pagamento",
        example: META_TEMPLATE_PUBLIC_SAMPLE_CODE,
      },
    ],
    button: RECEIPT_BUTTON,
    metaTestUrl: RECEIPT_META_TEST_URL,
  },
  {
    provider: "meta",
    status: "active",
    statusLabel: STATUS_ACTIVE_LABEL,
    locale: "pt_BR",
    group: "appointment_notice_variations",
    name: "aviso_agendamento_no_estudio_pago_integral_sem_oi_flora",
    body: `Olá, *{{1}}*! Tudo bem? ✨

*✅ O seu momento de cuidado com a Jana está confirmado!*

✨ Seu cuidado é *{{2}}*.
📅 Reservado para *{{3}}* às *{{4}}*.
📍 Nosso ponto de encontro é *no Estúdio: Rua Silva Pinto, 186, Centro Histórico, Amparo - SP, 13900-319.*

🧾 *Resumo Financeiro*
• *Valor Total:* R$ {{5}}
• *Valor Pago:* R$ {{6}}

*_(Seu atendimento já está totalmente pago. É só vir relaxar!)_*

Se houver qualquer imprevisto e você precisar ajustar o seu horário, fique à vontade para me avisar por aqui.

Ah, para o seu controle, deixei o comprovante de pagamento disponível no botão logo abaixo. 👇

_Até breve._`,
    footer: FOOTER_AUTO_MESSAGE,
    variables: [
      { index: 1, key: "client_name", description: "Nome da cliente", example: "Maria" },
      { index: 2, key: "service_name", description: "Nome do cuidado", example: "Massagem Relaxante" },
      { index: 3, key: "date_label", description: "Data formatada", example: "12/03/2026" },
      { index: 4, key: "time_label", description: "Horário formatado", example: "18:30" },
      { index: 5, key: "total_amount", description: "Valor total sem prefixo monetário", example: "220,00" },
      { index: 6, key: "paid_amount", description: "Valor pago integralmente", example: "220,00" },
      {
        index: 7,
        key: "receipt_payment_public_id",
        description: "Identificador público para abrir o comprovante de pagamento",
        example: META_TEMPLATE_PUBLIC_SAMPLE_CODE,
      },
    ],
    button: RECEIPT_BUTTON,
    metaTestUrl: RECEIPT_META_TEST_URL,
  },
  {
    provider: "meta",
    status: "in_review",
    statusLabel: STATUS_IN_REVIEW_LABEL,
    locale: "pt_BR",
    group: "appointment_notice_variations",
    name: "aviso_agendamento_domicilio_sinal_pago_com_flora",
    body: `Olá, *{{1}}*! Tudo bem? Sou a Flora, Assistente Virtual do Estúdio Corpo & Alma Humanizado. 🌿

*✅ O seu momento de cuidado em casa com a Jana está confirmado!*

✨ Seu cuidado é *{{2}}*.
📅 Reservado para *{{3}}* às *{{4}}*.
📍 Nosso ponto de encontro é *no seu endereço: {{5}}*.

🧾 *Resumo Financeiro*
• *Valor do Cuidado:* R$ {{6}}
• *Taxa de Deslocamento:* R$ {{7}}
• *Sinal já pago:* R$ {{8}}
• *Pagamento no dia:* R$ {{9}}

_(O pagamento do saldo pode ser feito via Pix, cartão ou dinheiro no dia do atendimento)._

Se houver qualquer imprevisto e você precisar ajustar o seu horário, fique à vontade para me avisar por aqui.

Ah, para o seu controle, deixei o comprovante de pagamento do sinal disponível no botão logo abaixo. 👇

_Até breve._`,
    footer: FOOTER_AUTO_MESSAGE,
    variables: [
      { index: 1, key: "client_name", description: "Nome da cliente", example: "Maria" },
      { index: 2, key: "service_name", description: "Nome do cuidado", example: "Massagem Relaxante" },
      { index: 3, key: "date_label", description: "Data formatada", example: "12/03/2026" },
      { index: 4, key: "time_label", description: "Horário formatado", example: "18:30" },
      {
        index: 5,
        key: "home_address_line",
        description: "Endereço completo para atendimento domiciliar",
        example: "Rua Exemplo, 123, Centro, Amparo - SP",
      },
      { index: 6, key: "care_amount", description: "Valor do cuidado sem prefixo monetário", example: "180,00" },
      { index: 7, key: "displacement_fee", description: "Taxa de deslocamento sem prefixo monetário", example: "40,00" },
      { index: 8, key: "signal_paid_amount", description: "Valor do sinal já pago", example: "80,00" },
      { index: 9, key: "remaining_amount", description: "Valor para pagamento no dia", example: "140,00" },
      {
        index: 10,
        key: "receipt_payment_public_id",
        description: "Identificador público para abrir o comprovante de pagamento",
        example: META_TEMPLATE_PUBLIC_SAMPLE_CODE,
      },
    ],
    button: RECEIPT_BUTTON,
    metaTestUrl: RECEIPT_META_TEST_URL,
  },
  {
    provider: "meta",
    status: "active",
    statusLabel: STATUS_ACTIVE_LABEL,
    locale: "pt_BR",
    group: "appointment_notice_variations",
    name: "aviso_agendamento_domicilio_sinal_pago_sem_oi_flora",
    body: `Olá, *{{1}}*! Tudo bem? ✨

*✅ O seu momento de cuidado em casa com a Jana está confirmado!*

✨ Seu cuidado é *{{2}}*.
📅 Reservado para *{{3}}* às *{{4}}*.
📍 Nosso ponto de encontro é *no seu endereço: {{5}}*.

🧾 *Resumo Financeiro*
• *Valor do Cuidado:* R$ {{6}}
• *Taxa de Deslocamento:* R$ {{7}}
• *Sinal já pago:* R$ {{8}}
• *Pagamento no dia:* R$ {{9}}

_(O pagamento do saldo pode ser feito via Pix, cartão ou dinheiro no dia do atendimento)._

Se houver qualquer imprevisto e você precisar ajustar o seu horário, fique à vontade para me avisar por aqui.

Ah, para o seu controle, deixei o comprovante de pagamento do sinal disponível no botão logo abaixo. 👇

_Até breve._`,
    footer: FOOTER_AUTO_MESSAGE,
    variables: [
      { index: 1, key: "client_name", description: "Nome da cliente", example: "Maria" },
      { index: 2, key: "service_name", description: "Nome do cuidado", example: "Massagem Relaxante" },
      { index: 3, key: "date_label", description: "Data formatada", example: "12/03/2026" },
      { index: 4, key: "time_label", description: "Horário formatado", example: "18:30" },
      {
        index: 5,
        key: "home_address_line",
        description: "Endereço completo para atendimento domiciliar",
        example: "Rua Exemplo, 123, Centro, Amparo - SP",
      },
      { index: 6, key: "care_amount", description: "Valor do cuidado sem prefixo monetário", example: "180,00" },
      { index: 7, key: "displacement_fee", description: "Taxa de deslocamento sem prefixo monetário", example: "40,00" },
      { index: 8, key: "signal_paid_amount", description: "Valor do sinal já pago", example: "80,00" },
      { index: 9, key: "remaining_amount", description: "Valor para pagamento no dia", example: "140,00" },
      {
        index: 10,
        key: "receipt_payment_public_id",
        description: "Identificador público para abrir o comprovante de pagamento",
        example: META_TEMPLATE_PUBLIC_SAMPLE_CODE,
      },
    ],
    button: RECEIPT_BUTTON,
    metaTestUrl: RECEIPT_META_TEST_URL,
  },
  {
    provider: "meta",
    status: "active",
    statusLabel: STATUS_ACTIVE_LABEL,
    locale: "pt_BR",
    group: "appointment_notice_variations",
    name: "aviso_agendamento_domicilio_pago_integral_com_flora",
    body: `Olá, *{{1}}*! Tudo bem? Sou a Flora, Assistente Virtual do Estúdio Corpo & Alma Humanizado. 🌿

*✅ O seu momento de cuidado em casa com a Jana está confirmado!*

✨ Seu cuidado é *{{2}}*.
📅 Reservado para *{{3}}* às *{{4}}*.
📍 Nosso ponto de encontro é *no seu endereço: {{5}}*.

🧾 *Resumo Financeiro*
• *Valor do Cuidado:* R$ {{6}}
• *Taxa de Deslocamento:* R$ {{7}}
• *Valor Pago:* R$ {{8}}

*_(Seu atendimento já está totalmente pago. É só relaxar e esperar a Jana!)_*

Se houver qualquer imprevisto e você precisar ajustar o seu horário, fique à vontade para me avisar por aqui.

Ah, para o seu controle, deixei o comprovante de pagamento disponível no botão logo abaixo. 👇

_Até breve._`,
    footer: FOOTER_AUTO_MESSAGE,
    variables: [
      { index: 1, key: "client_name", description: "Nome da cliente", example: "Maria" },
      { index: 2, key: "service_name", description: "Nome do cuidado", example: "Massagem Relaxante" },
      { index: 3, key: "date_label", description: "Data formatada", example: "12/03/2026" },
      { index: 4, key: "time_label", description: "Horário formatado", example: "18:30" },
      {
        index: 5,
        key: "home_address_line",
        description: "Endereço completo para atendimento domiciliar",
        example: "Rua Exemplo, 123, Centro, Amparo - SP",
      },
      { index: 6, key: "care_amount", description: "Valor do cuidado sem prefixo monetário", example: "180,00" },
      { index: 7, key: "displacement_fee", description: "Taxa de deslocamento sem prefixo monetário", example: "40,00" },
      { index: 8, key: "paid_amount", description: "Valor já pago integralmente", example: "220,00" },
      {
        index: 9,
        key: "receipt_payment_public_id",
        description: "Identificador público para abrir o comprovante de pagamento",
        example: META_TEMPLATE_PUBLIC_SAMPLE_CODE,
      },
    ],
    button: RECEIPT_BUTTON,
    metaTestUrl: RECEIPT_META_TEST_URL,
  },
  {
    provider: "meta",
    status: "active",
    statusLabel: STATUS_ACTIVE_LABEL,
    locale: "pt_BR",
    group: "appointment_notice_variations",
    name: "aviso_agendamento_domicilio_pago_integral_sem_oi_flora",
    body: `Olá, *{{1}}*! Tudo bem? ✨

*✅ O seu momento de cuidado em casa com a Jana está confirmado!*

✨ Seu cuidado é *{{2}}*.
📅 Reservado para *{{3}}* às *{{4}}*.
📍 Nosso ponto de encontro é *no seu endereço: {{5}}*.

🧾 *Resumo Financeiro*
• *Valor do Cuidado:* R$ {{6}}
• *Taxa de Deslocamento:* R$ {{7}}
• *Valor Pago:* R$ {{8}}

*_(Seu atendimento já está totalmente pago. É só relaxar e esperar a Jana!)_*

Se houver qualquer imprevisto e você precisar ajustar o seu horário, fique à vontade para me avisar por aqui.

Ah, para o seu controle, deixei o comprovante de pagamento disponível no botão logo abaixo. 👇

_Até breve._`,
    footer: FOOTER_AUTO_MESSAGE,
    variables: [
      { index: 1, key: "client_name", description: "Nome da cliente", example: "Maria" },
      { index: 2, key: "service_name", description: "Nome do cuidado", example: "Massagem Relaxante" },
      { index: 3, key: "date_label", description: "Data formatada", example: "12/03/2026" },
      { index: 4, key: "time_label", description: "Horário formatado", example: "18:30" },
      {
        index: 5,
        key: "home_address_line",
        description: "Endereço completo para atendimento domiciliar",
        example: "Rua Exemplo, 123, Centro, Amparo - SP",
      },
      { index: 6, key: "care_amount", description: "Valor do cuidado sem prefixo monetário", example: "180,00" },
      { index: 7, key: "displacement_fee", description: "Taxa de deslocamento sem prefixo monetário", example: "40,00" },
      { index: 8, key: "paid_amount", description: "Valor já pago integralmente", example: "220,00" },
      {
        index: 9,
        key: "receipt_payment_public_id",
        description: "Identificador público para abrir o comprovante de pagamento",
        example: META_TEMPLATE_PUBLIC_SAMPLE_CODE,
      },
    ],
    button: RECEIPT_BUTTON,
    metaTestUrl: RECEIPT_META_TEST_URL,
  },
  {
    provider: "meta",
    status: "active",
    statusLabel: STATUS_ACTIVE_LABEL,
    locale: "pt_BR",
    group: "appointment_notice_variations",
    name: "aviso_agendamento_estudio_pagamento_no_atendimento_com_flora",
    body: `Olá, *{{1}}*! Tudo bem? Sou a Flora, Assistente Virtual do Estúdio Corpo & Alma Humanizado. 🌿

*✅ O seu momento de cuidado com a Jana está confirmado!*

✨ Seu cuidado é *{{2}}*.
📅 Reservado para *{{3}}* às *{{4}}*.
📍 Nosso ponto de encontro é *no Estúdio: Rua Silva Pinto, 186, Centro Histórico, Amparo - SP, 13900-319.*

🧾 *Pagamento no Atendimento*
• *Total a pagar no dia:* R$ {{5}}

_(O pagamento pode ser feito via Pix, cartões ou dinheiro presencialmente com a Jana)._

Se houver qualquer imprevisto e você precisar ajustar o seu horário, fique à vontade para me avisar por aqui.

Se preferir adiantar o pagamento agora, deixei um botão logo abaixo para pagar online com Pix ou cartão. 👇

_Até breve._`,
    footer: FOOTER_AUTO_MESSAGE,
    variables: [
      { index: 1, key: "client_name", description: "Nome da cliente", example: "Maria" },
      { index: 2, key: "service_name", description: "Nome do cuidado", example: "Massagem Relaxante" },
      { index: 3, key: "date_label", description: "Data formatada", example: "12/03/2026" },
      { index: 4, key: "time_label", description: "Horário formatado", example: "18:30" },
      { index: 5, key: "total_due", description: "Total devido para pagamento online", example: "220,00" },
      {
        index: 6,
        key: "payment_link_public_id",
        description: "Identificador público para abrir checkout de pagamento",
        example: META_TEMPLATE_PUBLIC_SAMPLE_CODE,
      },
    ],
    button: PAY_NOW_BUTTON,
    metaTestUrl: PAYMENT_META_TEST_URL,
  },
  {
    provider: "meta",
    status: "active",
    statusLabel: STATUS_ACTIVE_LABEL,
    locale: "pt_BR",
    group: "appointment_notice_variations",
    name: "aviso_agendamento_estudio_pagamento_no_atendimento_sem_oi_flora",
    body: `Olá, *{{1}}*! Tudo bem? ✨

*✅ O seu momento de cuidado com a Jana está confirmado!*

✨ Seu cuidado é *{{2}}*.
📅 Reservado para *{{3}}* às *{{4}}*.
📍 Nosso ponto de encontro é *no Estúdio: Rua Silva Pinto, 186, Centro Histórico, Amparo - SP, 13900-319.*

🧾 *Pagamento no Atendimento*
• *Total a pagar no dia:* R$ {{5}}

_(O pagamento pode ser feito via Pix, cartões ou dinheiro presencialmente com a Jana)._

Se houver qualquer imprevisto e você precisar ajustar o seu horário, fique à vontade para me avisar por aqui.

Se preferir adiantar o pagamento agora, deixei um botão logo abaixo para pagar online com Pix ou cartão. 👇

_Até breve._`,
    footer: FOOTER_AUTO_MESSAGE,
    variables: [
      { index: 1, key: "client_name", description: "Nome da cliente", example: "Maria" },
      { index: 2, key: "service_name", description: "Nome do cuidado", example: "Massagem Relaxante" },
      { index: 3, key: "date_label", description: "Data formatada", example: "12/03/2026" },
      { index: 4, key: "time_label", description: "Horário formatado", example: "18:30" },
      { index: 5, key: "total_due", description: "Total devido para pagamento online", example: "220,00" },
      {
        index: 6,
        key: "payment_link_public_id",
        description: "Identificador público para abrir checkout de pagamento",
        example: META_TEMPLATE_PUBLIC_SAMPLE_CODE,
      },
    ],
    button: PAY_NOW_BUTTON,
    metaTestUrl: PAYMENT_META_TEST_URL,
  },
  {
    provider: "meta",
    status: "in_review",
    statusLabel: STATUS_IN_REVIEW_LABEL,
    locale: "pt_BR",
    group: "appointment_notice_variations",
    name: "aviso_agendamento_domicilio_pagamento_no_atendimento_com_flora",
    body: `Olá, *{{1}}*! Tudo bem? Sou a Flora, Assistente Virtual do Estúdio Corpo & Alma Humanizado. 🌿

*✅ O seu momento de cuidado em casa com a Jana está confirmado!*

✨ Seu cuidado é *{{2}}*.
📅 Reservado para *{{3}}* às *{{4}}*.
📍 Nosso ponto de encontro é *no seu endereço: {{5}}*.

🧾 *Pagamento no Atendimento*
• *Valor do Cuidado:* R$ {{6}}
• *Taxa de Deslocamento:* R$ {{7}}
• *Total a pagar no dia:* R$ {{8}}

_(O pagamento pode ser feito via Pix, cartões ou dinheiro presencialmente com a Jana)._

Se houver qualquer imprevisto e você precisar ajustar o seu horário, fique à vontade para me avisar por aqui.

Se preferir adiantar o pagamento agora, deixei um botão logo abaixo para pagar online com Pix ou cartão. 👇

_Até breve._`,
    footer: FOOTER_AUTO_MESSAGE,
    variables: [
      { index: 1, key: "client_name", description: "Nome da cliente", example: "Maria" },
      { index: 2, key: "service_name", description: "Nome do cuidado", example: "Massagem Relaxante" },
      { index: 3, key: "date_label", description: "Data formatada", example: "12/03/2026" },
      { index: 4, key: "time_label", description: "Horário formatado", example: "18:30" },
      {
        index: 5,
        key: "home_address_line",
        description: "Endereço completo para atendimento domiciliar",
        example: "Rua Exemplo, 123, Centro, Amparo - SP",
      },
      { index: 6, key: "care_amount", description: "Valor do cuidado sem prefixo monetário", example: "180,00" },
      { index: 7, key: "displacement_fee", description: "Taxa de deslocamento sem prefixo monetário", example: "40,00" },
      { index: 8, key: "total_due", description: "Total devido para pagamento online", example: "220,00" },
      {
        index: 9,
        key: "payment_link_public_id",
        description: "Identificador público para abrir checkout de pagamento",
        example: META_TEMPLATE_PUBLIC_SAMPLE_CODE,
      },
    ],
    button: PAY_NOW_BUTTON,
    metaTestUrl: PAYMENT_META_TEST_URL,
  },
  {
    provider: "meta",
    status: "in_review",
    statusLabel: STATUS_IN_REVIEW_LABEL,
    locale: "pt_BR",
    group: "appointment_notice_variations",
    name: "aviso_agendamento_domicilio_pagamento_no_atendimento_sem_oi_flora",
    body: `Olá, *{{1}}*! Tudo bem? ✨

*✅ O seu momento de cuidado em casa com a Jana está confirmado!*

✨ Seu cuidado é *{{2}}*.
📅 Reservado para *{{3}}* às *{{4}}*.
📍 Nosso ponto de encontro é *no seu endereço: {{5}}*.

🧾 *Pagamento no Atendimento*
• *Valor do Cuidado:* R$ {{6}}
• *Taxa de Deslocamento:* R$ {{7}}
• *Total a pagar no dia:* R$ {{8}}

_(O pagamento pode ser feito via Pix, cartões ou dinheiro presencialmente com a Jana)._

Se houver qualquer imprevisto e você precisar ajustar o seu horário, fique à vontade para me avisar por aqui.

Se preferir adiantar o pagamento agora, deixei um botão logo abaixo para pagar online com Pix ou cartão. 👇

_Até breve._`,
    footer: FOOTER_AUTO_MESSAGE,
    variables: [
      { index: 1, key: "client_name", description: "Nome da cliente", example: "Maria" },
      { index: 2, key: "service_name", description: "Nome do cuidado", example: "Massagem Relaxante" },
      { index: 3, key: "date_label", description: "Data formatada", example: "12/03/2026" },
      { index: 4, key: "time_label", description: "Horário formatado", example: "18:30" },
      {
        index: 5,
        key: "home_address_line",
        description: "Endereço completo para atendimento domiciliar",
        example: "Rua Exemplo, 123, Centro, Amparo - SP",
      },
      { index: 6, key: "care_amount", description: "Valor do cuidado sem prefixo monetário", example: "180,00" },
      { index: 7, key: "displacement_fee", description: "Taxa de deslocamento sem prefixo monetário", example: "40,00" },
      { index: 8, key: "total_due", description: "Total devido para pagamento online", example: "220,00" },
      {
        index: 9,
        key: "payment_link_public_id",
        description: "Identificador público para abrir checkout de pagamento",
        example: META_TEMPLATE_PUBLIC_SAMPLE_CODE,
      },
    ],
    button: PAY_NOW_BUTTON,
    metaTestUrl: PAYMENT_META_TEST_URL,
  },
];

export const WHATSAPP_TEMPLATE_LIBRARY_APPOINTMENT_REMINDER_CONFIRMATION_24H: WhatsAppTemplateDefinition[] =
  [
    {
      provider: "meta",
      status: "active",
      statusLabel: STATUS_ACTIVE_LABEL,
      locale: "pt_BR",
      group: "appointment_reminder_confirmation_24h",
      name: "lembrete_confirmacao_24h_estudio_pago_integral",
      body: `Olá, *{{1}}*! Tudo bem? Aqui é a Flora, Assistente Virtual do Estúdio, passando para lembrar do seu agendamento de amanhã. 🌿

⏳ *Falta muito pouco para o seu momento de cuidado com a Jana!*

✨ Seu cuidado é *{{2}}*.
📅 Horário: *Amanhã às {{3}}*.
📍 Local: *no Estúdio: Rua Silva Pinto, 186, Centro Histórico, Amparo - SP, 13900-319.*

*_(Seu atendimento já está totalmente pago. É só vir relaxar!)_*

Como a nossa agenda é organizada com muito carinho, peço que confirme sua presença nos botões abaixo ou me avise caso tenha algum imprevisto.

_Até breve._`,
      footer: "Mensagem automática. Por favor, selecione uma opção.",
      variables: [
        { index: 1, key: "client_name", description: "Nome da cliente", example: "Maria" },
        { index: 2, key: "service_name", description: "Nome do cuidado", example: "Massagem Relaxante" },
        { index: 3, key: "time_label", description: "Horário formatado", example: "18:30" },
      ],
      button: REMINDER_CONFIRMATION_BUTTON,
      metaTestUrl: REMINDER_META_TEST_URL,
    },
    {
      provider: "meta",
      status: "active",
      statusLabel: STATUS_ACTIVE_LABEL,
      locale: "pt_BR",
      group: "appointment_reminder_confirmation_24h",
      name: "lembrete_confirmacao_24h_estudio_saldo_pendente",
      body: `Olá, *{{1}}*! Tudo bem? Aqui é a Flora, Assistente Virtual do Estúdio, passando para lembrar do seu agendamento de amanhã. 🌿

⏳ *Falta muito pouco para o seu momento de cuidado com a Jana!*

✨ Seu cuidado é *{{2}}*.
📅 Horário: *Amanhã às {{3}}*.
📍 Local: *no Estúdio: Rua Silva Pinto, 186, Centro Histórico, Amparo - SP, 13900-319.*

🧾 *Lembrete Financeiro*
• *Total a pagar no dia:* R$ {{4}}

_(O pagamento pode ser feito presencialmente via Pix, cartão ou dinheiro)._

Como a nossa agenda é organizada com muito carinho, peço que confirme sua presença nos botões abaixo ou me avise caso tenha algum imprevisto.

_Até breve._`,
      footer: "Mensagem automática. Por favor, selecione uma opção.",
      variables: [
        { index: 1, key: "client_name", description: "Nome da cliente", example: "Maria" },
        { index: 2, key: "service_name", description: "Nome do cuidado", example: "Massagem Relaxante" },
        { index: 3, key: "time_label", description: "Horário formatado", example: "18:30" },
        {
          index: 4,
          key: "total_due",
          description: "Valor total a pagar no dia sem prefixo monetário",
          example: "220,00",
        },
      ],
      button: REMINDER_CONFIRMATION_BUTTON,
      metaTestUrl: REMINDER_META_TEST_URL,
    },
    {
      provider: "meta",
      status: "active",
      statusLabel: STATUS_ACTIVE_LABEL,
      locale: "pt_BR",
      group: "appointment_reminder_confirmation_24h",
      name: "lembrete_confirmacao_24h_domicilio_pago_integral",
      body: `Olá, *{{1}}*! Tudo bem? Aqui é a Flora, Assistente Virtual do Estúdio, passando para lembrar do seu agendamento de amanhã. 🌿

⏳ *Falta muito pouco para o seu momento de cuidado em casa com a Jana!*

✨ Seu cuidado é *{{2}}*.
📅 Horário: *Amanhã às {{3}}*.
📍 Local: *no seu endereço: {{4}}*.

*_(Seu atendimento já está totalmente pago. É só relaxar e esperar a Jana!)_*

Como a nossa agenda é organizada com muito carinho, peço que confirme sua presença nos botões abaixo ou me avise caso tenha algum imprevisto.

_Até breve._`,
      footer: "Mensagem automática. Por favor, selecione uma opção.",
      variables: [
        { index: 1, key: "client_name", description: "Nome da cliente", example: "Maria" },
        { index: 2, key: "service_name", description: "Nome do cuidado", example: "Massagem Relaxante" },
        { index: 3, key: "time_label", description: "Horário formatado", example: "18:30" },
        {
          index: 4,
          key: "home_address_line",
          description: "Endereço completo para atendimento domiciliar",
          example: "Rua Exemplo, 123, Centro, Amparo - SP",
        },
      ],
      button: REMINDER_CONFIRMATION_BUTTON,
      metaTestUrl: REMINDER_META_TEST_URL,
    },
    {
      provider: "meta",
      status: "active",
      statusLabel: STATUS_ACTIVE_LABEL,
      locale: "pt_BR",
      group: "appointment_reminder_confirmation_24h",
      name: "lembrete_confirmacao_24h_domicilio_saldo_pendente",
      body: `Olá, *{{1}}*! Tudo bem? Aqui é a Flora, Assistente Virtual do Estúdio, passando para lembrar do seu agendamento de amanhã. 🌿

⏳ *Falta muito pouco para o seu momento de cuidado em casa com a Jana!*

✨ Seu cuidado é *{{2}}*.
📅 Horário: *Amanhã às {{3}}*.
📍 Local: *no seu endereço: {{4}}*.

🧾 *Lembrete Financeiro*
• *Total a pagar no dia:* R$ {{5}}

_(O pagamento pode ser feito no momento do atendimento via Pix, cartão ou dinheiro)._

Como a nossa agenda é organizada com muito carinho, peço que confirme sua presença nos botões abaixo ou me avise caso tenha algum imprevisto.

_Até breve._`,
      footer: "Mensagem automática. Por favor, selecione uma opção.",
      variables: [
        { index: 1, key: "client_name", description: "Nome da cliente", example: "Maria" },
        { index: 2, key: "service_name", description: "Nome do cuidado", example: "Massagem Relaxante" },
        { index: 3, key: "time_label", description: "Horário formatado", example: "18:30" },
        {
          index: 4,
          key: "home_address_line",
          description: "Endereço completo para atendimento domiciliar",
          example: "Rua Exemplo, 123, Centro, Amparo - SP",
        },
        {
          index: 5,
          key: "total_due",
          description: "Valor total a pagar no dia sem prefixo monetário",
          example: "220,00",
        },
      ],
      button: REMINDER_CONFIRMATION_BUTTON,
      metaTestUrl: REMINDER_META_TEST_URL,
    },
  ];

export const WHATSAPP_TEMPLATE_LIBRARY_APPOINTMENT_CONFIRMATION_REPLY: WhatsAppTemplateDefinition[] =
  [
    {
      provider: "meta",
      status: "active",
      statusLabel: STATUS_ACTIVE_LABEL,
      locale: "pt_BR",
      group: "appointment_confirmation_reply",
      name: "resposta_confirmacao_estudio",
      headerText: "Presença Confirmada!",
      body: `Combinado *{{1}}*, a Jana já preparou tudo com muito carinho e te aguarda amanhã no Estúdio.

Abaixo deixei o seu *Voucher de Atendimento*. Nele você encontra o resumo completo com o seu horário e os cuidados que foram reservados para você.

Até amanhã!👋`,
      footer: "Mensagem automática. Por favor, não é preciso responder.",
      variables: [
        { index: 1, key: "client_name", description: "Nome da cliente", example: "Maria" },
        {
          index: 2,
          key: "voucher_public_id",
          description: "Identificador público para abrir o voucher do atendimento",
          example: META_TEMPLATE_PUBLIC_SAMPLE_CODE,
        },
      ],
      button: VOUCHER_BUTTON,
      metaTestUrl: VOUCHER_META_TEST_URL,
    },
    {
      provider: "meta",
      status: "in_review",
      statusLabel: STATUS_IN_REVIEW_LABEL,
      locale: "pt_BR",
      group: "appointment_confirmation_reply",
      name: "resposta_confirmacao_domicilio",
      headerText: "Presença Confirmada!",
      body: `Combinado *{{1}}*, a Jana já preparou tudo com muito carinho para o seu momento de cuidado amanhã, no seu endereço.

Abaixo deixei o seu *Voucher de Atendimento*. Nele você encontra o resumo completo com o seu horário e os cuidados que foram reservados para você.

Até amanhã!👋`,
      footer: "Mensagem automática. Por favor, não é preciso responder.",
      variables: [
        { index: 1, key: "client_name", description: "Nome da cliente", example: "Maria" },
        {
          index: 2,
          key: "voucher_public_id",
          description: "Identificador público para abrir o voucher do atendimento",
          example: META_TEMPLATE_PUBLIC_SAMPLE_CODE,
        },
      ],
      button: VOUCHER_BUTTON,
      metaTestUrl: VOUCHER_META_TEST_URL,
    },
  ];

export const WHATSAPP_TEMPLATE_LIBRARY: WhatsAppTemplateDefinition[] = [
  ...WHATSAPP_TEMPLATE_LIBRARY_APPOINTMENT_NOTICE_VARIATIONS,
  ...WHATSAPP_TEMPLATE_LIBRARY_APPOINTMENT_REMINDER_CONFIRMATION_24H,
  ...WHATSAPP_TEMPLATE_LIBRARY_APPOINTMENT_CONFIRMATION_REPLY,
];

const templateLibraryByName = new Map(
  WHATSAPP_TEMPLATE_LIBRARY.map((template) => [template.name, template])
);

export function getWhatsAppTemplateFromLibrary(name: string) {
  return templateLibraryByName.get(name) ?? null;
}
