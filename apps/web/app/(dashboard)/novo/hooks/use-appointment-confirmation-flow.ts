import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import {
  cancelImmediateChargeAppointment,
  createAppointmentForImmediateCharge,
  createAppointmentForReview,
  createBookingPixPayment,
  finalizeCreatedAppointmentNotifications,
  getBookingChargeContext,
  recordBookingChargePayment,
} from "../appointment-actions";
import { useAppointmentChargePaymentFlow } from "./use-appointment-charge-payment-flow";
import type {
  BookingConfirmationStep,
  BookingPixPaymentData,
  BookingPointPaymentData,
  ChargeBookingState,
  ChargeNowMethodDraft,
  ClientRecordLite,
  ClientSelectionMode,
} from "../appointment-form.types";
import type { UserFeedback } from "../../../../src/shared/feedback/user-feedback";
import { feedbackById } from "../../../../src/shared/feedback/user-feedback";
import { getRemainingSeconds } from "../../../../src/shared/datetime";

type Params = {
  formRef: MutableRefObject<HTMLFormElement | null>;
  clientCpfInputRef: MutableRefObject<HTMLInputElement | null>;
  router: { push: (href: string) => void };
  safeDate: string;
  selectedDate: string;
  resolvedClientPhone: string;
  clientPhone: string;
  clientPublicFullNamePreview: string;
  clientName: string;
  clientEmail: string;
  clientFirstName: string;
  selectedClientEmail: string | null;
  selectedClientMessagingFirstName: string;
  selectedClientRecord: ClientRecordLite | null;
  clientSelectionMode: ClientSelectionMode;
  duplicateCpfClient: ClientRecordLite | null;
  canOpenConfirmation: boolean;
  isLocationChoiceRequired: boolean;
  hasLocationChoice: boolean;
  chargeNowMethodDraft: ChargeNowMethodDraft | null;
  hasChargeNowAmountModeChoice: boolean;
  chargeNowAmountError: string | null;
  chargeNowDraftAmount: number;
  chargeBookingState: ChargeBookingState | null;
  confirmationSheetStep: BookingConfirmationStep;
  chargePixPayment: BookingPixPaymentData | null;
  chargePointPayment: BookingPointPaymentData | null;
  chargePointAttempt: number;
  chargeNotificationsDispatched: boolean;
  setChargeFlowError: Dispatch<SetStateAction<string | null>>;
  setChargePixPayment: Dispatch<SetStateAction<BookingPixPaymentData | null>>;
  setChargePixAttempt: Dispatch<SetStateAction<number>>;
  setChargePixRemainingSeconds: Dispatch<SetStateAction<number>>;
  setChargePointPayment: Dispatch<SetStateAction<BookingPointPaymentData | null>>;
  setChargePointAttempt: Dispatch<SetStateAction<number>>;
  setCreatingChargeBooking: (value: boolean) => void;
  setRunningChargeAction: Dispatch<SetStateAction<boolean>>;
  setConfirmationSheetStep: (value: BookingConfirmationStep) => void;
  setChargeBookingState: (value: ChargeBookingState | null) => void;
  setChargeNotificationsDispatched: (value: boolean) => void;
  setFinishingChargeFlow: (value: boolean) => void;
  setIsSendPromptOpen: (value: boolean) => void;
  showToast: (feedback: UserFeedback) => void;
  onBookingSuccessAction: (payload: { appointmentId: string; attendanceCode: string | null }) => void;
};

