"use client";

import { parseISO } from "date-fns";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppointmentFormSections } from "./components/appointment-form-sections";
import { AppointmentHiddenFields } from "./components/appointment-hidden-fields";
import {
  appointmentFormInputClass as inputClass,
  appointmentFormInputWithIconClass as inputWithIconClass,
  appointmentFormLabelClass as labelClass,
  appointmentFormSectionCardClass as sectionCardClass,
  appointmentFormSectionHeaderTextClass as sectionHeaderTextClass,
  appointmentFormSectionNumberClass as sectionNumberClass,
  appointmentFormSelectClass as selectClass,
} from "./appointment-form.styles";
import {
  isValidEmailAddress,
} from "./appointment-form.helpers";
import { useAppointmentFinance } from "./hooks/use-appointment-finance";
import { useAppointmentConfirmationFlow } from "./hooks/use-appointment-confirmation-flow";
import { useAppointmentAddressWorkflow } from "./hooks/use-appointment-address-workflow";
import { useAppointmentClientWorkflow } from "./hooks/use-appointment-client-workflow";
import { useAppointmentFormDerivedState } from "./hooks/use-appointment-form-derived-state";
import { useAppointmentFinanceState } from "./hooks/use-appointment-finance-state";
import { useAppointmentServiceSelection } from "./hooks/use-appointment-service-selection";
import { useInternalScheduleAvailability } from "./hooks/use-internal-schedule-availability";
import { useAppointmentClientChangeReset } from "./hooks/use-appointment-client-change-reset";
import { useAppointmentDisplacementEstimate } from "./hooks/use-appointment-displacement-estimate";
import {
  createAppointment,
  createClientFromAppointmentDraft,
  updateAppointment,
} from "./appointment-actions"; // Ação importada do arquivo renomeado
import { Toast, useToast } from "../../../components/ui/toast";
import { formatCep } from "../../../src/shared/address/cep";
import { formatCpf, normalizeCpfDigits } from "../../../src/shared/cpf";
import { formatMinutesSeconds } from "../../../src/shared/datetime";
import { formatBrazilPhone } from "../../../src/shared/phone";
import type {
  AppointmentFormProps,
  ClientRecordLite,
  ClientSelectionMode,
  DisplacementEstimate,
} from "./appointment-form.types";

const formatCountdown = formatMinutesSeconds;

