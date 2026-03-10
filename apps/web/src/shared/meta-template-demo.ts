export const META_TEMPLATE_PUBLIC_SAMPLE_CODE = "meta-demo-2026";
const META_TEMPLATE_PUBLIC_SAMPLE_CODE_ALIASES = new Set([
  "meta-demo-2026",
  "meta-demo-ycloud-2026",
  "meta-demo-meta-2026",
]);

export function isMetaTemplateSampleCode(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized.startsWith("meta-demo-") || META_TEMPLATE_PUBLIC_SAMPLE_CODE_ALIASES.has(normalized);
}

export type MetaVoucherSampleData = {
  clientName: string;
  dateTimeLabel: string;
  dayLabel: string;
  timeLabel: string;
  serviceName: string;
  locationLabel: string;
  bookingId: string;
};

export type MetaReceiptSampleData = {
  clientName: string;
  serviceName: string;
  dateLabel: string;
  timeLabel: string;
  paymentStatus: "paid" | "partial";
  paymentMethodLabel: string;
  locationLabel: string;
  locationDetail: string;
  totalLabel: string;
  signalLabel: string;
  paidLabel: string;
  remainingLabel: string;
  transactionId: string;
  generatedAtLabel: string;
};

export type MetaPaymentLinkSampleData = {
  clientName: string;
  serviceName: string;
  dateTimeLabel: string;
  locationLabel: string;
  amountLabel: string;
  paidAmountLabel: string;
  remainingAmountLabel: string;
  referenceLabel: string;
};

export function buildMetaVoucherSampleData(): MetaVoucherSampleData {
  return {
    clientName: "Maria Oliveira",
    dateTimeLabel: "Quinta-feira, 12/03/2026 as 18:30",
    dayLabel: "12 MAR",
    timeLabel: "18:30",
    serviceName: "Massagem Relaxante",
    locationLabel: "No estudio: Estudio Corpo & Alma Humanizado",
    bookingId: `AGD-${META_TEMPLATE_PUBLIC_SAMPLE_CODE.toUpperCase()}`,
  };
}

export function buildMetaReceiptSampleData(): MetaReceiptSampleData {
  return {
    clientName: "Maria Oliveira",
    serviceName: "Massagem Relaxante",
    dateLabel: "12/03/2026",
    timeLabel: "18:30",
    paymentStatus: "paid",
    paymentMethodLabel: "Pix",
    locationLabel: "Atendimento no Estudio",
    locationDetail: "Estudio Corpo & Alma Humanizado",
    totalLabel: "R$ 180,00",
    signalLabel: "R$ 180,00",
    paidLabel: "R$ 180,00",
    remainingLabel: "R$ 0,00",
    transactionId: `TX-${META_TEMPLATE_PUBLIC_SAMPLE_CODE.toUpperCase()}`,
    generatedAtLabel: "03/03/2026 as 14:30",
  };
}

export function buildMetaPaymentLinkSampleData(): MetaPaymentLinkSampleData {
  return {
    clientName: "Maria Oliveira",
    serviceName: "Massagem Relaxante",
    dateTimeLabel: "Quinta-feira, 12/03/2026 as 18:30",
    locationLabel: "Estudio Corpo & Alma Humanizado",
    amountLabel: "R$ 220,00",
    paidAmountLabel: "R$ 0,00",
    remainingAmountLabel: "R$ 220,00",
    referenceLabel: `AGD-${META_TEMPLATE_PUBLIC_SAMPLE_CODE.toUpperCase()}`,
  };
}
