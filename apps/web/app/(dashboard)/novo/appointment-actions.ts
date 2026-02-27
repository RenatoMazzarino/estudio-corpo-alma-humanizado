"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServiceClient } from "../../../lib/supabase/service";
import {
  createAppointment as createAppointmentImpl,
  triggerCreatedNotificationsForAppointment,
  updateInternalAppointment as updateAppointmentImpl,
} from "../../../src/modules/appointments/actions";
import { listClientAddresses, createClient, findClientByCpf } from "../../../src/modules/clients/repository";
import {
  buildClientNameColumnsProfile,
  composeInternalClientName,
  normalizeReferenceLabel,
} from "../../../src/modules/clients/name-profile";
import { FIXED_TENANT_ID } from "../../../lib/tenant-context";
import { requireDashboardAccessForServerAction } from "../../../src/modules/auth/dashboard-access";
import { normalizeCpfDigits } from "../../../src/shared/cpf";
import { normalizePhoneDigits } from "../../../src/shared/phone";
import {
  createAttendancePixPayment,
  createAttendancePointPayment,
  getAttendance,
  getAttendancePixPaymentStatus,
  getAttendancePointPaymentStatus,
  recordPayment,
  sendMessage,
  setCheckoutItems,
  setDiscount,
} from "../atendimento/[id]/actions";

export async function createAppointment(formData: FormData): Promise<void> {

  await requireDashboardAccessForServerAction();
  await createAppointmentImpl(formData);
}

function getInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0]?.slice(0, 2).toUpperCase() ?? null;
  return `${parts[0]?.[0] ?? ""}${parts[parts.length - 1]?.[0] ?? ""}`.toUpperCase();
}

export async function createClientFromAppointmentDraft(input: {
  firstName: string;
  lastName: string;
  reference?: string | null;
  phone?: string | null;
  email?: string | null;
  cpf?: string | null;
}): Promise<
  | {
      ok: true;
      data: {
        id: string;
        name: string;
        phone: string | null;
        email: string | null;
        cpf: string | null;
        public_first_name: string | null;
        public_last_name: string | null;
        internal_reference: string | null;
      };
    }
  | { ok: false; error: string }
> {
  await requireDashboardAccessForServerAction();

  const parsed = z
    .object({
      firstName: z.string().trim().min(1, "Informe o primeiro nome."),
      lastName: z.string().trim().min(1, "Informe o sobrenome."),
      reference: z.string().trim().max(120).optional().nullable(),
      phone: z.string().trim().max(32).optional().nullable(),
      email: z.string().trim().email("Email inválido.").max(180).optional().nullable(),
      cpf: z.string().trim().max(20).optional().nullable(),
    })
    .safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: "Dados do cliente inválidos." };
  }

  const firstName = parsed.data.firstName.trim();
  const lastName = parsed.data.lastName.trim();
  const reference = normalizeReferenceLabel(parsed.data.reference ?? null);
  const phoneDigits = normalizePhoneDigits(parsed.data.phone ?? null);
  const normalizedPhone = phoneDigits ? parsed.data.phone?.trim() ?? null : null;
  const normalizedEmail = (parsed.data.email ?? "").trim().toLowerCase() || null;
  const cpfDigits = normalizeCpfDigits(parsed.data.cpf ?? null);

  if (phoneDigits.length > 0 && phoneDigits.length !== 10 && phoneDigits.length !== 11) {
    return { ok: false, error: "WhatsApp inválido. Informe um número com DDD." };
  }

  if (cpfDigits.length > 0 && cpfDigits.length !== 11) {
    return { ok: false, error: "CPF inválido. Informe os 11 números do CPF." };
  }

  if (cpfDigits.length === 11) {
    const { data: cpfClient, error: cpfError } = await findClientByCpf(FIXED_TENANT_ID, cpfDigits);
    if (cpfError) {
      return { ok: false, error: "Não foi possível validar o CPF agora. Tente novamente." };
    }
    if (cpfClient?.id) {
      return { ok: false, error: `CPF já cadastrado para o cliente ${cpfClient.name}.` };
    }
  }

  const nameColumns = buildClientNameColumnsProfile({
    publicFirstName: firstName,
    publicLastName: lastName,
    reference: reference || null,
  });
  const internalName = composeInternalClientName(firstName, lastName, reference || null);
  const initials = getInitials(internalName);

  const { data: createdClient, error: createError } = await createClient({
    tenant_id: FIXED_TENANT_ID,
    name: internalName,
    phone: normalizedPhone,
    email: normalizedEmail,
    cpf: cpfDigits.length === 11 ? cpfDigits : null,
    public_first_name: nameColumns.public_first_name,
    public_last_name: nameColumns.public_last_name,
    internal_reference: nameColumns.internal_reference,
    initials,
    marketing_opt_in: false,
  });

  if (createError || !createdClient?.id) {
    return { ok: false, error: "Não foi possível salvar o cliente agora." };
  }

  revalidatePath("/clientes");

  return {
    ok: true,
    data: {
      id: createdClient.id,
      name: internalName,
      phone: normalizedPhone,
      email: normalizedEmail,
      cpf: cpfDigits.length === 11 ? cpfDigits : null,
      public_first_name: nameColumns.public_first_name,
      public_last_name: nameColumns.public_last_name,
      internal_reference: nameColumns.internal_reference,
    },
  };
}

