/// <reference path="../_shared/deno-globals.d.ts" />

const APP_BASE_URL = (Deno.env.get("APP_BASE_URL") ?? "").trim();
const DISPATCHER_SECRET =
  (Deno.env.get("EVENT_DISPATCHER_SECRET") ?? Deno.env.get("WHATSAPP_AUTOMATION_PROCESSOR_SECRET") ?? "").trim();

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

Deno.serve(async (request: Request) => {
  if (!APP_BASE_URL) {
    return json({ ok: false, error: "APP_BASE_URL não configurado." }, 500);
  }

  if (!DISPATCHER_SECRET) {
    return json({ ok: false, error: "EVENT_DISPATCHER_SECRET não configurado." }, 500);
  }

  if (request.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  const body = await request.text();
  const target = new URL("/api/internal/events/dispatch", APP_BASE_URL).toString();

  const response = await fetch(target, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${DISPATCHER_SECRET}`,
    },
    body,
  });

  const responseBody = await response.text();
  return new Response(responseBody, {
    status: response.status,
    headers: { "content-type": response.headers.get("content-type") ?? "application/json; charset=utf-8" },
  });
});
