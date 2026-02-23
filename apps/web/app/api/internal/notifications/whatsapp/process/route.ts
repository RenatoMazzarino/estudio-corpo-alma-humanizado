import { NextRequest, NextResponse } from "next/server";
import {
  WHATSAPP_AUTOMATION_PROCESSOR_SECRET,
  WHATSAPP_AUTOMATION_META_USE_HELLO_WORLD_TEMPLATE,
  isWhatsAppAutomationDispatchEnabled,
} from "../../../../../../src/modules/notifications/automation-config";
import {
  getWhatsAppAutomationRuntimeConfig,
  processPendingWhatsAppNotificationJobs,
} from "../../../../../../src/modules/notifications/whatsapp-automation";

const parseBearerToken = (request: NextRequest) => {
  const header = request.headers.get("authorization")?.trim();
  if (!header) return "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match?.[1]?.trim() ?? "";
};

const isAuthorized = (request: NextRequest) => {
  if (!WHATSAPP_AUTOMATION_PROCESSOR_SECRET) return false;
  return parseBearerToken(request) === WHATSAPP_AUTOMATION_PROCESSOR_SECRET;
};

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    ok: true,
    automation: getWhatsAppAutomationRuntimeConfig(),
    dispatchEnabled: isWhatsAppAutomationDispatchEnabled(),
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!WHATSAPP_AUTOMATION_PROCESSOR_SECRET) {
    return NextResponse.json(
      {
        ok: false,
        error: "WHATSAPP_AUTOMATION_PROCESSOR_SECRET não configurado.",
        automation: getWhatsAppAutomationRuntimeConfig(),
      },
      { status: 503 }
    );
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let limit: number | undefined;
  let appointmentId: string | undefined;
  let jobId: string | undefined;
  let type: "appointment_created" | "appointment_canceled" | "appointment_reminder" | undefined;
  let allowBulk = false;
  try {
    const body = (await request.json().catch(() => ({}))) as {
      limit?: unknown;
      appointmentId?: unknown;
      jobId?: unknown;
      type?: unknown;
      allowBulk?: unknown;
    };
    if (typeof body.limit === "number" && Number.isFinite(body.limit)) {
      limit = body.limit;
    }
    if (typeof body.appointmentId === "string" && body.appointmentId.trim()) {
      appointmentId = body.appointmentId.trim();
    }
    if (typeof body.jobId === "string" && body.jobId.trim()) {
      jobId = body.jobId.trim();
    }
    if (
      body.type === "appointment_created" ||
      body.type === "appointment_canceled" ||
      body.type === "appointment_reminder"
    ) {
      type = body.type;
    }
    if (body.allowBulk === true) {
      allowBulk = true;
    }
  } catch {
    // Ignorar body inválido e seguir com limite padrão.
  }

  if (WHATSAPP_AUTOMATION_META_USE_HELLO_WORLD_TEMPLATE && !allowBulk && !appointmentId && !jobId) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Modo de teste hello_world exige alvo específico para evitar spam. Envie appointmentId ou jobId (ou allowBulk=true conscientemente).",
        automation: getWhatsAppAutomationRuntimeConfig(),
      },
      { status: 400 }
    );
  }

  try {
    const summary = await processPendingWhatsAppNotificationJobs({ limit, appointmentId, jobId, type });
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Falha ao processar jobs de automação de WhatsApp.";
    return NextResponse.json(
      { ok: false, error: message, automation: getWhatsAppAutomationRuntimeConfig() },
      { status: 500 }
    );
  }
}
