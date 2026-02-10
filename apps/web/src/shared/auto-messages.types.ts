export type AutoMessageKey =
  | "created_confirmation"
  | "reminder_24h"
  | "signal_charge"
  | "signal_receipt"
  | "payment_receipt";

export type AutoMessageTemplates = Record<AutoMessageKey, string>;
