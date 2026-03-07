import { META_TEMPLATE_PUBLIC_SAMPLE_CODE } from "../../shared/meta-template-demo";

export type WhatsAppTemplateLibraryGroup = "appointment_notice_variations";

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
    };

export type WhatsAppTemplateDefinition = {
  provider: "meta";
  status: "submitted_for_approval";
  locale: "pt_BR";
  group: WhatsAppTemplateLibraryGroup;
  name: string;
  body: string;
  variables: WhatsAppTemplateVariableDefinition[];
  button: WhatsAppTemplateButtonDefinition;
};

const RECEIPT_URL_BASE = "https://public.corpoealmahumanizado.com.br/comprovante/";
const PAYMENT_URL_BASE = "https://public.corpoealmahumanizado.com.br/pagamento/";

const RECEIPT_BUTTON: WhatsAppTemplateButtonDefinition = {
  type: "url_dynamic",
  buttonText: "Comprovante de Pagamento",
  urlBase: RECEIPT_URL_BASE,
  variableName: "public_id",
  sampleValue: META_TEMPLATE_PUBLIC_SAMPLE_CODE,
};

const PAY_NOW_BUTTON: WhatsAppTemplateButtonDefinition = {
  type: "url_dynamic",
  buttonText: "Pagar agora",
  urlBase: PAYMENT_URL_BASE,
  variableName: "public_id",
  sampleValue: META_TEMPLATE_PUBLIC_SAMPLE_CODE,
};

