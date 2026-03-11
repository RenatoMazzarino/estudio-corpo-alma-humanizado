import { NextResponse } from "next/server";
import { getDashboardAccessForCurrentUser } from "../../../../src/modules/auth/dashboard-access";
import { isPushNotificationsEnabled } from "../../../../src/modules/push/push-config";
import {
  insertPushDeliveryAttempt,
  listActivePushSubscriptionsForUser,
} from "../../../../src/modules/push/push-repository";
import { sendPushViaOneSignal } from "../../../../src/modules/push/onesignal-server";
import type { Json } from "../../../../lib/supabase/types";

export async function POST() {
  const access = await getDashboardAccessForCurrentUser();
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!isPushNotificationsEnabled(access.data.tenantId)) {
    return NextResponse.json(
      { ok: false, error: "Push notifications estão desabilitadas neste ambiente." },
      { status: 423 }
    );
  }

  const subscriptions = await listActivePushSubscriptionsForUser({
    tenantId: access.data.tenantId,
    externalId: access.data.userId,
  });

  if (subscriptions.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Nenhuma assinatura push ativa para este usuário. Autorize notificações no navegador e recarregue a página.",
        appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID?.trim() || null,
      },
      { status: 409 }
    );
  }

  const correlationId = `push-test-${Date.now()}`;

  try {
    const dispatch = await sendPushViaOneSignal({
      externalIds: [access.data.userId],
      heading: "Push de teste do Estúdio",
      message: "Se você recebeu isso, a inscrição OneSignal está funcionando.",
      url: "/configuracoes",
      data: {
        event_type: "push.test.manual",
        correlation_id: correlationId,
      },
    });

    await insertPushDeliveryAttempt({
      tenantId: access.data.tenantId,
      outboxId: null,
      eventId: correlationId,
      eventType: "push.test.manual",
      correlationId,
      status: dispatch.skipped ? "queued" : "success",
      providerMessageId: dispatch.providerMessageId,
      requestPayload: {
        source: "manual_test",
        subscriptions: subscriptions.length,
      },
      responsePayload:
        dispatch.response && typeof dispatch.response === "object"
          ? (JSON.parse(JSON.stringify(dispatch.response)) as Json)
          : null,
      attempt: 1,
    });

    return NextResponse.json({
      ok: true,
      subscriptions: subscriptions.length,
      providerMessageId: dispatch.providerMessageId,
      appId: dispatch.providerAppId ?? null,
      deliveryMode: dispatch.skipped ? "queued_without_targets" : "sent",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao enviar push de teste.";

    await insertPushDeliveryAttempt({
      tenantId: access.data.tenantId,
      outboxId: null,
      eventId: correlationId,
      eventType: "push.test.manual",
      correlationId,
      status: "failed",
      errorMessage: message,
      requestPayload: {
        source: "manual_test",
        subscriptions: subscriptions.length,
      },
      attempt: 1,
    });

    return NextResponse.json(
      {
        ok: false,
        error: message,
        appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID?.trim() || null,
      },
      { status: 500 }
    );
  }
}
