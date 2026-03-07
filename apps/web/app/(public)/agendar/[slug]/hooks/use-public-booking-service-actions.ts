import { useCallback } from "react";
import type { Service, Step } from "../booking-flow.types";
import type { UserFeedback } from "../../../../../src/shared/feedback/user-feedback";
import { feedbackById } from "../../../../../src/shared/feedback/user-feedback";
import { buildWhatsAppLink } from "../booking-flow.helpers";

type Params = {
  whatsappNumber?: string | null;
  setSelectedService: (service: Service | null) => void;
  setSelectedTime: (value: string) => void;
  setStep: (step: Step) => void;
  setProtocol: (value: string) => void;
  setAppointmentId: (value: string | null) => void;
  enforceStudioLocationOnly: () => void;
  showToast: (feedback: UserFeedback) => void;
  resetCheckout: () => void;
};

export function usePublicBookingServiceActions({
  whatsappNumber,
  setSelectedService,
  setSelectedTime,
  setStep,
  setProtocol,
  setAppointmentId,
  enforceStudioLocationOnly,
  showToast,
  resetCheckout,
}: Params) {
  const handleServiceSelect = useCallback(
    (service: Service) => {
      setSelectedService(service);
      setSelectedTime("");
      setStep("DATETIME");
      resetCheckout();
      setProtocol("");
      setAppointmentId(null);

      if (!service.accepts_home_visit) {
        enforceStudioLocationOnly();
      }
    },
    [
      enforceStudioLocationOnly,
      resetCheckout,
      setAppointmentId,
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
