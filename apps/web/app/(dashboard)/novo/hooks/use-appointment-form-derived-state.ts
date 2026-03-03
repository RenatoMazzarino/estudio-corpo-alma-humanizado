import { useMemo } from "react";
import { buildAddressQuery } from "../appointment-form.helpers";
import { normalizeCpfDigits } from "../../../../src/shared/cpf";
import {
  composeInternalClientName,
  resolveClientNames,
} from "../../../../src/modules/clients/name-profile";
import type {
  ChargeNowMethodDraft,
  ClientAddress,
  ClientRecordLite,
  ClientSelectionMode,
  CollectionTimingDraft,
  Service,
} from "../appointment-form.types";

interface UseAppointmentFormDerivedStateParams {
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  selectedClientId: string | null;
  clientRecords: ClientRecordLite[];
  clientCpf: string;
  clientSelectionMode: ClientSelectionMode;
  isEditing: boolean;
  selectedClientRecordCpf: string | null;
  clientPhone: string;
  clientName: string;
  clientFirstName: string;
  clientLastName: string;
  clientReference: string;
  selectedService: Service | null;
  selectedServiceId: string;
  hasLocationChoice: boolean;
  isHomeVisit: boolean;
  addressConfirmed: boolean;
  selectedDate: string;
  selectedTime: string;
  collectionTimingDraft: CollectionTimingDraft | null;
  chargeNowMethodDraft: ChargeNowMethodDraft | null;
  hasChargeNowAmountModeChoice: boolean;
  chargeNowAmountError: string | null;
  chargeNowAmountMode: "full" | "signal";
  chargeNowSignalValueConfirmed: boolean;
  selectedAddressId: string | null;
  clientAddresses: ClientAddress[];
  resolvedClientIdFallback: string | null;
}

