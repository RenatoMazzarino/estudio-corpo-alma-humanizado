"use server";

import { submitPublicAppointment as submitPublicAppointmentImpl } from "../../../../src/modules/appointments/actions";
import { createServiceClient } from "../../../../lib/supabase/service";
import { AppError } from "../../../../src/shared/errors/AppError";
import { fail, ok, type ActionResult } from "../../../../src/shared/errors/result";

interface ClientLookupResult {
  id: string;
  name: string;
  phone: string | null;
  address_cep: string | null;
  address_logradouro: string | null;
  address_numero: string | null;
  address_complemento: string | null;
  address_bairro: string | null;
  address_cidade: string | null;
  address_estado: string | null;
}

interface PixPaymentResult {
  id: string;
  status: string;
  ticket_url: string | null;
  qr_code: string | null;
  qr_code_base64: string | null;
  transaction_amount: number;
}

interface PublicAppointmentInput {
  tenantSlug: string;
  serviceId: string;
  date: string;
  time: string;
  clientName: string;
  clientPhone: string;
  isHomeVisit?: boolean;
  addressCep?: string;
  addressLogradouro?: string;
  addressNumero?: string;
  addressComplemento?: string;
  addressBairro?: string;
  addressCidade?: string;
  addressEstado?: string;
}

export async function submitPublicAppointment(
  data: PublicAppointmentInput
): Promise<ActionResult<{ appointmentId: string | null }>> {
  return submitPublicAppointmentImpl(data);
}

function normalizePhoneValue(value: string) {
  return value.replace(/\D/g, "");
}

function sanitizeIlike(value: string) {
  return value.replace(/[%_,]/g, "").trim();
}

function phoneMatchesAny(candidate: string | null | undefined, variants: string[]) {
  if (!candidate) return false;
  const normalized = normalizePhoneValue(candidate);
  return variants.some((value) => normalized === value || normalized.endsWith(value));
}

