export function normalizeCpfDigits(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "").slice(0, 11);
}

export function formatCpf(value: string | null | undefined) {
  const digits = normalizeCpfDigits(value);
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

export function isCpfLengthValid(value: string | null | undefined) {
  return normalizeCpfDigits(value).length === 11;
}
