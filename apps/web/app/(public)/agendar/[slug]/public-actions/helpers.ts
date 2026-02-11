export function normalizePhoneValue(value: string) {
  return value.replace(/\D/g, "");
}

export function sanitizeIlike(value: string) {
  return value.replace(/[%_,]/g, "").trim();
}

export function phoneMatchesAny(candidate: string | null | undefined, variants: string[]) {
  if (!candidate) return false;
  const normalized = normalizePhoneValue(candidate);
  return variants.some((value) => normalized === value || normalized.endsWith(value));
}

export function splitName(name: string) {
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 0) {
    return { firstName: "Cliente", lastName: "Corpo & Alma" };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "Corpo & Alma" };
  }
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export function buildPayerEmail(phoneDigits: string) {
  const clean = phoneDigits.replace(/\D/g, "");
  return `cliente+${clean || "anon"}@corpoealmahumanizado.com.br`;
}

export function splitPhone(phoneDigits: string) {
  const digits = phoneDigits.replace(/\D/g, "");
  const area = digits.slice(0, 2);
  const number = digits.slice(2);
  return { area_code: area || "11", number: number || digits };
}
