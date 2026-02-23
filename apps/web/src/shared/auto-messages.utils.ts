import type { AutoMessageTemplates } from "./auto-messages.types";

export const DEFAULT_AUTO_MESSAGES: AutoMessageTemplates = {
  created_confirmation:
    "{{greeting}} Tudo bem?\n\nAqui é a Flora, assistente virtual do Estúdio Corpo & Alma Humanizado. 🌿\n\n✅ *Seu agendamento com a Jana foi realizado.*\n\n✨ *Seu cuidado:* {{service_name}}\n🗓️ *Seu momento está reservado para:* {{date_line}}, às {{time}}\n📍 *Nosso ponto de encontro:* {{location_line}}\n\nSe precisar ajustar algo, é só responder por aqui.\n\nFlora | Estúdio Corpo & Alma Humanizado",
  reminder_24h:
    "{{greeting}} A Flora passando para confirmar seu horário 🙂\n\nAmanhã é o seu momento com a Jana 🙂\n\n✨ *Seu cuidado é:* {{service_name}}\n📅 *Seu momento está reservado para:* {{date_line}} às {{time}}\n📍 *Nosso ponto de encontro:* {{location_line}}\n\nPode responder por aqui com uma das opções abaixo (é só enviar o número):\n{{confirmation_reply_options}}\n\nFlora | Estúdio Corpo & Alma Humanizado",
  signal_charge:
    "Olá! Tudo bem? 🌿\n\nAqui é a Flora, assistente virtual do Estúdio Corpo & Alma Humanizado.\n\nFiquei muito feliz com seu agendamento! Para deixarmos o seu horário de {{service_name}} reservadinho e confirmado para o dia {{date_line}} às {{time}}, precisamos apenas da confirmação do sinal/reserva.\n\n{{payment_link_block}}É rapidinho! Assim que confirmar, eu já te envio o comprovante e garantimos a sua vaga.\n\nQualquer dúvida, estou por aqui! Um abraço 🌸",
  payment_charge:
    "Olá! Tudo bem? 🌿\n\nAqui é a Flora do Estúdio Corpo & Alma. Seu atendimento de {{service_name}} foi concluído e ficou um valor pendente.\n\n{{payment_link_block}}Quando o pagamento for confirmado, envio o recibo por aqui. 💚",
  signal_receipt:
    "Olá! Tudo bem? 🌿 Aqui é a Flora. Passando para confirmar que recebemos seu sinal de {{signal_amount}}! ✨ Seu horário para {{service_name}} está reservado.\n\n{{receipt_link_block}}Até o dia do atendimento! 🌸",
  payment_receipt:
    "Olá! Tudo bem? 🌿\n\nAqui é a Flora, assistente virtual do Estúdio Corpo & Alma. Passando para avisar que recebemos o seu pagamento e está tudo certinho! ✨\n\nSeu horário para {{service_name}} está super confirmado.\n\n{{receipt_link_block}}Até o dia do atendimento! 🌸",
};

export function applyAutoMessageTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/{{\s*([\w-]+)\s*}}/g, (_, key) => variables[key] ?? "");
}
