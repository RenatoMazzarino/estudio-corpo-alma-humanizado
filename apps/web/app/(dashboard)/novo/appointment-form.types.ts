import type { CheckoutItem, CheckoutRow, PaymentRow } from "../../../lib/attendance/attendance-types";
import type { AutoMessageTemplates } from "../../../src/shared/auto-messages.types";

export interface Service {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
  accepts_home_visit?: boolean | null;
  custom_buffer_minutes?: number | null;
  description?: string | null;
}

export type AppointmentFormClient = {
  id: string;
  name: string;
  phone: string | null;
  email?: string | null;
  cpf?: string | null;
  public_first_name?: string | null;
  public_last_name?: string | null;
  internal_reference?: string | null;
};

export interface InitialAppointment {
  id: string;
  serviceId: string | null;
  date: string;
  time: string;
  clientId: string | null;
  clientName: string;
  clientPhone: string | null;
  isHomeVisit: boolean;
  clientAddressId: string | null;
  addressCep: string | null;
  addressLogradouro: string | null;
  addressNumero: string | null;
  addressComplemento: string | null;
  addressBairro: string | null;
  addressCidade: string | null;
  addressEstado: string | null;
  internalNotes: string | null;
  priceOverride: number | null;
  displacementFee?: number | null;
  displacementDistanceKm?: number | null;
}

export interface AppointmentFormProps {
  services: Service[];
  clients: AppointmentFormClient[];
  safeDate: string;
  initialAppointment?: InitialAppointment | null;
  returnTo?: string;
  messageTemplates: AutoMessageTemplates;
  signalPercentage: number;
  pointEnabled: boolean;
  pointTerminalName: string;
  pointTerminalModel: string;
  publicBaseUrl: string;
  pixKeyValue: string;
  pixKeyType: "cnpj" | "cpf" | "email" | "phone" | "evp" | null;
}

export interface ClientAddress {
  id: string;
  label: string;
  is_primary: boolean;
  address_cep: string | null;
  address_logradouro: string | null;
  address_numero: string | null;
  address_complemento: string | null;
  address_bairro: string | null;
  address_cidade: string | null;
  address_estado: string | null;
}

export interface AddressSearchResult {
  id: string;
  label: string;
  placeId: string;
}

export interface DisplacementEstimate {
  distanceKm: number;
  fee: number;
  rule: "urban" | "road";
}

export type AddressModalStep = "chooser" | "cep" | "search" | "form";
export type ClientSelectionMode = "idle" | "existing" | "new";
export type FinanceDraftItemType = "service" | "fee" | "addon" | "adjustment";
export type CollectionTimingDraft = "at_attendance" | "charge_now";
export type ChargeNowAmountMode = "full" | "signal";
export type ChargeNowMethodDraft = "cash" | "pix_mp" | "card" | "waiver";
export type BookingConfirmationStep = "review" | "creating_charge" | "charge_payment" | "charge_manual_prompt";
export type ChargePaymentStatus = "paid" | "pending" | "failed";

export interface FinanceDraftItem {
  id: string;
  type: FinanceDraftItemType;
  label: string;
  qty: number;
  amount: number;
}

export interface ChargeBookingState {
  appointmentId: string;
  date: string;
  startTimeIso: string;
  attendanceCode: string | null;
  appointmentPaymentStatus: string | null;
  checkout: CheckoutRow | null;
  checkoutItems: CheckoutItem[];
  payments: PaymentRow[];
}

export type BookingPixPaymentData = {
  id: string;
  order_id: string;
  qr_code: string | null;
  qr_code_base64: string | null;
  expires_at: string;
  transaction_amount: number;
};

export type BookingPointPaymentData = {
  id: string;
  order_id: string;
  internal_status: ChargePaymentStatus;
  card_mode: "debit" | "credit";
  transaction_amount: number;
};

export type ClientRecordLite = {
  id: string;
  name: string;
  phone: string | null;
  email?: string | null;
  cpf?: string | null;
  public_first_name?: string | null;
  public_last_name?: string | null;
  internal_reference?: string | null;
};
