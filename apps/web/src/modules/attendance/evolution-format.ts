export function fallbackStructuredEvolution(rawText: string) {
  const normalized = rawText.trim();
  if (!normalized) return "";

  return [
    "Queixa principal:",
    normalized,
    "",
    "Conduta aplicada:",
    "Descrever técnicas e abordagem realizada na sessão.",
    "",
    "Resposta do cliente:",
    "Descrever resposta durante e após a sessão.",
    "",
    "Recomendação:",
    "Descrever orientação de autocuidado e próximo passo.",
  ].join("\n");
}