export function AppointmentForm({
  services,
  clients,
  safeDate,
  initialAppointment,
  returnTo,
  messageTemplates,
  signalPercentage,
  pointEnabled,
  pointTerminalName,
  pointTerminalModel,
}: AppointmentFormProps) {
  const router = useRouter();
  const isEditing = Boolean(initialAppointment);
  const formRef = useRef<HTMLFormElement | null>(null);
  const sendMessageInputRef = useRef<HTMLInputElement | null>(null);
  const sendMessageTextInputRef = useRef<HTMLInputElement | null>(null);
  const clientPhoneInputRef = useRef<HTMLInputElement | null>(null);
  const clientCpfInputRef = useRef<HTMLInputElement | null>(null);
  const clientCreateFirstNameInputRef = useRef<HTMLInputElement | null>(null);
  const [isSendPromptOpen, setIsSendPromptOpen] = useState(false);
  const initialTimeRef = useRef(initialAppointment?.time ?? "");
  const selectedTimeRef = useRef(initialAppointment?.time ?? "");
  const previousClientIdRef = useRef<string | null>(initialAppointment?.clientId ?? null);

  const [selectedServiceId, setSelectedServiceId] = useState<string>(initialAppointment?.serviceId ?? "");
  const [displayedPrice, setDisplayedPrice] = useState<string>("");
  const [priceOverride, setPriceOverride] = useState<string>(
    initialAppointment?.priceOverride != null
      ? initialAppointment.priceOverride.toFixed(2).replace(".", ",")
      : ""
  );
  const [servicePriceDraft, setServicePriceDraft] = useState<string>(
    initialAppointment?.priceOverride != null
      ? Math.max(
          initialAppointment.priceOverride - Math.max(initialAppointment.displacementFee ?? 0, 0),
          0
        )
          .toFixed(2)
          .replace(".", ",")
      : ""
  );
  const {
    financeExtraItems,
    setFinanceExtraItems,
    financeNewItemLabel,
    setFinanceNewItemLabel,
    financeNewItemAmount,
    setFinanceNewItemAmount,
    scheduleDiscountType,
    setScheduleDiscountType,
    scheduleDiscountValue,
    setScheduleDiscountValue,
    collectionTimingDraft,
    setCollectionTimingDraft,
    chargeNowAmountMode,
    setChargeNowAmountMode,
    hasChargeNowAmountModeChoice,
    setHasChargeNowAmountModeChoice,
    chargeNowSignalPercent,
    setChargeNowSignalPercent,
    chargeNowCustomAmount,
    setChargeNowCustomAmount,
    chargeNowMethodDraft,
    setChargeNowMethodDraft,
    chargeNowSignalValueConfirmed,
    setChargeNowSignalValueConfirmed,
    confirmationSheetStep,
    setConfirmationSheetStep,
    creatingChargeBooking,
    setCreatingChargeBooking,
    runningChargeAction,
    setRunningChargeAction,
    chargeBookingState,
    setChargeBookingState,
    chargePixPayment,
    setChargePixPayment,
    chargePixAttempt,
    setChargePixAttempt,
    chargePixRemainingSeconds,
    setChargePixRemainingSeconds,
    chargePointPayment,
    setChargePointPayment,
    chargePointAttempt,
    setChargePointAttempt,
    chargeFlowError,
    setChargeFlowError,
    chargeNotificationsDispatched,
    setChargeNotificationsDispatched,
    finishingChargeFlow,
    setFinishingChargeFlow,
    handleAddFinanceItem,
    handleRemoveFinanceItem,
  } = useAppointmentFinanceState({ isEditing, signalPercentage });
  const [selectedDate, setSelectedDate] = useState<string>(initialAppointment?.date ?? "");
  const [selectedTime, setSelectedTime] = useState<string>(initialAppointment?.time ?? "");
  const [clientRecords, setClientRecords] = useState<ClientRecordLite[]>(clients);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(initialAppointment?.clientId ?? null);
  const [clientSelectionMode, setClientSelectionMode] = useState<ClientSelectionMode>(
    initialAppointment?.clientId ? "existing" : "idle"
  );
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [clientName, setClientName] = useState(initialAppointment?.clientName ?? "");
  const [clientPhone, setClientPhone] = useState(
    initialAppointment?.clientPhone ? formatBrazilPhone(initialAppointment.clientPhone) : ""
  );
  const [clientCpf, setClientCpf] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientFirstName, setClientFirstName] = useState("");
  const [clientLastName, setClientLastName] = useState("");
  const [clientReference, setClientReference] = useState("");
  const [isClientCreateModalOpen, setIsClientCreateModalOpen] = useState(false);
  const [clientCreateError, setClientCreateError] = useState<string | null>(null);
  const [isClientCreateSaving, setIsClientCreateSaving] = useState(false);
  const [isHomeVisit, setIsHomeVisit] = useState(initialAppointment?.isHomeVisit ?? false);
  const [hasLocationChoice, setHasLocationChoice] = useState<boolean>(Boolean(initialAppointment));
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const {
    clientAddresses,
    selectedAddressId,
    setSelectedAddressId,
    addressMode,
    setAddressMode,
    isAddressModalOpen,
    setIsAddressModalOpen,
    addressModalStep,
    setAddressModalStep,
    showAddressSelectionList,
    setShowAddressSelectionList,
    addressConfirmed,
    setAddressConfirmed,
    cepDraft,
    setCepDraft,
    cepDraftStatus,
    setCepDraftStatus,
    addressSearchQuery,
    setAddressSearchQuery,
    addressSearchResults,
    setAddressSearchResults,
    addressSearchLoading,
    setAddressSearchLoading,
    addressSearchError,
    setAddressSearchError,
    addressSavePending,
    addressSaveError,
    setAddressSaveError,
    addressIsPrimaryDraft,
    setAddressIsPrimaryDraft,
    addressLabel,
    setAddressLabel,
    cep,
    setCep,
    logradouro,
    setLogradouro,
    numero,
    setNumero,
    complemento,
    setComplemento,
    bairro,
    setBairro,
    cidade,
    setCidade,
    estado,
    setEstado,
    applyAddressDraftFields,
    handleCepDraftLookup,
    handleAddressSearchResultSelect,
    openAddressCreateModal,
    closeAddressCreateModal,
    handleSelectExistingAddress,
    handleAddressModalSave,
  } = useAppointmentAddressWorkflow({
    initialAppointment,
    selectedClientId,
    isHomeVisit,
  });
  const [displacementEstimate, setDisplacementEstimate] = useState<DisplacementEstimate | null>(null);
  const [displacementStatus, setDisplacementStatus] = useState<"idle" | "loading" | "error">("idle");
  const [displacementError, setDisplacementError] = useState<string | null>(null);
  const [manualDisplacementFee, setManualDisplacementFee] = useState(
    initialAppointment?.displacementFee != null
      ? initialAppointment.displacementFee.toFixed(2).replace(".", ",")
      : ""
  );
  const [internalNotes, setInternalNotes] = useState(initialAppointment?.internalNotes ?? "");
  const { toast, showToast } = useToast();
  const selectedService = useMemo(
    () => services.find((service) => service.id === selectedServiceId) ?? null,
    [selectedServiceId, services]
  );
  const {
    activeMonth,
    availableSlots,
    blockStatus,
    handleChangeScheduleMonth,
    handleSelectScheduleDay,
    hasBlocks,
    hasShiftBlock,
    isLoadingMonthAvailability,
    isLoadingSlots,
    isScheduleDayDisabled,
  } = useInternalScheduleAvailability({
    safeDate,
    initialDate: initialAppointment?.date ?? null,
    selectedDate,
    selectedServiceId,
    selectedServiceAcceptsHomeVisit: Boolean(selectedService?.accepts_home_visit),
    hasLocationChoice,
    isHomeVisit,
    isEditing,
    initialTimeRef,
    selectedTimeRef,
    setSelectedDate,
    setSelectedTime,
  });
  const selectedDateObj = useMemo(
    () => (selectedDate ? parseISO(`${selectedDate}T00:00:00`) : null),
    [selectedDate]
  );
  const selectedServiceBufferMinutes = Math.max(0, Number(selectedService?.custom_buffer_minutes ?? 0));
  const selectedServiceTotalMinutes = (selectedService?.duration_minutes ?? 0) + selectedServiceBufferMinutes;

  useEffect(() => {
    selectedTimeRef.current = selectedTime;
  }, [selectedTime]);

  useEffect(() => {
    setPortalTarget(document.getElementById("app-frame"));
  }, []);

  useEffect(() => {
    setClientRecords(clients);
  }, [clients]);

  useAppointmentClientChangeReset({
    selectedClientId,
    previousClientIdRef,
    setAddressModeAction: setAddressMode,
    setSelectedAddressIdAction: setSelectedAddressId,
    setShowAddressSelectionListAction: setShowAddressSelectionList,
    setAddressConfirmedAction: setAddressConfirmed,
    setIsAddressModalOpenAction: setIsAddressModalOpen,
    setAddressModalStepAction: setAddressModalStep,
    setCepAction: setCep,
    setLogradouroAction: setLogradouro,
    setNumeroAction: setNumero,
    setComplementoAction: setComplemento,
    setBairroAction: setBairro,
    setCidadeAction: setCidade,
    setEstadoAction: setEstado,
    setAddressLabelAction: setAddressLabel,
    setAddressIsPrimaryDraftAction: setAddressIsPrimaryDraft,
    setAddressSaveErrorAction: setAddressSaveError,
    setDisplacementEstimateAction: setDisplacementEstimate,
    setDisplacementStatusAction: setDisplacementStatus,
    setDisplacementErrorAction: setDisplacementError,
  });

  const duplicateCpfClient = useMemo(() => {
    const cpfDigits = normalizeCpfDigits(clientCpf);
    if (cpfDigits.length !== 11) return null;
    return (
      clientRecords.find((client) => {
        if (selectedClientId && client.id === selectedClientId) return false;
        return normalizeCpfDigits(client.cpf ?? null) === cpfDigits;
      }) ?? null
    );
  }, [clientCpf, clientRecords, selectedClientId]);

  const {
    filteredClients,
    exactClientMatch,
    handleSelectClient,
    handleCreateNewClientFromName,
    clearSelectedClient,
    handleSaveClientDraftFromModal,
    handleLinkExistingClientByCpf,
    handleChangeCpfAfterConflict,
  } = useAppointmentClientWorkflow({
    clientName,
    setClientName,
    clientPhone,
    setClientPhone,
    clientCpf,
    setClientCpf,
    clientEmail,
    setClientEmail,
    clientFirstName,
    setClientFirstName,
    clientLastName,
    setClientLastName,
    clientReference,
    setClientReference,
    clientRecords,
    setClientRecords,
    setSelectedClientId,
    setClientSelectionMode,
    setIsClientDropdownOpen,
    setClientCreateError,
    setIsClientCreateModalOpen,
    setIsClientCreateSaving,
    duplicateCpfClient,
    isEditing,
    formRef,
    clientCreateFirstNameInputRef,
    clientPhoneInputRef,
    clientCpfInputRef,
    createClientFromAppointmentDraft,
    showToast,
  });

  const { handleServiceChange, handleClearSelectedService } = useAppointmentServiceSelection({
    services,
    isEditing,
    signalPercentage,
    setSelectedServiceId,
    setPriceOverride,
    setFinanceExtraItems,
    setFinanceNewItemLabel,
    setFinanceNewItemAmount,
    setScheduleDiscountType,
    setScheduleDiscountValue,
    setSelectedDate,
    setSelectedTime,
    setCollectionTimingDraft,
    setChargeNowAmountMode,
    setHasChargeNowAmountModeChoice,
    setChargeNowSignalPercent,
    setChargeNowCustomAmount,
    setChargeNowMethodDraft,
    setChargeNowSignalValueConfirmed,
    setConfirmationSheetStep,
    setChargeBookingState,
    setChargeFlowError,
    setChargeNotificationsDispatched,
    setDisplayedPrice,
    setServicePriceDraft,
    setHasLocationChoice,
    setIsHomeVisit,
    setDisplacementEstimate,
    setDisplacementStatus,
    setDisplacementError,
    setManualDisplacementFee,
  });

  const {
    effectiveDisplacementFee,
    effectiveScheduleDiscount,
    effectiveScheduleDiscountInputValue,
    effectiveSignalPercentageDraft,
    financeDraftItems,
    scheduleSubtotal,
    scheduleTotal,
    chargeNowSuggestedSignalAmount,
    chargeNowDraftAmount,
    chargeNowAmountError,
    createPriceOverrideValue,
    createCheckoutServiceAmountValue,
    isCourtesyDraft,
    createCheckoutExtraItemsJson,
  } = useAppointmentFinance({
    manualDisplacementFee,
    displacementEstimate,
    isHomeVisit,
    servicePriceDraft,
    selectedService,
    scheduleDiscountValue,
    scheduleDiscountType,
    chargeNowCustomAmount,
    financeExtraItems,
    chargeNowMethodDraft,
    chargeNowAmountMode,
    chargeNowSignalPercent,
    collectionTimingDraft,
    isEditing,
  });

  useEffect(() => {
    if (!selectedService) return;
    const basePrice = Number(selectedService.price || 0);
    const fee = effectiveDisplacementFee;
    setDisplayedPrice((basePrice + fee).toFixed(2));
  }, [selectedService, effectiveDisplacementFee]);

  useEffect(() => {
    if (isHomeVisit) return;
    setDisplacementEstimate(null);
    setDisplacementStatus("idle");
    setDisplacementError(null);
    setManualDisplacementFee("");
  }, [isHomeVisit]);

  const selectedClientRecordCpf =
    (selectedClientId ? clientRecords.find((client) => client.id === selectedClientId)?.cpf ?? null : null) ?? null;

  const {
    mapsQuery,
    selectedClientRecord,
    selectedClientNames,
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
    isStep2Unlocked,
    isStep3Unlocked,
    isStep4Unlocked,
    isChargeNowMethodChosen,
    isChargeNowAmountConfirmed,
    canOpenConfirmation,
    selectedAddress,
  } = useAppointmentFormDerivedState({
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
    resolvedClientIdFallback: exactClientMatch?.id ?? null,
  });
  useAppointmentDisplacementEstimate({
    isHomeVisit,
    addressMode,
    selectedAddress,
    addressConfirmed,
    cep,
    logradouro,
    numero,
    complemento,
    bairro,
    cidade,
    estado,
    setDisplacementEstimateAction: setDisplacementEstimate,
    setDisplacementStatusAction: setDisplacementStatus,
    setDisplacementErrorAction: setDisplacementError,
    setManualDisplacementFeeAction: setManualDisplacementFee,
  });

  const finalPrice = priceOverride ? priceOverride : displayedPrice;
  const formAction = isEditing ? updateAppointment : createAppointment;

  const {
    handleCreateChargePixNow,
    handleCopyChargePixCode,
    handleSendChargePixViaWhatsapp,
    handleStartChargeCard,
    handleVerifyChargeCardNow,
    handleBeginImmediateCharge,
    handleSwitchChargeToAttendance,
    handleResolveDeferredManualPrompt,
    handleConfirmationSheetClose,
    handleSchedule,
    handleOpenConfirmationPrompt,
  } = useAppointmentConfirmationFlow({
    formRef,
    sendMessageInputRef,
    sendMessageTextInputRef,
    clientCpfInputRef,
    router,
    safeDate,
    selectedDate,
    selectedTime,
    selectedServiceName: selectedService?.name ?? "",
    isHomeVisit,
    addressLabel,
    clientMessageFirstName,
    messageTemplate: messageTemplates.created_confirmation,
    resolvedClientPhone,
    clientPhone,
    clientPublicFullNamePreview,
    clientName,
    clientEmail,
    clientFirstName,
    selectedClientEmail: selectedClientRecord?.email ?? null,
    selectedClientMessagingFirstName: selectedClientNames?.messagingFirstName ?? "",
    selectedClientRecord,
    clientSelectionMode,
    duplicateCpfClient,
    canOpenConfirmation,
    isLocationChoiceRequired,
    hasLocationChoice,
    chargeNowMethodDraft,
    hasChargeNowAmountModeChoice,
    chargeNowAmountMode,
    chargeNowSignalValueConfirmed,
    chargeNowAmountError,
    chargeNowDraftAmount,
    chargeBookingState,
    confirmationSheetStep,
    chargePixPayment,
    chargePointPayment,
    chargePointAttempt,
    chargeNotificationsDispatched,
    setChargeFlowError,
    setChargePixPayment,
    setChargePixAttempt,
    setChargePixRemainingSeconds,
    setChargePointPayment,
    setChargePointAttempt,
    setCreatingChargeBooking,
    setRunningChargeAction,
    setConfirmationSheetStep,
    setChargeBookingState,
    setChargeNotificationsDispatched,
    setFinishingChargeFlow,
    setIsSendPromptOpen,
    showToast,
  });

  return (
    <form ref={formRef} action={formAction} className="space-y-6">
      <Toast toast={toast} />
      <AppointmentHiddenFields
        isEditing={isEditing}
        appointmentId={initialAppointment?.id}
        returnTo={returnTo}
        resolvedClientId={resolvedClientId}
        clientSelectionMode={clientSelectionMode}
        clientFirstName={clientFirstName}
        clientLastName={clientLastName}
        clientReference={clientReference}
        clientEmail={clientEmail}
        createPriceOverrideValue={createPriceOverrideValue}
        createCheckoutServiceAmountValue={createCheckoutServiceAmountValue}
        effectiveScheduleDiscount={effectiveScheduleDiscount}
        scheduleDiscountType={scheduleDiscountType}
        createCheckoutExtraItemsJson={createCheckoutExtraItemsJson}
        collectionTimingDraft={collectionTimingDraft}
        isCourtesyDraft={isCourtesyDraft}
        isHomeVisit={isHomeVisit}
        selectedAddressId={selectedAddressId}
        addressLabel={addressLabel}
        addressMode={addressMode}
        cep={cep}
        logradouro={logradouro}
        numero={numero}
        complemento={complemento}
        bairro={bairro}
        cidade={cidade}
        estado={estado}
        effectiveDisplacementFee={effectiveDisplacementFee}
        displacementDistanceKm={displacementEstimate?.distanceKm ?? null}
      />
      {!isEditing && <input ref={sendMessageInputRef} type="hidden" name="send_created_message" value="" />}
      {!isEditing && (
        <input ref={sendMessageTextInputRef} type="hidden" name="send_created_message_text" value="" />
      )}
      <AppointmentFormSections
        clientStepProps={{
          sectionCardClass,
          sectionNumberClass,
          sectionHeaderTextClass,
          labelClass,
          inputWithIconClass,
          inputClass,
          isEditing,
          clientName,
          isClientReadOnly,
          isClientDropdownOpen,
          filteredClients: filteredClients.map((client) => ({
            ...client,
            cpf: client.cpf ?? null,
            phone: client.phone ?? null,
          })),
          isClientSelectionPending,
          shouldShowClientContactFields,
          clientPhone,
          isClientPhoneReadOnly: clientSelectionMode === "existing",
          missingWhatsappWarning,
          shouldShowCpfField,
          clientCpf,
          isExistingClientCpfLocked,
          duplicateCpfClient,
          clientPhoneInputRef,
          clientCpfInputRef,
          onFocusClient: () => {
            if (!isEditing && !isClientReadOnly) setIsClientDropdownOpen(true);
          },
          onBlurClient: () => {
            if (isEditing || isClientReadOnly) return;
            window.setTimeout(() => setIsClientDropdownOpen(false), 120);
          },
          onChangeClientName: (value) => {
            if (isClientReadOnly) return;
            setClientName(value);
            if (!isEditing) {
              setSelectedClientId(null);
              setClientSelectionMode("idle");
              setClientPhone("");
              setClientCpf("");
              setClientEmail("");
              setClientFirstName("");
              setClientLastName("");
              setClientReference("");
              setIsClientDropdownOpen(true);
            }
          },
          onClearSelectedClient: clearSelectedClient,
          onSelectClient: handleSelectClient,
          onCreateNewClientFromName: handleCreateNewClientFromName,
          onChangeClientPhone: (value) => setClientPhone(formatBrazilPhone(value)),
          onChangeClientCpf: (value) => setClientCpf(formatCpf(value)),
          onLinkExistingClientByCpf: handleLinkExistingClientByCpf,
          onChangeCpfAfterConflict: handleChangeCpfAfterConflict,
        }}
        showStep2={isStep2Unlocked}
        serviceLocationStepProps={{
          sectionCardClass,
          sectionNumberClass,
          sectionHeaderTextClass,
          labelClass,
          selectClass,
          selectedService,
          selectedServiceId,
          services,
          selectedServiceTotalMinutes,
          displayedPrice,
          canHomeVisit,
          hasLocationChoice,
          isHomeVisit,
          onServiceChange: handleServiceChange,
          onClearSelectedService: handleClearSelectedService,
          onSelectStudioLocation: () => {
            setHasLocationChoice(true);
            setIsHomeVisit(false);
            setDisplacementEstimate(null);
            setDisplacementStatus("idle");
            setDisplacementError(null);
          },
          onSelectHomeVisitLocation: () => {
            setHasLocationChoice(true);
            setIsHomeVisit(true);
            setDisplacementEstimate(null);
            setDisplacementStatus("idle");
            setDisplacementError(null);
          },
        }}
        homeVisitDetailsProps={{
          visible: isHomeVisit && hasLocationChoice,
          clientAddresses,
          addressMode,
          showAddressSelectionList,
          selectedAddressId,
          selectedAddress,
          addressLabel,
          mapsQuery,
          addressConfirmed,
          displacementStatus,
          displacementEstimate,
          displacementError,
          manualDisplacementFee,
          onManualDisplacementFeeChange: setManualDisplacementFee,
          onZeroDisplacementFee: () => setManualDisplacementFee("0,00"),
          onSelectExistingAddress: handleSelectExistingAddress,
          onOpenAddressCreateModal: openAddressCreateModal,
          onShowAddressSelectionList: setShowAddressSelectionList,
        }}
        whenStepProps={{
          visible: isStep3Unlocked,
          isEditing,
          sectionCardClass,
          sectionNumberClass,
          sectionHeaderTextClass,
          labelClass,
          selectedDate,
          selectedDateObj,
          activeMonth,
          onSelectScheduleDay: handleSelectScheduleDay,
          onChangeScheduleMonth: handleChangeScheduleMonth,
          isScheduleDayDisabled,
          isLoadingMonthAvailability,
          blockStatus,
          hasShiftBlock,
          hasBlocks,
          finalPrice,
          priceOverride,
          displayedPrice,
          onPriceOverrideChange: setPriceOverride,
          selectedServiceId,
          isLoadingSlots,
          availableSlots,
          selectedTime,
          onSelectTime: setSelectedTime,
        }}
        showFinanceStep={!isEditing && isStep4Unlocked}
        financeStepProps={{
          sectionCardClass,
          sectionNumberClass,
          sectionHeaderTextClass,
          financeDraftItems,
          financeExtraItems,
          displacementEstimate,
          scheduleSubtotal,
          effectiveScheduleDiscount,
          scheduleDiscountType,
          effectiveScheduleDiscountInputValue,
          scheduleTotal,
          financeNewItemLabel,
          financeNewItemAmount,
          onChangeFinanceNewItemLabel: setFinanceNewItemLabel,
          onChangeFinanceNewItemAmount: setFinanceNewItemAmount,
          onAddFinanceItem: handleAddFinanceItem,
          onRemoveFinanceItem: handleRemoveFinanceItem,
          scheduleDiscountValue,
          onChangeScheduleDiscountType: setScheduleDiscountType,
          onChangeScheduleDiscountValue: setScheduleDiscountValue,
          collectionTimingDraft,
          onChangeCollectionTiming: setCollectionTimingDraft,
          chargeNowMethodDraft,
          onChangeChargeNowMethod: setChargeNowMethodDraft,
          chargeNowAmountMode,
          hasChargeNowAmountModeChoice,
          onChangeChargeNowAmountMode: (value) => {
            setChargeNowAmountMode(value);
            setHasChargeNowAmountModeChoice(true);
          },
          effectiveSignalPercentageDraft,
          chargeNowSuggestedSignalAmount,
          chargeNowCustomAmount,
          onChangeChargeNowCustomAmount: setChargeNowCustomAmount,
          chargeNowAmountError,
          chargeNowDraftAmount,
          chargeNowSignalValueConfirmed,
          onConfirmSignalValue: () => setChargeNowSignalValueConfirmed(true),
          onResetSignalValueConfirmation: () => setChargeNowSignalValueConfirmed(false),
          onClearChargeFlowError: () => setChargeFlowError(null),
        }}
        overlaysProps={{
          clientCreateModalProps: {
            portalTarget,
            open: isClientCreateModalOpen,
            saving: isClientCreateSaving,
            error: clientCreateError,
            labelClass,
            inputClass,
            inputWithIconClass,
            firstNameInputRef: clientCreateFirstNameInputRef,
            phoneInputRef: clientPhoneInputRef,
            cpfInputRef: clientCpfInputRef,
            firstName: clientFirstName,
            lastName: clientLastName,
            reference: clientReference,
            internalPreview: clientDraftInternalPreview,
            publicPreview: clientDraftPublicPreview,
            phone: clientPhone,
            email: clientEmail,
            cpf: clientCpf,
            showInvalidEmailHint: clientEmail.trim().length > 0 && !isValidEmailAddress(clientEmail),
            onClose: () => setIsClientCreateModalOpen(false),
            onFirstNameChange: (value) => {
              setClientFirstName(value);
              setClientCreateError(null);
            },
            onLastNameChange: (value) => {
              setClientLastName(value);
              setClientCreateError(null);
            },
            onReferenceChange: (value) => {
              setClientReference(value);
              setClientCreateError(null);
            },
            onPhoneChange: (value) => {
              setClientPhone(formatBrazilPhone(value));
              setClientCreateError(null);
            },
            onEmailChange: (value) => {
              setClientEmail(value);
              setClientCreateError(null);
            },
            onCpfChange: (value) => {
              setClientCpf(formatCpf(value));
              setClientCreateError(null);
            },
            onSave: () => void handleSaveClientDraftFromModal(),
          },
          addressCreateModalProps: {
            portalTarget,
            open: isAddressModalOpen,
            step: addressModalStep,
            resolvedClientId,
            labelClass,
            inputClass,
            inputWithIconClass,
            addressSaveError,
            addressLabel,
            onAddressLabelChange: setAddressLabel,
            clientAddressesCount: clientAddresses.length,
            addressIsPrimaryDraft,
            onAddressIsPrimaryDraftChange: setAddressIsPrimaryDraft,
            cep,
            onCepChange: (value) => setCep(formatCep(value)),
            logradouro,
            onLogradouroChange: setLogradouro,
            numero,
            onNumeroChange: setNumero,
            complemento,
            onComplementoChange: setComplemento,
            bairro,
            onBairroChange: setBairro,
            cidade,
            onCidadeChange: setCidade,
            estado,
            onEstadoChange: (value) => setEstado(value.toUpperCase()),
            addressSavePending,
            cepDraft,
            cepDraftStatus,
            onCepDraftChange: (value) => {
              setCepDraft(formatCep(value));
              setCepDraftStatus("idle");
            },
            onCepDraftLookup: handleCepDraftLookup,
            onApplyAddressDraftFields: applyAddressDraftFields,
            addressSearchQuery,
            onAddressSearchQueryChange: setAddressSearchQuery,
            addressSearchResults,
            addressSearchLoading,
            addressSearchError,
            onSelectAddressSearchResult: handleAddressSearchResultSelect,
            onClose: closeAddressCreateModal,
            onBackToChooser: () => {
              setAddressModalStep("chooser");
              setAddressSaveError(null);
            },
            onOpenCepStep: () => {
              setAddressModalStep("cep");
              setCepDraft("");
              setCepDraftStatus("idle");
              setAddressSaveError(null);
            },
            onOpenSearchStep: () => {
              setAddressModalStep("search");
              setAddressSearchQuery("");
              setAddressSearchResults([]);
              setAddressSearchLoading(false);
              setAddressSearchError(null);
              setAddressSaveError(null);
            },
            onOpenFormStep: () => setAddressModalStep("form"),
            onSave: () => handleAddressModalSave(resolvedClientId),
          },
          confirmationSheetProps: {
            portalTarget,
            open: isSendPromptOpen,
            step: confirmationSheetStep,
            chargeFlowError,
            chargeBookingState,
            chargeNowMethodDraft,
            chargeNowDraftAmount,
            chargePixPayment,
            chargePixAttempt,
            runningChargeAction,
            chargePixRemainingSeconds,
            pointEnabled,
            pointTerminalName,
            pointTerminalModel,
            chargePointPayment,
            finishingChargeFlow,
            clientDisplayPreviewLabel,
            selectedServiceName: selectedService?.name ?? null,
            selectedDate,
            selectedTime,
            isHomeVisit,
            addressLabel,
            financeDraftItems,
            scheduleSubtotal,
            effectiveScheduleDiscount,
            scheduleDiscountType,
            effectiveScheduleDiscountInputValue,
            collectionTimingDraft,
            scheduleTotal,
            isChargeNowMethodChosen,
            isChargeNowAmountConfirmed,
            chargeNowAmountError,
            creatingChargeBooking,
            isCourtesyDraft,
            formatCountdown,
            onClose: handleConfirmationSheetClose,
            onCreateChargePixNow: (attempt) => handleCreateChargePixNow(attempt),
            onCopyChargePixCode: handleCopyChargePixCode,
            onSendChargePixViaWhatsapp: handleSendChargePixViaWhatsapp,
            onStartChargeCard: (mode) => handleStartChargeCard(mode),
            onVerifyChargeCardNow: handleVerifyChargeCardNow,
            onSwitchChargeToAttendance: handleSwitchChargeToAttendance,
            onClearChargeFlowError: () => setChargeFlowError(null),
            onResolveDeferredManualPrompt: handleResolveDeferredManualPrompt,
            onBeginImmediateCharge: handleBeginImmediateCharge,
            onSchedule: handleSchedule,
          },
        }}
        notesAndSubmitProps={{
          showNotes: isEditing || isStep4Unlocked,
          showSubmit: isStep4Unlocked,
          isEditing,
          sectionCardClass,
          labelClass,
          inputClass,
          internalNotes,
          onChangeInternalNotes: setInternalNotes,
          canOpenConfirmation,
          onOpenConfirmationPrompt: handleOpenConfirmationPrompt,
        }}
      />
    </form>
  );
}