export function useAppointmentConfirmationFlow({
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
  selectedClientEmail,
  selectedClientMessagingFirstName,
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
  onBookingSuccessAction,
}: Params) {
  const openWhatsappFromForm = useCallback(
    (message: string) => {
      const phone = resolvedClientPhone || clientPhone;
      const digits = phone.replace(/\D/g, "");
      if (!digits) {
        showToast(feedbackById("whatsapp_missing_phone"));
        return false;
      }
      const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
      const url = `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
      window.open(url, "_blank");
      return true;
    },
    [clientPhone, resolvedClientPhone, showToast]
  );

  const getActionErrorMessage = useCallback((error: unknown, fallback: string) => {
    if (
      error &&
      typeof error === "object" &&
      "message" in error &&
      typeof (error as { message?: unknown }).message === "string" &&
      (error as { message: string }).message.trim().length > 0
    ) {
      return (error as { message: string }).message.trim();
    }
    return fallback;
  }, []);

  const buildAgendaDayReturnUrl = useCallback(
    (appointmentId?: string | null) => {
      const dateParam = selectedDate || safeDate;
      const params = new URLSearchParams();
      params.set("view", "day");
      params.set("date", dateParam);
      if (appointmentId) {
        params.set("openAppointment", appointmentId);
      }
      return `/?${params.toString()}`;
    },
    [safeDate, selectedDate]
  );

  const closeConfirmationSheet = useCallback(() => {
    setChargeFlowError(null);
    setIsSendPromptOpen(false);
    setConfirmationSheetStep("review");
  }, [setChargeFlowError, setConfirmationSheetStep, setIsSendPromptOpen]);

  const finishFlowWithSuccess = useCallback(
    (payload: { appointmentId: string; attendanceCode: string | null }) => {
      closeConfirmationSheet();
      onBookingSuccessAction(payload);
    },
    [closeConfirmationSheet, onBookingSuccessAction]
  );

  const refreshChargeBookingState = useCallback(
    async (appointmentId: string) => {
      const context = await getBookingChargeContext(appointmentId);
      if (!context.ok) {
        setChargeFlowError(context.error ?? "Nao foi possivel atualizar o checkout.");
        return null;
      }
      const next = {
        ...(chargeBookingState ?? {
          appointmentId,
          date: selectedDate || safeDate,
          startTimeIso: "",
          attendanceCode: null,
        }),
        appointmentId,
        appointmentPaymentStatus: context.data.appointment.payment_status ?? null,
        attendanceCode: context.data.appointment.attendance_code ?? null,
        checkout: context.data.checkout,
        checkoutItems: context.data.checkoutItems,
        payments: context.data.payments,
      } satisfies ChargeBookingState;
      setChargeBookingState(next);
      return next;
    },
    [chargeBookingState, safeDate, selectedDate, setChargeBookingState, setChargeFlowError]
  );

  const ensureChargeNotificationsDispatched = useCallback(async () => {
    if (!chargeBookingState || chargeNotificationsDispatched) return true;
    const result = await finalizeCreatedAppointmentNotifications({
      appointmentId: chargeBookingState.appointmentId,
      startTimeIso: chargeBookingState.startTimeIso,
    });
    if (!result.ok) {
      showToast({
        title: "Automacao",
        message: "Agendamento criado, mas nao foi possivel acionar a automacao agora.",
        tone: "warning",
        durationMs: 2600,
      });
      return false;
    }
    setChargeNotificationsDispatched(true);
    return true;
  }, [chargeBookingState, chargeNotificationsDispatched, setChargeNotificationsDispatched, showToast]);

  const handleChargePaymentResolved = useCallback(async () => {
    if (!chargeBookingState) return;
    await ensureChargeNotificationsDispatched();
    setChargePixPayment(null);
    setChargePointPayment(null);
    finishFlowWithSuccess({
      appointmentId: chargeBookingState.appointmentId,
      attendanceCode: chargeBookingState.attendanceCode ?? null,
    });
  }, [
    chargeBookingState,
    ensureChargeNotificationsDispatched,
    finishFlowWithSuccess,
    setChargePixPayment,
    setChargePointPayment,
  ]);

  const showToastAction = useCallback(
    (input: {
      title?: string;
      message: string;
      tone?: "success" | "error" | "warning" | "info";
      durationMs?: number;
    }) => {
      showToast({
        title: input.title,
        message: input.message,
        tone: input.tone ?? "info",
        durationMs: input.durationMs,
      });
    },
    [showToast]
  );

  const {
    handleCreateChargePixNow,
    handleCopyChargePixCode,
    handleSendChargePixViaWhatsapp,
    handleStartChargeCard,
    handleVerifyChargeCardNow,
    handleVerifyChargePixNow,
  } = useAppointmentChargePaymentFlow({
    chargeBookingState,
    chargeNowMethodDraft,
    chargeNowDraftAmount,
    confirmationSheetStep,
    chargePixPayment,
    chargePointPayment,
    chargePointAttempt,
    clientPublicFullNamePreview,
    clientName,
    resolvedClientPhone,
    clientPhone,
    clientEmail,
    selectedClientEmail,
    clientSelectionMode,
    selectedClientMessagingFirstName,
    clientFirstName,
    openWhatsappFromForm,
    showToast: showToastAction,
    refreshChargeBookingState,
    handleChargePaymentResolved,
    setRunningChargeAction,
    setChargeFlowError,
    setChargePixAttempt,
    setChargePixPayment,
    setChargePixRemainingSeconds,
    setChargePointAttempt,
    setChargePointPayment,
  });

  const handleBeginImmediateCharge = useCallback(async () => {
    if (!formRef.current) return;
    if (!formRef.current.reportValidity()) return;
    if (chargeNowMethodDraft === null) {
      showToast({ title: "Financeiro", message: "Escolha a forma de pagamento.", tone: "warning", durationMs: 2600 });
      return;
    }
    if (chargeNowMethodDraft !== "waiver" && !hasChargeNowAmountModeChoice) {
      showToast({
        title: "Financeiro",
        message: "Escolha se vai cobrar integral ou sinal.",
        tone: "warning",
        durationMs: 2600,
      });
      return;
    }
    if (chargeNowAmountError) {
      showToast({ title: "Financeiro", message: chargeNowAmountError, tone: "warning", durationMs: 2600 });
      return;
    }
    if (chargeNowMethodDraft === "pix_mp") {
      const payerName = (clientPublicFullNamePreview || clientName || "").trim();
      const payerPhoneDigits = (resolvedClientPhone || clientPhone || "").replace(/\D/g, "");
      if (payerName.length < 2) {
        showToast({
          title: "Financeiro",
          message: "Informe o nome da cliente antes de iniciar o checkout PIX.",
          tone: "warning",
          durationMs: 2600,
        });
        return;
      }
      if (payerPhoneDigits.length < 10) {
        showToast({
          title: "Financeiro",
          message: "Informe um WhatsApp valido da cliente para gerar o checkout PIX.",
          tone: "warning",
          durationMs: 2600,
        });
        return;
      }
    }

    setChargePixPayment(null);
    setChargePixAttempt(0);
    setChargePixRemainingSeconds(0);
    setChargePointPayment(null);
    setChargePointAttempt(0);
    setCreatingChargeBooking(true);
    setRunningChargeAction(false);
    setChargeFlowError(null);
    setConfirmationSheetStep("creating_charge");
    let createdAppointmentId: string | null = chargeBookingState?.appointmentId ?? null;
    let nextState: ChargeBookingState | null = chargeBookingState;

    try {
      if (!nextState) {
        const formData = new FormData(formRef.current);
        formData.set("payment_collection_timing", "charge_now");
        const result = await createAppointmentForImmediateCharge(formData);
        if (!result.ok || !result.data) {
          const createBookingError = (result.error ?? "").trim();
          if (
            createBookingError.toLowerCase().includes("dados inv") ||
            createBookingError.toLowerCase().includes("dados incomplet")
          ) {
            setChargeFlowError("Revise cliente, servico, dia e horario antes de iniciar o checkout.");
          } else {
            setChargeFlowError(createBookingError || "Nao foi possivel criar o agendamento para cobranca.");
          }
          setConfirmationSheetStep("review");
          return;
        }

        const attendance = result.data.attendance;
        nextState = {
          appointmentId: result.data.appointmentId,
          date: result.data.date,
          startTimeIso: result.data.startTimeIso,
          attendanceCode: attendance?.appointment?.attendance_code ?? null,
          appointmentPaymentStatus: attendance?.appointment?.payment_status ?? null,
          checkout: attendance?.checkout ?? null,
          checkoutItems: attendance?.checkoutItems ?? [],
          payments: attendance?.payments ?? [],
        };
        createdAppointmentId = nextState.appointmentId;
        setChargeBookingState(nextState);
        setChargeNotificationsDispatched(false);
      }

      if (!nextState) {
        setChargeFlowError("Nao foi possivel preparar o checkout agora.");
        setConfirmationSheetStep("review");
        return;
      }

      if (chargeNowMethodDraft === "cash") {
        setRunningChargeAction(true);
        const checkoutTotal = Number(nextState.checkout?.total ?? 0);
        const amountToChargeNow =
          checkoutTotal > 0 ? Math.min(chargeNowDraftAmount, checkoutTotal) : chargeNowDraftAmount;
        const paymentResult = await recordBookingChargePayment({
          appointmentId: nextState.appointmentId,
          method: "cash",
          amount: amountToChargeNow,
        });
        if (!paymentResult.ok) {
          const errorMessage =
            typeof paymentResult.error?.message === "string" && paymentResult.error.message.trim().length > 0
              ? paymentResult.error.message
              : "Nao foi possivel registrar o pagamento em dinheiro.";
          setChargeFlowError(errorMessage);
          setConfirmationSheetStep("charge_payment");
          return;
        }
        await refreshChargeBookingState(nextState.appointmentId);
        await ensureChargeNotificationsDispatched();
        setChargePixPayment(null);
        setChargePointPayment(null);
        finishFlowWithSuccess({
          appointmentId: nextState.appointmentId,
          attendanceCode: nextState.attendanceCode ?? null,
        });
        return;
      }

      if (chargeNowMethodDraft === "pix_mp") {
        setRunningChargeAction(true);
        setConfirmationSheetStep("charge_payment");
        const pixResult = await createBookingPixPayment({
          appointmentId: nextState.appointmentId,
          amount: chargeNowDraftAmount,
          payerName: clientPublicFullNamePreview || clientName || "Cliente",
          payerPhone: resolvedClientPhone || clientPhone,
          payerEmail: clientEmail || selectedClientRecord?.email || null,
          attempt: 0,
        });
        if (!pixResult.ok || !pixResult.data) {
          setChargeFlowError(
            getActionErrorMessage(
              (pixResult as { error?: unknown }).error,
              "Nao foi possivel gerar o PIX agora."
            )
          );
          return;
        }
        setChargePixPayment(pixResult.data as BookingPixPaymentData);
        setChargePixRemainingSeconds(getRemainingSeconds(pixResult.data.expires_at));
        return;
      }

      if (chargeNowMethodDraft === "card") {
        setConfirmationSheetStep("charge_payment");
        setChargePointAttempt(0);
        setChargePointPayment(null);
        return;
      }

      setConfirmationSheetStep("review");
    } catch (error) {
      const message = getActionErrorMessage(error, "Falha inesperada ao iniciar cobranca.");
      setChargeFlowError(message);
      setConfirmationSheetStep(createdAppointmentId ? "charge_payment" : "review");
    } finally {
      setCreatingChargeBooking(false);
      setRunningChargeAction(false);
    }
  }, [
    chargeNowMethodDraft,
    hasChargeNowAmountModeChoice,
    chargeNowAmountError,
    chargeBookingState,
    setChargePixPayment,
    setChargePixAttempt,
    setChargePixRemainingSeconds,
    setChargePointPayment,
    setChargePointAttempt,
    setCreatingChargeBooking,
    setRunningChargeAction,
    setChargeFlowError,
    setConfirmationSheetStep,
    formRef,
    showToast,
    setChargeBookingState,
    setChargeNotificationsDispatched,
    chargeNowDraftAmount,
    finishFlowWithSuccess,
    refreshChargeBookingState,
    ensureChargeNotificationsDispatched,
    clientPublicFullNamePreview,
    clientName,
    resolvedClientPhone,
    clientPhone,
    clientEmail,
    selectedClientRecord?.email,
    getActionErrorMessage,
  ]);

  const handleSwitchChargeToAttendance = useCallback(async () => {
    if (!chargeBookingState) return;
    setFinishingChargeFlow(true);
    try {
      await ensureChargeNotificationsDispatched();
      setChargePixPayment(null);
      setChargePointPayment(null);
      finishFlowWithSuccess({
        appointmentId: chargeBookingState.appointmentId,
        attendanceCode: chargeBookingState.attendanceCode ?? null,
      });
    } finally {
      setFinishingChargeFlow(false);
    }
  }, [
    chargeBookingState,
    ensureChargeNotificationsDispatched,
    finishFlowWithSuccess,
    setChargePixPayment,
    setChargePointPayment,
    setFinishingChargeFlow,
  ]);

  const handleCancelChargeBooking = useCallback(async () => {
    if (!chargeBookingState) return;

    setRunningChargeAction(true);
    setChargeFlowError(null);
    try {
      const result = await cancelImmediateChargeAppointment({
        appointmentId: chargeBookingState.appointmentId,
      });

      if (!result.ok) {
        setChargeFlowError(result.error ?? "Nao foi possivel cancelar o agendamento.");
        return;
      }

      setChargePixPayment(null);
      setChargePointPayment(null);
      setIsSendPromptOpen(false);
      setConfirmationSheetStep("review");
      showToast({
        title: "Agendamento cancelado",
        message: "O agendamento e a cobranca foram cancelados.",
        tone: "success",
        durationMs: 2400,
      });
      router.push(buildAgendaDayReturnUrl());
    } finally {
      setRunningChargeAction(false);
    }
  }, [
    buildAgendaDayReturnUrl,
    chargeBookingState,
    router,
    setChargeFlowError,
    setChargePixPayment,
    setChargePointPayment,
    setConfirmationSheetStep,
    setIsSendPromptOpen,
    setRunningChargeAction,
    showToast,
  ]);

  const handleConfirmManualCharge = useCallback(async () => {
    if (!chargeBookingState) return;
    if (chargeNowMethodDraft === null || chargeNowMethodDraft === "waiver") return;

    const mappedMethod: "pix" | "card" | "cash" | "other" =
      chargeNowMethodDraft === "pix_mp"
        ? "pix"
        : chargeNowMethodDraft === "card"
          ? "card"
          : chargeNowMethodDraft === "cash"
            ? "cash"
            : "other";

    setRunningChargeAction(true);
    setChargeFlowError(null);

    try {
      const paymentResult = await recordBookingChargePayment({
        appointmentId: chargeBookingState.appointmentId,
        method: mappedMethod,
        amount: chargeNowDraftAmount,
      });

      if (!paymentResult.ok) {
        const errorMessage =
          typeof paymentResult.error?.message === "string" && paymentResult.error.message.trim().length > 0
            ? paymentResult.error.message
            : "Nao foi possivel registrar a confirmacao manual da cobranca.";
        setChargeFlowError(errorMessage);
        return;
      }

      await refreshChargeBookingState(chargeBookingState.appointmentId);
      await handleChargePaymentResolved();
    } finally {
      setRunningChargeAction(false);
    }
  }, [
    chargeBookingState,
    chargeNowDraftAmount,
    chargeNowMethodDraft,
    handleChargePaymentResolved,
    refreshChargeBookingState,
    setChargeFlowError,
    setRunningChargeAction,
  ]);

  const handleOpenCheckoutAfterConfirmation = useCallback(async () => {
    if (!formRef.current) return;

    if (!canOpenConfirmation) {
      showToast({
        title: "Finalize o financeiro",
        message:
          "Escolha quando cobrar e, se for cobranca no agendamento, defina a forma de pagamento e o valor para liberar a confirmacao.",
        tone: "warning",
        durationMs: 3200,
      });
      return;
    }

    if (isLocationChoiceRequired && !hasLocationChoice) {
      showToast({
        title: "Local do atendimento",
        message: "Escolha se o atendimento sera no estudio ou em domicilio para continuar.",
        tone: "warning",
        durationMs: 2600,
      });
      return;
    }

    if (!formRef.current.reportValidity()) return;

    setChargePixPayment(null);
    setChargePixAttempt(0);
    setChargePixRemainingSeconds(0);
    setChargePointPayment(null);
    setChargePointAttempt(0);
    setChargeFlowError(null);
    setConfirmationSheetStep("review");
    setIsSendPromptOpen(true);

    await handleBeginImmediateCharge();
  }, [
    canOpenConfirmation,
    formRef,
    handleBeginImmediateCharge,
    hasLocationChoice,
    isLocationChoiceRequired,
    setChargeFlowError,
    setChargePixAttempt,
    setChargePixPayment,
    setChargePixRemainingSeconds,
    setChargePointAttempt,
    setChargePointPayment,
    setConfirmationSheetStep,
    setIsSendPromptOpen,
    showToast,
  ]);

  const handleConfirmationSheetClose = useCallback(() => {
    if (confirmationSheetStep === "charge_payment" && chargeBookingState) {
      void handleCancelChargeBooking();
      return;
    }
    closeConfirmationSheet();
  }, [
    chargeBookingState,
    closeConfirmationSheet,
    confirmationSheetStep,
    handleCancelChargeBooking,
  ]);

  const handleSchedule = useCallback(() => {
    const submit = async () => {
      if (duplicateCpfClient) {
        showToast({
          title: "CPF ja cadastrado",
          message: `O CPF informado ja pertence ao cliente ${duplicateCpfClient.name}. Escolha vincular ao cliente existente ou informe outro CPF.`,
          tone: "warning",
          durationMs: 3200,
        });
        clientCpfInputRef.current?.focus();
        return;
      }

      if (!formRef.current) return;
      if (!formRef.current.reportValidity()) return;

      const formData = new FormData(formRef.current);
      formData.set("payment_collection_timing", "at_attendance");

      setCreatingChargeBooking(true);
      setRunningChargeAction(false);
      setChargeFlowError(null);
      setConfirmationSheetStep("creating_charge");

      try {
        const result = await createAppointmentForReview(formData);
        if (!result.ok || !result.data) {
          const message = (result.error ?? "").trim();
          setChargeFlowError(message || "Nao foi possivel criar o agendamento.");
          setConfirmationSheetStep("review");
          return;
        }

        const attendance = result.data.attendance;
        const nextState: ChargeBookingState = {
          appointmentId: result.data.appointmentId,
          date: result.data.date,
          startTimeIso: result.data.startTimeIso,
          attendanceCode: attendance?.appointment?.attendance_code ?? null,
          appointmentPaymentStatus: attendance?.appointment?.payment_status ?? null,
          checkout: attendance?.checkout ?? null,
          checkoutItems: attendance?.checkoutItems ?? [],
          payments: attendance?.payments ?? [],
        };

        setChargeBookingState(nextState);
        setChargeNotificationsDispatched(true);
        setChargePixPayment(null);
        setChargePointPayment(null);
        finishFlowWithSuccess({
          appointmentId: nextState.appointmentId,
          attendanceCode: nextState.attendanceCode ?? null,
        });
      } finally {
        setCreatingChargeBooking(false);
        setRunningChargeAction(false);
      }
    };

    void submit();
  }, [
    clientCpfInputRef,
    duplicateCpfClient,
    finishFlowWithSuccess,
    formRef,
    setChargeBookingState,
    setChargeFlowError,
    setChargeNotificationsDispatched,
    setChargePixPayment,
    setChargePointPayment,
    setConfirmationSheetStep,
    setCreatingChargeBooking,
    setRunningChargeAction,
    showToast,
  ]);

  const handleOpenConfirmationPrompt = useCallback(() => {
    if (!formRef.current) return;
    if (!canOpenConfirmation) {
      showToast({
        title: "Finalize o financeiro",
        message:
          "Escolha quando cobrar e, se for cobranca no agendamento, defina a forma de pagamento e o valor para liberar a confirmacao.",
        tone: "warning",
        durationMs: 3200,
      });
      return;
    }
    if (isLocationChoiceRequired && !hasLocationChoice) {
      showToast({
        title: "Local do atendimento",
        message: "Escolha se o atendimento sera no estudio ou em domicilio para continuar.",
        tone: "warning",
        durationMs: 2600,
      });
      return;
    }
    if (!formRef.current.reportValidity()) return;
    setChargePixPayment(null);
    setChargePixAttempt(0);
    setChargePixRemainingSeconds(0);
    setChargePointPayment(null);
    setChargePointAttempt(0);
    setConfirmationSheetStep("review");
    setChargeFlowError(null);
    setIsSendPromptOpen(true);
  }, [
    canOpenConfirmation,
    formRef,
    hasLocationChoice,
    isLocationChoiceRequired,
    setChargeFlowError,
    setChargePixAttempt,
    setChargePixPayment,
    setChargePixRemainingSeconds,
    setChargePointAttempt,
    setChargePointPayment,
    setConfirmationSheetStep,
    setIsSendPromptOpen,
    showToast,
  ]);

  return {
    handleCreateChargePixNow,
    handleCopyChargePixCode,
    handleSendChargePixViaWhatsapp,
    handleVerifyChargePixNow,
    handleStartChargeCard,
    handleVerifyChargeCardNow,
    handleBeginImmediateCharge,
    handleConfirmManualCharge,
    handleOpenCheckoutAfterConfirmation,
    handleSwitchChargeToAttendance,
    handleCancelChargeBooking,
    handleConfirmationSheetClose,
    handleSchedule,
    handleOpenConfirmationPrompt,
  };
}

