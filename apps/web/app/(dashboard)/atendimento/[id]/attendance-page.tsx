"use client";

import { useEffect, useMemo, useState, type UIEvent } from "react";
import { ChevronLeft, Pause, Play } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { AttendanceOverview, CheckoutItem } from "../../../../lib/attendance/attendance-types";
import {
  createAttendancePixPayment,
  createAttendancePointPayment,
  finishAttendance,
  getAttendancePixPaymentStatus,
  getAttendancePointPaymentStatus,
  recordPayment,
  saveEvolution,
  structureEvolutionFromAudio,
  transcribeEvolutionFromAudio,
  sendMessage,
  setCheckoutItems,
  setDiscount,
  toggleChecklistItem,
} from "./actions";
import { SessionStage } from "./components/session-stage";
import { AttendancePaymentModal } from "./components/attendance-payment-modal";
import { useTimer } from "../../../../components/timer/use-timer";
import { computeElapsedSeconds } from "../../../../lib/attendance/attendance-domain";
import { Toast, useToast } from "../../../../components/ui/toast";
import { feedbackById, feedbackFromError } from "../../../../src/shared/feedback/user-feedback";
import { applyAutoMessageTemplate } from "../../../../src/shared/auto-messages.utils";
import type { AutoMessageTemplates } from "../../../../src/shared/auto-messages.types";
import { ModuleHeader } from "../../../../components/ui/module-header";
import { ModulePage } from "../../../../components/ui/module-page";
import { SlideConfirmButton } from "./components/slide-confirm-button";

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

function formatTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const prefix = hours > 0 ? `${hours.toString().padStart(2, "0")}:` : "";
  return `${prefix}${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function formatSignedCountdown(totalSeconds: number) {
  const isNegative = totalSeconds < 0;
  const absolute = Math.abs(totalSeconds);
  const base = formatTime(absolute);
  return isNegative ? `-${base}` : base;
}

function getHeaderPaymentStatusMeta(status: string | null | undefined) {
  switch (status) {
    case "paid":
      return { label: "Pago", className: "border-emerald-200 bg-emerald-50 text-emerald-700" };
    case "partial":
      return { label: "Parcial", className: "border-amber-200 bg-amber-50 text-amber-700" };
    case "refunded":
      return { label: "Estornado", className: "border-slate-300 bg-slate-100 text-slate-700" };
    default:
      return { label: "Pendente", className: "border-orange-200 bg-orange-50 text-orange-700" };
  }
}

function formatAppointmentContext(startTime: string, serviceName: string) {
  const date = new Date(startTime);
  if (Number.isNaN(date.getTime())) return serviceName;

  const dateLabel = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
  }).format(date);
  const timeLabel = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  return `${dateLabel} • ${timeLabel} • ${serviceName}`;
}

function getInitials(name: string) {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) return "CA";
  const first = parts[0] ?? "";
  const last = parts[parts.length - 1] ?? "";
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

function resolvePublicBaseUrl(rawBaseUrl: string) {
  const trimmed = rawBaseUrl.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed.replace(/\/$/, "");
  return `https://${trimmed.replace(/\/$/, "")}`;
}

function normalizePhoneForWhatsapp(phone: string | null | undefined) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  return digits.startsWith("55") ? digits : `55${digits}`;
}

