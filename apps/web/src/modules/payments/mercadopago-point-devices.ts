import { AppError } from "../../shared/errors/AppError";
import { fail, ok, type ActionResult } from "../../shared/errors/result";
import { getPayloadMessage, parseApiPayload } from "./mercadopago-orders.helpers";
import { resolveMercadoPagoAccessToken } from "./mercadopago-access-token";

export interface PointDevice {
  id: string;
  name: string;
  model: string | null;
  external_id: string | null;
  status: string | null;
}

function resolveDeviceArray(payload: Record<string, unknown> | null) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.results)) return payload.results;
  if (payload.data && typeof payload.data === "object") {
    const dataObj = payload.data as Record<string, unknown>;
    if (Array.isArray(dataObj.results)) return dataObj.results;
    if (Array.isArray(dataObj.devices)) return dataObj.devices;
  }
  if (Array.isArray(payload.devices)) return payload.devices;
  return [];
}

export async function listPointDevices({
  offset = 0,
  limit = 50,
}: {
  offset?: number;
  limit?: number;
} = {}): Promise<ActionResult<PointDevice[]>> {
  const tokenResult = resolveMercadoPagoAccessToken();
  if (!tokenResult.ok) return tokenResult;
  const accessToken = tokenResult.data;

  let response: Response;
  try {
    response = await fetch(
      `https://api.mercadopago.com/point/integration-api/devices?offset=${offset}&limit=${limit}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    return fail(new AppError("Falha de rede ao listar maquininhas.", "UNKNOWN", 500, details));
  }

  const payloadText = await response.text();
  const payload = parseApiPayload(payloadText);
  if (!response.ok) {
    const message = getPayloadMessage(payload, "Não foi possível listar maquininhas Point.");
    return fail(new AppError(message, "SUPABASE_ERROR", response.status, payload));
  }

  const devices = resolveDeviceArray(payload)
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const record = entry as Record<string, unknown>;
      const id =
        (typeof record.id === "string" && record.id) ||
        (typeof record.terminal_id === "string" && record.terminal_id) ||
        (typeof record.terminalId === "string" && record.terminalId) ||
        "";
      if (!id) return null;
      return {
        id,
        name:
          (typeof record.name === "string" && record.name) ||
          (typeof record.device_name === "string" && record.device_name) ||
          "Point",
        model:
          (typeof record.model === "string" && record.model) ||
          (typeof record.device_model === "string" && record.device_model) ||
          null,
        external_id:
          (typeof record.external_id === "string" && record.external_id) ||
          (typeof record.externalId === "string" && record.externalId) ||
          null,
        status:
          (typeof record.status === "string" && record.status) ||
          (typeof record.connection_status === "string" && record.connection_status) ||
          null,
      } satisfies PointDevice;
    })
    .filter((item): item is PointDevice => Boolean(item));

  return ok(devices);
}

export async function configurePointDeviceToPdv({
  terminalId,
  externalId,
}: {
  terminalId: string;
  externalId: string;
}): Promise<ActionResult<{ terminalId: string; externalId: string }>> {
  const tokenResult = resolveMercadoPagoAccessToken();
  if (!tokenResult.ok) return tokenResult;
  const accessToken = tokenResult.data;

  const terminal = terminalId.trim();
  const external = externalId.trim();
  if (!terminal || !external) {
    return fail(new AppError("Terminal e identificador externo são obrigatórios.", "VALIDATION_ERROR", 400));
  }

  let response: Response;
  try {
    response = await fetch(`https://api.mercadopago.com/point/integration-api/devices/${terminal}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        external_id: external,
      }),
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    return fail(new AppError("Falha de rede ao configurar maquininha.", "UNKNOWN", 500, details));
  }

  const payloadText = await response.text();
  const payload = parseApiPayload(payloadText);
  if (!response.ok) {
    const message = getPayloadMessage(payload, "Não foi possível configurar a maquininha Point.");
    return fail(new AppError(message, "SUPABASE_ERROR", response.status, payload));
  }

  return ok({ terminalId: terminal, externalId: external });
}
