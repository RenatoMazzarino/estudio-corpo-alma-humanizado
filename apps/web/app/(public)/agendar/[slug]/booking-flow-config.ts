export const cardProcessingStages = [
  {
    title: "Arrumando a maca",
    description: "Estamos preparando seu momento de cuidado com carinho.",
  },
  {
    title: "Esquentando o ambiente",
    description: "Deixando tudo confortável enquanto o pagamento é validado.",
  },
  {
    title: "Separando seus óleos",
    description: "Seu atendimento está sendo confirmado com segurança.",
  },
  {
    title: "Seu horário está quase pronto",
    description: "Finalizando os últimos detalhes do seu agendamento.",
  },
] as const;

export const progressSteps = ["IDENT", "SERVICE", "DATETIME", "LOCATION", "CONFIRM"] as const;

export const footerSteps = ["IDENT", "SERVICE", "DATETIME", "LOCATION", "CONFIRM"] as const;

export const stepLabels = {
  IDENT: "Passo 1 de 5",
  SERVICE: "Passo 2 de 5",
  DATETIME: "Passo 3 de 5",
  LOCATION: "Passo 4 de 5",
  CONFIRM: "Passo 5 de 5",
} as const;
