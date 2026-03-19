import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDashboardAccessForCurrentUser } from "../../../../src/modules/auth/dashboard-access";
import {
  isPushNotificationsEnabled,
  isPushTransportConfigured,
} from "../../../../src/modules/push/push-config";
import {
  disablePushSubscription,
  ensureDefaultNotificationPreferences,
  listActivePushSubscriptionsForUser,
  upsertPushSubscription,
} from "../../../../src/modules/push/push-repository";
import { PUSH_EVENT_TYPES } from "../../../../src/modules/push/push-events";

const upsertSchema = z.object({
  oneSignalSubscriptionId: z.string().trim().min(1),
  oneSignalUserId: z.string().trim().optional().nullable(),
  deviceLabel: z.string().trim().max(120).optional().nullable(),
});

const disableSchema = z.object({
  oneSignalSubscriptionId: z.string().trim().min(1),
});

export async function POST(request: NextRequest) {
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

  const transportConfigured = await isPushTransportConfigured(access.data.tenantId);
  if (!transportConfigured) {
    return NextResponse.json(
      { ok: false, error: "OneSignal não está configurado para este tenant." },
      { status: 423 }
    );
  }

  let payload: z.infer<typeof upsertSchema>;
  try {
    payload = upsertSchema.parse(await request.json());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payload inválido.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }

  try {
    const row = await upsertPushSubscription({
      tenantId: access.data.tenantId,
      dashboardAccessUserId: access.data.membershipId,
      externalId: access.data.userId,
      oneSignalSubscriptionId: payload.oneSignalSubscriptionId,
      oneSignalUserId: payload.oneSignalUserId ?? null,
      deviceLabel: payload.deviceLabel ?? null,
      userAgent: request.headers.get("user-agent"),
      metadata: {
        source: "dashboard_web",
      },
    });

    await ensureDefaultNotificationPreferences({
      tenantId: access.data.tenantId,
      dashboardAccessUserId: access.data.membershipId,
      externalId: access.data.userId,
      eventTypes: [...PUSH_EVENT_TYPES],
    });

    return NextResponse.json({
      ok: true,
      subscription: row,
      preferencesSeeded: PUSH_EVENT_TYPES.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao registrar assinatura push.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET() {
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

  const transportConfigured = await isPushTransportConfigured(access.data.tenantId);
  if (!transportConfigured) {
    return NextResponse.json(
      { ok: false, error: "OneSignal não está configurado para este tenant." },
      { status: 423 }
    );
  }

  try {
    const subscriptions = await listActivePushSubscriptionsForUser({
      tenantId: access.data.tenantId,
      externalId: access.data.userId,
    });
    return NextResponse.json({
      ok: true,
      total: subscriptions.length,
      subscriptions,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao listar assinaturas push.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const access = await getDashboardAccessForCurrentUser();
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let payload: z.infer<typeof disableSchema>;
  try {
    payload = disableSchema.parse(await request.json());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payload inválido.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }

  try {
    const row = await disablePushSubscription({
      tenantId: access.data.tenantId,
      oneSignalSubscriptionId: payload.oneSignalSubscriptionId,
    });
    return NextResponse.json({ ok: true, subscription: row });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao desativar assinatura push.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
