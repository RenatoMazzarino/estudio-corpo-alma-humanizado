import type { AttendanceTotals } from "./attendance-types";

export function computeElapsedSeconds(params: {
  startedAt: string | null;
  pausedAt: string | null;
  pausedTotalSeconds: number;
  now?: number;
}) {
  if (!params.startedAt) return 0;
  const now = params.now ?? Date.now();
  const startedAtMs = new Date(params.startedAt).getTime();
  const pausedAtMs = params.pausedAt ? new Date(params.pausedAt).getTime() : null;
  const pausedDurationMs = params.pausedTotalSeconds * 1000;
  const activeDurationMs = pausedAtMs ? pausedAtMs - startedAtMs : now - startedAtMs;
  const elapsed = Math.max(0, activeDurationMs - pausedDurationMs);
  return Math.floor(elapsed / 1000);
}

export function computeTotals(params: {
  items: Array<{ amount: number; qty?: number }>;
  discountType: "value" | "pct" | null;
  discountValue: number | null;
}): AttendanceTotals {
  const subtotal = params.items.reduce((acc, item) => acc + item.amount * (item.qty ?? 1), 0);
  const discountValue = params.discountValue ?? 0;
  const discount =
    params.discountType === "pct"
      ? Math.min(subtotal, subtotal * (discountValue / 100))
      : Math.min(subtotal, discountValue);
  const total = Math.max(0, subtotal - discount);
  return { subtotal, total };
}
