import {
  WHATSAPP_AUTOMATION_META_ACCESS_TOKEN,
  WHATSAPP_AUTOMATION_META_API_VERSION,
  WHATSAPP_AUTOMATION_META_PHONE_NUMBER_ID,
  WHATSAPP_AUTOMATION_META_TEST_RECIPIENT,
} from "./automation-config";
import { extractMetaApiErrorMessage, onlyDigits, parseJsonResponse } from "./whatsapp-automation.helpers";

export function getMetaCloudTestRecipient() {
  const recipient = onlyDigits(WHATSAPP_AUTOMATION_META_TEST_RECIPIENT);
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
  return `https://graph.facebook.com/${WHATSAPP_AUTOMATION_META_API_VERSION}/${WHATSAPP_AUTOMATION_META_PHONE_NUMBER_ID}/messages`;
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
  const recipient = onlyDigits(params.to);
  if (!recipient) {
    throw new Error("Número de destino inválido para resposta automática WhatsApp.");
  }

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