function formatDateToUrlParam(dateValue: string) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

  const handleSaveItems = async (
    items: Array<{ type: CheckoutItem["type"]; label: string; qty: number; amount: number }>
  ) => {
    const result = await setCheckoutItems({ appointmentId: appointment.id, items });
    if (!result.ok) {
      showToast(feedbackFromError(result.error, "attendance"));
      return false;
    }
    showToast(feedbackById("generic_saved", { tone: "success", message: "Itens atualizados." }));
    router.refresh();
    return true;
  };

  const handleSetDiscount = async (type: "value" | "pct" | null, value: number | null, reason?: string) => {
    const result = await setDiscount({
      appointmentId: appointment.id,
      type,
      value,
      reason: reason ?? null,
    });
    if (!result.ok) {
      showToast(feedbackFromError(result.error, "attendance"));
      return false;
    }
    showToast(feedbackById("generic_saved", { tone: "success", message: "Desconto aplicado." }));
    router.refresh();
    return true;
  };

  const handleRegisterCashPayment = async (amount: number) => {
    const result = await recordPayment({
      appointmentId: appointment.id,
      method: "cash",
      amount,
    });
    if (!result.ok) {
      showToast(feedbackFromError(result.error, "attendance"));
      return { ok: false, paymentId: null };
    }
    showToast(feedbackById("payment_recorded"));
    router.refresh();
    return { ok: true, paymentId: result.data.paymentId };
  };

  const handleRegisterPixKeyPayment = async (amount: number) => {
    const result = await recordPayment({
      appointmentId: appointment.id,
      method: "pix",
      amount,
    });
    if (!result.ok) {
      showToast(feedbackFromError(result.error, "attendance"));
      return { ok: false, paymentId: null };
    }
    showToast(feedbackById("payment_recorded"));
    router.refresh();
    return { ok: true, paymentId: result.data.paymentId };
  };

  const handleCreatePixPayment = async (amount: number, attempt: number) => {
    const payerPhone = appointment.clients?.phone ?? "";
    const digits = payerPhone.replace(/\D/g, "");
    if (!digits || digits.length < 10) {
      showToast(feedbackById("whatsapp_missing_phone"));
      return { ok: false as const };
    }
    const result = await createAttendancePixPayment({
      appointmentId: appointment.id,
      amount,
      payerName: clientName,
      payerPhone,
      payerEmail: null,
      attempt,
    });
    if (!result.ok) {
      showToast(feedbackFromError(result.error, "payment_pix"));
      return { ok: false as const };
    }
    showToast(feedbackById("payment_pix_generated"));
    router.refresh();
    return { ok: true as const, data: result.data };
  };

  const handlePollPixStatus = async () => {
    const result = await getAttendancePixPaymentStatus({ appointmentId: appointment.id });
    if (!result.ok) {
      showToast(feedbackFromError(result.error, "payment_pix"));
      return { ok: false as const, status: "pending" as const };
    }

    const status = result.data.internal_status;
    if (status === "paid") {
      showToast(feedbackById("payment_recorded"));
      router.refresh();
    } else if (status === "failed") {
      showToast(feedbackById("payment_pix_failed"));
      router.refresh();
    }

    return { ok: true as const, status };
  };

  const handleCreatePointPayment = async (amount: number, cardMode: "debit" | "credit", attempt: number) => {
    const result = await createAttendancePointPayment({
      appointmentId: appointment.id,
      amount,
      cardMode,
      attempt,
    });

    if (!result.ok) {
      showToast(feedbackFromError(result.error, "payment_card"));
      return { ok: false as const };
    }

    if (result.data.internal_status === "paid") {
      showToast(feedbackById("payment_recorded"));
      router.refresh();
    } else {
      showToast(
        feedbackById("payment_pending", {
          message: "Cobrança enviada para a maquininha. Aguarde a confirmação.",
          durationMs: 2200,
        })
      );
    }

    return { ok: true as const, data: result.data };
  };

  const handlePollPointStatus = async (orderId: string) => {
    const result = await getAttendancePointPaymentStatus({
      appointmentId: appointment.id,
      orderId,
    });

    if (!result.ok) {
      showToast(feedbackFromError(result.error, "payment_card"));
      return { ok: false as const, status: "pending" as const, paymentId: null };
    }

    const status = result.data.internal_status;
    if (status === "paid") {
      showToast(feedbackById("payment_recorded"));
      router.refresh();
    } else if (status === "failed") {
      showToast(feedbackById("payment_card_declined"));
      router.refresh();
    }

    return { ok: true as const, status, paymentId: result.data.id };
  };

  const handleSendReceipt = async (paymentId: string) => {
    const phone = normalizePhoneForWhatsapp(contactPhone);
    if (!phone) {
      showToast(feedbackById("whatsapp_missing_phone"));
      return;
    }

    const baseUrl = resolvePublicBaseUrl(publicBaseUrl);
    const receiptLink = baseUrl
      ? `${baseUrl}/comprovante/pagamento/${paymentId}`
      : `${window.location.origin}/comprovante/pagamento/${paymentId}`;
    const greeting = clientName ? `Olá, ${clientName}!` : "Olá!";
    const message = applyAutoMessageTemplate(messageTemplates.payment_receipt, {
      greeting,
      service_name: appointment.service_name ?? "atendimento",
      receipt_link_block: `🧾 Acesse seu recibo digital aqui:\n${receiptLink}\n\n`,
    }).trim();

    // Não bloquear a navegação da tela no retorno do WhatsApp.
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");

    void sendMessage({
      appointmentId: appointment.id,
      type: "payment_receipt",
      channel: "whatsapp",
      payload: {
        message,
        payment_id: paymentId,
        receipt_link: receiptLink,
      },
    }).then((result) => {
      if (!result.ok) {
        showToast(feedbackFromError(result.error, "whatsapp"));
        return;
      }
      showToast(feedbackById("message_recorded"));
    });
  };

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
    router.push(buildAgendaReturnUrl());
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
              onToggleChecklist={handleToggleChecklist}
              hasSavedEvolution={hasSavedEvolution}
              clientHistory={data.clientHistory}
              evolutionText={evolutionText}
              onChangeEvolutionText={setEvolutionText}
              onTranscribeAudio={handleTranscribeAudio}
              onStructureWithFlora={handleStructureWithFlora}
              onSaveEvolution={handleSaveEvolution}
            />
          </main>

          <footer className="shrink-0 border-t border-line bg-white px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
            <SlideConfirmButton
              label={primarySlideLabel}
              hint={primarySlideHint}
              onConfirm={handlePrimaryAction}
            />
          </footer>
        </div>

        <AttendancePaymentModal
          open={paymentModalOpen}
          checkout={checkout}
          items={data.checkoutItems}
          payments={data.payments}
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
          onSendReceipt={handleSendReceipt}
          onReceiptPromptResolved={handleReceiptPromptResolved}
        />
        <Toast toast={toast} />
      </ModulePage>
    </div>
  );
}
