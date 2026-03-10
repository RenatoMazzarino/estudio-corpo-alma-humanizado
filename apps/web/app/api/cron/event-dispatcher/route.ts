import { NextRequest, NextResponse } from "next/server";
import { processNotificationOutbox } from "../../../../src/modules/events/outbox-dispatcher";

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
    const summary = await processNotificationOutbox({ limit: 50 });
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao processar dispatcher de eventos.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
