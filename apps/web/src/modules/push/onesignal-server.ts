import { assertPushServerConfig } from "./push-config";
import { registerProviderUsageEvent } from "../tenancy/provider-metering";

type OneSignalCreateNotificationResponse = {
  id?: string;
  errors?: unknown;
};

export type PushDispatchPayload = {
  tenantId: string;
  externalIds: string[];
  heading: string;
  message: string;
  url?: string | null;
  data?: Record<string, unknown>;
};

export async function sendPushViaOneSignal(payload: PushDispatchPayload) {
  const config = await assertPushServerConfig(payload.tenantId);

  if (payload.externalIds.length === 0) {
    return {
      ok: true as const,
      skipped: true as const,
      providerMessageId: null,
      providerAppId: config.appId,
      response: null,
    };
  }

  const response = await fetch("https://api.onesignal.com/notifications?c=push", {
    method: "POST",
    headers: {
      "content-type": "application/json; charset=utf-8",
      authorization: `Key ${config.restApiKey}`,
    },
    body: JSON.stringify({
      app_id: config.appId,
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

  const meteringIdempotencyKey =
    typeof payload.data?.event_id === "string" && payload.data.event_id.trim()
      ? `onesignal:${payload.tenantId}:${payload.data.event_id.trim()}`
      : `onesignal:${payload.tenantId}:${payload.externalIds.slice().sort().join(",")}:${payload.heading}:${payload.message}`;

  await registerProviderUsageEvent({
    tenantId: payload.tenantId,
    providerKey: "onesignal",
    usageKey: "push_notification_send",
    quantity: Math.max(1, payload.externalIds.length || 1),
    idempotencyKey: meteringIdempotencyKey,
    metadata: {
      provider_message_id: json?.id ?? null,
      external_ids_count: payload.externalIds.length,
    },
  }).catch((meteringError) => {
    const message =
      meteringError instanceof Error ? meteringError.message : String(meteringError);
    console.error("[onesignal] falha ao registrar metering", {
      tenantId: payload.tenantId,
      message,
    });
  });

  return {
    ok: true as const,
    skipped: false as const,
    providerMessageId: json?.id ?? null,
    providerAppId: config.appId,
    response: json,
  };
}
