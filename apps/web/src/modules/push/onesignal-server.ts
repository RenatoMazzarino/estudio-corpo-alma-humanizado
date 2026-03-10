import { ONESIGNAL_APP_ID, ONESIGNAL_REST_API_KEY, assertPushServerConfig } from "./push-config";

type OneSignalCreateNotificationResponse = {
  id?: string;
  errors?: unknown;
};

export type PushDispatchPayload = {
  externalIds: string[];
  heading: string;
  message: string;
  url?: string | null;
  data?: Record<string, unknown>;
};

export async function sendPushViaOneSignal(payload: PushDispatchPayload) {
  assertPushServerConfig();

  if (payload.externalIds.length === 0) {
    return {
      ok: true as const,
      skipped: true as const,
      providerMessageId: null,
      response: null,
    };
  }

  const response = await fetch("https://api.onesignal.com/notifications?c=push", {
    method: "POST",
    headers: {
      "content-type": "application/json; charset=utf-8",
      authorization: `Key ${ONESIGNAL_REST_API_KEY}`,
    },
    body: JSON.stringify({
      app_id: ONESIGNAL_APP_ID,
      target_channel: "push",
      include_aliases: {
        external_id: payload.externalIds,
      },
      // OneSignal exige idioma `en`/`any` para notificações web.
      // Mantemos PT-BR e adicionamos fallback EN com o mesmo texto.
      headings: {
        en: payload.heading,
        pt: payload.heading,
      },
      contents: {
        en: payload.message,
        pt: payload.message,
      },
      data: payload.data ?? {},
      url: payload.url ?? undefined,
    }),
  });

  const json = (await response.json().catch(() => null)) as OneSignalCreateNotificationResponse | null;
  if (!response.ok) {
    const detail = json?.errors ? JSON.stringify(json.errors) : response.statusText;
    throw new Error(`OneSignal falhou (${response.status}): ${detail}`);
  }

  return {
    ok: true as const,
    skipped: false as const,
    providerMessageId: json?.id ?? null,
    response: json,
  };
}
