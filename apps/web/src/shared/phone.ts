export function normalizePhoneDigits(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "");
}

export function phonesMatch(a: string | null | undefined, b: string | null | undefined) {
  const left = normalizePhoneDigits(a);
  const right = normalizePhoneDigits(b);
  if (!left || !right) return false;
  return left === right || left.endsWith(right) || right.endsWith(left);
}

export function formatBrazilPhone(value: string | null | undefined) {
  const digits = normalizePhoneDigits(value).slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digits
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}
