# Mensagens Automáticas (Central)

Edite este arquivo para atualizar as mensagens sem precisar alterar código.

## Placeholders disponíveis

- `{{greeting}}`: "Olá, Nome!" ou "Olá!"
- `{{date_line}}`: "Terça, 03/02"
- `{{time}}`: "08:00"
- `{{service_name}}`: nome do serviço
- `{{location_line}}`: "No estúdio" ou "No endereço informado: ..."
- `{{service_segment}}`: " 💆‍♀️ Serviço: Nome do Serviço" (ou vazio)
- `{{service_line}}`: "para o seu Nome do Serviço às 08:00." (ou fallback sem
  serviço)
- `{{confirmation_reply_options}}`: opções numeradas para confirmação manual
- `{{signal_amount}}`: valor do sinal (ex: R$ 50,00)
- `{{payment_link_block}}`: bloco com link de pagamento (ou vazio)
- `{{receipt_link_block}}`: bloco com link do recibo (ou vazio)

---

## created_confirmation

{{greeting}} Tudo bem?

Aqui é a Flora, assistente virtual do Estúdio Corpo & Alma Humanizado. 🌿

✅ _Seu agendamento com a Jana foi realizado._

✨ _Seu cuidado:_ {{service_name}} 🗓️ _Seu momento está reservado para:_
{{date_line}}, às {{time}} 📍 _Nosso ponto de encontro:_ {{location_line}}

Se precisar ajustar algo, é só responder por aqui.

Flora | Estúdio Corpo & Alma Humanizado

## reminder_24h

{{greeting}} A Flora passando para confirmar seu horário 🙂

Amanhã é o seu momento com a Jana 🙂

✨ _Seu cuidado é:_ {{service_name}} 📅 _Seu momento está reservado para:_
{{date_line}} às {{time}} 📍 _Nosso ponto de encontro:_ {{location_line}}

Pode responder por aqui com uma das opções abaixo (é só enviar o número):
{{confirmation_reply_options}}

Flora | Estúdio Corpo & Alma Humanizado

## signal_charge

{{greeting}} Tudo bem? 🌿

Aqui é a Flora, assistente virtual do Estúdio Corpo & Alma Humanizado.

Fiquei muito feliz com seu agendamento! Para deixarmos o seu horário de
{{service_name}} reservadinho e confirmado para o dia {{date_line}} às {{time}},
precisamos apenas da confirmação do sinal/reserva.

{{payment_link_block}}É rapidinho! Assim que confirmar, eu já te envio o
comprovante e garantimos a sua vaga.

Qualquer dúvida, estou por aqui! Um abraço 🌸

## signal_receipt

{{greeting}} Tudo bem? 🌿 Aqui é a Flora. Passando para confirmar que recebemos
seu sinal de {{signal_amount}}! ✨ Seu horário para {{service_name}} está
reservado.

{{receipt_link_block}}Até o dia do atendimento! 🌸

## payment_receipt

{{greeting}} Tudo bem? 🌿

Aqui é a Flora, assistente virtual do Estúdio Corpo & Alma. Passando para avisar
que recebemos o seu pagamento e está tudo certinho! ✨

Seu horário para {{service_name}} está super confirmado.

{{receipt_link_block}}Até o dia do atendimento! 🌸
