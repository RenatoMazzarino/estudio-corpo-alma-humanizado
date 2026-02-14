"use client";

import { useEffect, useMemo, useState } from "react";
import { format, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, Clock3, MapPin, Minimize2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import type { AttendanceOverview, CheckoutItem } from "../../../../lib/attendance/attendance-types";
import {
  createAttendancePixPayment,
  createAttendancePointPayment,
  finishAttendance,
  getAttendancePixPaymentStatus,
  getAttendancePointPaymentStatus,
  recordPayment,
  saveEvolution,
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

interface AttendancePageProps {
  data: AttendanceOverview;
  pointEnabled: boolean;
  pointTerminalName: string;
  pointTerminalModel: string;
  publicBaseUrl: string;
  messageTemplates: AutoMessageTemplates;
}

function formatTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const prefix = hours > 0 ? `${hours.toString().padStart(2, "0")}:` : "";
  return `${prefix}${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
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

export function AttendancePage({
  data,
  pointEnabled,
  pointTerminalName,
  pointTerminalModel,
  publicBaseUrl,
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

  const initialEvolution = useMemo(() => {
    const draft = data.evolution.find((entry) => entry.status === "draft");
    const published = data.evolution.find((entry) => entry.status === "published");
    return draft ?? published ?? null;
  }, [data.evolution]);

  const [summary, setSummary] = useState(initialEvolution?.summary ?? "");
  const [complaint, setComplaint] = useState(initialEvolution?.complaint ?? "");
  const [techniques, setTechniques] = useState(initialEvolution?.techniques ?? "");
  const [recommendations, setRecommendations] = useState(initialEvolution?.recommendations ?? "");

  useEffect(() => {
    setSummary(initialEvolution?.summary ?? "");
    setComplaint(initialEvolution?.complaint ?? "");
    setTechniques(initialEvolution?.techniques ?? "");
    setRecommendations(initialEvolution?.recommendations ?? "");
  }, [initialEvolution]);

  useEffect(() => {
    const scrollContainer = document.querySelector("[data-shell-scroll]");
    if (!scrollContainer) return;
    const onScroll = () => {
      const top = (scrollContainer as HTMLElement).scrollTop ?? 0;
      setHeaderCompact(top > 50);
    };
    scrollContainer.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => scrollContainer.removeEventListener("scroll", onScroll);
  }, []);

  const isActiveSession = session?.appointmentId === appointment.id;
  const isTimerRunning = isActiveSession && !isPaused;
  const plannedMinutes = appointment.service_duration_minutes ?? appointment.total_duration_minutes ?? 30;

  const currentElapsed = computeElapsedSeconds({
    startedAt: attendance.timer_started_at,
    pausedAt: attendance.timer_paused_at,
    pausedTotalSeconds: attendance.paused_total_seconds,
  });

  const timerLabel = formatTime(isActiveSession ? elapsedSeconds : currentElapsed);
  const startDate = new Date(appointment.start_time);
  const dayLabel = isToday(startDate) ? "Hoje" : format(startDate, "dd MMM", { locale: ptBR });
  const timeLabel = format(startDate, "HH:mm", { locale: ptBR });
  const clientName = appointment.clients?.name ?? "Cliente";
  const clientInitials = getInitials(clientName);
  const contactPhone = appointment.clients?.phone ?? null;

  const addressLine = [
    appointment.address_logradouro ?? appointment.clients?.address_logradouro,
    appointment.address_numero ?? appointment.clients?.address_numero,
    appointment.address_complemento ?? appointment.clients?.address_complemento,
    appointment.address_bairro ?? appointment.clients?.address_bairro,
    appointment.address_cidade ?? appointment.clients?.address_cidade,
    appointment.address_estado ?? appointment.clients?.address_estado,
  ]
    .filter((value) => value && value.trim().length > 0)
    .join(", ");

  const paidTotal = data.payments
    .filter((payment) => payment.status === "paid")
    .reduce((acc, payment) => acc + Number(payment.amount ?? 0), 0);
  const total = Number(checkout?.total ?? 0);
  const remaining = Math.max(total - paidTotal, 0);

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

  const handleSaveEvolution = async (status: "draft" | "published") => {
    const result = await saveEvolution({
      appointmentId: appointment.id,
      status,
      payload: {
        summary,
        complaint,
        techniques,
        recommendations,
      },
    });
    if (!result.ok) {
      showToast(feedbackFromError(result.error, "attendance"));
      return;
    }
    showToast(
      feedbackById("generic_saved", {
        tone: "success",
        message: status === "published" ? "Evolução publicada." : "Rascunho salvo.",
      })
    );
    router.refresh();
  };

  const handleSaveItems = async (
    items: Array<{ type: CheckoutItem["type"]; label: string; qty: number; amount: number }>
  ) => {
    const result = await setCheckoutItems({ appointmentId: appointment.id, items });
    if (!result.ok) {
      showToast(feedbackFromError(result.error, "attendance"));
      return;
    }
    showToast(feedbackById("generic_saved", { tone: "success", message: "Itens atualizados." }));
    router.refresh();
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
      return;
    }
    showToast(feedbackById("generic_saved", { tone: "success", message: "Desconto aplicado." }));
    router.refresh();
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

  const handleCreatePointPayment = async (amount: number, cardMode: "debit" | "credit") => {
    const result = await createAttendancePointPayment({
      appointmentId: appointment.id,
      amount,
      cardMode,
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

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");

    const result = await sendMessage({
      appointmentId: appointment.id,
      type: "payment_receipt",
      channel: "whatsapp",
      payload: {
        message,
        payment_id: paymentId,
        receipt_link: receiptLink,
      },
    });
    if (!result.ok) {
      showToast(feedbackFromError(result.error, "whatsapp"));
      return;
    }

    showToast(feedbackById("message_recorded"));
    router.refresh();
  };

  const handleFinish = async () => {
    const result = await finishAttendance({ appointmentId: appointment.id });
    if (!result.ok) {
      showToast(feedbackFromError(result.error, "attendance"));
      return;
    }
    stopSession();
    showToast(
      feedbackById("generic_saved", {
        tone: "success",
        message: "Atendimento finalizado.",
      })
    );
    router.refresh();
  };

  return (
    <div className="-mx-4 -mt-4">
      <div className="min-h-dvh bg-paper flex flex-col">
        <header className="sticky top-0 z-30 rounded-b-[32px] border-b border-line bg-white shadow-soft">
          <div className="px-5 pt-8 pb-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  if (returnTo) {
                    router.push(decodeURIComponent(returnTo));
                  } else {
                    router.back();
                  }
                }}
                className="w-10 h-10 rounded-full bg-white/80 backdrop-blur text-gray-600 flex items-center justify-center shadow-sm hover:bg-white transition"
                title="Voltar"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setBubbleVisible(true)}
                className="w-10 h-10 rounded-full bg-white/80 backdrop-blur text-gray-600 flex items-center justify-center shadow-sm hover:bg-white transition"
                title="Minimizar"
              >
                <Minimize2 className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="inline-flex items-center rounded-full bg-studio-light px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-studio-green">
                Em atendimento
              </span>
              <div className="flex items-center gap-2 rounded-2xl border border-line bg-paper px-3 py-2">
                <span className="text-sm font-black text-studio-text tabular-nums">{timerLabel}</span>
                <button
                  onClick={handleToggleTimer}
                  className="h-9 w-9 rounded-xl border border-studio-green/20 bg-studio-green text-white text-xs font-black"
                >
                  {isTimerRunning ? "II" : ">"}
                </button>
              </div>
            </div>

            <div
              className={`transition-all duration-200 overflow-hidden ${
                headerCompact ? "max-h-0 opacity-0 -translate-y-1" : "max-h-96 opacity-100 translate-y-0"
              }`}
            >
              <div className="mt-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-studio-light text-studio-green flex items-center justify-center font-serif font-bold">
                  {clientInitials}
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-serif font-bold text-studio-text leading-tight truncate">
                    {clientName}
                  </p>
                  <p className="text-[10px] font-extrabold text-muted uppercase tracking-widest">
                    {appointment.service_name} • {plannedMinutes} min
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-5 pt-5 pb-44 space-y-5">
          <div className="rounded-3xl border border-line bg-white p-4">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted">Informações da sessão</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl border border-line bg-paper p-3">
                <p className="font-serif text-lg font-bold text-studio-text">{dayLabel}</p>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted">Data</p>
              </div>
              <div className="rounded-2xl border border-line bg-paper p-3">
                <p className="font-serif text-lg font-bold text-studio-text">{timeLabel}</p>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted">Horário</p>
              </div>
              <div className="rounded-2xl border border-line bg-paper p-3">
                <p className="font-serif text-lg font-bold text-studio-text">
                  {Math.max(1, Math.round((isActiveSession ? elapsedSeconds : currentElapsed) / 60))} min
                </p>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted">Duração</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted">
              <MapPin className="w-4 h-4 text-studio-green" />
              <span className="truncate">
                {appointment.is_home_visit ? addressLine || "Atendimento em domicílio" : "Atendimento no estúdio"}
              </span>
            </div>
          </div>

          <SessionStage
            attendance={attendance}
            checklist={data.checklist}
            onToggleChecklist={handleToggleChecklist}
            evolution={data.evolution}
            summary={summary}
            complaint={complaint}
            techniques={techniques}
            recommendations={recommendations}
            onChange={(field, value) => {
              if (field === "summary") setSummary(value);
              if (field === "complaint") setComplaint(value);
              if (field === "techniques") setTechniques(value);
              if (field === "recommendations") setRecommendations(value);
            }}
            onSaveDraft={() => handleSaveEvolution("draft")}
            onPublish={() => handleSaveEvolution("published")}
          />
        </main>

        <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center">
          <div className="w-full max-w-103.5 rounded-t-2xl border-t border-line bg-white/95 px-4 py-3 pb-4 backdrop-blur">
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => setPaymentModalOpen(true)}
                className="h-11 rounded-2xl border border-studio-green/30 bg-white text-[11px] font-extrabold uppercase tracking-wider text-studio-green"
              >
                Pagamento
              </button>
              <button
                type="button"
                onClick={handleFinish}
                className="h-11 rounded-2xl bg-studio-text text-[11px] font-extrabold uppercase tracking-wider text-white"
              >
                Finalizar sessão
              </button>
              <button
                type="button"
                onClick={() => handleSaveEvolution("published")}
                className="h-11 rounded-2xl bg-studio-green text-[11px] font-extrabold uppercase tracking-wider text-white"
              >
                Concluir
              </button>
            </div>
            <div className="mt-2 flex items-center justify-center gap-2 text-[10px] font-semibold text-muted">
              <Clock3 className="h-3.5 w-3.5" />
              <span>Faltam {formatTime(Math.max(0, plannedMinutes * 60 - (isActiveSession ? elapsedSeconds : currentElapsed)))}</span>
              <span>•</span>
              <span>A receber {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(remaining)}</span>
            </div>
          </div>
        </div>

        <AttendancePaymentModal
          open={paymentModalOpen}
          checkout={checkout}
          items={data.checkoutItems}
          payments={data.payments}
          pointEnabled={pointEnabled}
          pointTerminalName={pointTerminalName}
          pointTerminalModel={pointTerminalModel}
          onClose={() => setPaymentModalOpen(false)}
          onSaveItems={handleSaveItems}
          onSetDiscount={handleSetDiscount}
          onRegisterCashPayment={handleRegisterCashPayment}
          onCreatePixPayment={handleCreatePixPayment}
          onPollPixStatus={handlePollPixStatus}
          onCreatePointPayment={handleCreatePointPayment}
          onPollPointStatus={handlePollPointStatus}
          onSendReceipt={handleSendReceipt}
        />

        <Toast toast={toast} />
      </div>
    </div>
  );
}
