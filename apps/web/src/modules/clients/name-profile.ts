function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function normalizeText(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function stripReferenceFromInternalName(value: string) {
  return value.replace(/\s*\([^)]*\)\s*$/, "").trim();
}

export function composeInternalClientName(
  firstName: string,
  lastName?: string | null,
  reference?: string | null
) {
  const normalizedFirstName = firstName.trim();
  const normalizedLastName = (lastName ?? "").trim();
  const normalizedReference = normalizeReferenceLabel(reference);
  if (!normalizedReference) {
    return [normalizedFirstName, normalizedLastName].filter((value) => value.length > 0).join(" ").trim();
  }
  return `${normalizedFirstName} (${normalizedReference})`;
}

export function composePublicClientFullName(firstName?: string | null, lastName?: string | null) {
  const parts = [firstName, lastName]
    .map((value) => (value ?? "").trim())
    .filter((value) => value.length > 0);
  return parts.join(" ").trim();
}

export function normalizeReferenceLabel(value?: string | null) {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  return raw.replace(/^\(+/, "").replace(/\)+$/, "").trim();
}

export interface ResolvedClientNames {
  internalName: string;
  publicFirstName: string;
  publicLastName: string;
  publicFullName: string;
  reference: string;
  messagingFirstName: string;
}

export function resolveClientNames(input: {
  name?: string | null;
  publicFirstName?: string | null;
  publicLastName?: string | null;
  internalReference?: string | null;
  extraData?: unknown; // transitional fallback
}): ResolvedClientNames {
  const internalName = (input.name ?? "").trim();
  const extra = asObject(input.extraData);
  const publicFirstName = normalizeText(input.publicFirstName) || normalizeText(extra?.public_first_name);
  const publicLastName = normalizeText(input.publicLastName) || normalizeText(extra?.public_last_name);
  const publicFullNameFromExtra =
    normalizeText(extra?.public_display_name) || composePublicClientFullName(publicFirstName, publicLastName);
  const fallbackBase = stripReferenceFromInternalName(internalName) || internalName || "Cliente";
  const fallbackFirstName = fallbackBase.split(/\s+/).filter(Boolean)[0] ?? "Cliente";
  const fallbackFullName = fallbackBase || "Cliente";
  const reference = normalizeReferenceLabel(
    input.internalReference ??
      (typeof extra?.internal_reference === "string" ? extra.internal_reference : null)
  );

  const fullName = publicFullNameFromExtra || fallbackFullName;
  const firstName = publicFirstName || fullName.split(/\s+/).filter(Boolean)[0] || fallbackFirstName;
  const lastName =
    publicLastName ||
    (publicFullNameFromExtra
      ? publicFullNameFromExtra
          .split(/\s+/)
          .filter(Boolean)
          .slice(1)
          .join(" ")
      : "");

  return {
    internalName:
      internalName ||
      composeInternalClientName(firstName || "Cliente", lastName, reference || null) ||
      fullName,
    publicFirstName: firstName || "Cliente",
    publicLastName: lastName,
    publicFullName: fullName || "Cliente",
    reference,
    messagingFirstName: firstName || "Cliente",
  };
}

export function buildClientNameColumnsProfile(params: {
  publicFirstName: string;
  publicLastName: string;
  reference?: string | null;
}) {
  const publicFirstName = params.publicFirstName.trim();
  const publicLastName = params.publicLastName.trim();
  const reference = normalizeReferenceLabel(params.reference);
  return {
    public_first_name: publicFirstName || null,
    public_last_name: publicLastName || null,
    internal_reference: reference || null,
  };
}
