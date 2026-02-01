"use client";

import { useTimer } from "../../../components/timer/use-timer";

export function useActiveSession() {
  return useTimer();
}