export const WHATSAPP_TEMPLATE_LIBRARY_APPOINTMENT_NOTICE_VARIATIONS: WhatsAppTemplateDefinition[] = [
  {
    provider: "meta",
    status: "submitted_for_approval",
    locale: "pt_BR",
    group: "appointment_notice_variations",
    name: "aviso_agendamento_no_estudio_com_sinal_pago",
    body:
      "Olá, *{{1}}*! Tudo bem? ✨\n\n" +
      "✅ O seu momento de cuidado com a Jana está confirmado!\n\n" +
      "✨ *Seu cuidado é*\n" +
      "{{2}}.\n" +
      "📅 *Reservado para*\n" +
      "{{3}} às\n" +
      "{{4}}.\n" +
      "📍 *Nosso ponto de encontro é no Estúdio:* Rua Silva Pinto, 186, Centro Histórico, Amparo - SP, 13900-319.\n\n" +
      "🧾 *Resumo Financeiro*\n" +
      "• *Valor Total:*\n" +
      "{{5}}\n" +
      "• *Sinal já pago:*\n" +
      "{{6}}\n" +
      "• *Restante para o dia:*\n" +
      "{{7}}\n" +
      "_(O pagamento do saldo pode ser feito via Pix, cartão ou dinheiro no dia do atendimento)._\n\n" +
      "Se houver qualquer imprevisto e você precisar ajustar o seu horário, fique à vontade para me avisar por aqui, combinado?\n\n" +
      "Ah, para o seu controle, deixei o comprovante de pagamento do sinal disponível no botão logo abaixo. 👇\n\n" +
      "_Com carinho,_",
    variables: [
      { index: 1, key: "client_name", description: "Primeiro nome da cliente", example: "Maria" },
      { index: 2, key: "service_name", description: "Nome do cuidado/serviço", example: "Massagem Relaxante" },
      { index: 3, key: "date_label", description: "Data formatada", example: "Quinta-feira, 12/03/2026" },
      { index: 4, key: "time_label", description: "Horário formatado", example: "18:30" },
      { index: 5, key: "total_amount", description: "Valor total", example: "R$ 220,00" },
      { index: 6, key: "signal_paid_amount", description: "Valor de sinal já pago", example: "R$ 80,00" },
      { index: 7, key: "remaining_amount", description: "Valor restante para o dia", example: "R$ 140,00" },
    ],
    button: RECEIPT_BUTTON,
  },
  {
    provider: "meta",
    status: "submitted_for_approval",
    locale: "pt_BR",
    group: "appointment_notice_variations",
    name: "aviso_agendemnto_no_estudio_pago_integral",
    body:
      "Olá, *{{1}}*! Tudo bem? ✨\n\n" +
      "✅ O seu momento de cuidado com a Jana está confirmado!\n\n" +
      "✨ *Seu cuidado é*\n" +
      "{{2}}.\n" +
      "📅 *Reservado para*\n" +
      "{{3}} às\n" +
      "{{4}}.\n" +
      "📍 *Nosso ponto de encontro é no Estúdio:* Rua Silva Pinto, 186, Centro Histórico, Amparo - SP, 13900-319.\n\n" +
      "🧾 *Resumo Financeiro*\n" +
      "• *Valor Total:*\n" +
      "{{5}}.\n" +
      "• *Valor Pago:*\n" +
      "{{6}}\n" +
      "_(Seu atendimento já está totalmente pago. É só vir relaxar!)_\n\n" +
      "Se houver qualquer imprevisto e você precisar ajustar o seu horário, fique à vontade para me avisar por aqui, combinado?\n\n" +
      "Ah, para o seu controle, deixei o comprovante de pagamento disponível no botão logo abaixo. 👇\n\n" +
      "_Com carinho,_",
    variables: [
      { index: 1, key: "client_name", description: "Primeiro nome da cliente", example: "Maria" },
      { index: 2, key: "service_name", description: "Nome do cuidado/serviço", example: "Massagem Relaxante" },
      { index: 3, key: "date_label", description: "Data formatada", example: "Quinta-feira, 12/03/2026" },
      { index: 4, key: "time_label", description: "Horário formatado", example: "18:30" },
      { index: 5, key: "total_amount", description: "Valor total", example: "R$ 220,00" },
      { index: 6, key: "paid_amount", description: "Valor já pago", example: "R$ 220,00" },
    ],
    button: RECEIPT_BUTTON,
  },
  {
    provider: "meta",
    status: "submitted_for_approval",
    locale: "pt_BR",
    group: "appointment_notice_variations",
    name: "aviso_agendamento_domicilio_sinal_pago",
    body:
      "Olá, *{{1}}*! Tudo bem? ✨\n\n" +
      "✅ O seu momento de cuidado em casa com a Jana está confirmado!\n\n" +
      "✨ *Seu cuidado é*\n" +
      "{{2}}.\n" +
      "📅 *Reservado para*\n" +
      "{{3}} às\n" +
      "{{4}}.\n" +
      "📍 *Nosso ponto de encontro é no seu endereço,*\n" +
      "{{5}}.\n\n" +
      "🧾 *Resumo Financeiro*\n\n" +
      "• *Valor do cuidado:*\n" +
      "{{6}}.\n" +
      "• *Taxa de deslocamento:*\n" +
      "{{7}}.\n" +
      "• *Sinal já pago:*\n" +
      "{{8}}.\n" +
      "• *Restante para o dia:*\n" +
      "{{9}}.\n" +
      "_(O pagamento do saldo pode ser feito via Pix, cartão ou dinheiro presencialmente com a Jana)._\n\n" +
      "Se houver qualquer imprevisto e você precisar ajustar o seu horário, fique à vontade para me avisar por aqui, combinado?\n\n" +
      "Ah, para o seu controle, deixei o comprovante de pagamento do sinal disponível no botão logo abaixo. 👇\n\n" +
      "_Com carinho,_",
    variables: [
      { index: 1, key: "client_name", description: "Primeiro nome da cliente", example: "Maria" },
      { index: 2, key: "service_name", description: "Nome do cuidado/serviço", example: "Massagem Relaxante" },
      { index: 3, key: "date_label", description: "Data formatada", example: "Quinta-feira, 12/03/2026" },
      { index: 4, key: "time_label", description: "Horário formatado", example: "18:30" },
      {
        index: 5,
        key: "home_address_line",
        description: "Linha única do endereço de atendimento",
        example: "Rua Exemplo, 123, Centro, Amparo - SP",
      },
      { index: 6, key: "care_amount", description: "Valor do cuidado", example: "R$ 180,00" },
      { index: 7, key: "displacement_fee", description: "Taxa de deslocamento", example: "R$ 40,00" },
      { index: 8, key: "signal_paid_amount", description: "Valor de sinal já pago", example: "R$ 80,00" },
      { index: 9, key: "remaining_amount", description: "Valor restante para o dia", example: "R$ 140,00" },
    ],
    button: RECEIPT_BUTTON,
  },
  {
    provider: "meta",
    status: "submitted_for_approval",
    locale: "pt_BR",
    group: "appointment_notice_variations",
    name: "aviso_agendamento_domicilio_pago_integral",
    body:
      "Olá, *{{1}}*! Tudo bem? ✨\n\n" +
      "✅ O seu momento de cuidado em casa com a Jana está confirmado!\n\n" +
      "✨ *Seu cuidado é*\n" +
      "{{2}}.\n" +
      "📅 *Reservado para*\n" +
      "{{3}} às\n" +
      "{{4}}.\n" +
      "📍 *Nosso ponto de encontro é no seu endereço,*\n" +
      "{{5}}.\n\n" +
      "🧾 *Resumo Financeiro*\n" +
      "• *Valor do cuidado:*\n" +
      "{{6}}.\n" +
      "• *Taxa de deslocamento:*\n" +
      "{{7}}.\n" +
      "• *Total pago:*\n" +
      "{{8}}.\n\n" +
      "_(Tudo certinho! Seu atendimento e deslocamento já estão pagos)._\n\n" +
      "Se houver qualquer imprevisto e você precisar ajustar o seu horário, fique à vontade para me avisar por aqui, combinado?\n\n" +
      "Ah, para o seu controle, deixei o comprovante de pagamento disponível no botão logo abaixo. 👇\n\n" +
      "_Com carinho,_",
    variables: [
      { index: 1, key: "client_name", description: "Primeiro nome da cliente", example: "Maria" },
      { index: 2, key: "service_name", description: "Nome do cuidado/serviço", example: "Massagem Relaxante" },
      { index: 3, key: "date_label", description: "Data formatada", example: "Quinta-feira, 12/03/2026" },
      { index: 4, key: "time_label", description: "Horário formatado", example: "18:30" },
      {
        index: 5,
        key: "home_address_line",
        description: "Linha única do endereço de atendimento",
        example: "Rua Exemplo, 123, Centro, Amparo - SP",
      },
      { index: 6, key: "care_amount", description: "Valor do cuidado", example: "R$ 180,00" },
      { index: 7, key: "displacement_fee", description: "Taxa de deslocamento", example: "R$ 40,00" },
      { index: 8, key: "total_paid", description: "Valor total já pago", example: "R$ 220,00" },
    ],
    button: RECEIPT_BUTTON,
  },
  {
    provider: "meta",
    status: "submitted_for_approval",
    locale: "pt_BR",
    group: "appointment_notice_variations",
    name: "aviso_agendamento_estudio_pagamento_no_atendimento",
    body:
      "Olá, *{{1}}*! Tudo bem? ✨\n\n" +
      "✅ O seu momento de cuidado em casa com a Jana está confirmado!\n\n" +
      "✨ *Seu cuidado é*\n" +
      "{{2}}.\n" +
      "📅 *Reservado para*\n" +
      "{{3}} às\n" +
      "{{4}}.\n" +
      "📍 *Nosso ponto de encontro é* no Estúdio, Rua Silva Pinto, 186, Centro Histórico, Amparo/SP, 13900-319.\n\n" +
      "🧾 *Pagamento no Atendimento*\n" +
      "• Total a pagar no dia:\n" +
      "{{5}}.\n" +
      "_(Aceitamos Pix, cartões ou dinheiro presencialmente no estúdio)._\n\n" +
      "Se preferir adiantar o pagamento agora, deixei um botão logo abaixo para pagar online com Pix ou cartão. 👇\n\n" +
      "Se houver qualquer imprevisto e você precisar ajustar o seu horário, fique à vontade para me avisar por aqui, combinado?\n\n" +
      "_Com carinho,_",
    variables: [
      { index: 1, key: "client_name", description: "Primeiro nome da cliente", example: "Maria" },
      { index: 2, key: "service_name", description: "Nome do cuidado/serviço", example: "Massagem Relaxante" },
      { index: 3, key: "date_label", description: "Data formatada", example: "Quinta-feira, 12/03/2026" },
      { index: 4, key: "time_label", description: "Horário formatado", example: "18:30" },
      { index: 5, key: "total_due", description: "Total devido no atendimento", example: "R$ 220,00" },
    ],
    button: PAY_NOW_BUTTON,
  },
  {
    provider: "meta",
    status: "submitted_for_approval",
    locale: "pt_BR",
    group: "appointment_notice_variations",
    name: "aviso_agendamento_domicilio_pagamento_no_atendimento",
    body:
      "Olá, *{{1}}*! Tudo bem? ✨\n\n" +
      "✅ O seu momento de cuidado em casa com a Jana está confirmado!\n\n" +
      "✨ *Seu cuidado é*\n" +
      "{{2}}.\n" +
      "📅 *Reservado para*\n" +
      "{{3}} às\n" +
      "{{4}}.\n" +
      "📍 *Nosso ponto de encontro é no seu endereço,*\n" +
      "{{5}}.\n\n" +
      "🧾 *Pagamento no Atendimento*\n" +
      "• *Valor do cuidado:*\n" +
      "{{6}}\n" +
      "• *Taxa de deslocamento:*\n" +
      "{{7}}\n" +
      "• *Total a pagar no dia:*\n" +
      "{{8}}\n\n" +
      "_(O pagamento pode ser feito via Pix, cartões ou dinheiro presencialmente com a Jana)._\n\n" +
      "Se preferir adiantar o pagamento agora, deixei um botão logo abaixo para pagar online com Pix ou cartão. 👇\n\n" +
      "Se houver qualquer imprevisto e você precisar ajustar o seu horário, fique à vontade para me avisar por aqui, combinado?\n\n" +
      "_Com carinho,_",
    variables: [
      { index: 1, key: "client_name", description: "Primeiro nome da cliente", example: "Maria" },
      { index: 2, key: "service_name", description: "Nome do cuidado/serviço", example: "Massagem Relaxante" },
      { index: 3, key: "date_label", description: "Data formatada", example: "Quinta-feira, 12/03/2026" },
      { index: 4, key: "time_label", description: "Horário formatado", example: "18:30" },
      {
        index: 5,
        key: "home_address_line",
        description: "Linha única do endereço de atendimento",
        example: "Rua Exemplo, 123, Centro, Amparo - SP",
      },
      { index: 6, key: "care_amount", description: "Valor do cuidado", example: "R$ 180,00" },
      { index: 7, key: "displacement_fee", description: "Taxa de deslocamento", example: "R$ 40,00" },
      { index: 8, key: "total_due", description: "Total devido no atendimento", example: "R$ 220,00" },
    ],
    button: PAY_NOW_BUTTON,
  },
];

export const WHATSAPP_TEMPLATE_LIBRARY: WhatsAppTemplateDefinition[] = [
  ...WHATSAPP_TEMPLATE_LIBRARY_APPOINTMENT_NOTICE_VARIATIONS,
];

const templateLibraryByName = new Map(
  WHATSAPP_TEMPLATE_LIBRARY.map((template) => [template.name, template])
);

export function getWhatsAppTemplateFromLibrary(name: string) {
  return templateLibraryByName.get(name) ?? null;
}
