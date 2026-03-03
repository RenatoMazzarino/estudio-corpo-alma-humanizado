"use client";

import type { ComponentProps } from "react";
import { AppointmentClientStep } from "./appointment-client-step";
import { AppointmentServiceLocationStep } from "./appointment-service-location-step";
import { AppointmentHomeVisitDetails } from "./appointment-home-visit-details";
import { AppointmentWhenStep } from "./appointment-when-step";
import { AppointmentFinanceStep } from "./appointment-finance-step";
import { AppointmentOverlays } from "./appointment-overlays";
import { AppointmentNotesAndSubmit } from "./appointment-notes-and-submit";

type Props = {
  clientStepProps: ComponentProps<typeof AppointmentClientStep>;
  showStep2: boolean;
  serviceLocationStepProps: ComponentProps<typeof AppointmentServiceLocationStep>;
  homeVisitDetailsProps: ComponentProps<typeof AppointmentHomeVisitDetails>;
  whenStepProps: ComponentProps<typeof AppointmentWhenStep>;
  showFinanceStep: boolean;
  financeStepProps: ComponentProps<typeof AppointmentFinanceStep>;
  overlaysProps: ComponentProps<typeof AppointmentOverlays>;
  notesAndSubmitProps: ComponentProps<typeof AppointmentNotesAndSubmit>;
};

export function AppointmentFormSections({
  clientStepProps,
  showStep2,
  serviceLocationStepProps,
  homeVisitDetailsProps,
  whenStepProps,
  showFinanceStep,
  financeStepProps,
  overlaysProps,
  notesAndSubmitProps,
}: Props) {
  return (
    <>
      <AppointmentClientStep {...clientStepProps} />

      {showStep2 && (
        <AppointmentServiceLocationStep {...serviceLocationStepProps}>
          <AppointmentHomeVisitDetails {...homeVisitDetailsProps} />
        </AppointmentServiceLocationStep>
      )}

      <AppointmentWhenStep {...whenStepProps} />

      {showFinanceStep && <AppointmentFinanceStep {...financeStepProps} />}

      <AppointmentOverlays {...overlaysProps} />

      <AppointmentNotesAndSubmit {...notesAndSubmitProps} />
    </>
  );
}
