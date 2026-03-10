import crypto from "crypto";
import {
  WHATSAPP_AUTOMATION_META_ACCESS_TOKEN,
  WHATSAPP_AUTOMATION_META_API_VERSION,
  WHATSAPP_AUTOMATION_META_APP_SECRET,
  WHATSAPP_AUTOMATION_META_BUSINESS_ACCOUNT_ID,
  WHATSAPP_AUTOMATION_META_PHONE_NUMBER_ID,
  WHATSAPP_AUTOMATION_RECIPIENT_MODE,
  WHATSAPP_AUTOMATION_META_TEST_RECIPIENT,
} from "./automation-config";
import {
  extractMetaApiErrorMessage,
  normalizeWhatsAppRecipient,
  parseJsonResponse,
} from "./whatsapp-automation.helpers";

export function getMetaCloudTestRecipient() {
  const recipient = normalizeWhatsAppRecipient(WHATSAPP_AUTOMATION_META_TEST_RECIPIENT);
  if (!recipient) {
    throw new Error(
      "WHATSAPP_AUTOMATION_META_TEST_RECIPIENT não configurado (use apenas dígitos com DDI, ex.: 5519...)."
    );
  }
  return recipient;
}

export function assertMetaCloudConfigBase() {
  if (!WHATSAPP_AUTOMATION_META_ACCESS_TOKEN) {
    throw new Error("WHATSAPP_AUTOMATION_META_ACCESS_TOKEN não configurado.");
  }
  if (!WHATSAPP_AUTOMATION_META_PHONE_NUMBER_ID) {
    throw new Error("WHATSAPP_AUTOMATION_META_PHONE_NUMBER_ID não configurado.");
  }
}

export function getMetaCloudMessagesUrl() {
  const baseUrl = `https://graph.facebook.com/${WHATSAPP_AUTOMATION_META_API_VERSION}/${WHATSAPP_AUTOMATION_META_PHONE_NUMBER_ID}/messages`;
  if (!WHATSAPP_AUTOMATION_META_APP_SECRET) {
    return baseUrl;
  }

  const appSecretProof = crypto
    .createHmac("sha256", WHATSAPP_AUTOMATION_META_APP_SECRET)
    .update(WHATSAPP_AUTOMATION_META_ACCESS_TOKEN, "utf8")
    .digest("hex");

  const url = new URL(baseUrl);
  url.searchParams.set("appsecret_proof", appSecretProof);
  return url.toString();
}

type TemplateImageHeaderCacheEntry = {
  expiresAt: number;
  value: { requiresImageHeader: boolean; imageLink: string | null };
};

const TEMPLATE_IMAGE_HEADER_CACHE_TTL_MS = 10 * 60 * 1000;
const templateImageHeaderCache = new Map<string, TemplateImageHeaderCacheEntry>();

