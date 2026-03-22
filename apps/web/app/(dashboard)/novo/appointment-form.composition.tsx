"use client";

import { format, parseISO } from "date-fns";
import { ChevronLeft } from "lucide-react";
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
} from "./appointment-actions"; // Acao importada do arquivo renomeado
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
const CREATE_FLOW_STEPS = ["client", "service", "agenda", "finance"] as const;
type CreateFlowStep = (typeof CREATE_FLOW_STEPS)[number];

export function AppointmentForm({
  services,
  clients,
  safeDate,
  initialAppointment,
  prefilledClient,
  returnTo,
  signalPercentage,
  pointEnabled,
  pointTerminalName,
  pointTerminalModel,
}: AppointmentFormProps) {
  const router = useRouter();
  const isEditing = Boolean(initialAppointment);
  const resolvedPrefilledClient = !initialAppointment ? prefilledClient ?? null : null;
  const initialSelectedClientId = initialAppointment?.clientId ?? resolvedPrefilledClient?.id ?? null;
  const initialClientName = initialAppointment?.clientName ?? resolvedPrefilledClient?.name ?? "";
  const initialClientPhone =
    initialAppointment?.clientPhone ?? resolvedPrefilledClient?.phone ?? null;
  const initialClientEmail = resolvedPrefilledClient?.email?.trim().toLowerCase() ?? "";
  const initialClientCpf = resolvedPrefilledClient?.cpf ?? "";
  const initialClientFirstName = resolvedPrefilledClient?.public_first_name ?? "";
  const initialClientLastName = resolvedPrefilledClient?.public_last_name ?? "";
  const initialClientReference = resolvedPrefilledClient?.internal_reference ?? "";
  const formRef = useRef<HTMLFormElement | null>(null);
  const clientPhoneInputRef = useRef<HTMLInputElement | null>(null);
  const clientCpfInputRef = useRef<HTMLInputElement | null>(null);
  const clientCreateFirstNameInputRef = useRef<HTMLInputElement | null>(null);
  const [isSendPromptOpen, setIsSendPromptOpen] = useState(false);
  const [activeCreateStep, setActiveCreateStep] = useState<CreateFlowStep>("client");
  const initialTimeRef = useRef(initialAppointment?.time ?? "");
  const selectedTimeRef = useRef(initialAppointment?.time ?? "");
  const previousClientIdRef = useRef<string | null>(initialSelectedClientId);
  const [isFooterSummaryExpanded, setIsFooterSummaryExpanded] = useState(false);

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
  const [selectedClientId, setSelectedClientId] = useState<string | null>(initialSelectedClientId);
  const [clientSelectionMode, setClientSelectionMode] = useState<ClientSelectionMode>(
    initialSelectedClientId ? "existing" : "idle"
  );
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [clientName, setClientName] = useState(initialClientName);
  const [clientPhone, setClientPhone] = useState(
    initialClientPhone ? formatBrazilPhone(initialClientPhone) : ""
  );
  const [clientCpf, setClientCpf] = useState(initialClientCpf ? formatCpf(initialClientCpf) : "");
  const [clientEmail, setClientEmail] = useState(initialClientEmail);
  const [clientFirstName, setClientFirstName] = useState(initialClientFirstName);
  const [clientLastName, setClientLastName] = useState(initialClientLastName);
  const [clientReference, setClientReference] = useState(initialClientReference);
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
    handleConfirmManualCharge,
    handleOpenCheckoutAfterConfirmation,
    handleSwitchChargeToAttendance,
    handleConfirmationSheetClose,
    handleSchedule,
    handleOpenConfirmationPrompt,
  } = useAppointmentConfirmationFlow({
    formRef,
    clientCpfInputRef,
    router,
    safeDate,
    selectedDate,
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

  const createStepLabelMap: Record<CreateFlowStep, string> = {
    client: "Cliente",
    service: "Servico",
    agenda: "Agenda",
    finance: "Financeiro",
  };
  const activeCreateStepIndex = CREATE_FLOW_STEPS.indexOf(activeCreateStep);
  const canAdvanceFromCreateStep =
    activeCreateStep === "client"
      ? isStep2Unlocked
      : activeCreateStep === "service"
        ? isStep3Unlocked
          : activeCreateStep === "agenda"
            ? isStep4Unlocked
            : activeCreateStep === "finance"
              ? canOpenConfirmation
              : true;

  const handleBackCreateStep = () => {
    if (activeCreateStepIndex <= 0) return;
    const previousStep = CREATE_FLOW_STEPS[activeCreateStepIndex - 1];
    if (previousStep) setActiveCreateStep(previousStep);
  };

  const handleAdvanceCreateStep = () => {
    if (!canAdvanceFromCreateStep) {
      const message =
        activeCreateStep === "client"
          ? "Selecione um cliente antes de continuar."
          : activeCreateStep === "service"
            ? "Defina servico, local e endereco para continuar."
            : activeCreateStep === "agenda"
              ? "Selecione data e horario para continuar."
              : "Finalize os dados financeiros para confirmar o agendamento.";
      showToast({
        title: "Novo agendamento",
        message,
        tone: "warning",
        durationMs: 2600,
      });
      return;
    }
    const nextStep = CREATE_FLOW_STEPS[activeCreateStepIndex + 1];
    if (nextStep) setActiveCreateStep(nextStep);
  };

  const handleCreatePrimaryAction = () => {
    if (activeCreateStep !== "finance") {
      handleAdvanceCreateStep();
      return;
    }
    if (collectionTimingDraft === "charge_now" && chargeNowMethodDraft !== "waiver") {
      void handleOpenCheckoutAfterConfirmation();
      return;
    }
    handleSchedule();
  };

  const handleOpenFooterReview = () => {
    if (!canOpenConfirmation) {
      showToast({
        title: "Novo agendamento",
        message: "Finalize os dados financeiros para revisar e confirmar.",
        tone: "warning",
        durationMs: 2600,
      });
      return;
    }
    setIsFooterSummaryExpanded(true);
  };

  useEffect(() => {
    if (activeCreateStep !== "finance" && isFooterSummaryExpanded) {
      setIsFooterSummaryExpanded(false);
    }
  }, [activeCreateStep, isFooterSummaryExpanded]);

  return (
    <form ref={formRef} action={formAction} className={isEditing ? "space-y-6" : "flex h-full min-h-0 flex-col"}>
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

      {!isEditing ? (
        <header className="z-30 -mx-6 bg-studio-green text-white safe-top safe-top-6 px-6 pb-0 pt-5">
          <div className="mb-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push(returnTo ?? "/")}
              className="wl-header-icon-button-strong inline-flex h-9 w-9 items-center justify-center rounded-full transition"
              aria-label="Voltar"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h1 className="wl-typo-card-name-md text-white font-bold">Agendamento Interno</h1>
          </div>

          <div className="border-b border-white/25 pb-0.5">
            <div className="no-scrollbar flex items-center gap-6 overflow-x-auto">
              {CREATE_FLOW_STEPS.map((step) => {
                const isActive = activeCreateStep === step;
                return (
                  <button
                    key={step}
                    type="button"
                    onClick={() => setActiveCreateStep(step)}
                    className={`relative pb-2 text-[13px] font-semibold transition-colors ${
                      isActive ? "text-white" : "text-white/75 hover:text-white"
                    }`}
                  >
                    {createStepLabelMap[step]}
                    <span
                      className={`absolute inset-x-0 -bottom-px h-0.5 bg-white transition-opacity ${
                        isActive ? "opacity-100" : "opacity-0"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </header>
      ) : null}

      <div className={isEditing ? "space-y-6" : "min-h-0 flex-1 space-y-4 overflow-y-auto pb-6 pt-4"}>
      <AppointmentFormSections
        showClientStep={isEditing || activeCreateStep === "client"}
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
          clientEmail,
          clientReference,
          isClientPhoneReadOnly: clientSelectionMode === "existing",
          missingWhatsappWarning,
          shouldShowCpfField,
          clientCpf,
          isExistingClientCpfLocked,
          duplicateCpfClient,
          clientPhoneInputRef,
          clientCpfInputRef,
          onFocusClientAction: () => {
            if (!isEditing && !isClientReadOnly) setIsClientDropdownOpen(true);
          },
          onBlurClientAction: () => {
            if (isEditing || isClientReadOnly) return;
            window.setTimeout(() => setIsClientDropdownOpen(false), 120);
          },
          onChangeClientNameAction: (value) => {
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
          onClearSelectedClientAction: clearSelectedClient,
          onSelectClientAction: handleSelectClient,
          onCreateNewClientFromNameAction: handleCreateNewClientFromName,
          onChangeClientPhoneAction: (value) => setClientPhone(formatBrazilPhone(value)),
          onChangeClientCpfAction: (value) => setClientCpf(formatCpf(value)),
          onLinkExistingClientByCpfAction: handleLinkExistingClientByCpf,
          onChangeCpfAfterConflictAction: handleChangeCpfAfterConflict,
        }}
        showStep2={isEditing ? isStep2Unlocked : activeCreateStep === "service" && isStep2Unlocked}
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
          onServiceChangeAction: handleServiceChange,
          onClearSelectedServiceAction: handleClearSelectedService,
          onSelectStudioLocationAction: () => {
            setHasLocationChoice(true);
            setIsHomeVisit(false);
            setDisplacementEstimate(null);
            setDisplacementStatus("idle");
            setDisplacementError(null);
          },
          onSelectHomeVisitLocationAction: () => {
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
          onManualDisplacementFeeChangeAction: setManualDisplacementFee,
          onZeroDisplacementFeeAction: () => setManualDisplacementFee("0,00"),
          onSelectExistingAddressAction: handleSelectExistingAddress,
          onOpenAddressCreateModalAction: openAddressCreateModal,
          onShowAddressSelectionListAction: setShowAddressSelectionList,
        }}
        whenStepProps={{
          visible: isEditing ? isStep3Unlocked : activeCreateStep === "agenda" && isStep3Unlocked,
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
        showFinanceStep={!isEditing && activeCreateStep === "finance" && isStep4Unlocked}
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
            onCloseAction: () => setIsClientCreateModalOpen(false),
            onFirstNameChangeAction: (value) => {
              setClientFirstName(value);
              setClientCreateError(null);
            },
            onLastNameChangeAction: (value) => {
              setClientLastName(value);
              setClientCreateError(null);
            },
            onReferenceChangeAction: (value) => {
              setClientReference(value);
              setClientCreateError(null);
            },
            onPhoneChangeAction: (value) => {
              setClientPhone(formatBrazilPhone(value));
              setClientCreateError(null);
            },
            onEmailChangeAction: (value) => {
              setClientEmail(value);
              setClientCreateError(null);
            },
            onCpfChangeAction: (value) => {
              setClientCpf(formatCpf(value));
              setClientCreateError(null);
            },
            onSaveAction: () => void handleSaveClientDraftFromModal(),
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
            formatCountdownAction: formatCountdown,
            onCloseAction: handleConfirmationSheetClose,
            onCreateChargePixNowAction: (attempt) => handleCreateChargePixNow(attempt),
            onCopyChargePixCodeAction: handleCopyChargePixCode,
            onSendChargePixViaWhatsappAction: handleSendChargePixViaWhatsapp,
            onStartChargeCardAction: (mode) => handleStartChargeCard(mode),
            onVerifyChargeCardNowAction: handleVerifyChargeCardNow,
            onSwitchChargeToAttendanceAction: handleSwitchChargeToAttendance,
            onEditPaymentAction: () => {
              setIsSendPromptOpen(false);
              setConfirmationSheetStep("review");
              setChargeFlowError(null);
              setChargePixPayment(null);
              setChargePointPayment(null);
              setActiveCreateStep("finance");
            },
            onConfirmManualChargeAction: handleConfirmManualCharge,
            onClearChargeFlowErrorAction: () => setChargeFlowError(null),
            onBeginImmediateChargeAction: handleBeginImmediateCharge,
            onScheduleAction: handleSchedule,
          },
        }}
        notesAndSubmitProps={{
          showNotes: isEditing || activeCreateStep === "finance",
          showSubmit: isEditing ? isStep4Unlocked : false,
          isEditing,
          sectionCardClass,
          sectionNumberClass,
          sectionHeaderTextClass,
          inputClass,
          internalNotes,
          onChangeInternalNotesAction: setInternalNotes,
          canOpenConfirmation,
          onOpenConfirmationPromptAction: handleOpenConfirmationPrompt,
        }}
      />

      {!isEditing && activeCreateStep === "service" && !isStep2Unlocked ? (
        <section className={`${sectionCardClass} overflow-hidden`}>
          <div className="flex h-11 items-center gap-2 border-b border-line px-3 wl-surface-card-header">
            <h2 className={`${sectionHeaderTextClass} leading-none`}>Servico e local</h2>
          </div>
          <div className="px-4 py-4 wl-surface-card-body">
            <p className="text-sm text-muted">Selecione um cliente para liberar esta etapa.</p>
          </div>
        </section>
      ) : null}

      {!isEditing && activeCreateStep === "agenda" && !isStep3Unlocked ? (
        <section className={`${sectionCardClass} overflow-hidden`}>
          <div className="flex h-11 items-center gap-2 border-b border-line px-3 wl-surface-card-header">
            <h2 className={`${sectionHeaderTextClass} leading-none`}>Dia</h2>
          </div>
          <div className="px-4 py-4 wl-surface-card-body">
            <p className="text-sm text-muted">
              Defina servico, local e endereco confirmado (quando for domicilio) para liberar o dia.
            </p>
          </div>
        </section>
      ) : null}

      {!isEditing && activeCreateStep === "finance" && !isStep4Unlocked ? (
        <section className={`${sectionCardClass} overflow-hidden`}>
          <div className="flex h-11 items-center gap-2 border-b border-line px-3 wl-surface-card-header">
            <h2 className={`${sectionHeaderTextClass} leading-none`}>Financeiro</h2>
          </div>
          <div className="px-4 py-4 wl-surface-card-body">
            <p className="text-sm text-muted">Selecione data e horario antes de configurar financeiro.</p>
          </div>
        </section>
      ) : null}

      </div>

      {!isEditing ? (
        <div className="shrink-0 -mx-6 border-t border-line bg-[rgba(247,242,234,0.96)] px-6 pb-3 pt-3 safe-bottom">
          <div className="mb-2 flex items-center justify-end">
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-[0.12em] text-muted">Total</div>
              <div className="mt-1 text-[16px] font-semibold text-studio-text">
                R$ {scheduleTotal.toFixed(2).replace(".", ",")}
              </div>
            </div>
          </div>
          <div
            id="novo-agendamento-resumo-expandido"
            className={`overflow-hidden transition-[max-height,opacity,margin] duration-300 ease-out ${
              isFooterSummaryExpanded ? "mb-3 max-h-72 opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="space-y-2 rounded-xl border border-line bg-white/70 px-3 py-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted">Cliente</span>
                <span className="font-semibold text-studio-text">{clientDisplayPreviewLabel || "Cliente"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted">Servico</span>
                <span className="font-semibold text-studio-text">{selectedService?.name || "--"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted">Dia</span>
                <span className="font-semibold text-studio-text">
                  {selectedDate ? format(parseISO(`${selectedDate}T00:00:00`), "dd/MM/yyyy") : "--"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted">Horario</span>
                <span className="font-semibold text-studio-text">{selectedTime || "--:--"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted">Local</span>
                <span className="font-semibold text-studio-text">
                  {isHomeVisit ? `Domicilio${addressLabel ? ` - ${addressLabel}` : ""}` : "Estudio"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-line pt-2">
                <span className="text-muted">Cobranca</span>
                <span className="font-semibold text-studio-text">
                  {collectionTimingDraft === "charge_now" ? "No agendamento" : "No atendimento"}
                </span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-[auto_1fr] gap-3">
            <button
              type="button"
              onClick={handleBackCreateStep}
              disabled={activeCreateStepIndex <= 0}
              className={`h-12 rounded-[18px] border border-line px-4 text-[13px] font-semibold ${
                activeCreateStepIndex <= 0 ? "bg-stone-200 text-stone-500" : "bg-white text-studio-text"
              }`}
            >
              Voltar
            </button>
            {activeCreateStep === "finance" && !isFooterSummaryExpanded ? (
              <button
                type="button"
                onClick={handleOpenFooterReview}
                className="h-12 rounded-[18px] bg-studio-green px-5 text-[13px] font-semibold text-white shadow-[0_10px_22px_-14px_rgba(11,28,19,.6)]"
              >
                Revisar
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCreatePrimaryAction}
                className="h-12 rounded-[18px] bg-studio-green px-5 text-[13px] font-semibold text-white shadow-[0_10px_22px_-14px_rgba(11,28,19,.6)]"
              >
                {activeCreateStep === "finance"
                  ? collectionTimingDraft === "charge_now" && chargeNowMethodDraft !== "waiver"
                    ? "Confirmar e abrir checkout"
                    : isCourtesyDraft
                      ? "Confirmar e agendar cortesia"
                      : "Confirmar e agendar"
                  : "Continuar"}
              </button>
            )}
          </div>
        </div>
      ) : null}
    </form>
  );
}
