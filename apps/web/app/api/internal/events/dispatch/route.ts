import { NextRequest, NextResponse } from "next/server";
import { processNotificationOutbox } from "../../../../../src/modules/events/outbox-dispatcher";
import { WHATSAPP_AUTOMATION_PROCESSOR_SECRET } from "../../../../../src/modules/notifications/automation-config";
import { getFeatureFlagMode } from "../../../../../src/shared/feature-flags";

const resolveDispatcherSecret = () =>
  (process.env.EVENT_DISPATCHER_SECRET?.trim() || WHATSAPP_AUTOMATION_PROCESSOR_SECRET || "").trim();

const parseBearerToken = (request: NextRequest) => {
  const header = request.headers.get("authorization")?.trim();
  if (!header) return "";
  const separator = header.indexOf(" ");
  if (separator <= 0) return "";
  const scheme = header.slice(0, separator).toLowerCase();
  if (scheme !== "bearer") return "";
  return header.slice(separator + 1).trim();
};

const isAuthorized = (request: NextRequest) => {
  const secret = resolveDispatcherSecret();
  if (!secret) return false;
  return parseBearerToken(request) === secret;
};

export async function GET(request: NextRequest) {
  const secret = resolveDispatcherSecret();
  if (!secret) {
    return NextResponse.json(
      {
        ok: false,
        error: "EVENT_DISPATCHER_SECRET não configurado.",
      },
      { status: 503 }
    );
  }

  const headers = new Headers();
  headers.set("WWW-Authenticate", 'Bearer realm="event-dispatcher"');
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401, headers });
  }

  return NextResponse.json({
    ok: true,
    flags: {
      FF_EDGE_DISPATCHER_V2: getFeatureFlagMode("FF_EDGE_DISPATCHER_V2"),
      FF_PUSH_NOTIFICATIONS: getFeatureFlagMode("FF_PUSH_NOTIFICATIONS"),
    },
  });
}

export async function POST(request: NextRequest) {
  const secret = resolveDispatcherSecret();
  if (!secret) {
    return NextResponse.json(
      {
        ok: false,
        error: "EVENT_DISPATCHER_SECRET não configurado.",
      },
      { status: 503 }
    );
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let limit: number | undefined;
  try {
    const body = (await request.json().catch(() => ({}))) as { limit?: unknown };
    if (typeof body.limit === "number" && Number.isFinite(body.limit)) {
      limit = body.limit;
    }
  } catch {
    // body opcional
  }

  try {
    const summary = await processNotificationOutbox({ limit });
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao processar dispatcher de eventos.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