export async function lookupClientByPhone({
  tenantId,
  phone,
}: {
  tenantId: string;
  phone: string;
}): Promise<ActionResult<{ client: ClientLookupResult | null }>> {
  const digits = normalizePhoneValue(phone);
  if (digits.length < 10) {
    return ok({ client: null });
  }

  const supabase = createServiceClient();
  const shortDigits = digits.length > 8 ? digits.slice(-8) : digits;
  const shortDigits9 = digits.length > 9 ? digits.slice(-9) : digits;

  const patterns = Array.from(
    new Set([digits, shortDigits9, shortDigits].filter((value) => value && value.length >= 8))
  );

  const loosePatterns = patterns.map((value) => `%${value.split("").join("%")}%`);

  const phoneFilters = [
    ...patterns.map((value) => `phone.ilike.%${sanitizeIlike(value)}%`),
    ...loosePatterns.map((pattern) => `phone.ilike.${pattern}`),
  ]
    .filter(Boolean)
    .join(",");

  const { data: clientsByPhone, error: clientsError } = phoneFilters
    ? await supabase
        .from("clients")
        .select(
          "id, name, phone, address_cep, address_logradouro, address_numero, address_complemento, address_bairro, address_cidade, address_estado"
        )
        .eq("tenant_id", tenantId)
        .or(phoneFilters)
    : await supabase
        .from("clients")
        .select(
          "id, name, phone, address_cep, address_logradouro, address_numero, address_complemento, address_bairro, address_cidade, address_estado"
        )
        .eq("tenant_id", tenantId);

  const phoneMatchFilters = [
    ...patterns.map((value) => `number_e164.ilike.%${sanitizeIlike(value)}%`),
    ...patterns.map((value) => `number_raw.ilike.%${sanitizeIlike(value)}%`),
    ...loosePatterns.map((pattern) => `number_raw.ilike.${pattern}`),
    ...loosePatterns.map((pattern) => `number_e164.ilike.${pattern}`),
  ]
    .filter(Boolean)
    .join(",");

  const { data: clientPhones, error: phonesError } = phoneMatchFilters
    ? await supabase
        .from("client_phones")
        .select("client_id, number_raw, number_e164, is_primary")
        .eq("tenant_id", tenantId)
        .or(phoneMatchFilters)
    : await supabase
        .from("client_phones")
        .select("client_id, number_raw, number_e164, is_primary")
        .eq("tenant_id", tenantId);

  if (clientsError || phonesError) {
    const { data: fallbackClients, error: fallbackError } = await supabase
      .from("clients")
      .select(
        "id, name, phone, address_cep, address_logradouro, address_numero, address_complemento, address_bairro, address_cidade, address_estado"
      )
      .eq("tenant_id", tenantId)
      .not("phone", "is", null)
      .limit(1000);

    if (fallbackError) {
      return fail(new AppError("Não foi possível buscar clientes.", "SUPABASE_ERROR", 500, fallbackError));
    }

    const fallbackClient =
      (fallbackClients ?? []).find((client) => phoneMatchesAny(client.phone, patterns)) ?? null;

    return ok({ client: fallbackClient });
  }

  const candidateIds = new Set<string>();
  (clientsByPhone ?? []).forEach((client) => candidateIds.add(client.id));
  (clientPhones ?? []).forEach((phoneEntry) => candidateIds.add(phoneEntry.client_id));

  if (candidateIds.size === 0) {
    return ok({ client: null });
  }

  const clientMap = new Map<string, ClientLookupResult>();
  (clientsByPhone ?? []).forEach((client) => {
    clientMap.set(client.id, client as ClientLookupResult);
  });

  const missingIds = Array.from(candidateIds).filter((id) => !clientMap.has(id));
  if (missingIds.length > 0) {
    const { data: extraClients, error: extraError } = await supabase
      .from("clients")
      .select(
        "id, name, phone, address_cep, address_logradouro, address_numero, address_complemento, address_bairro, address_cidade, address_estado"
      )
      .eq("tenant_id", tenantId)
      .in("id", missingIds);
    if (extraError) {
      return fail(new AppError("Não foi possível buscar clientes.", "SUPABASE_ERROR", 500, extraError));
    }
    (extraClients ?? []).forEach((client) => {
      clientMap.set(client.id, client as ClientLookupResult);
    });
  }

  const phonesByClient = new Map<string, { number_raw: string | null; number_e164: string | null }[]>();
  (clientPhones ?? []).forEach((phoneEntry) => {
    const list = phonesByClient.get(phoneEntry.client_id) ?? [];
    list.push({ number_raw: phoneEntry.number_raw, number_e164: phoneEntry.number_e164 });
    phonesByClient.set(phoneEntry.client_id, list);
  });

  const candidates = Array.from(candidateIds)
    .map((id) => clientMap.get(id))
    .filter(Boolean) as ClientLookupResult[];

  const matchedClient =
    candidates.find((client) => phoneMatchesAny(client.phone, patterns)) ||
    candidates.find((client) =>
      (phonesByClient.get(client.id) ?? []).some(
        (phoneEntry) =>
          phoneMatchesAny(phoneEntry.number_raw, patterns) ||
          phoneMatchesAny(phoneEntry.number_e164, patterns)
      )
    ) ||
    candidates[0] ||
    null;

  if (matchedClient) {
    return ok({ client: matchedClient });
  }

  const { data: fallbackClients, error: fallbackClientsError } = await supabase
    .from("clients")
    .select(
      "id, name, phone, address_cep, address_logradouro, address_numero, address_complemento, address_bairro, address_cidade, address_estado"
    )
    .eq("tenant_id", tenantId)
    .not("phone", "is", null)
    .limit(500);

  if (fallbackClientsError) {
    return fail(
      new AppError("Não foi possível buscar clientes.", "SUPABASE_ERROR", 500, fallbackClientsError)
    );
  }

  const fallbackClient =
    (fallbackClients ?? []).find((client) => phoneMatchesAny(client.phone, patterns)) ?? null;

  return ok({ client: fallbackClient });
}

function splitName(name: string) {
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 0) {
    return { firstName: "Cliente", lastName: "Corpo & Alma" };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "Corpo & Alma" };
  }
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function buildPayerEmail(phoneDigits: string) {
  const clean = phoneDigits.replace(/\D/g, "");
  return `cliente+${clean || "anon"}@corpoealmahumanizado.com.br`;
}

