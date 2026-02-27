export const stageMessages = [
  "Arrumando a maca...",
  "Esquentando as toalhas...",
  "Conferindo os dados do pagamento...",
  "Confirmando a sessão no sistema...",
];

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function getRemainingSeconds(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.max(Math.floor(diff / 1000), 0);
}

export function formatCountdown(totalSeconds: number) {
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const ss = String(totalSeconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function normalizePixKeyForCharge(
  value: string,
  type: "cnpj" | "cpf" | "email" | "phone" | "evp" | null
) {
  if (type === "cnpj" || type === "cpf") {
    return value.replace(/\D/g, "");
  }
  if (type === "phone") {
    const digits = value.replace(/\D/g, "");
    return digits.startsWith("+") ? digits : `+${digits}`;
  }
  return value.trim();
}

export function formatPixTypeLabel(type: "cnpj" | "cpf" | "email" | "phone" | "evp" | null) {
  switch (type) {
    case "cnpj":
      return "CNPJ";
    case "cpf":
      return "CPF";
    case "email":
      return "E-mail";
    case "phone":
      return "Telefone";
    case "evp":
      return "Aleatória (EVP)";
    default:
      return "Chave";
  }
}
