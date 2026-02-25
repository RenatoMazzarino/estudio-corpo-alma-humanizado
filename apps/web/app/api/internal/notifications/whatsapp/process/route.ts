import { NextRequest, NextResponse } from "next/server";
import {
  WHATSAPP_AUTOMATION_PROCESSOR_SECRET,
  isWhatsAppAutomationDispatchEnabled,
} from "../../../../../../src/modules/notifications/automation-config";
import {
  getWhatsAppAutomationRuntimeConfig,
  processPendingWhatsAppNotificationJobs,
} from "../../../../../../src/modules/notifications/whatsapp-automation";

const parseBearerToken = (request: NextRequest) => {
  const header = request.headers.get("authorization")?.trim();
  if (!header) return "";
  const separatorIndex = header.indexOf(" ");
  if (separatorIndex <= 0) return "";

  const scheme = header.slice(0, separatorIndex);
  if (scheme.toLowerCase() !== "bearer") return "";

  const token = header.slice(separatorIndex + 1).trim();
  return token.length > 0 ? token : "";
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
  try {
    const body = (await request.json().catch(() => ({}))) as {
      limit?: unknown;
      appointmentId?: unknown;
      jobId?: unknown;
      type?: unknown;
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
  } catch {
    // Ignorar body inválido e seguir com limite padrão.
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
