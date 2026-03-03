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

  if (request.method !== "GET" && request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const incomingUrl = new URL(request.url);
  const targetUrl = new URL("/api/whatsapp/meta/webhook", APP_BASE_URL);
  targetUrl.search = incomingUrl.search;

  const init: RequestInit = {
    method: request.method,
    headers: buildForwardHeaders(request.headers),
  };

  if (request.method === "POST") {
    init.body = await request.text();
  }

  const response = await fetch(targetUrl.toString(), init);
  const responseBody = await response.text();

  return new Response(responseBody, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "text/plain; charset=utf-8",
    },
  });
});
