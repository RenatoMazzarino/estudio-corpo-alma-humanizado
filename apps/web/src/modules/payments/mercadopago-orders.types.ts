export type InternalPaymentStatus = "paid" | "pending" | "failed";
export type PointCardMode = "debit" | "credit";

export interface CardOrderResult {
  id: string;
  order_id: string;
  status: string;
  internal_status: InternalPaymentStatus;
  status_detail: string | null;
  transaction_amount: number;
}

export interface PixOrderResult {
  id: string;
  order_id: string;
  status: string;
  internal_status: InternalPaymentStatus;
  ticket_url: string | null;
  qr_code: string | null;
  qr_code_base64: string | null;
  transaction_amount: number;
  created_at: string;
  expires_at: string;
}

export interface PointOrderResult {
  id: string;
  order_id: string;
  status: string;
  internal_status: InternalPaymentStatus;
  status_detail: string | null;
  transaction_amount: number;
  point_terminal_id: string;
  card_mode: PointCardMode;
}

export interface PointOrderStatusResult {
  id: string;
  order_id: string;
  status: string;
  internal_status: InternalPaymentStatus;
  status_detail: string | null;
  transaction_amount: number;
  point_terminal_id: string | null;
  card_mode: PointCardMode | null;
  appointment_id: string | null;
}
