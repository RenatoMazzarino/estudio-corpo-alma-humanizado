import type { ComponentProps } from "react";
import { AddressCreateModal } from "./address-create-modal";
import { AppointmentConfirmationSheet } from "./appointment-confirmation-sheet";
import { ClientCreateModal } from "./client-create-modal";

interface AppointmentOverlaysProps {
  clientCreateModalProps: ComponentProps<typeof ClientCreateModal>;
  addressCreateModalProps: ComponentProps<typeof AddressCreateModal>;
  confirmationSheetProps: ComponentProps<typeof AppointmentConfirmationSheet>;
}

export function AppointmentOverlays({
  clientCreateModalProps,
  addressCreateModalProps,
  confirmationSheetProps,
}: AppointmentOverlaysProps) {
  return (
    <>
      <ClientCreateModal {...clientCreateModalProps} />
      <AddressCreateModal {...addressCreateModalProps} />
      <AppointmentConfirmationSheet {...confirmationSheetProps} />
    </>
  );
}