function splitPhone(phoneDigits: string) {
  const digits = phoneDigits.replace(/\D/g, "");
  const area = digits.slice(0, 2);
  const number = digits.slice(2);
  return { area_code: area || "11", number: number || digits };
}

export async function createPixPayment({
  appointmentId,
  tenantId,
  amount,
  description,
  payerName,
  payerPhone,
}: {
  appointmentId: string;
  tenantId: string;
  amount: number;
  description: string;
  payerName: string;
  payerPhone: string;
}): Promise<ActionResult<PixPaymentResult>> {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    return fail(
      new AppError(
        "MERCADOPAGO_ACCESS_TOKEN ausente: configure a chave no ambiente.",
        "CONFIG_ERROR",
        500
      )
    );
  }

  const { firstName, lastName } = splitName(payerName);
  const phoneDigits = normalizePhoneValue(payerPhone);
  const payer = {
    email: buildPayerEmail(phoneDigits),
    first_name: firstName,
    last_name: lastName,
    phone: splitPhone(phoneDigits),
  };

  const idempotencyKey =
    typeof globalThis.crypto !== "undefined" && "randomUUID" in globalThis.crypto
      ? globalThis.crypto.randomUUID()
      : undefined;

  let response: Response;
  try {
    response = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...(idempotencyKey ? { "X-Idempotency-Key": idempotencyKey } : {}),
      },
      body: JSON.stringify({
        transaction_amount: Number(amount.toFixed(2)),
        description,
        payment_method_id: "pix",
        payer,
        external_reference: appointmentId,
        ...(process.env.MERCADOPAGO_WEBHOOK_URL
          ? { notification_url: process.env.MERCADOPAGO_WEBHOOK_URL }
          : {}),
      }),
    });
  } catch (error) {
    return fail(
      new AppError(
        "Falha de rede ao criar pagamento Pix. Tente novamente.",
        "UNKNOWN",
        500,
        error
      )
    );
  }

  const payloadText = await response.text();
  let payload: Record<string, unknown> | null = null;
  if (payloadText) {
    try {
      payload = JSON.parse(payloadText) as Record<string, unknown>;
    } catch {
      payload = { message: payloadText };
    }
  }

  const payloadMessage =
    payload && typeof payload.message === "string" ? payload.message : "Erro ao criar pagamento Pix.";

  if (!response.ok) {
    return fail(
      new AppError(
        payloadMessage,
        "SUPABASE_ERROR",
        response.status,
        payload
      )
    );
  }

  if (!payload || typeof payload.id === "undefined") {
    return fail(
      new AppError(
        "Resposta inválida do Mercado Pago ao criar Pix.",
        "SUPABASE_ERROR",
        502,
        payload
      )
    );
  }

  const pointOfInteraction = payload.point_of_interaction as
    | { transaction_data?: Record<string, unknown> }
    | undefined;
  const transactionData = pointOfInteraction?.transaction_data;
  const status = typeof payload.status === "string" ? payload.status : "pending";
  const ticketUrl =
    transactionData && typeof transactionData.ticket_url === "string"
      ? transactionData.ticket_url
      : null;
  const qrCode =
    transactionData && typeof transactionData.qr_code === "string" ? transactionData.qr_code : null;
  const qrCodeBase64 =
    transactionData && typeof transactionData.qr_code_base64 === "string"
      ? transactionData.qr_code_base64
      : null;
  const transactionAmount =
    typeof payload.transaction_amount === "number" ? payload.transaction_amount : amount;

  const result: PixPaymentResult = {
    id: String(payload.id),
    status,
    ticket_url: ticketUrl,
    qr_code: qrCode,
    qr_code_base64: qrCodeBase64,
    transaction_amount: transactionAmount,
  };

  const supabase = createServiceClient();
  await supabase.from("appointment_payments").insert({
    appointment_id: appointmentId,
    tenant_id: tenantId,
    method: "pix",
    amount: result.transaction_amount,
    status: result.status,
    provider_ref: result.id,
    paid_at: result.status === "approved" ? new Date().toISOString() : null,
  });

  if (result.status === "approved") {
    await supabase
      .from("appointments")
      .update({ payment_status: "partial" })
      .eq("id", appointmentId)
      .eq("tenant_id", tenantId);
  }

  return ok(result);
}
