"use client";

import { useEffect, useMemo, useState, type UIEvent } from "react";
import { ChevronLeft, Pause, Play } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
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
import { ModuleHeader } from "../../../../components/ui/module-header";
import { ModulePage } from "../../../../components/ui/module-page";
import { SlideConfirmButton } from "./components/slide-confirm-button";
import { useAttendanceCheckoutActions } from "./hooks/use-attendance-checkout-actions";
import { useSupabaseRealtimeRefresh } from "../../../../src/shared/realtime/use-supabase-realtime-refresh";
import {
  formatAppointmentContext,
  formatDateToUrlParam,
  formatSignedCountdown,
  getHeaderPaymentStatusMeta,
  getInitials,
} from "./attendance-page.helpers";

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
  const [headerCompact, setHeaderCompact] = useState(false);
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
  const counterProgress =
    plannedSeconds > 0 ? Math.min((elapsedForCounter / plannedSeconds) * 100, 100) : 0;
  const isOvertime = countdownSeconds < 0;
  const clientName = appointment.clients?.name ?? "Cliente";
  const clientId = appointment.clients?.id ?? null;
  const clientInitials = getInitials(clientName);
  const contactPhone = appointment.clients?.phone ?? null;
  const clientAvatarUrl = appointment.clients?.avatar_url ?? null;
  const clientTags = Array.isArray(appointment.clients?.health_tags)
    ? appointment.clients.health_tags
        .filter((tag): tag is string => typeof tag === "string")
        .map((tag) => tag.trim())
        .filter(Boolean)
    : [];
  const visibleClientTags = clientTags.slice(0, 3);
  const hiddenClientTagsCount = Math.max(clientTags.length - visibleClientTags.length, 0);
  const primarySlideLabel = hasSessionStarted ? "Encerrar e cobrar" : "Iniciar atendimento";
  const primarySlideHint = "Arraste para a direita";
  const headerAppointmentContext = formatAppointmentContext(appointment.start_time, appointment.service_name);
  const headerPaymentStatus = getHeaderPaymentStatusMeta(appointment.payment_status);

  const handleBodyScroll = (event: UIEvent<HTMLElement>) => {
    const top = event.currentTarget.scrollTop;
    setHeaderCompact(top > 24);
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
    handleCreatePixPayment,
    handlePollPixStatus,
    handleCreatePointPayment,
    handlePollPointStatus,
    handleSendReceipt,
    handleWaiveCheckoutPayment,
  } = useAttendanceCheckoutActions({
    appointment,
    clientName,
    contactPhone,
    publicBaseUrl,
    messageTemplates,
    showToast,
    refreshPage: () => router.refresh(),
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
    onRefresh: () => router.refresh(),
  });

  return (
    <div className="-mx-4 h-full overflow-hidden">
      <ModulePage
        className="h-full overflow-hidden"
        contentClassName="overflow-hidden"
        header={
          <ModuleHeader
            className="rounded-b-[28px]"
            compact={headerCompact}
            title={
              <div className="flex min-w-0 items-center gap-3">
                <button
                  onClick={handleBack}
                  className="h-10 w-10 shrink-0 rounded-full border border-line bg-white text-gray-600 flex items-center justify-center shadow-sm hover:bg-studio-light transition"
                  title="Voltar"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                {clientAvatarUrl ? (
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-line">
                    <Image src={clientAvatarUrl} alt={clientName} fill sizes="44px" className="object-cover" unoptimized />
                  </div>
                ) : (
                  <div className="h-11 w-11 shrink-0 rounded-full bg-studio-light text-studio-green flex items-center justify-center font-serif font-bold text-base">
                    {clientInitials}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                  {clientId ? (
                    <Link href={`/clientes/${clientId}`} className="block">
                      <p className="truncate text-lg font-bold text-studio-text hover:text-studio-green transition">
                        {clientName}
                      </p>
                    </Link>
                  ) : (
                    <p className="truncate text-lg font-bold text-studio-text">{clientName}</p>
                  )}
                    {headerCompact && (
                      <span
                        className={`shrink-0 rounded-xl border border-line bg-paper px-3 py-1 text-sm font-black tabular-nums ${
                          isOvertime ? "text-red-600" : "text-studio-text"
                        }`}
                      >
                        {countdownLabel}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-1.5">
                    <p className="min-w-0 flex-1 truncate text-[11px] font-extrabold uppercase tracking-widest text-muted">
                      {headerAppointmentContext}
                    </p>
                    <span
                      className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.08em] ${headerPaymentStatus.className}`}
                    >
                      Pagamento: {headerPaymentStatus.label}
                    </span>
                  </div>
                </div>
              </div>
            }
            bottomSlot={
              headerCompact ? undefined : (
              <div className="rounded-2xl border border-line bg-paper px-3 py-3">
                {visibleClientTags.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {visibleClientTags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-studio-green/25 bg-studio-light px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-studio-green"
                      >
                        {tag}
                      </span>
                    ))}
                    {hiddenClientTagsCount > 0 && (
                      <span className="rounded-full border border-line bg-white px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-muted">
                        +{hiddenClientTagsCount}
                      </span>
                    )}
                  </div>
                )}
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={`text-2xl font-black tabular-nums leading-none ${
                      isOvertime ? "text-red-600" : "text-studio-text"
                    }`}
                  >
                    {countdownLabel}
                  </span>
                  {canToggleTimerFromHeader ? (
                    <button
                      onClick={handleToggleTimer}
                      className="h-10 w-10 rounded-xl border border-studio-green/20 bg-studio-green text-white flex items-center justify-center"
                    >
                      {isTimerRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </button>
                  ) : (
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted">
                      Inicie no rodapé
                    </span>
                  )}
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-stone-200">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      isOvertime ? "bg-red-500 animate-pulse" : "bg-studio-green animate-pulse"
                    }`}
                    style={{ width: `${isOvertime ? 100 : counterProgress}%` }}
                  />
                </div>
              </div>
              )
            }
          />
        }
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <main onScroll={handleBodyScroll} className="flex-1 overflow-y-auto px-5 pt-5 pb-6">
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

          <footer className="shrink-0 border-t border-line bg-white px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
            <SlideConfirmButton
              label={primarySlideLabel}
              hint={primarySlideHint}
              onConfirmAction={handlePrimaryAction}
            />
          </footer>
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
          onCreatePixPayment={handleCreatePixPayment}
          onPollPixStatus={handlePollPixStatus}
          onCreatePointPayment={handleCreatePointPayment}
          onPollPointStatus={handlePollPointStatus}
          onWaivePayment={handleWaiveCheckoutPayment}
          onSendReceipt={handleSendReceipt}
          onReceiptPromptResolved={handleReceiptPromptResolved}
        />
        <Toast toast={toast} />
      </ModulePage>
    </div>
  );
}
