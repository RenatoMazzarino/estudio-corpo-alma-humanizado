"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Pause, Play } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import type { AttendanceOverview } from "../../../../lib/attendance/attendance-types";
import {
  finishAttendance,
  saveEvolution,
  structureEvolutionFromAudio,
  transcribeEvolutionFromAudio,
  toggleChecklistItem,
} from "./actions";
import { SessionStage } from "./components/session-stage";
import { AttendancePaymentModal } from "./components/attendance-payment-modal";
import { useTimer } from "../../../../components/timer/use-timer";
import { computeElapsedSeconds } from "../../../../lib/attendance/attendance-domain";
import { Toast, useToast } from "../../../../components/ui/toast";
import { feedbackById, feedbackFromError } from "../../../../src/shared/feedback/user-feedback";
import type { AutoMessageTemplates } from "../../../../src/shared/auto-messages.types";
import { ModulePage } from "../../../../components/ui/module-page";
import { FooterRail } from "../../../../components/ui/footer-rail";
import { SlideConfirmButton } from "./components/slide-confirm-button";
import { useAttendanceCheckoutActions } from "./hooks/use-attendance-checkout-actions";
import { useSupabaseRealtimeRefresh } from "../../../../src/shared/realtime/use-supabase-realtime-refresh";
import {
  formatAppointmentDateTime,
  formatDateToUrlParam,
  formatSignedCountdown,
  getHeaderPaymentStatusMeta,
} from "./attendance-page.helpers";
import { SpotifyBrandIcon } from "./components/session-stage.helpers";

interface AttendancePageProps {
  data: AttendanceOverview;
  pointEnabled: boolean;
  pointTerminalName: string;
  pointTerminalModel: string;
  checklistEnabled: boolean;
  publicBaseUrl: string;
  pixKeyValue: string;
  pixKeyType: "cnpj" | "cpf" | "email" | "phone" | "evp" | null;
  messageTemplates: AutoMessageTemplates;
}

