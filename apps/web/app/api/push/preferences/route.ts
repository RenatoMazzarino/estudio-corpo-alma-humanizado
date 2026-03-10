import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDashboardAccessForCurrentUser } from "../../../../src/modules/auth/dashboard-access";
import { PUSH_EVENT_TYPES } from "../../../../src/modules/push/push-events";
import {
  listNotificationPreferencesForUser,
  upsertNotificationPreference,
} from "../../../../src/modules/push/push-repository";

const updateSchema = z.object({
  eventType: z.enum(PUSH_EVENT_TYPES),
  enabled: z.boolean(),
});

export async function GET() {
  const access = await getDashboardAccessForCurrentUser();
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const preferences = await listNotificationPreferencesForUser({
      tenantId: access.data.tenantId,
      externalId: access.data.userId,
    });
    return NextResponse.json({ ok: true, preferences });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao carregar preferências.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const access = await getDashboardAccessForCurrentUser();
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let payload: z.infer<typeof updateSchema>;
  try {
    payload = updateSchema.parse(await request.json());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payload inválido.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }

  try {
    await upsertNotificationPreference({
      tenantId: access.data.tenantId,
      dashboardAccessUserId: access.data.membershipId,
      externalId: access.data.userId,
      eventType: payload.eventType,
      enabled: payload.enabled,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao atualizar preferência.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
