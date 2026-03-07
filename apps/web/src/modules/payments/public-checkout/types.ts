export type PublicCheckoutPaymentMethod = "pix" | "card" | null;

export type PublicCheckoutPixPayment = {
  id: string;
  status: string;
  ticket_url: string | null;
  qr_code: string | null;
  qr_code_base64: string | null;
  transaction_amount: number;
  created_at: string;
  expires_at: string;
};

export type PublicCheckoutStatusResult = {
  internal_status: "paid" | "pending" | "failed";
};

export type PublicCheckoutCardPayload = {
  token: string;
  paymentMethodId: string;
  installments: number;
  identificationType?: string;
  identificationNumber?: string;
};

export type PublicCheckoutEvent =
  | { type: "pix_generated" }
  | { type: "pix_error"; message: string }
  | { type: "pix_copy_success" }
  | { type: "pix_copy_error" }
  | { type: "card_pending"; message: string }
  | { type: "card_error"; message: string }
  | { type: "payment_paid" };
