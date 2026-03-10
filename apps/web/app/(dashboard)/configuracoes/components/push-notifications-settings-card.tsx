"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BellRing, Loader2 } from "lucide-react";
import { PUSH_EVENT_TYPES } from "../../../../src/modules/push/push-events";

type PreferenceItem = {
  eventType: (typeof PUSH_EVENT_TYPES)[number];
  enabled: boolean;
  updatedAt: string | null;
};

type PushNotificationsSettingsCardProps = {
  pushConfigured: boolean;
};

const eventLabels: Record<(typeof PUSH_EVENT_TYPES)[number], string> = {
  "payment.created": "Novo pagamento registrado",
  "appointment.created": "Novo agendamento",
  "appointment.updated": "Alteração de agendamento",
  "appointment.canceled": "Cancelamento de agendamento",
  "payment.status_changed": "Mudança de status de pagamento",
  "whatsapp.job.status_changed": "Falha/status da automação WhatsApp",
};

export function PushNotificationsSettingsCard({
  pushConfigured,
}: PushNotificationsSettingsCardProps) {
  const [loading, setLoading] = useState(false);
  const [savingEventType, setSavingEventType] = useState<string | null>(null);
  const [sendingTest, setSendingTest] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<PreferenceItem[]>([]);
  const [subscriptions, setSubscriptions] = useState<
    Array<{ id: string; deviceLabel: string | null; lastSeenAt: string | null }>
  >([]);
  const [testStatus, setTestStatus] = useState<string | null>(null);

  const mergedPreferences = useMemo(() => {
    const map = new Map(preferences.map((item) => [item.eventType, item.enabled]));
    return PUSH_EVENT_TYPES.map((eventType) => ({
      eventType,
      enabled: map.get(eventType) ?? true,
    }));
  }, [preferences]);

  const loadPreferences = useCallback(async () => {
    if (!pushConfigured) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/push/preferences", {
        method: "GET",
        headers: { accept: "application/json" },
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            ok: true;
            preferences: Array<{ eventType: string; enabled: boolean; updatedAt: string | null }>;
          }
        | { ok: false; error: string }
        | null;

      if (!response.ok || !payload || !payload.ok) {
        const message = payload && "error" in payload ? payload.error : "Falha ao carregar preferências de push.";
        throw new Error(message);
      }

      const normalized = payload.preferences
        .map((item) => {
          const eventType = item.eventType as (typeof PUSH_EVENT_TYPES)[number];
          if (!PUSH_EVENT_TYPES.includes(eventType)) return null;
          return {
            eventType,
            enabled: Boolean(item.enabled),
            updatedAt: item.updatedAt ?? null,
          };
        })
        .filter((item): item is PreferenceItem => Boolean(item));
      setPreferences(normalized);

      const subscriptionsResponse = await fetch("/api/push/subscriptions", {
        method: "GET",
        headers: { accept: "application/json" },
        cache: "no-store",
      });
      const subscriptionsPayload = (await subscriptionsResponse.json().catch(() => null)) as
        | {
            ok: true;
            subscriptions: Array<{ id: string; deviceLabel: string | null; lastSeenAt: string | null }>;
          }
        | { ok: false; error: string }
        | null;

      if (
        subscriptionsResponse.ok &&
        subscriptionsPayload &&
        subscriptionsPayload.ok &&
        Array.isArray(subscriptionsPayload.subscriptions)
      ) {
        setSubscriptions(subscriptionsPayload.subscriptions);
      }
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : "Falha ao carregar preferências de push.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [pushConfigured]);

  useEffect(() => {
    void loadPreferences();
  }, [loadPreferences]);

  const handleToggle = useCallback(
    async (eventType: (typeof PUSH_EVENT_TYPES)[number], nextEnabled: boolean) => {
      setSavingEventType(eventType);
      setError(null);
      try {
        const response = await fetch("/api/push/preferences", {
          method: "POST",
          headers: { "content-type": "application/json; charset=utf-8" },
          body: JSON.stringify({
            eventType,
            enabled: nextEnabled,
          }),
        });

        const payload = (await response.json().catch(() => null)) as
          | { ok: true }
          | { ok: false; error: string }
          | null;

        if (!response.ok || !payload || !payload.ok) {
          const message = payload && "error" in payload ? payload.error : "Falha ao atualizar preferência.";
          throw new Error(message);
        }

        setPreferences((current) => {
          const map = new Map(current.map((item) => [item.eventType, item]));
          map.set(eventType, {
            eventType,
            enabled: nextEnabled,
            updatedAt: new Date().toISOString(),
          });
          return Array.from(map.values());
        });
      } catch (requestError) {
        const message =
          requestError instanceof Error ? requestError.message : "Falha ao atualizar preferência.";
        setError(message);
      } finally {
        setSavingEventType(null);
      }
    },
    []
  );

  const handleSendTest = useCallback(async () => {
    setSendingTest(true);
    setError(null);
    setTestStatus(null);
    try {
      const response = await fetch("/api/push/test", {
        method: "POST",
        headers: { "content-type": "application/json; charset=utf-8" },
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok: true; subscriptions: number; providerMessageId: string | null }
        | { ok: false; error: string }
        | null;

      if (!response.ok || !payload || !payload.ok) {
        const message = payload && "error" in payload ? payload.error : "Falha ao disparar push de teste.";
        throw new Error(message);
      }

      setTestStatus(
        `Push de teste enviado com sucesso (${payload.subscriptions} assinatura(s) ativa(s)).`
      );
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Falha ao disparar push de teste.";
      setError(message);
    } finally {
      setSendingTest(false);
    }
  }, []);

  return (
    <div className="bg-white p-6 rounded-3xl border border-stone-100 space-y-4">
      <div className="flex items-center gap-2">
        <BellRing className="h-4 w-4 text-studio-green" />
        <h2 className="text-sm font-bold text-gray-700">Notificações Push (Jana)</h2>
      </div>

      {!pushConfigured ? (
        <p className="text-xs text-muted">
          Push não está configurado para este ambiente. Configure OneSignal (`NEXT_PUBLIC_ONESIGNAL_APP_ID` + `ONESIGNAL_REST_API_KEY`) para ativar.
        </p>
      ) : null}

      {loading ? (
        <div className="inline-flex items-center gap-2 text-xs text-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Carregando preferências...</span>
        </div>
      ) : (
        <div className="space-y-2">
          {mergedPreferences.map((item) => (
            <label
              key={item.eventType}
              className="flex items-center justify-between gap-3 rounded-xl border border-line p-3"
            >
              <span className="text-xs text-studio-text font-semibold">
                {eventLabels[item.eventType]}
              </span>
              <button
                type="button"
                disabled={!pushConfigured || savingEventType === item.eventType}
                onClick={() => void handleToggle(item.eventType, !item.enabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition disabled:opacity-60 ${
                  item.enabled ? "bg-studio-green" : "bg-stone-300"
                }`}
                aria-pressed={item.enabled}
                aria-label={`Alternar ${eventLabels[item.eventType]}`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                    item.enabled ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </button>
            </label>
          ))}
        </div>
      )}

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      {testStatus ? <p className="text-xs text-studio-green">{testStatus}</p> : null}
      {pushConfigured ? (
        <div className="space-y-2 rounded-xl border border-dashed border-line p-3">
          <p className="text-xs text-muted">
            Assinaturas ativas neste usuário: <strong>{subscriptions.length}</strong>
          </p>
          <button
            type="button"
            onClick={() => void handleSendTest()}
            disabled={sendingTest}
            className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-studio-text disabled:opacity-60"
          >
            {sendingTest ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Enviar push de teste
          </button>
        </div>
      ) : null}
      <p className="text-[11px] text-muted">
        Observação: para receber push no celular, é necessário autorizar notificações no navegador usado pela Jana.
      </p>
    </div>
  );
}
