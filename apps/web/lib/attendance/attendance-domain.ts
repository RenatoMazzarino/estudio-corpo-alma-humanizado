import type { AttendanceTotals, StageStatus, TimerStatus, StageKey } from "./attendance-types";

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

export function deriveStageFromStatus(status: string | null): {
  currentStage: StageKey;
  preStatus: StageStatus;
  sessionStatus: StageStatus;
  checkoutStatus: StageStatus;
  postStatus: StageStatus;
  timerStatus: TimerStatus;
} {
  if (status === "completed") {
    return {
      currentStage: "hub",
      preStatus: "done",
      sessionStatus: "done",
      checkoutStatus: "done",
      postStatus: "done",
      timerStatus: "finished",
    };
  }

  if (status === "in_progress") {
    return {
      currentStage: "session",
      preStatus: "done",
      sessionStatus: "in_progress",
      checkoutStatus: "locked",
      postStatus: "locked",
      timerStatus: "running",
    };
  }

  if (status === "confirmed") {
    return {
      currentStage: "hub",
      preStatus: "done",
      sessionStatus: "available",
      checkoutStatus: "locked",
      postStatus: "locked",
      timerStatus: "idle",
    };
  }

  if (status === "canceled_by_client" || status === "canceled_by_studio" || status === "no_show") {
    return {
      currentStage: "hub",
      preStatus: "locked",
      sessionStatus: "locked",
      checkoutStatus: "locked",
      postStatus: "locked",
      timerStatus: "idle",
    };
  }

  return {
    currentStage: "hub",
    preStatus: "available",
    sessionStatus: "locked",
    checkoutStatus: "locked",
    postStatus: "locked",
    timerStatus: "idle",
  };
}
