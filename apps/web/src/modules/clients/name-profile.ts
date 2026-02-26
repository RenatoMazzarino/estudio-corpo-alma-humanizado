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

export function composeInternalClientName(firstName: string, reference?: string | null) {
  const normalizedFirstName = firstName.trim();
  const normalizedReference = normalizeReferenceLabel(reference);
  if (!normalizedReference) return normalizedFirstName;
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

export function resolveClientNames(input: { name?: string | null; extraData?: unknown }): ResolvedClientNames {
  const internalName = (input.name ?? "").trim();
  const extra = asObject(input.extraData);
  const publicFirstName = normalizeText(extra?.public_first_name);
  const publicLastName = normalizeText(extra?.public_last_name);
  const publicFullNameFromExtra =
    normalizeText(extra?.public_display_name) || composePublicClientFullName(publicFirstName, publicLastName);
  const fallbackBase = stripReferenceFromInternalName(internalName) || internalName || "Cliente";
  const fallbackFirstName = fallbackBase.split(/\s+/).filter(Boolean)[0] ?? "Cliente";
  const fallbackFullName = fallbackBase || "Cliente";
  const reference = normalizeReferenceLabel(
    typeof extra?.internal_reference === "string" ? extra.internal_reference : null
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
    internalName: internalName || fullName,
    publicFirstName: firstName || "Cliente",
    publicLastName: lastName,
    publicFullName: fullName || "Cliente",
    reference,
    messagingFirstName: firstName || "Cliente",
  };
}

export function buildClientExtraDataProfile(params: {
  publicFirstName: string;
  publicLastName: string;
  reference?: string | null;
}) {
  const publicFirstName = params.publicFirstName.trim();
  const publicLastName = params.publicLastName.trim();
  const reference = normalizeReferenceLabel(params.reference);
  const publicDisplayName = composePublicClientFullName(publicFirstName, publicLastName);
  const payload: Record<string, unknown> = {
    public_first_name: publicFirstName,
    public_last_name: publicLastName,
    public_display_name: publicDisplayName || publicFirstName,
  };
  if (reference) {
    payload.internal_reference = reference;
  }
  return payload;
}
