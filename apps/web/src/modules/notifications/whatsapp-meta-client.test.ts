import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./automation-config", () => ({
  WHATSAPP_AUTOMATION_META_ACCESS_TOKEN: "token-test",
  WHATSAPP_AUTOMATION_META_API_VERSION: "v99.0",
  WHATSAPP_AUTOMATION_META_PHONE_NUMBER_ID: "12345",
  WHATSAPP_AUTOMATION_META_TEST_RECIPIENT: "55 (19) 99999-0000",
}));

vi.mock("./whatsapp-automation.helpers", () => ({
  extractMetaApiErrorMessage: (payload: Record<string, unknown> | null, status: number) =>
    `Erro ${status}: ${JSON.stringify(payload ?? {})}`,
  onlyDigits: (value: string | null | undefined) => (value ?? "").replace(/\D/g, ""),
  parseJsonResponse: async (response: { json: () => Promise<unknown> }) =>
    (await response.json()) as Record<string, unknown>,
}));

import {
  getMetaCloudMessagesUrl,
  getMetaCloudTestRecipient,
  sendMetaCloudMessage,
  sendMetaCloudTextMessage,
} from "./whatsapp-meta-client";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("whatsapp-meta-client", () => {
  it("normaliza recipient de teste", () => {
    expect(getMetaCloudTestRecipient()).toBe("5519999990000");
  });

  it("envia payload para Meta e retorna provider message id", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ messages: [{ id: "wamid.123" }] }),
    } as Response);

    const result = await sendMetaCloudMessage({ foo: "bar" });

    expect(getMetaCloudMessagesUrl()).toBe("https://graph.facebook.com/v99.0/12345/messages");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://graph.facebook.com/v99.0/12345/messages",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer token-test" }),
      })
    );
    expect(result.providerMessageId).toBe("wamid.123");
  });

  it("dispara erro quando Meta responde com falha", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: { message: "bad request" } }),
    } as Response);

    await expect(sendMetaCloudMessage({})).rejects.toThrow("Erro 400");
  });

  it("envia texto sanitizando número do destinatário", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ messages: [{ id: "wamid.456" }] }),
    } as Response);

    const result = await sendMetaCloudTextMessage({
      to: "+55 (19) 98888-7777",
      text: "Olá",
    });

    expect(result.recipient).toBe("5519988887777");
    expect(result.providerMessageId).toBe("wamid.456");
  });

  it("bloqueia envio de texto sem número válido", async () => {
    await expect(sendMetaCloudTextMessage({ to: "", text: "Olá" })).rejects.toThrow(
      "Número de destino inválido"
    );
  });
});