export function AttendancePage({
  data,
  pointEnabled,
  pointTerminalName,
  pointTerminalModel,
  checklistEnabled,
  publicBaseUrl,
  pixKeyValue,
  pixKeyType,
  messageTemplates,
}: AttendancePageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("return");
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const { toast, showToast } = useToast();

  const {
    session,
    elapsedSeconds,
    isPaused,
    startSession,
    togglePause,
    stopSession,
    setBubbleVisible,
  } = useTimer();

  const appointment = data.appointment;
  const attendance = data.attendance;
  const checkout = data.checkout;

  const initialEvolution = useMemo(() => data.evolution[0] ?? null, [data.evolution]);

  const [evolutionText, setEvolutionText] = useState(initialEvolution?.evolution_text ?? "");

  useEffect(() => {
    setEvolutionText(initialEvolution?.evolution_text ?? "");
  }, [initialEvolution]);

  useEffect(() => {
    const handlePopState = () => {
      setBubbleVisible(true);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [setBubbleVisible]);

  const isActiveSession = session?.appointmentId === appointment.id;
  const isTimerRunning = isActiveSession && !isPaused;
  const hasSessionStarted =
    Boolean(attendance.timer_started_at) || isActiveSession || appointment.status === "in_progress";
  const canToggleTimerFromHeader = hasSessionStarted && appointment.status !== "completed";
  const plannedMinutes = appointment.service_duration_minutes ?? appointment.total_duration_minutes ?? 30;
  const plannedSeconds = plannedMinutes * 60;

  const currentElapsed = computeElapsedSeconds({
    startedAt: attendance.timer_started_at,
    pausedAt: attendance.timer_paused_at,
    pausedTotalSeconds: attendance.paused_total_seconds,
  });

  const elapsedForCounter = isActiveSession ? elapsedSeconds : currentElapsed;
  const countdownSeconds = plannedSeconds - elapsedForCounter;
  const countdownLabel = formatSignedCountdown(countdownSeconds);
  const isOvertime = countdownSeconds < 0;
  const progressPercent =
    plannedSeconds > 0 ? Math.min(Math.round((elapsedForCounter / plannedSeconds) * 100), 100) : 0;
  const clientName = appointment.clients?.name ?? "Cliente";
  const contactPhone = appointment.clients?.phone ?? null;
  const primarySlideLabel = hasSessionStarted ? "Encerrar e cobrar" : "Iniciar atendimento";
  const primarySlideHint = "Arraste para a direita";
  const headerDateTime = formatAppointmentDateTime(appointment.start_time);
  const headerSummaryLine = [appointment.service_name, headerDateTime].filter(Boolean).join(" - ");
  const headerPaymentStatus = getHeaderPaymentStatusMeta(appointment.payment_status);
  const handleOpenSpotifyFromHeader = () => {
    if (typeof window === "undefined") return;
    window.open("https://open.spotify.com", "_blank", "noopener,noreferrer");
  };

  const handleToggleTimer = async () => {
    if (!isActiveSession) {
      await startSession({
        appointmentId: appointment.id,
        clientName: appointment.clients?.name || "Cliente",
        serviceName: appointment.service_name,
        totalDurationMinutes: plannedMinutes,
      });
      router.refresh();
      return;
    }
    await togglePause();
    router.refresh();
  };

  const handleToggleChecklist = async (itemId: string, completed: boolean) => {
    const result = await toggleChecklistItem({ appointmentId: appointment.id, itemId, completed });
    if (!result.ok) {
      showToast(feedbackFromError(result.error, "attendance"));
      return;
    }
    router.refresh();
  };

  const hasSavedEvolution = Boolean(initialEvolution);

  const handleSaveEvolution = async () => {
    const result = await saveEvolution({
      appointmentId: appointment.id,
      payload: {
        text: evolutionText,
      },
    });
    if (!result.ok) {
      showToast(feedbackFromError(result.error, "attendance"));
      return false;
    }
    showToast(
      feedbackById("generic_saved", {
        tone: "success",
        message: "Evolução salva.",
      })
    );
    router.refresh();
    return true;
  };

  const handleTranscribeAudio = async (payload: { audioBase64: string; mimeType: string }) => {
    const result = await transcribeEvolutionFromAudio({
      appointmentId: appointment.id,
      audioBase64: payload.audioBase64,
      mimeType: payload.mimeType,
    });

    if (!result.ok) {
      showToast(feedbackFromError(result.error, "attendance"));
      return null;
    }

    showToast(
      feedbackById("generic_saved", {
        tone: "success",
        message: "Áudio transcrito. Revise e edite antes de estruturar.",
      })
    );
    return result.data.transcript;
  };

  const handleStructureWithFlora = async (transcript: string) => {
    const result = await structureEvolutionFromAudio({
      appointmentId: appointment.id,
      transcript,
    });

    if (!result.ok) {
      showToast(feedbackFromError(result.error, "attendance"));
      return;
    }

    setEvolutionText(result.data.structuredText);
    showToast(
      feedbackById("generic_saved", {
        tone: "success",
        message: "Flora estruturou a evolução com base no áudio.",
      })
    );
  };

  const {
    handleSaveItems,
    handleSetDiscount,
    handleRegisterCashPayment,
    handleRegisterPixKeyPayment,
    handleRegisterManualPayment,
    handleCreatePixPayment,
    handlePollPixStatus,
    handleCreatePointPayment,
    handlePollPointStatus,
    handleSendReceipt,
    handleWaiveCheckoutPayment,
    handleCancelPendingCharges,
  } = useAttendanceCheckoutActions({
    appointment,
    clientName,
    contactPhone,
    publicBaseUrl,
    messageTemplates,
    showToast,
  });

  const handleFinish = async () => {
    const result = await finishAttendance({ appointmentId: appointment.id });
    if (!result.ok) {
      showToast(feedbackFromError(result.error, "attendance"));
      return false;
    }
    stopSession();
    showToast(
      feedbackById("generic_saved", {
        tone: "success",
        message: "Atendimento finalizado.",
      })
    );
    return true;
  };

  const buildAgendaReturnUrl = () => {
    const fallbackDate = formatDateToUrlParam(appointment.start_time);
    const fallback = fallbackDate ? `/?view=day&date=${fallbackDate}` : "/?view=day";
    const rawTarget = returnTo ? decodeURIComponent(returnTo) : fallback;
    const target = rawTarget.startsWith("/") ? rawTarget : `/${rawTarget}`;
    const [pathnameRaw, queryRaw = ""] = target.split("?");
    const pathname = pathnameRaw || "/";
    const params = new URLSearchParams(queryRaw);
    params.set("openAppointment", appointment.id);
    params.set("fromAttendance", "1");
    return `${pathname}?${params.toString()}`;
  };

  const handleReceiptPromptResolved = async () => {
    setPaymentModalOpen(false);
    setBubbleVisible(true);
    router.push(buildAgendaReturnUrl(), { scroll: false });
  };

  const handleCreateSameClientAppointment = () => {
    const params = new URLSearchParams();
    const clientId = appointment.clients?.id;
    const dateParam = formatDateToUrlParam(appointment.start_time);
    if (clientId) params.set("clientId", clientId);
    if (dateParam) params.set("date", dateParam);
    setPaymentModalOpen(false);
    setBubbleVisible(true);
    router.push(`/novo?${params.toString()}`, { scroll: false });
  };

  const handlePrimaryAction = async () => {
    if (!hasSessionStarted) {
      await handleToggleTimer();
      return;
    }

    if (appointment.status === "completed") {
      setPaymentModalOpen(true);
      return;
    }

    const finished = await handleFinish();
    if (!finished) return;
    setPaymentModalOpen(true);
    router.refresh();
  };

  const handleBack = () => {
    // Mantém o contador flutuante visível ao sair da tela de atendimento.
    setBubbleVisible(true);
    if (returnTo) {
      router.push(decodeURIComponent(returnTo));
    } else {
      router.back();
    }
  };

  const realtimeTables = useMemo(
    () => [
      { table: "appointments", filter: `id=eq.${appointment.id}` },
      { table: "appointment_checkout", filter: `appointment_id=eq.${appointment.id}` },
      { table: "appointment_checkout_items", filter: `appointment_id=eq.${appointment.id}` },
      { table: "appointment_payments", filter: `appointment_id=eq.${appointment.id}` },
      { table: "notification_jobs", filter: `appointment_id=eq.${appointment.id}` },
    ],
    [appointment.id]
  );

  useSupabaseRealtimeRefresh({
    channelName: `attendance-${appointment.id}`,
    tables: realtimeTables,
    onRefresh: () => {
      if (paymentModalOpen) return;
      router.refresh();
    },
  });

  return (
    <div className="-mx-4 h-full overflow-hidden">
      <ModulePage
        className="h-full overflow-hidden"
        contentClassName="overflow-hidden"
        header={
          <header className="z-30 min-h-27 wl-sheet-header-surface safe-top safe-top-4 px-5 pb-0 pt-4">
            <div className="mb-2 flex items-start gap-2.5">
              <button
                onClick={handleBack}
                className="wl-header-icon-button-strong inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition"
                title="Voltar"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="wl-typo-card-name-md truncate text-white">{clientName}</p>
                <p className="wl-typo-body truncate text-white/88">{headerSummaryLine}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={handleOpenSpotifyFromHeader}
                  className="wl-header-icon-button-strong inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition"
                  title="Abrir Spotify"
                  aria-label="Abrir Spotify"
                >
                  <SpotifyBrandIcon className="h-5 w-5" />
                </button>
                {canToggleTimerFromHeader && (
                  <button
                    onClick={handleToggleTimer}
                    className="wl-header-icon-button-strong inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition"
                    title={isTimerRunning ? "Pausar cronometro" : "Retomar cronometro"}
                  >
                    {isTimerRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1.5 border-b border-white/25 pb-2 pt-1">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[24px] font-black tabular-nums leading-none text-white">{countdownLabel}</span>
                <span
                  className={`wl-radius-control inline-flex h-7 items-center gap-1 border px-2 text-[10px] font-bold uppercase tracking-[0.03em] ${headerPaymentStatus.className}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${headerPaymentStatus.dotClass}`} />
                  {headerPaymentStatus.label}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
                <div
                  className={`h-full transition-all duration-700 ${isOvertime ? "bg-red-400" : "bg-white/90"}`}
                  style={{ width: `${isOvertime ? 100 : progressPercent}%` }}
                />
              </div>
            </div>
          </header>
        }
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <main className="flex-1 overflow-y-auto px-5 pt-5 pb-6">
            <SessionStage
              checklistEnabled={checklistEnabled}
              checklist={data.checklist}
              onToggleChecklistAction={handleToggleChecklist}
              hasSavedEvolution={hasSavedEvolution}
              clientHistory={data.clientHistory}
              evolutionText={evolutionText}
              onChangeEvolutionTextAction={setEvolutionText}
              onTranscribeAudioAction={handleTranscribeAudio}
              onStructureWithFloraAction={handleStructureWithFlora}
              onSaveEvolutionAction={handleSaveEvolution}
            />
          </main>

          <FooterRail paddingXClassName="px-4">
            <SlideConfirmButton
              label={primarySlideLabel}
              hint={primarySlideHint}
              onConfirmAction={handlePrimaryAction}
            />
          </FooterRail>
        </div>

        <AttendancePaymentModal
          open={paymentModalOpen}
          checkout={checkout}
          items={data.checkoutItems}
          payments={data.payments}
          appointmentPaymentStatus={appointment.payment_status ?? null}
          pixKeyValue={pixKeyValue}
          pixKeyType={pixKeyType}
          pointEnabled={pointEnabled}
          pointTerminalName={pointTerminalName}
          pointTerminalModel={pointTerminalModel}
          onClose={() => setPaymentModalOpen(false)}
          onSaveItems={handleSaveItems}
          onSetDiscount={handleSetDiscount}
          onRegisterCashPayment={handleRegisterCashPayment}
          onRegisterPixKeyPayment={handleRegisterPixKeyPayment}
          onRegisterManualPayment={handleRegisterManualPayment}
          onCreatePixPayment={handleCreatePixPayment}
          onPollPixStatus={handlePollPixStatus}
          onCreatePointPayment={handleCreatePointPayment}
          onPollPointStatus={handlePollPointStatus}
          onWaivePayment={handleWaiveCheckoutPayment}
          onCancelPendingCharges={handleCancelPendingCharges}
          onSendReceipt={handleSendReceipt}
          onCreateSameClientAppointment={handleCreateSameClientAppointment}
          onReceiptPromptResolved={handleReceiptPromptResolved}
        />
        <Toast toast={toast} />
      </ModulePage>
    </div>
  );
}