export async function getMetaCloudTemplateImageHeader(params: {
  templateName: string;
  languageCode: string;
}): Promise<{ requiresImageHeader: boolean; imageLink: string | null }> {
  const cacheKey = `${params.templateName}::${params.languageCode}`;
  const cached = templateImageHeaderCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  if (!WHATSAPP_AUTOMATION_META_BUSINESS_ACCOUNT_ID) {
    return { requiresImageHeader: false, imageLink: null };
  }

  const url = new URL(
    `https://graph.facebook.com/${WHATSAPP_AUTOMATION_META_API_VERSION}/${WHATSAPP_AUTOMATION_META_BUSINESS_ACCOUNT_ID}/message_templates`
  );
  url.searchParams.set("fields", "name,language,components");
  url.searchParams.set("name", params.templateName);
  url.searchParams.set("limit", "50");

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${WHATSAPP_AUTOMATION_META_ACCESS_TOKEN}`,
    },
  });

  const payload = await parseJsonResponse(response);
  if (!response.ok) {
    throw new Error(extractMetaApiErrorMessage(payload, response.status));
  }

  const templates = Array.isArray(payload?.data) ? payload.data : [];
  const template = templates.find((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const obj = entry as Record<string, unknown>;
    const name = typeof obj.name === "string" ? obj.name : "";
    const language = typeof obj.language === "string" ? obj.language : "";
    return name === params.templateName && language === params.languageCode;
  });

  if (!template || typeof template !== "object") {
    const value = { requiresImageHeader: false, imageLink: null };
    templateImageHeaderCache.set(cacheKey, { expiresAt: Date.now() + TEMPLATE_IMAGE_HEADER_CACHE_TTL_MS, value });
    return value;
  }

  const templateObj = template as Record<string, unknown>;
  const components = Array.isArray(templateObj.components) ? templateObj.components : [];
  const header = components.find((component) => {
    if (!component || typeof component !== "object") return false;
    const obj = component as Record<string, unknown>;
    return obj.type === "HEADER" && obj.format === "IMAGE";
  });

  if (!header || typeof header !== "object") {
    const value = { requiresImageHeader: false, imageLink: null };
    templateImageHeaderCache.set(cacheKey, { expiresAt: Date.now() + TEMPLATE_IMAGE_HEADER_CACHE_TTL_MS, value });
    return value;
  }

  const headerObj = header as Record<string, unknown>;
  const example =
    headerObj.example && typeof headerObj.example === "object"
      ? (headerObj.example as Record<string, unknown>)
      : null;
  const headerHandles = example && Array.isArray(example.header_handle) ? example.header_handle : [];
  const firstImageLink = headerHandles.find((handle) => typeof handle === "string" && handle.trim()) as
    | string
    | undefined;

  const value = {
    requiresImageHeader: true,
    imageLink: firstImageLink?.trim() ?? null,
  };
  templateImageHeaderCache.set(cacheKey, { expiresAt: Date.now() + TEMPLATE_IMAGE_HEADER_CACHE_TTL_MS, value });
  return value;
}

export async function sendMetaCloudMessage(requestBody: Record<string, unknown>) {
  const response = await fetch(getMetaCloudMessagesUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WHATSAPP_AUTOMATION_META_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  const payload = await parseJsonResponse(response);
  if (!response.ok) {
    throw new Error(extractMetaApiErrorMessage(payload, response.status));
  }

  const messages = Array.isArray(payload?.messages) ? payload.messages : [];
  const firstMessage = messages[0];
  const providerMessageId =
    firstMessage && typeof firstMessage === "object" && "id" in firstMessage && typeof firstMessage.id === "string"
      ? firstMessage.id
      : null;

  return { payload, providerMessageId };
}

export async function sendMetaCloudTextMessage(params: { to: string; text: string }) {
  assertMetaCloudConfigBase();
  const requestedRecipient = normalizeWhatsAppRecipient(params.to);
  if (!requestedRecipient) {
    throw new Error("Número de destino inválido para resposta automática WhatsApp.");
  }
  const recipient = WHATSAPP_AUTOMATION_RECIPIENT_MODE === "test_recipient"
    ? getMetaCloudTestRecipient()
    : requestedRecipient;

  const { payload, providerMessageId } = await sendMetaCloudMessage({
    messaging_product: "whatsapp",
    to: recipient,
    type: "text",
    text: {
      body: params.text,
      preview_url: true,
    },
  });

  return {
    payload,
    providerMessageId,
    deliveredAt: new Date().toISOString(),
    recipient,
  };
}

export function resolveMetaCloudOutboundRecipient(requestedRecipient: string | null | undefined) {
  if (WHATSAPP_AUTOMATION_RECIPIENT_MODE === "test_recipient") {
    return getMetaCloudTestRecipient();
  }

  const normalized = normalizeWhatsAppRecipient(requestedRecipient);
  if (!normalized) {
    throw new Error("Cliente sem número de WhatsApp válido para envio automático.");
  }

  return normalized;
}
