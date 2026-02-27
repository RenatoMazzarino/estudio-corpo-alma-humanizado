export function normalizeReferenceToken(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

export function buildServiceReferenceCode(serviceName: string | null | undefined) {
  const normalized = normalizeReferenceToken(serviceName ?? "");
  if (!normalized) return "AT";
  const ignored = new Set(["DE", "DA", "DO", "DAS", "DOS", "E", "EM", "PARA", "COM"]);
  const parts = normalized.split(" ").filter((part) => part && !ignored.has(part));
  if (parts.length === 0) return "AT";
  const firstPart = parts[0] ?? "";
  const secondPart = parts[1] ?? "";
  if (parts.length === 1) return firstPart.slice(0, 2).padEnd(2, "X");
  return `${firstPart[0] ?? ""}${secondPart[0] ?? ""}`.padEnd(2, "X");
}

export function buildClientReferenceCode(params: {
  clientName?: string | null;
  phone?: string | null;
  appointmentId: string;
}) {
  const normalizedName = normalizeReferenceToken(params.clientName ?? "");
  if (normalizedName) {
    const parts = normalizedName.split(" ").filter(Boolean);
    const firstPart = parts[0] ?? "";
    const lastPart = parts[parts.length - 1] ?? "";
    const initials =
      parts.length >= 2 ? `${firstPart[0] ?? ""}${lastPart[0] ?? ""}` : firstPart.slice(0, 2);
    const token = initials || "CL";
    return `N${token}`;
  }

  const digits = (params.phone ?? "").replace(/\D/g, "");
  if (digits) {
    return `T${digits.slice(-4).padStart(4, "0")}`;
  }

  return `A${params.appointmentId.replace(/[^a-zA-Z0-9]/g, "").slice(-3).toUpperCase().padStart(3, "X")}`;
}
