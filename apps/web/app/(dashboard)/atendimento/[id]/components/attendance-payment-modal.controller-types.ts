
import type { CheckoutItem, CheckoutRow, PaymentRow } from "../../../../../lib/attendance/attendance-types";
import type { ReceiptFlowMode } from "./attendance-payment.types";

export type InternalStatus = "paid" | "pending" | "failed";
export type PointCardMode = "debit" | "credit";

export type PixPaymentData = {
  id: string;
  order_id: string;
  qr_code: string | null;
  qr_code_base64: string | null;
  expires_at: string;
  transaction_amount: number;
};

export type PointPaymentData = {
  id: string;
  order_id: string;
  internal_status: InternalStatus;
  card_mode: PointCardMode;
  transaction_amount: number;
};

export interface AttendancePaymentModalProps {
  open: boolean;
  checkout: CheckoutRow | null;
  items: CheckoutItem[];
  payments: PaymentRow[];
  appointmentPaymentStatus?: string | null;
  pixKeyValue: string;
  pixKeyType: "cnpj" | "cpf" | "email" | "phone" | "evp" | null;
  pointEnabled: boolean;
  pointTerminalName: string;
  pointTerminalModel: string;
  onClose: () => void;
  onSaveItems: (
    items: Array<{ type: CheckoutItem["type"]; label: string; qty: number; amount: number }>
  ) => Promise<boolean>;
  onSetDiscount: (type: "value" | "pct" | null, value: number | null, reason?: string) => Promise<boolean>;
  onRegisterCashPayment: (amount: number) => Promise<{ ok: boolean; paymentId?: string | null }>;
  onRegisterPixKeyPayment: (amount: number) => Promise<{ ok: boolean; paymentId?: string | null }>;
  onCreatePixPayment: (amount: number, attempt: number) => Promise<{ ok: boolean; data?: PixPaymentData }>;
  onPollPixStatus: () => Promise<{ ok: boolean; status: InternalStatus }>;
  onCreatePointPayment: (
    amount: number,
    cardMode: PointCardMode,
    attempt: number
  ) => Promise<{ ok: boolean; data?: PointPaymentData }>;
  onPollPointStatus: (
    orderId: string
  ) => Promise<{ ok: boolean; status: InternalStatus; paymentId?: string | null }>;
  onWaivePayment: () => Promise<{ ok: boolean }>;
  onSendReceipt: (paymentId: string) => Promise<void>;
  onAutoSendReceipt?: (paymentId: string) => Promise<{ ok?: boolean; message?: string } | void>;
  receiptFlowMode?: ReceiptFlowMode;
  variant?: "modal" | "embedded";
  chargeAmountOverride?: number | null;
  hideWaiverOption?: boolean;
  initialMethod?: "cash" | "pix_mp" | "pix_key" | "card" | "waiver";
  successResolveLabel?: string;
  onReceiptPromptResolved?: (payload: {
    paymentId?: string | null;
    sentReceipt: boolean;
    outcome?: "paid" | "waived";
  }) => Promise<void> | void;
}
