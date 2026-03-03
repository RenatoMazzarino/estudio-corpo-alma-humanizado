
import type { BookingFlowProps } from "../booking-flow.types";
import { usePublicBookingFlowState } from "./use-public-booking-flow-state";
import { usePublicBookingFlowControllerDeps } from "./use-public-booking-flow-controller-deps";
import { buildPublicBookingFlowControllerResult } from "./use-public-booking-flow-controller-result";

export function usePublicBookingFlowController({
  tenant,
  services,
  signalPercentage,
  publicBookingCutoffBeforeCloseMinutes,
  publicBookingLastSlotBeforeCloseMinutes,
  whatsappNumber,
  mercadoPagoPublicKey,
}: BookingFlowProps) {
  const state = usePublicBookingFlowState();
  const deps = usePublicBookingFlowControllerDeps({
    tenant,
    signalPercentage,
    publicBookingCutoffBeforeCloseMinutes,
    publicBookingLastSlotBeforeCloseMinutes,
    whatsappNumber,
    mercadoPagoPublicKey,
    state,
  });

  return buildPublicBookingFlowControllerResult({ services, deps });
}
