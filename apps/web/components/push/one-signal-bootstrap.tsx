"use client";

import Script from "next/script";
import { useEffect, useMemo, useRef, useState } from "react";

type OneSignalPushChangeEvent = {
  previous?: { id?: string | null; optedIn?: boolean | null };
  current?: { id?: string | null; optedIn?: boolean | null };
};

type OneSignalRuntime = {
  init: (config: Record<string, unknown>) => Promise<void>;
  login: (externalId: string) => Promise<void>;
  User: {
    PushSubscription: {
      id?: string | null;
      optedIn?: boolean | null;
      addEventListener?: (event: "change", callback: (event: OneSignalPushChangeEvent) => void) => void;
    };
  };
  Notifications: {
    permission?: string;
  };
  Slidedown: {
    promptPush: () => Promise<void>;
  };
};

declare global {
  interface Window {
    OneSignalDeferred?: Array<(oneSignal: OneSignalRuntime) => void | Promise<void>>;
  }
}

type OneSignalBootstrapProps = {
  externalId: string;
  tenantId: string;
};

const ONESIGNAL_APP_ID = (process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID ?? "").trim();
const ONESIGNAL_SAFARI_WEB_ID = (process.env.NEXT_PUBLIC_ONESIGNAL_SAFARI_WEB_ID ?? "").trim();

async function registerSubscription(params: {
  oneSignalSubscriptionId: string;
  oneSignalUserId?: string | null;
}) {
  await fetch("/api/push/subscriptions", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      oneSignalSubscriptionId: params.oneSignalSubscriptionId,
      oneSignalUserId: params.oneSignalUserId ?? null,
      deviceLabel: "Dashboard Web",
    }),
  });
}

async function unregisterSubscription(oneSignalSubscriptionId: string) {
  await fetch("/api/push/subscriptions", {
    method: "DELETE",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      oneSignalSubscriptionId,
    }),
  });
}

export function OneSignalBootstrap({ externalId, tenantId }: OneSignalBootstrapProps) {
  const [scriptReady, setScriptReady] = useState(false);
  const initializedRef = useRef(false);
  const changeListenerBoundRef = useRef(false);

  const canBoot = useMemo(
    () => Boolean(ONESIGNAL_APP_ID && externalId.trim() && tenantId.trim()),
    [externalId, tenantId]
  );

  useEffect(() => {
    if (!scriptReady || !canBoot || initializedRef.current) return;

    window.OneSignalDeferred = window.OneSignalDeferred ?? [];
    window.OneSignalDeferred.push(async (OneSignal) => {
      if (initializedRef.current) return;
      initializedRef.current = true;

      try {
        await OneSignal.init({
          appId: ONESIGNAL_APP_ID,
          safari_web_id: ONESIGNAL_SAFARI_WEB_ID || undefined,
          notifyButton: { enable: false },
          allowLocalhostAsSecureOrigin: true,
        });

        await OneSignal.login(externalId);

        const syncCurrentSubscription = async () => {
          const currentId =
            typeof OneSignal.User?.PushSubscription?.id === "string"
              ? OneSignal.User.PushSubscription.id
              : null;
          const optedIn = Boolean(OneSignal.User?.PushSubscription?.optedIn);
          if (currentId && optedIn) {
            await registerSubscription({
              oneSignalSubscriptionId: currentId,
            });
          }
        };

        await syncCurrentSubscription();

        if (!changeListenerBoundRef.current && OneSignal.User?.PushSubscription?.addEventListener) {
          changeListenerBoundRef.current = true;
          OneSignal.User.PushSubscription.addEventListener("change", async (event) => {
            const previousId =
              typeof event?.previous?.id === "string" ? event.previous.id : null;
            const currentId = typeof event?.current?.id === "string" ? event.current.id : null;
            const optedIn = Boolean(event?.current?.optedIn);

            if (previousId && previousId !== currentId) {
              await unregisterSubscription(previousId);
            }
            if (currentId && optedIn) {
              await registerSubscription({
                oneSignalSubscriptionId: currentId,
              });
            }
          });
        }

        const permission = (OneSignal.Notifications?.permission ?? "").toLowerCase();
        const optedIn = Boolean(OneSignal.User?.PushSubscription?.optedIn);
        if (!optedIn && permission === "default") {
          await OneSignal.Slidedown.promptPush();
        }
      } catch (error) {
        console.error("[push] Falha ao inicializar OneSignal:", error);
      }
    });
  }, [canBoot, externalId, scriptReady]);

  if (!canBoot) return null;

  return (
    <Script
      id="onesignal-sdk-v16"
      src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
      strategy="afterInteractive"
      onLoad={() => setScriptReady(true)}
    />
  );
}
