# Mensagens Automáticas (Central)

Edite este arquivo para atualizar as mensagens sem precisar alterar código.

**Placeholders disponíveis**
- `{{greeting}}`: "Olá, Nome!" ou "Olá!"
- `{{date_line}}`: "Terça, 03/02"
- `{{time}}`: "08:00"
- `{{service_name}}`: nome do serviço
- `{{service_segment}}`: " 💆‍♀️ Serviço: Nome do Serviço" (ou vazio)
- `{{service_line}}`: "para o seu Nome do Serviço às 08:00." (ou fallback sem serviço)
- `{{signal_amount}}`: valor do sinal (ex: R$ 50,00)
- `{{payment_link_block}}`: bloco com link de pagamento (ou vazio)
- `{{receipt_link_block}}`: bloco com link do recibo (ou vazio)

---

## created_confirmation
{{greeting}} Tudo bem? Aqui é a Flora, assistente virtual do Estúdio 🌸

Que notícia boa! Já reservei o seu horário na agenda da Jana. Seu momento de autocuidado está garantidíssimo.

🗓 Data: {{date_line}} ⏰ Horário: {{time}}{{service_segment}}

Deixei tudo organizado por aqui. Se precisar remarcar ou tiver alguma dúvida, é só me chamar. Até logo! 💚

## reminder_24h
{{greeting}} Flora passando para iluminar seu dia ✨

Amanhã é o dia de você se cuidar com a Jana! Ela já está preparando a sala com todo carinho {{service_line}}

Posso deixar confirmado na agenda dela? (É só responder com um 👍 ou "Sim")

## signal_charge
{{greeting}} Tudo bem? 🌿

Aqui é a Flora, assistente virtual do Estúdio Corpo & Alma Humanizado.

Fiquei muito feliz com seu agendamento! Para deixarmos o seu horário de {{service_name}} reservadinho e confirmado para o dia {{date_line}} às {{time}}, precisamos apenas da confirmação do sinal/reserva.

{{payment_link_block}}É rapidinho! Assim que confirmar, eu já te envio o comprovante e garantimos a sua vaga.

Qualquer dúvida, estou por aqui! Um abraço 🌸

## signal_receipt
{{greeting}} Tudo bem? 🌿 Aqui é a Flora. Passando para confirmar que recebemos seu sinal de {{signal_amount}}! ✨ Seu horário para {{service_name}} está reservado.

{{receipt_link_block}}Até o dia do atendimento! 🌸

## payment_receipt
{{greeting}} Tudo bem? 🌿

Aqui é a Flora, assistente virtual do Estúdio Corpo & Alma. Passando para avisar que recebemos o seu pagamento e está tudo certinho! ✨

Seu horário para {{service_name}} está super confirmado.

{{receipt_link_block}}Até o dia do atendimento! 🌸
