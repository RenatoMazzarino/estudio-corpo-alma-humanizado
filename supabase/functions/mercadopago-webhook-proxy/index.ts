/// <reference path="../_shared/deno-globals.d.ts" />

const APP_BASE_URL = (Deno.env.get("APP_BASE_URL") ?? "").trim();
const EDGE_FORWARD_TOKEN = (Deno.env.get("INTERNAL_EDGE_FORWARD_TOKEN") ?? "").trim();

function buildForwardHeaders(original: Headers) {
  const headers = new Headers();
  const contentType = original.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }
  if (EDGE_FORWARD_TOKEN) {
    headers.set("x-edge-forward-token", EDGE_FORWARD_TOKEN);
  }
  return headers;
}

Deno.serve(async (request: Request) => {
  if (!APP_BASE_URL) {
    return new Response("APP_BASE_URL não configurado.", { status: 500 });
  }

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const targetUrl = new URL("/api/mercadopago/webhook", APP_BASE_URL).toString();
  const body = await request.text();

  const response = await fetch(targetUrl, {
    method: "POST",
    headers: buildForwardHeaders(request.headers),
    body,
  });

  const responseBody = await response.text();
  return new Response(responseBody, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "application/json; charset=utf-8",
    },
  });
});
