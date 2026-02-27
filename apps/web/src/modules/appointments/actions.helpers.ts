import { BRAZIL_TZ_OFFSET } from "../../shared/timezone";

export const toBrazilDateTime = (date: string, time: string) =>
  new Date(`${date}T${time}:00${BRAZIL_TZ_OFFSET}`);

export const resolveBuffer = (...values: Array<number | null | undefined>) => {
  const positive = values.find((value) => typeof value === "number" && value > 0);
  if (positive !== undefined) return positive;
  return 0;
};

export const parseDecimalInput = (value: string | null) => {
  if (!value) return null;
  const cleaned = value.trim().replace(/[^\d.,-]/g, "");
  if (!cleaned) return null;

  let normalized = cleaned;
  if (cleaned.includes(",") && cleaned.includes(".")) {
    normalized =
      cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")
        ? cleaned.replace(/\./g, "").replace(",", ".")
        : cleaned.replace(/,/g, "");
  } else if (cleaned.includes(",")) {
    normalized = cleaned.replace(",", ".");
  }

  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? null : parsed;
};

export const normalizeCpfDigits = (value: string | null) => {
  if (!value) return null;
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits.length > 0 ? digits : null;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidEmailAddress = (value: string) => EMAIL_REGEX.test(value);

export type InitialFinanceExtraItemDraft = {
  type: "addon" | "adjustment";
  label: string;
  qty: number;
  amount: number;
};

export const normalizeCheckoutDiscountType = (value: string | null): "value" | "pct" | null => {
  if (value === "pct") return "pct";
  if (value === "value") return "value";
  return null;
};

export const parseInitialFinanceExtraItems = (value: string | null): InitialFinanceExtraItemDraft[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => {
        const rawType = typeof entry?.type === "string" ? entry.type : "addon";
        const type: "addon" | "adjustment" = rawType === "adjustment" ? "adjustment" : "addon";
        const label = typeof entry?.label === "string" ? entry.label.trim() : "";
        const qtyRaw = Number(entry?.qty ?? 1);
        const qty = Number.isFinite(qtyRaw) ? Math.max(1, Math.trunc(qtyRaw)) : 1;
        const amountRaw = Number(entry?.amount ?? 0);
        const amount = Number.isFinite(amountRaw) ? Math.max(0, amountRaw) : 0;
        if (!label || amount <= 0) return null;
        return { type, label, qty, amount };
      })
      .filter((entry): entry is InitialFinanceExtraItemDraft => Boolean(entry));
  } catch {
    return [];
  }
};
