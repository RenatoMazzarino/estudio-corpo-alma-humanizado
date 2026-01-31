"use client";

import { useRouter } from "next/navigation";
import { AppointmentDetailsModal, AppointmentDetails } from "../../../../components/appointment-details-modal";

interface Props {
  appointment: AppointmentDetails;
}

export function AppointmentDetailsPage({ appointment }: Props) {
  const router = useRouter();

  return (
    <AppointmentDetailsModal
      appointment={appointment}
      variant="page"
      onUpdate={() => router.refresh()}
    />
  );
}
