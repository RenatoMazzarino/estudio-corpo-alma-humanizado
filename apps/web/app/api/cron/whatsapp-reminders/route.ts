import { NextRequest, NextResponse } from "next/server";
import { WHATSAPP_AUTOMATION_BATCH_LIMIT } from "../../../../src/modules/notifications/automation-config";
import {
  getWhatsAppAutomationRuntimeConfig,
  processPendingWhatsAppNotificationJobs,
} from "../../../../src/modules/notifications/whatsapp-automation";

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

const isAuthorizedCron = (request: NextRequest) => {
  const cronSecret = process.env.CRON_SECRET?.trim() ?? "";
  if (!cronSecret) return false;
  return parseBearerToken(request) === cronSecret;
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await processPendingWhatsAppNotificationJobs({
      type: "appointment_reminder",
      limit: WHATSAPP_AUTOMATION_BATCH_LIMIT,
    });
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Falha ao processar lembretes automáticos de WhatsApp.";
    return NextResponse.json(
      {
        ok: false,
        error: message,
        automation: getWhatsAppAutomationRuntimeConfig(),
      },
      { status: 500 }
    );
  }
}
