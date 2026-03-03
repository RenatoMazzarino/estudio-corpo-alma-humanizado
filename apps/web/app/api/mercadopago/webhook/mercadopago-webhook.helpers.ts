import crypto from "crypto";

type SignatureParts = {
  ts?: string;
  v1?: string;
};

export type NotificationType = "payment" | "order" | "unknown";

export const logWebhookError = (message: string, details?: unknown) => {
  console.error("[mercadopago-webhook]", message, details ?? {});
};

const parseSignatureHeader = (value: string | null): SignatureParts => {
  if (!value) return {};
  return value.split(",").reduce<SignatureParts>((acc, part) => {
    const [rawKey, rawValue] = part.split("=", 2);
    if (!rawKey || !rawValue) return acc;
    const key = rawKey.trim();
    const val = rawValue.trim();
    if (key === "ts") acc.ts = val;
    if (key === "v1") acc.v1 = val;
    return acc;
  }, {});
};

export const normalizeMercadoPagoToken = (value: string | undefined | null) => {
  if (!value) return "";
  const trimmed = value.trim().replace(/^["']|["']$/g, "");
  return trimmed.replace(/^Bearer\s+/i, "");
};

const buildSignatureManifest = (dataId: string, requestId: string, ts: string) => {
  const parts: string[] = [];
  if (dataId) parts.push(`id:${dataId}`);
  if (requestId) parts.push(`request-id:${requestId}`);
  if (ts) parts.push(`ts:${ts}`);
  return parts.length ? `${parts.join(";")};` : "";
};

const safeEqual = (left: string, right: string) => {
  const normalizedLeft = left.trim().toLowerCase();
  const normalizedRight = right.trim().toLowerCase();
  const leftBuffer = Buffer.from(normalizedLeft, "utf8");
  const rightBuffer = Buffer.from(normalizedRight, "utf8");
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

export const verifyWebhookSignature = (
  request: Request,
  secret: string,
  body: Record<string, unknown> | null
) => {
  const signature = parseSignatureHeader(request.headers.get("x-signature"));
  const requestId = request.headers.get("x-request-id") ?? "";
  const url = new URL(request.url);
  const bodyData = body?.data as { id?: string | number } | undefined;
  const bodyDataId =
    bodyData?.id?.toString() ??
    (typeof body?.id === "string" || typeof body?.id === "number" ? String(body.id) : "");
  const rawDataId = url.searchParams.get("data.id") || url.searchParams.get("id") || bodyDataId || "";
  const dataId = rawDataId ? rawDataId.toLowerCase() : "";

  if (!signature.ts || !signature.v1) {
    return { valid: false as const, reason: "missing_signature_fields" as const };
  }
  const manifests = new Set<string>();
  const rawManifest = buildSignatureManifest(rawDataId, requestId, signature.ts);
  const normalizedManifest = buildSignatureManifest(dataId, requestId, signature.ts);
  const normalizedWithoutRequestId = buildSignatureManifest(dataId, "", signature.ts);

  if (rawManifest) manifests.add(rawManifest);
  if (normalizedManifest) manifests.add(normalizedManifest);
  if (normalizedWithoutRequestId) manifests.add(normalizedWithoutRequestId);
  if (!manifests.size) {
    return { valid: false as const, reason: "missing_manifest" as const };
  }

  const normalizedSecret = secret.trim().replace(/^["']|["']$/g, "");
  for (const manifest of manifests) {
    const expected = crypto.createHmac("sha256", normalizedSecret).update(manifest).digest("hex");
    if (safeEqual(expected, signature.v1)) {
      return { valid: true as const, reason: "ok" as const };
    }
  }

  return { valid: false as const, reason: "signature_mismatch" as const };
};

export const resolveNotificationType = (
  request: Request,
  body: Record<string, unknown> | null
): NotificationType => {
  const url = new URL(request.url);
  const urlType = url.searchParams.get("type") ?? url.searchParams.get("topic");
  const bodyType =
    typeof body?.type === "string" ? body.type : typeof body?.topic === "string" ? body.topic : null;
  const rawType = (urlType ?? bodyType ?? "").toLowerCase();
  if (rawType === "payment") return "payment";
  if (rawType === "order") return "order";
  return "unknown";
};

export const mapProviderStatusToInternal = (providerStatus: string | null | undefined) => {
  const normalized = (providerStatus ?? "").toLowerCase();

  if (
    normalized === "approved" ||
    normalized === "processed" ||
    normalized === "accredited" ||
    normalized === "partially_refunded"
  ) {
    return "paid";
  }

  if (
    normalized === "rejected" ||
    normalized === "cancelled" ||
    normalized === "canceled" ||
    normalized === "charged_back" ||
    normalized === "failed" ||
    normalized === "refunded"
  ) {
    return "failed";
  }
  return "pending";
};

export const parseNumericAmount = (value: unknown, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

export function getPaymentId(request: Request, body: Record<string, unknown> | null) {
  const url = new URL(request.url);
  const search = url.searchParams;

  const data = body?.data as { id?: string | number } | undefined;
  const bodyId = body?.id as string | number | undefined;

  return data?.id?.toString() || bodyId?.toString() || search.get("data.id") || search.get("id") || null;
}

export function parseMercadoPagoResourceId(value: unknown) {
  const normalized =
    typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
  if (!/^\d+$/.test(normalized)) return null;
  return normalized;
}
