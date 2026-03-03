import { useCallback } from "react";
import type { PaymentMethod, Service, Step } from "../booking-flow.types";
import type { UserFeedback } from "../../../../../src/shared/feedback/user-feedback";
import { feedbackById } from "../../../../../src/shared/feedback/user-feedback";
import { buildWhatsAppLink } from "../booking-flow.helpers";

type Params = {
  whatsappNumber?: string | null;
  setSelectedService: (service: Service | null) => void;
  setSelectedTime: (value: string) => void;
  setStep: (step: Step) => void;
  setPaymentMethod: (method: PaymentMethod | null) => void;
  setPixPayment: (data: null) => void;
  setCardStatus: (status: "idle" | "loading" | "error") => void;
  setProtocol: (value: string) => void;
  setAppointmentId: (value: string | null) => void;
  enforceStudioLocationOnly: () => void;
  showToast: (feedback: UserFeedback) => void;
};

export function usePublicBookingServiceActions({
  whatsappNumber,
  setSelectedService,
  setSelectedTime,
  setStep,
  setPaymentMethod,
  setPixPayment,
  setCardStatus,
  setProtocol,
  setAppointmentId,
  enforceStudioLocationOnly,
  showToast,
}: Params) {
  const handleServiceSelect = useCallback(
    (service: Service) => {
      setSelectedService(service);
      setSelectedTime("");
      setStep("DATETIME");
      setPaymentMethod(null);
      setPixPayment(null);
      setCardStatus("idle");
      setProtocol("");
      setAppointmentId(null);

      if (!service.accepts_home_visit) {
        enforceStudioLocationOnly();
      }
    },
    [
      enforceStudioLocationOnly,
      setAppointmentId,
      setCardStatus,
      setPaymentMethod,
      setPixPayment,
      setProtocol,
      setSelectedService,
      setSelectedTime,
      setStep,
    ]
  );

  const handleTalkToFlora = useCallback(() => {
    const link = buildWhatsAppLink(whatsappNumber);
    if (link) {
      window.open(link, "_blank");
      return;
    }
    showToast(feedbackById("contact_whatsapp_unavailable"));
  }, [showToast, whatsappNumber]);

  return {
    handleServiceSelect,
    handleTalkToFlora,
  };
}
