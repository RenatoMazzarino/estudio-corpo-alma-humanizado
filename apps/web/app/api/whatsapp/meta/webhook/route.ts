import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  WHATSAPP_AUTOMATION_META_APP_SECRET,
  WHATSAPP_AUTOMATION_META_WEBHOOK_VERIFY_TOKEN,
} from "../../../../../src/modules/notifications/automation-config";
import { processMetaCloudWebhookStatusEvents } from "../../../../../src/modules/notifications/whatsapp-automation";

const timingSafeEqualHex = (a: string, b: string) => {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
};

const isValidMetaSignature = (rawBody: string, signatureHeader: string | null) => {
  if (!WHATSAPP_AUTOMATION_META_APP_SECRET) return true;
  if (!signatureHeader) return false;
  const match = /^sha256=(.+)$/i.exec(signatureHeader.trim());
  if (!match?.[1]) return false;

  const digest = crypto
    .createHmac("sha256", WHATSAPP_AUTOMATION_META_APP_SECRET)
    .update(rawBody, "utf8")
    .digest("hex");

  try {
    return timingSafeEqualHex(digest, match[1]);
  } catch {
    return false;
  }
};

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (!WHATSAPP_AUTOMATION_META_WEBHOOK_VERIFY_TOKEN) {
    return NextResponse.json(
      { ok: false, error: "WHATSAPP_AUTOMATION_META_WEBHOOK_VERIFY_TOKEN não configurado." },
      { status: 503 }
    );
  }

  if (mode === "subscribe" && token === WHATSAPP_AUTOMATION_META_WEBHOOK_VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ ok: false, error: "Webhook verification failed." }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signatureHeader = request.headers.get("x-hub-signature-256");

  if (!isValidMetaSignature(rawBody, signatureHeader)) {
    return NextResponse.json({ ok: false, error: "Invalid Meta webhook signature." }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON payload." }, { status: 400 });
  }

  try {
    const result = await processMetaCloudWebhookStatusEvents(payload);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao processar webhook da Meta.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