export function useAppointmentFormDerivedState({
  logradouro,
  numero,
  complemento,
  bairro,
  cidade,
  estado,
  cep,
  selectedClientId,
  clientRecords,
  clientCpf,
  clientSelectionMode,
  isEditing,
  selectedClientRecordCpf,
  clientPhone,
  clientName,
  clientFirstName,
  clientLastName,
  clientReference,
  selectedService,
  selectedServiceId,
  hasLocationChoice,
  isHomeVisit,
  addressConfirmed,
  selectedDate,
  selectedTime,
  collectionTimingDraft,
  chargeNowMethodDraft,
  hasChargeNowAmountModeChoice,
  chargeNowAmountError,
  chargeNowAmountMode,
  chargeNowSignalValueConfirmed,
  selectedAddressId,
  clientAddresses,
  resolvedClientIdFallback,
}: UseAppointmentFormDerivedStateParams) {
  const mapsQuery = buildAddressQuery({
    logradouro,
    numero,
    complemento,
    bairro,
    cidade,
    estado,
    cep,
  });

  const selectedClientRecord =
    (selectedClientId ? clientRecords.find((client) => client.id === selectedClientId) ?? null : null) ?? null;

  const selectedClientNames = useMemo(
    () =>
      selectedClientRecord
        ? resolveClientNames({
            name: selectedClientRecord.name,
            publicFirstName: selectedClientRecord.public_first_name ?? null,
            publicLastName: selectedClientRecord.public_last_name ?? null,
            internalReference: selectedClientRecord.internal_reference ?? null,
          })
        : null,
    [selectedClientRecord]
  );

  const duplicateCpfClient = useMemo(() => {
    const normalized = normalizeCpfDigits(clientCpf);
    if (normalized.length !== 11) return null;

    const match =
      clientRecords.find((client) => {
        const clientCpfDigits = normalizeCpfDigits(client.cpf ?? null);
        return clientCpfDigits.length === 11 && clientCpfDigits === normalized;
      }) ?? null;

    if (!match) return null;
    if (selectedClientId && match.id === selectedClientId) return null;
    return match;
  }, [clientCpf, clientRecords, selectedClientId]);

  const isClientSelectionPending = !isEditing && clientSelectionMode === "idle";
  const shouldShowClientContactFields = isEditing || clientSelectionMode !== "idle";
  const isClientReadOnly = !isEditing && clientSelectionMode !== "idle";
  const shouldShowCpfField =
    shouldShowClientContactFields &&
    (isEditing
      ? !selectedClientRecordCpf || selectedClientRecordCpf.trim().length === 0 || clientCpf.trim().length > 0
      : clientSelectionMode === "new"
        ? clientCpf.trim().length === 0 || Boolean(duplicateCpfClient)
        : !selectedClientRecordCpf || selectedClientRecordCpf.trim().length === 0);
  const missingWhatsappWarning =
    shouldShowClientContactFields && clientPhone.replace(/\D/g, "").length === 0;
  const isExistingClientCpfLocked =
    clientSelectionMode === "existing" && Boolean(selectedClientRecordCpf?.trim());
  const resolvedClientId =
    clientSelectionMode === "existing" ? (selectedClientId ?? resolvedClientIdFallback ?? null) : null;
  const resolvedClientPhone = clientPhone || (selectedClientRecord?.phone ?? "");
  const clientDisplayPreviewLabel =
    clientSelectionMode === "existing"
      ? selectedClientNames?.internalName || clientName
      : clientName;
  const clientPublicFullNamePreview =
    clientSelectionMode === "existing"
      ? selectedClientNames?.publicFullName || ""
      : [clientFirstName, clientLastName].filter((value) => value.trim().length > 0).join(" ");
  const clientMessageFirstName =
    clientSelectionMode === "existing"
      ? selectedClientNames?.messagingFirstName || "Cliente"
      : clientFirstName.trim() || clientName.replace(/\s*\([^)]*\)\s*$/, "").trim().split(/\s+/)[0] || "Cliente";
  const clientDraftInternalPreview = composeInternalClientName(
    clientFirstName.trim() || "Primeiro nome",
    clientLastName.trim() || null,
    clientReference || null
  );
  const clientDraftPublicPreview =
    [clientFirstName, clientLastName].filter((value) => value.trim().length > 0).join(" ") || "Nome público";
  const canHomeVisit = selectedService?.accepts_home_visit ?? false;
  const isLocationChoiceRequired = Boolean(selectedServiceId) && canHomeVisit;
  const isLocationChoiceResolved = Boolean(selectedServiceId) && (!canHomeVisit || hasLocationChoice);
  const isStep1Unlocked = isEditing || clientSelectionMode !== "idle";
  const isStep2Unlocked = isStep1Unlocked;
  const isStep3Unlocked =
    isEditing || (isStep2Unlocked && isLocationChoiceResolved && (!isHomeVisit || addressConfirmed));
  const isStep4Unlocked = isEditing || (isStep3Unlocked && Boolean(selectedDate) && Boolean(selectedTime));
  const isChargeNowMethodChosen = collectionTimingDraft === "charge_now" && chargeNowMethodDraft !== null;
  const isChargeNowAmountConfirmed =
    collectionTimingDraft === "charge_now" &&
    (chargeNowMethodDraft === "waiver" ||
      (hasChargeNowAmountModeChoice &&
        !chargeNowAmountError &&
        (chargeNowAmountMode === "full" || chargeNowSignalValueConfirmed)));
  const canOpenConfirmation = isEditing
    ? true
    : isStep4Unlocked &&
      (collectionTimingDraft === "at_attendance" ||
        (collectionTimingDraft === "charge_now" && isChargeNowMethodChosen && isChargeNowAmountConfirmed));
  const selectedAddress = useMemo(
    () => clientAddresses.find((address) => address.id === selectedAddressId) ?? null,
    [clientAddresses, selectedAddressId]
  );

  return {
    mapsQuery,
    selectedClientRecord,
    selectedClientNames,
    duplicateCpfClient,
    isClientSelectionPending,
    shouldShowClientContactFields,
    isClientReadOnly,
    shouldShowCpfField,
    missingWhatsappWarning,
    isExistingClientCpfLocked,
    resolvedClientId,
    resolvedClientPhone,
    clientDisplayPreviewLabel,
    clientPublicFullNamePreview,
    clientMessageFirstName,
    clientDraftInternalPreview,
    clientDraftPublicPreview,
    canHomeVisit,
    isLocationChoiceRequired,
    isLocationChoiceResolved,
    isStep1Unlocked,
    isStep2Unlocked,
    isStep3Unlocked,
    isStep4Unlocked,
    isChargeNowMethodChosen,
    isChargeNowAmountConfirmed,
    canOpenConfirmation,
    selectedAddress,
  };
}
