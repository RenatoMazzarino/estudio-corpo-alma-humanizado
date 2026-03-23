"use client";

import { parseISO } from "date-fns";
import { CheckCircle2, ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { FooterRail } from "../../../components/ui/footer-rail";
import { BlockingOverlay } from "../../../components/ui/loading-system";
import { AppointmentFormSections } from "./components/appointment-form-sections";
import { AppointmentHiddenFields } from "./components/appointment-hidden-fields";
import {
  appointmentFormButtonPrimaryClass as buttonPrimaryClass,
  appointmentFormButtonSecondaryClass as buttonSecondaryClass,
  appointmentFormHeaderIconButtonClass as headerIconButtonClass,
  appointmentFormInputClass as inputClass,
  appointmentFormInputWithIconClass as inputWithIconClass,
  appointmentFormLabelClass as labelClass,
  appointmentFormSectionCardClass as sectionCardClass,
  appointmentFormSectionHeaderPrimaryClass as sectionHeaderPrimaryClass,
  appointmentFormSectionHeaderTextClass as sectionHeaderTextClass,
  appointmentFormSectionNumberClass as sectionNumberClass,
  appointmentFormScreenHeaderClass as screenHeaderClass,
  appointmentFormScreenHeaderTabsClass as screenHeaderTabsClass,
  appointmentFormScreenHeaderTopRowClass as screenHeaderTopRowClass,
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
import { formatBrazilPhone } from "../../../src/shared/phone";
import type {
  AppointmentFormProps,
  ClientRecordLite,
  ClientSelectionMode,
  DisplacementEstimate,
} from "./appointment-form.types";

const CREATE_FLOW_STEPS = ["client", "service", "agenda", "finance"] as const;
type CreateFlowStep = (typeof CREATE_FLOW_STEPS)[number];

type BookingSuccessState = {
  appointmentId: string;
  attendanceCode: string | null;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  clientCpf: string;
  serviceName: string;
  date: string;
  time: string;
  isHomeVisit: boolean;
  addressLabel: string;
  notes: string;
  subtotal: number;
  discount: number;
  discountType: "value" | "pct";
  discountInput: string | number;
  total: number;
  chargeTiming: "at_attendance" | "charge_now";
  chargeMethod: "cash" | "pix_mp" | "card" | "waiver" | null;
  chargeNowAmount: number;
  items: Array<{ id: string; label: string; qty: number; amount: number }>;
};

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
  const [bookingSuccessState, setBookingSuccessState] = useState<BookingSuccessState | null>(null);
  const [isRouteTransitionLoading, setIsRouteTransitionLoading] = useState(false);
  const contentScrollRef = useRef<HTMLDivElement | null>(null);
  const initialTimeRef = useRef(initialAppointment?.time ?? "");
  const selectedTimeRef = useRef(initialAppointment?.time ?? "");
  const previousClientIdRef = useRef<string | null>(initialSelectedClientId);

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
    checkScheduleDayBlockStatus,
    handleChangeScheduleMonth,
    handleSelectScheduleDay,
    hasBlocks,
    hasSelectedTimeBlock,
    hasShiftBlock,
    isLoadingMonthAvailability,
    isLoadingSlots,
    isScheduleDayDisabled,
    monthCalendarOverview,
    selectedDateBlockTitle,
  } = useInternalScheduleAvailability({
    safeDate,
    initialDate: initialAppointment?.date ?? null,
    selectedDate,
    selectedTime,
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
    handleVerifyChargePixNow,
    handleBeginImmediateCharge,
    handleConfirmManualCharge,
    handleOpenCheckoutAfterConfirmation,
    handleSwitchChargeToAttendance,
    handleCancelChargeBooking,
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
    onBookingSuccessAction: ({ appointmentId, attendanceCode }) => {
      setBookingSuccessState({
        appointmentId,
        attendanceCode,
        clientName: clientDisplayPreviewLabel || clientName || "Cliente",
        clientPhone: resolvedClientPhone || clientPhone || "--",
        clientEmail: selectedClientRecord?.email?.trim() || clientEmail.trim() || "--",
        clientCpf: clientCpf || "--",
        serviceName: selectedService?.name || "Servico nao informado",
        date: selectedDate || safeDate,
        time: selectedTime || "--:--",
        isHomeVisit,
        addressLabel: addressLabel || "",
        notes: internalNotes.trim(),
        subtotal: scheduleSubtotal,
        discount: effectiveScheduleDiscount,
        discountType: scheduleDiscountType,
        discountInput: effectiveScheduleDiscountInputValue,
        total: scheduleTotal,
        chargeTiming: collectionTimingDraft === "charge_now" ? "charge_now" : "at_attendance",
        chargeMethod: chargeNowMethodDraft,
        chargeNowAmount: chargeNowDraftAmount,
        items: financeDraftItems.map((item, index) => ({
          id: `${item.type}-${item.label}-${index}`,
          label: item.label,
          qty: item.qty,
          amount: item.amount,
        })),
      });
      setActiveCreateStep("finance");
      setIsSendPromptOpen(false);
      setConfirmationSheetStep("review");
      setChargeFlowError(null);
    },
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

  const handleViewAgendaFromSuccess = () => {
    if (!bookingSuccessState) return;
    const dateParam = bookingSuccessState.date || safeDate;
    setIsRouteTransitionLoading(true);
    window.setTimeout(() => setIsRouteTransitionLoading(false), 6000);
    router.push(
      `/?view=day&date=${encodeURIComponent(dateParam)}&focusAppointment=${encodeURIComponent(
        bookingSuccessState.appointmentId
      )}`
    );
  };

  const handleCreateAnotherFromSuccess = () => {
    setBookingSuccessState(null);
    setIsSendPromptOpen(false);
    setChargeFlowError(null);
    setConfirmationSheetStep("review");
    setChargeBookingState(null);
    setChargePixPayment(null);
    setChargePointPayment(null);
    setActiveCreateStep("client");
    router.push(`/novo?fresh=${Date.now()}`);
  };

  useEffect(() => {
    if (!bookingSuccessState) return;
    window.scrollTo({ top: 0, behavior: "auto" });
    const shellScroll = document.querySelector("[data-shell-scroll]") as HTMLElement | null;
    shellScroll?.scrollTo({ top: 0, behavior: "auto" });
    contentScrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [bookingSuccessState]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className={isEditing ? "relative space-y-6" : "relative flex h-full min-h-0 flex-col"}
    >
      <Toast toast={toast} />
      <AppointmentHiddenFields
        isEditing={isEditing}
        appointmentId={initialAppointment?.id}
        returnTo={returnTo}
        clientName={clientName}
        clientPhone={clientPhone}
        selectedServiceId={selectedServiceId}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
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
        <header className={screenHeaderClass}>
          <div className={screenHeaderTopRowClass}>
            <button
              type="button"
              onClick={() => router.push(returnTo ?? "/")}
              className={headerIconButtonClass}
              aria-label="Voltar"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h1 className="wl-typo-card-name-lg text-white font-bold">Agendamento Interno</h1>
          </div>

          <div
            className={`${screenHeaderTabsClass} ${
              bookingSuccessState ? "pointer-events-none opacity-85" : ""
            }`}
          >
            <div className="no-scrollbar flex items-center gap-6 overflow-x-auto">
              {CREATE_FLOW_STEPS.map((step) => {
                const isDisabled = Boolean(bookingSuccessState);
                const isActive = !isDisabled && activeCreateStep === step;
                return (
                  <button
                    key={step}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => setActiveCreateStep(step)}
                    className={`relative pb-2 text-[13px] font-semibold transition-colors ${
                      isDisabled
                        ? "cursor-not-allowed text-white/45"
                        : isActive
                          ? "text-white"
                          : "text-white/75 hover:text-white"
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

      <div
        ref={contentScrollRef}
        className={isEditing ? "space-y-6" : "min-h-0 flex-1 space-y-4 overflow-y-auto pb-6 pt-4"}
      >
      {bookingSuccessState ? (
        <section className="space-y-4 pt-10">
          <div className="px-2 pt-4 text-center">
            <div
              className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-studio-green"
              style={{ animation: "bounce 0.8s ease-out 1" }}
            >
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <p className="wl-typo-card-name-md text-studio-text">Agendamento realizado com sucesso.</p>
            <p className="mt-1 text-xs text-muted">Revise os dados e siga para a agenda.</p>
          </div>

          <div className={`${sectionCardClass} overflow-hidden`}>
            <div className={sectionHeaderPrimaryClass}>
              <h2 className={`${sectionHeaderTextClass} leading-none`}>Resumo do agendamento</h2>
            </div>
            <div className="wl-surface-card-body divide-y divide-line text-sm">
              <div className="grid grid-cols-[1fr_auto] gap-3 px-4 py-3">
                <span className="text-muted">Codigo</span>
                <span className="font-semibold text-studio-text">
                  {bookingSuccessState.attendanceCode || bookingSuccessState.appointmentId}
                </span>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-3 px-4 py-3">
                <span className="text-muted">Cliente</span>
                <span className="text-right font-semibold text-studio-text">{bookingSuccessState.clientName}</span>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-3 px-4 py-3">
                <span className="text-muted">Servico</span>
                <span className="text-right font-semibold text-studio-text">{bookingSuccessState.serviceName}</span>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-3 px-4 py-3">
                <span className="text-muted">Quando</span>
                <span className="font-semibold text-studio-text">
                  {bookingSuccessState.date} - {bookingSuccessState.time}
                </span>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-3 px-4 py-3">
                <span className="text-muted">Local</span>
                <span className="font-semibold text-studio-text">
                  {bookingSuccessState.isHomeVisit ? "Domicilio" : "Estudio"}
                </span>
              </div>
              {bookingSuccessState.isHomeVisit && bookingSuccessState.addressLabel ? (
                <div className="grid grid-cols-[1fr_auto] gap-3 px-4 py-3">
                  <span className="text-muted">Endereco</span>
                  <span className="text-right font-semibold text-studio-text">{bookingSuccessState.addressLabel}</span>
                </div>
              ) : null}
              {bookingSuccessState.notes ? (
                <div className="px-4 py-3">
                  <p className="text-muted">Observacao</p>
                  <p className="mt-1 font-semibold text-studio-text">{bookingSuccessState.notes}</p>
                </div>
              ) : null}
              {bookingSuccessState.discount > 0 ? (
                <div className="grid grid-cols-[1fr_auto] gap-3 px-4 py-3">
                  <span className="text-muted">
                    Desconto
                    {bookingSuccessState.discountType === "pct"
                      ? ` (${String(bookingSuccessState.discountInput)}%)`
                      : ""}
                  </span>
                  <span className="font-semibold text-studio-text">
                    - R$ {bookingSuccessState.discount.toFixed(2).replace(".", ",")}
                  </span>
                </div>
              ) : null}
              <div className="grid grid-cols-[1fr_auto] gap-3 px-4 py-3">
                <span className="text-muted">Total</span>
                <span className="font-bold text-studio-text">
                  R$ {bookingSuccessState.total.toFixed(2).replace(".", ",")}
                </span>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-3 px-4 py-3">
                <span className="text-muted">Cobranca</span>
                <span className="font-semibold text-studio-text">
                  {bookingSuccessState.chargeTiming === "charge_now" ? "No agendamento" : "No atendimento"}
                </span>
              </div>
              {bookingSuccessState.chargeTiming === "charge_now" ? (
                <>
                  <div className="grid grid-cols-[1fr_auto] gap-3 px-4 py-3">
                    <span className="text-muted">Forma</span>
                    <span className="font-semibold text-studio-text">
                      {bookingSuccessState.chargeMethod === "pix_mp"
                        ? "Pix"
                        : bookingSuccessState.chargeMethod === "card"
                          ? "Cartao"
                          : bookingSuccessState.chargeMethod === "cash"
                            ? "Dinheiro"
                            : bookingSuccessState.chargeMethod === "waiver"
                              ? "Cortesia"
                              : "--"}
                    </span>
                  </div>
                  <div className="grid grid-cols-[1fr_auto] gap-3 px-4 py-3">
                    <span className="text-muted">Valor cobrado agora</span>
                    <span className="font-semibold text-studio-text">
                      R$ {bookingSuccessState.chargeNowAmount.toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </section>
      ) : (
      <>
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
          monthCalendarOverview,
          selectedDateBlockTitle,
          onCheckScheduleDayBlockStatus: checkScheduleDayBlockStatus,
          hasSelectedTimeBlock,
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
            onCloseAction: handleConfirmationSheetClose,
            onBackToFinanceAction: () => {
              setIsSendPromptOpen(false);
              setConfirmationSheetStep("review");
              setChargeFlowError(null);
              setActiveCreateStep("finance");
            },
            onCopyChargePixCodeAction: handleCopyChargePixCode,
            onSendChargePixViaWhatsappAction: handleSendChargePixViaWhatsapp,
            onCreateChargePixAction: () => handleCreateChargePixNow(chargePixAttempt + 1),
            onStartChargeCardAction: (mode) => handleStartChargeCard(mode),
            onVerifyChargeCardNowAction: handleVerifyChargeCardNow,
            onVerifyChargePixNowAction: handleVerifyChargePixNow,
            onSwitchChargeToAttendanceAction: handleSwitchChargeToAttendance,
            onCancelChargeBookingAction: handleCancelChargeBooking,
            onEditPaymentAction: () => {
              setIsSendPromptOpen(false);
              setConfirmationSheetStep("review");
              setChargeFlowError(null);
              setChargePixPayment(null);
              setChargePointPayment(null);
              setActiveCreateStep("finance");
            },
            onConfirmManualChargeAction: handleConfirmManualCharge,
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
          <div className={sectionHeaderPrimaryClass}>
            <h2 className={`${sectionHeaderTextClass} leading-none`}>Servico e local</h2>
          </div>
          <div className="px-4 py-4 wl-surface-card-body">
            <p className="text-sm text-muted">Selecione um cliente para liberar esta etapa.</p>
          </div>
        </section>
      ) : null}

      {!isEditing && activeCreateStep === "agenda" && !isStep3Unlocked ? (
        <section className={`${sectionCardClass} overflow-hidden`}>
          <div className={sectionHeaderPrimaryClass}>
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
          <div className={sectionHeaderPrimaryClass}>
            <h2 className={`${sectionHeaderTextClass} leading-none`}>Financeiro</h2>
          </div>
          <div className="px-4 py-4 wl-surface-card-body">
            <p className="text-sm text-muted">Selecione data e horario antes de configurar financeiro.</p>
          </div>
        </section>
      ) : null}
      </>
      )}

      </div>

      {!isEditing && !bookingSuccessState ? (
        <FooterRail
          className="-mx-6"
          surfaceClassName="bg-[rgba(247,242,234,0.96)]"
          paddingXClassName="px-6"
          summary={
            <div className="flex items-center justify-end">
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-[0.12em] text-muted">Total</div>
                <div className="mt-1 text-[16px] font-semibold text-studio-text">
                  R$ {scheduleTotal.toFixed(2).replace(".", ",")}
                </div>
              </div>
            </div>
          }
          rowClassName="grid grid-cols-[auto_1fr] gap-3"
        >
          <button
            type="button"
            onClick={handleBackCreateStep}
            disabled={activeCreateStepIndex <= 0}
            className={`${buttonSecondaryClass} ${
              activeCreateStepIndex <= 0 ? "bg-stone-200 text-stone-500" : "bg-white text-studio-text"
            }`}
          >
            Voltar
          </button>
          {activeCreateStep === "finance" ? (
            <button
              type="button"
              onClick={handleOpenConfirmationPrompt}
              className={buttonPrimaryClass}
            >
              Revisar
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCreatePrimaryAction}
              className={buttonPrimaryClass}
            >
              Continuar
            </button>
          )}
        </FooterRail>
      ) : null}

      {!isEditing && bookingSuccessState ? (
        <FooterRail
          className="-mx-6"
          surfaceClassName="bg-[rgba(247,242,234,0.96)]"
          paddingXClassName="px-6"
          rowClassName="grid grid-cols-2 gap-3"
        >
          <button type="button" onClick={handleCreateAnotherFromSuccess} className={buttonSecondaryClass}>
            Novo agendamento
          </button>
          <button type="button" onClick={handleViewAgendaFromSuccess} className={buttonPrimaryClass}>
            Ver agendamento
          </button>
        </FooterRail>
      ) : null}

      <BlockingOverlay
        visible={isRouteTransitionLoading}
        label="Abrindo agenda..."
        variant="brand-draw"
      />
    </form>
  );
}
