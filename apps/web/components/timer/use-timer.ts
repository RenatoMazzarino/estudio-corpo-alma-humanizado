"use client";

import { useTimerContext } from "./timer-provider";

export function useTimer() {
  return useTimerContext();
}
