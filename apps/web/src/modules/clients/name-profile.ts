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
  const normalizedFirstName = (firstName ?? "").trim();
  const normalizedLastName = (lastName ?? "").trim();
  const normalizedReference = normalizeReferenceLabel(reference);
  if (!normalizedReference) {
    return [normalizedFirstName, normalizedLastName].filter((value) => value.length > 0).join(" ").trim();
  }
  if (!normalizedFirstName) return normalizedReference;
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
}): ResolvedClientNames {
  const internalName = (input.name ?? "").trim();
  const publicFirstName = normalizeText(input.publicFirstName);
  const publicLastName = normalizeText(input.publicLastName);
  const publicFullNameFromColumns = composePublicClientFullName(publicFirstName, publicLastName);
  const strippedInternalName = stripReferenceFromInternalName(internalName);
  const reference = normalizeReferenceLabel(input.internalReference);
  const referenceOnlyInternalName =
    !publicFirstName &&
    !publicLastName &&
    !!reference &&
    (!!internalName && (internalName === reference || strippedInternalName === reference));
  const fallbackBase = referenceOnlyInternalName
    ? "Cliente"
    : strippedInternalName || internalName || "Cliente";
  const fallbackFirstName = fallbackBase.split(/\s+/).filter(Boolean)[0] ?? "Cliente";
  const fallbackFullName = fallbackBase || "Cliente";

  const fullName = publicFullNameFromColumns || fallbackFullName;
  const firstName = publicFirstName || fullName.split(/\s+/).filter(Boolean)[0] || fallbackFirstName;
  const lastName =
    publicLastName ||
    (publicFullNameFromColumns
      ? publicFullNameFromColumns
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
