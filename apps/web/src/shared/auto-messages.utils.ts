import type { AutoMessageTemplates } from "./auto-messages.types";

export const DEFAULT_AUTO_MESSAGES: AutoMessageTemplates = {
  created_confirmation:
    "Olá! Tudo bem? Aqui é a Flora, assistente virtual do Estúdio 🌸\n\nQue notícia boa! Já reservei o seu horário na agenda da Jana. Seu momento de autocuidado está garantidíssimo.\n\n🗓 Data: {{date_line}} ⏰ Horário: {{time}}{{service_segment}}\n\nDeixei tudo organizado por aqui. Se precisar remarcar ou tiver alguma dúvida, é só me chamar. Até logo! 💚",
  reminder_24h:
    "Olá! Flora passando para iluminar seu dia ✨\n\nAmanhã é o dia de você se cuidar com a Jana! Ela já está preparando a sala com todo carinho {{service_line}}\n\nPosso deixar confirmado na agenda dela? (É só responder com um 👍 ou \"Sim\")",
  signal_charge:
    "Olá! Tudo bem? 🌿\n\nAqui é a Flora, assistente virtual do Estúdio Corpo & Alma Humanizado.\n\nFiquei muito feliz com seu agendamento! Para deixarmos o seu horário de {{service_name}} reservadinho e confirmado para o dia {{date_line}} às {{time}}, precisamos apenas da confirmação do sinal/reserva.\n\n{{payment_link_block}}É rapidinho! Assim que confirmar, eu já te envio o comprovante e garantimos a sua vaga.\n\nQualquer dúvida, estou por aqui! Um abraço 🌸",
  signal_receipt:
    "Olá! Tudo bem? 🌿 Aqui é a Flora. Passando para confirmar que recebemos seu sinal de {{signal_amount}}! ✨ Seu horário para {{service_name}} está reservado.\n\n{{receipt_link_block}}Até o dia do atendimento! 🌸",
  payment_receipt:
    "Olá! Tudo bem? 🌿\n\nAqui é a Flora, assistente virtual do Estúdio Corpo & Alma. Passando para avisar que recebemos o seu pagamento e está tudo certinho! ✨\n\nSeu horário para {{service_name}} está super confirmado.\n\n{{receipt_link_block}}Até o dia do atendimento! 🌸",
};

export function applyAutoMessageTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/{{\s*([\w-]+)\s*}}/g, (_, key) => variables[key] ?? "");
}