function cloneFormData(input: FormData) {
  const copy = new FormData();
  for (const [key, value] of input.entries()) {
    copy.append(key, value);
  }
  return copy;
}

export async function createAppointmentForImmediateCharge(formData: FormData): Promise<{
  ok: boolean;
  error?: string;
  data?: {
    appointmentId: string;
    date: string;
    startTimeIso: string;
    attendance: Awaited<ReturnType<typeof getAttendance>>;
  };
}> {
  await requireDashboardAccessForServerAction();

  const payload = cloneFormData(formData);
  payload.set("response_mode", "json");
  payload.set("defer_lifecycle_notifications", "1");
  payload.set("skip_manual_created_message", "1");
  payload.set("send_created_message", "");

  try {
    const result = await createAppointmentImpl(payload);
    if (!result || typeof result !== "object" || !("appointmentId" in result)) {
      return { ok: false, error: "Não foi possível criar o agendamento para cobrança imediata." };
    }

    const attendance = await getAttendance(result.appointmentId);
    if (!attendance) {
      return { ok: false, error: "Agendamento criado, mas não foi possível carregar o checkout." };
    }

    return {
      ok: true,
      data: {
        appointmentId: result.appointmentId,
        date: result.date,
        startTimeIso: result.startTimeIso,
        attendance,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Falha ao criar agendamento para cobrança imediata.",
    };
  }
}

export async function updateAppointment(formData: FormData): Promise<void> {

  await requireDashboardAccessForServerAction();
  return updateAppointmentImpl(formData);
}

export async function getBookingChargeContext(appointmentId: string) {
  await requireDashboardAccessForServerAction();
  const parsed = z.object({ appointmentId: z.string().uuid() }).safeParse({ appointmentId });
  if (!parsed.success) {
    return { ok: false as const, error: "Agendamento inválido." };
  }
  const attendance = await getAttendance(parsed.data.appointmentId);
  if (!attendance) {
    return { ok: false as const, error: "Agendamento não encontrado." };
  }
  return { ok: true as const, data: attendance };
}

export async function saveBookingChargeItems(input: {
  appointmentId: string;
  items: Array<{ type: "service" | "fee" | "addon" | "adjustment"; label: string; qty: number; amount: number }>;
}) {
  await requireDashboardAccessForServerAction();
  return setCheckoutItems(input);
}

export async function setBookingChargeDiscount(input: {
  appointmentId: string;
  type: "value" | "pct" | null;
  value: number | null;
  reason?: string | null;
}) {
  await requireDashboardAccessForServerAction();
  return setDiscount({
    appointmentId: input.appointmentId,
    type: input.type,
    value: input.value,
    reason: input.reason ?? null,
  });
}

export async function recordBookingChargePayment(input: {
  appointmentId: string;
  method: "pix" | "card" | "cash" | "other";
  amount: number;
}) {
  await requireDashboardAccessForServerAction();
  return recordPayment(input);
}

export async function createBookingPixPayment(input: {
  appointmentId: string;
  amount: number;
  payerName?: string | null;
  payerPhone?: string | null;
  payerEmail?: string | null;
  attempt?: number;
}) {
  await requireDashboardAccessForServerAction();
  return createAttendancePixPayment({
    appointmentId: input.appointmentId,
    amount: input.amount,
    payerName: input.payerName ?? "",
    payerPhone: input.payerPhone ?? "",
    payerEmail: input.payerEmail ?? null,
    attempt: input.attempt ?? 0,
  });
}

export async function pollBookingPixPaymentStatus(input: { appointmentId: string }) {
  await requireDashboardAccessForServerAction();
  return getAttendancePixPaymentStatus(input);
}

export async function createBookingPointPayment(input: {
  appointmentId: string;
  amount: number;
  cardMode: "debit" | "credit";
  attempt?: number;
}) {
  await requireDashboardAccessForServerAction();
  return createAttendancePointPayment({
    appointmentId: input.appointmentId,
    amount: input.amount,
    cardMode: input.cardMode,
    attempt: input.attempt ?? 0,
  });
}

export async function pollBookingPointPaymentStatus(input: { appointmentId: string; orderId: string }) {
  await requireDashboardAccessForServerAction();
  return getAttendancePointPaymentStatus({
    appointmentId: input.appointmentId,
    orderId: input.orderId,
  });
}

export async function finalizeCreatedAppointmentNotifications(input: {
  appointmentId: string;
  startTimeIso: string;
}) {
  await requireDashboardAccessForServerAction();
  return triggerCreatedNotificationsForAppointment({
    appointmentId: input.appointmentId,
    startTimeIso: input.startTimeIso,
    source: "admin_create_after_payment",
  });
}

export async function recordManualCreatedMessage(input: {
  appointmentId: string;
  message: string;
}) {
  await requireDashboardAccessForServerAction();
  return sendMessage({
    appointmentId: input.appointmentId,
    type: "created_confirmation",
    channel: "whatsapp",
    payload: { message: input.message },
  });
}

export async function recordManualPaymentReceiptMessage(input: {
  appointmentId: string;
  paymentId: string;
  message: string;
  receiptLink: string;
}) {
  await requireDashboardAccessForServerAction();
  return sendMessage({
    appointmentId: input.appointmentId,
    type: "payment_receipt",
    channel: "whatsapp",
    payload: {
      message: input.message,
      payment_id: input.paymentId,
      receipt_link: input.receiptLink,
    },
  });
}

export async function getClientAddresses(clientId: string): Promise<{ data: unknown[]; error?: string | null }> {

  await requireDashboardAccessForServerAction();
  const parsed = z.object({ clientId: z.string().uuid() }).safeParse({ clientId });
  if (!parsed.success) {
    return { data: [], error: "Cliente inválido" };
  }

  const { data, error } = await listClientAddresses(FIXED_TENANT_ID, parsed.data.clientId);
  return { data: (data as unknown[] | null) ?? [], error: error?.message ?? null };
}

export async function saveClientAddress(input: {
  clientId: string;
  label: string;
  isPrimary?: boolean;
  addressCep?: string | null;
  addressLogradouro?: string | null;
  addressNumero?: string | null;
  addressComplemento?: string | null;
  addressBairro?: string | null;
  addressCidade?: string | null;
  addressEstado?: string | null;
}): Promise<{ data: { id: string } | null; error?: string | null }> {
  await requireDashboardAccessForServerAction();

  const parsed = z
    .object({
      clientId: z.string().uuid(),
      label: z.string().trim().min(1).max(80),
      isPrimary: z.boolean().optional(),
      addressCep: z.string().trim().max(20).nullish(),
      addressLogradouro: z.string().trim().min(1).max(255),
      addressNumero: z.string().trim().max(50).nullish(),
      addressComplemento: z.string().trim().max(255).nullish(),
      addressBairro: z.string().trim().max(255).nullish(),
      addressCidade: z.string().trim().min(1).max(255),
      addressEstado: z.string().trim().min(2).max(2),
    })
    .safeParse({
      clientId: input.clientId,
      label: input.label,
      isPrimary: input.isPrimary,
      addressCep: input.addressCep ?? null,
      addressLogradouro: input.addressLogradouro,
      addressNumero: input.addressNumero ?? null,
      addressComplemento: input.addressComplemento ?? null,
      addressBairro: input.addressBairro ?? null,
      addressCidade: input.addressCidade,
      addressEstado: input.addressEstado?.toUpperCase(),
    });

  if (!parsed.success) {
    return { data: null, error: "Dados de endereço inválidos." };
  }

  const supabase = createServiceClient();
  const { data: existingRows, error: existingError } = await supabase
    .from("client_addresses")
    .select("id, is_primary")
    .eq("tenant_id", FIXED_TENANT_ID)
    .eq("client_id", parsed.data.clientId);

  if (existingError) {
    return { data: null, error: "Não foi possível verificar os endereços do cliente." };
  }

  const hasExistingAddresses = (existingRows?.length ?? 0) > 0;
  const shouldBePrimary = !hasExistingAddresses || parsed.data.isPrimary === true;

  if (shouldBePrimary) {
    const { error: clearPrimaryError } = await supabase
      .from("client_addresses")
      .update({ is_primary: false })
      .eq("tenant_id", FIXED_TENANT_ID)
      .eq("client_id", parsed.data.clientId);

    if (clearPrimaryError) {
      return { data: null, error: "Não foi possível atualizar o endereço principal." };
    }
  }

  const { data: inserted, error: insertError } = await supabase
    .from("client_addresses")
    .insert({
      tenant_id: FIXED_TENANT_ID,
      client_id: parsed.data.clientId,
      label: parsed.data.label,
      is_primary: shouldBePrimary,
      address_cep: parsed.data.addressCep || null,
      address_logradouro: parsed.data.addressLogradouro,
      address_numero: parsed.data.addressNumero || null,
      address_complemento: parsed.data.addressComplemento || null,
      address_bairro: parsed.data.addressBairro || null,
      address_cidade: parsed.data.addressCidade,
      address_estado: parsed.data.addressEstado,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return { data: null, error: "Não foi possível salvar o endereço." };
  }

  return { data: { id: inserted.id }, error: null };
}
