"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, Minimize2, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import type {
  AttendanceOverview,
  StageKey,
  StageStatus,
  MessageType,
} from "../../../../lib/attendance/attendance-types";
import {
  confirmPre,
  sendReminder24h,
  sendMessage,
  saveInternalNotes,
  toggleChecklistItem,
  saveEvolution,
  setCheckoutItems,
  setDiscount,
  recordPayment,
  confirmCheckout,
  savePost,
  sendSurvey,
  recordSurveyAnswer,
  finishAttendance,
} from "./actions";
import { useTimer } from "../../../../components/timer/use-timer";
import { PreStage } from "./components/pre-stage";
import { SessionStage } from "./components/session-stage";
import { CheckoutStage } from "./components/checkout-stage";
import { PostStage } from "./components/post-stage";
import { computeElapsedSeconds } from "../../../../lib/attendance/attendance-domain";

interface AttendancePageProps {
  data: AttendanceOverview;
  initialStage?: StageKey;
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

const stageOrder: StageKey[] = ["pre", "session", "checkout", "post"];

export function AttendancePage({ data, initialStage }: AttendancePageProps) {
  const router = useRouter();
  const [activeStage, setActiveStage] = useState<StageKey>(
    initialStage && initialStage !== "hub" ? initialStage : "pre"
  );
  const [toast, setToast] = useState<string | null>(null);
  const [headerCompact, setHeaderCompact] = useState(false);
  const toastTimer = useRef<number | null>(null);
  const pagerRef = useRef<HTMLDivElement | null>(null);
  const scrollLockRef = useRef(false);

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
  const contactPhone = appointment.clients?.phone?.replace(/\D/g, "") ?? null;
  const appointmentLabel = format(new Date(appointment.start_time), "dd/MM 'às' HH:mm", { locale: ptBR });

  const stageStatusMap: Record<StageKey, StageStatus> = {
    hub: "available",
    pre: attendance.pre_status,
    session: attendance.session_status,
    checkout: attendance.checkout_status,
    post: attendance.post_status,
  };

  const isActiveSession = session?.appointmentId === appointment.id;
  const isTimerRunning = isActiveSession && !isPaused;

  const plannedMinutes = appointment.service_duration_minutes ?? appointment.total_duration_minutes ?? 30;

  const initialEvolution = useMemo(() => {
    const draft = data.evolution.find((entry) => entry.status === "draft");
    const published = data.evolution.find((entry) => entry.status === "published");
    return draft ?? published ?? null;
  }, [data.evolution]);

  const [summary, setSummary] = useState(initialEvolution?.summary ?? "");
  const [complaint, setComplaint] = useState(initialEvolution?.complaint ?? "");
  const [techniques, setTechniques] = useState(initialEvolution?.techniques ?? "");
  const [recommendations, setRecommendations] = useState(initialEvolution?.recommendations ?? "");
  const [internalNotes, setInternalNotes] = useState(appointment.internal_notes ?? "");

  useEffect(() => {
    setSummary(initialEvolution?.summary ?? "");
    setComplaint(initialEvolution?.complaint ?? "");
    setTechniques(initialEvolution?.techniques ?? "");
    setRecommendations(initialEvolution?.recommendations ?? "");
  }, [initialEvolution]);

  useEffect(() => {
    setInternalNotes(appointment.internal_notes ?? "");
  }, [appointment.internal_notes]);

  useEffect(() => {
    const scrollContainer = document.querySelector("[data-shell-scroll]");
    if (!scrollContainer) return;
    const onScroll = () => {
      const top = (scrollContainer as HTMLElement).scrollTop ?? 0;
      setHeaderCompact(top > 60);
    };
    scrollContainer.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => scrollContainer.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!pagerRef.current) return;
    const targetStage = initialStage && initialStage !== "hub" ? initialStage : "pre";
    const index = stageOrder.indexOf(targetStage);
    if (index < 0) return;
    const width = pagerRef.current.clientWidth;
    pagerRef.current.scrollTo({ left: width * index, behavior: "auto" });
    setActiveStage(targetStage);
  }, [initialStage]);

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 1800);
  };

  const scrollToStage = (stage: StageKey) => {
    if (stageStatusMap[stage] === "locked") {
      showToast("Etapa bloqueada. Conclua a anterior para liberar.");
      return;
    }
    if (!pagerRef.current) return;
    const index = stageOrder.indexOf(stage);
    if (index < 0) return;
    const width = pagerRef.current.clientWidth;
    scrollLockRef.current = true;
    pagerRef.current.scrollTo({ left: width * index, behavior: "smooth" });
    setTimeout(() => {
      scrollLockRef.current = false;
    }, 400);
    setActiveStage(stage);
  };

  const handlePagerScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (scrollLockRef.current) return;
    const width = event.currentTarget.clientWidth || 1;
    const index = Math.round(event.currentTarget.scrollLeft / width);
    const nextStage = stageOrder[index] ?? "pre";
    if (nextStage !== activeStage) {
      setActiveStage(nextStage);
    }
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

  const handleSendReminder = async () => {
    if (!contactPhone) {
      showToast("Sem telefone de WhatsApp cadastrado.");
      return;
    }
    const message = buildMessage("reminder_24h");
    openWhatsapp(message);
    const result = await sendReminder24h({ appointmentId: appointment.id, message });
    if (!result.ok) {
      showToast(result.error.message);
      return;
    }
    showToast("Lembrete 24h registrado.");
    router.refresh();
  };

  const buildMessage = (type: MessageType) => {
    const name = appointment.clients?.name ?? "Cliente";
    if (type === "created_confirmation") {
      return `Olá ${name}! Confirmamos seu atendimento em ${appointmentLabel}. Qualquer dúvida, responda por aqui.`;
    }
    if (type === "reminder_24h") {
      return `Oi ${name}! Lembrete do seu atendimento em ${appointmentLabel}. Responda para confirmar, por favor.`;
    }
    return `Obrigada pelo atendimento, ${name}! Pode avaliar nossa experiência de 0 a 10?`;
  };

  const openWhatsapp = (message: string) => {
    if (!contactPhone) return false;
    const url = `https://wa.me/${contactPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
    return true;
  };

  const handleSendMessage = async (type: MessageType) => {
    if (!contactPhone) {
      showToast("Sem telefone de WhatsApp cadastrado.");
      return;
    }
    const message = buildMessage(type);
    openWhatsapp(message);
    const result = await sendMessage({
      appointmentId: appointment.id,
      type,
      channel: "whatsapp",
      payload: { message },
    });
    if (!result?.ok) {
      showToast(result.error?.message ?? "Não foi possível registrar a mensagem.");
      return;
    }
    showToast("Mensagem registrada.");
    router.refresh();
  };

  const handleConfirmPre = async () => {
    const result = await confirmPre({ appointmentId: appointment.id, channel: "manual" });
    if (!result.ok) {
      showToast(result.error.message);
      return;
    }
    router.refresh();
    scrollToStage("session");
  };

  const handleToggleChecklist = async (itemId: string, completed: boolean) => {
    const result = await toggleChecklistItem({ appointmentId: appointment.id, itemId, completed });
    if (!result.ok) showToast(result.error.message);
    router.refresh();
  };

  const handleSaveNotes = async (notes: string) => {
    const result = await saveInternalNotes({ appointmentId: appointment.id, internalNotes: notes });
    if (!result.ok) {
      showToast(result.error.message);
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
      showToast(result.error.message);
      return;
    }
    router.refresh();
    if (status === "published") scrollToStage("checkout");
  };

  const handleSaveItems = async (items: Array<{ type: "service" | "fee" | "addon" | "adjustment"; label: string; qty: number; amount: number }>) => {
    const result = await setCheckoutItems({ appointmentId: appointment.id, items });
    if (!result.ok) {
      showToast(result.error.message);
      return;
    }
    router.refresh();
  };

  const handleSetDiscount = async (type: "value" | "pct" | null, value: number | null, reason?: string) => {
    const result = await setDiscount({ appointmentId: appointment.id, type, value, reason: reason ?? null });
    if (!result.ok) {
      showToast(result.error.message);
      return;
    }
    router.refresh();
  };

  const handleRecordPayment = async (method: "pix" | "card" | "cash" | "other", amount: number) => {
    const result = await recordPayment({ appointmentId: appointment.id, method, amount });
    if (!result.ok) {
      showToast(result.error.message);
      return;
    }
    router.refresh();
  };

  const handleConfirmCheckout = async () => {
    const result = await confirmCheckout({ appointmentId: appointment.id });
    if (!result.ok) {
      showToast(result.error.message);
      return;
    }
    router.refresh();
    scrollToStage("post");
  };

  const handleSavePost = async (payload: { postNotes?: string | null; followUpDueAt?: string | null; followUpNote?: string | null }) => {
    const result = await savePost({
      appointmentId: appointment.id,
      ...payload,
      kpiTotalSeconds: attendance.actual_seconds || currentElapsed,
    });
    if (!result.ok) showToast(result.error.message);
    router.refresh();
  };

  const handleSendSurvey = async () => {
    if (!contactPhone) {
      showToast("Sem telefone de WhatsApp cadastrado.");
      return;
    }
    const message = buildMessage("post_survey");
    openWhatsapp(message);
    const result = await sendSurvey({ appointmentId: appointment.id, message });
    if (!result.ok) showToast(result.error.message);
    router.refresh();
  };

  const handleRecordSurvey = async (score: number) => {
    const result = await recordSurveyAnswer({ appointmentId: appointment.id, score });
    if (!result.ok) showToast(result.error.message);
    router.refresh();
  };

  const handleFinish = async () => {
    const result = await finishAttendance({ appointmentId: appointment.id });
    if (!result.ok) {
      showToast(result.error.message);
      return;
    }
    stopSession();
    router.refresh();
  };

  const currentElapsed = computeElapsedSeconds({
    startedAt: attendance.timer_started_at,
    pausedAt: attendance.timer_paused_at,
    pausedTotalSeconds: attendance.paused_total_seconds,
  });

  const timerLabel = formatTime(isActiveSession ? elapsedSeconds : currentElapsed);
  const kpiLabel = formatTime(attendance.actual_seconds || currentElapsed);

  const startDate = new Date(appointment.start_time);
  const dayLabel = isToday(startDate)
    ? "Hoje"
    : format(startDate, "dd MMM", { locale: ptBR });
  const timeLabel = format(startDate, "HH:mm", { locale: ptBR });
  const clientName = appointment.clients?.name ?? "Cliente";
  const clientInitials = getInitials(clientName);

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

  const activeIndex = stageOrder.indexOf(activeStage);
  const prevStage = activeIndex > 0 ? stageOrder[activeIndex - 1] : null;
  const nextStage = activeIndex < stageOrder.length - 1 ? stageOrder[activeIndex + 1] : null;

  const primaryAction = (() => {
    if (activeStage === "pre") {
      return {
        label: attendance.pre_status === "done" ? "Pré concluído" : "Concluir pré",
        onClick: handleConfirmPre,
        disabled: attendance.pre_status === "done",
      };
    }
    if (activeStage === "session") {
      return {
        label: attendance.session_status === "done" ? "Sessão concluída" : "Publicar evolução",
        onClick: () => handleSaveEvolution("published"),
        disabled: attendance.session_status === "done" || attendance.session_status === "locked",
      };
    }
    if (activeStage === "checkout") {
      return {
        label: attendance.checkout_status === "done" ? "Checkout confirmado" : "Confirmar pagamento",
        onClick: handleConfirmCheckout,
        disabled: attendance.checkout_status === "done" || attendance.checkout_status === "locked",
      };
    }
    return {
      label: attendance.post_status === "done" ? "Atendimento finalizado" : "Finalizar atendimento",
      onClick: handleFinish,
      disabled: attendance.post_status === "done" || attendance.post_status === "locked",
    };
  })();

  const stageLabelMap: Record<StageKey, string> = {
    hub: "HUB",
    pre: "PRE",
    session: "SESSÃO",
    checkout: "CHECKOUT",
    post: "PÓS",
  };

  const stageDotClass = (status: StageStatus, isActive: boolean) => {
    const base = "flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-extrabold uppercase tracking-widest";
    if (status === "done") return `${base} bg-emerald-50 text-emerald-700 border-emerald-200 ${isActive ? "ring-1 ring-emerald-200" : ""}`;
    if (status === "in_progress") return `${base} bg-studio-light text-studio-dark border-studio-green/20 ${isActive ? "ring-1 ring-studio-green/30" : ""}`;
    if (status === "locked") return `${base} bg-gray-50 text-gray-400 border-gray-100 ${isActive ? "ring-1 ring-gray-200" : ""}`;
    return `${base} bg-white text-muted border-gray-100 ${isActive ? "ring-1 ring-gray-200" : ""}`;
  };

  return (
    <div className="-mx-4 -mt-4">
      <div className="bg-paper min-h-[100dvh] flex flex-col">
        <header className="sticky top-0 relative bg-white rounded-b-[40px] shadow-soft z-30">
          <div className="absolute inset-x-0 top-0 h-[112px] bg-gradient-to-b from-studio-light to-white"></div>

          <div className="relative px-5 pt-8 pb-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => router.back()}
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

            <div className="mt-5 flex items-center justify-between">
              <button className="flex items-center gap-3 min-w-0" title="Cliente">
                <div className="w-10 h-10 rounded-full bg-studio-light text-studio-green flex items-center justify-center font-serif font-bold">
                  {clientInitials}
                </div>
                <div className="min-w-0 leading-tight text-left">
                  <p className="text-[10px] font-extrabold text-muted uppercase tracking-widest">Atendimento</p>
                  <p className="text-sm font-bold text-studio-text truncate">{clientName}</p>
                </div>
              </button>

              <div className="flex items-center gap-2 bg-paper border border-line rounded-2xl px-3 py-2">
                <span className="text-sm font-black text-studio-text tabular-nums">{timerLabel}</span>
                <button
                  onClick={handleToggleTimer}
                  className="w-9 h-9 rounded-2xl bg-studio-light text-studio-green flex items-center justify-center border border-studio-green/10 hover:bg-white transition"
                >
                  {isTimerRunning ? "❚❚" : "▶"}
                </button>
              </div>
            </div>

            <div
              className={`mt-5 transition-all duration-200 overflow-hidden ${
                headerCompact ? "max-h-0 opacity-0 -translate-y-1" : "max-h-[420px] opacity-100 translate-y-0"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-full bg-studio-green text-white flex items-center justify-center font-serif font-bold text-xl shadow-md">
                  {clientInitials}
                </div>

                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-serif font-bold text-studio-text leading-tight">{clientName}</h1>
                  <p className="text-xs font-extrabold text-muted uppercase tracking-widest mt-1">
                    {appointment.service_name} • {plannedMinutes} min
                  </p>

                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <span className="px-2.5 py-1 rounded-xl bg-paper border border-line text-[11px] font-bold text-studio-text">
                      {dayLabel} • {timeLabel}
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold ${
                        appointment.is_home_visit
                          ? "bg-purple-50 border-purple-100 text-dom"
                          : "bg-studio-light border-studio-green/10 text-studio-green"
                      }`}
                    >
                      {appointment.is_home_visit ? "Domicílio" : "Estúdio"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {contactPhone && (
                    <a
                      href={`https://wa.me/${contactPhone}`}
                      className="w-11 h-11 rounded-2xl bg-white border border-line shadow-sm flex items-center justify-center hover:bg-gray-50 transition"
                      title="WhatsApp"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <svg width="22" height="22" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                        <path d="M16 3C9.1 3 3.5 8.6 3.5 15.5c0 2.7.9 5.2 2.3 7.2L5 29l6.5-1.7c2 .9 4.2 1.4 6.5 1.4 6.9 0 12.5-5.6 12.5-12.5S22.9 3 16 3z" fill="#25D366" opacity="0.95" />
                        <path d="M13.4 10.2c-.3-.7-.6-.7-.9-.7h-.8c-.3 0-.7.1-1 .4-.3.3-1.3 1.2-1.3 3s1.3 3.5 1.5 3.8c.2.3 2.5 4 6.2 5.4 3 .9 3.7.7 4.3.6.6-.1 1.9-.8 2.1-1.6.3-.8.3-1.4.2-1.6-.1-.2-.3-.3-.7-.5l-2.1-1c-.2-.1-.5-.2-.7.2-.2.4-.8 1.6-1 1.9-.2.3-.4.4-.8.2-.4-.2-1.6-.6-3.1-1.9-1.1-1-1.9-2.2-2.1-2.6-.2-.4 0-.6.2-.8l.6-.7c.2-.2.2-.4.3-.6.1-.2 0-.4-.1-.6l-.8-2z" fill="#fff" />
                      </svg>
                    </a>
                  )}
                  {addressLine && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressLine)}`}
                      className="w-11 h-11 rounded-2xl bg-white border border-line shadow-sm flex items-center justify-center hover:bg-gray-50 transition"
                      title="Mapa"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MapPin className="w-5 h-5 text-studio-green" />
                    </a>
                  )}
                </div>
              </div>

              <div className="mt-5 bg-paper border border-line rounded-3xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-extrabold text-muted uppercase tracking-widest">Tempo do atendimento</p>
                  <p className="text-2xl font-black text-studio-text tabular-nums leading-tight">{timerLabel}</p>
                </div>
                <button
                  onClick={handleToggleTimer}
                  className="h-12 px-4 rounded-2xl bg-studio-green text-white font-extrabold shadow-lg shadow-green-200 active:scale-95 transition flex items-center gap-2"
                >
                  {isTimerRunning ? "Pausar" : "Iniciar"}
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 bg-paper">
          <div
            ref={pagerRef}
            onScroll={handlePagerScroll}
            className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar scroll-smooth"
          >
            <section className="min-w-full snap-start px-5 pt-5 pb-32">
              <PreStage
                appointment={appointment}
                attendance={attendance}
                checklist={data.checklist}
                onConfirm={handleConfirmPre}
                onSendReminder={handleSendReminder}
                onSendMessage={handleSendMessage}
                onToggleChecklist={handleToggleChecklist}
                onSaveNotes={handleSaveNotes}
                internalNotes={internalNotes}
                onInternalNotesChange={setInternalNotes}
                messages={data.messages}
              />
            </section>

            <section className="min-w-full snap-start px-5 pt-5 pb-32">
              {stageStatusMap.session === "locked" ? (
                <div className="bg-white rounded-3xl p-5 shadow-soft border border-white">
                  <p className="text-sm font-bold text-studio-text">Etapa bloqueada</p>
                  <p className="text-xs text-muted mt-1">Conclua a confirmação no Pré-atendimento para liberar.</p>
                </div>
              ) : (
                <SessionStage
                  attendance={attendance}
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
              )}
            </section>

            <section className="min-w-full snap-start px-5 pt-5 pb-32">
              {stageStatusMap.checkout === "locked" ? (
                <div className="bg-white rounded-3xl p-5 shadow-soft border border-white">
                  <p className="text-sm font-bold text-studio-text">Etapa bloqueada</p>
                  <p className="text-xs text-muted mt-1">Conclua a Sessão para liberar o Checkout.</p>
                </div>
              ) : (
                <CheckoutStage
                  attendance={attendance}
                  checkout={data.checkout}
                  items={data.checkoutItems}
                  payments={data.payments}
                  onSaveItems={handleSaveItems}
                  onSetDiscount={handleSetDiscount}
                  onRecordPayment={handleRecordPayment}
                  onConfirmCheckout={handleConfirmCheckout}
                />
              )}
            </section>

            <section className="min-w-full snap-start px-5 pt-5 pb-32">
              {stageStatusMap.post === "locked" ? (
                <div className="bg-white rounded-3xl p-5 shadow-soft border border-white">
                  <p className="text-sm font-bold text-studio-text">Etapa bloqueada</p>
                  <p className="text-xs text-muted mt-1">Conclua o Checkout para liberar o Pós.</p>
                </div>
              ) : (
                <PostStage
                  attendance={attendance}
                  post={data.post}
                  messages={data.messages}
                  kpiLabel={kpiLabel}
                  onSavePost={handleSavePost}
                  onSendSurvey={handleSendSurvey}
                  onRecordSurvey={handleRecordSurvey}
                />
              )}
            </section>
          </div>
        </div>

        {toast && (
          <div className="fixed left-0 right-0 bottom-24 z-[120] flex justify-center">
            <div className="w-full max-w-[414px] px-6">
              <div className="bg-gray-900 text-white rounded-2xl px-4 py-3 text-sm shadow-float">
                {toast}
              </div>
            </div>
          </div>
        )}

        <div className="fixed bottom-0 left-0 right-0 flex justify-center z-50">
          <div className="w-full max-w-[414px] bg-white/95 backdrop-blur border-t border-line px-3 py-3 pb-4 rounded-t-2xl shadow-float">
            <div className="flex items-center justify-center gap-2 mb-2">
              {stageOrder.map((stage) => (
                <button
                  key={stage}
                  onClick={() => scrollToStage(stage)}
                  className={stageDotClass(stageStatusMap[stage], activeStage === stage)}
                >
                  <span className={`w-2 h-2 rounded-full ${stageStatusMap[stage] === "done" ? "bg-emerald-600" : stageStatusMap[stage] === "in_progress" ? "bg-studio-green" : "bg-gray-200"}`} />
                  {stageLabelMap[stage]}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => prevStage && scrollToStage(prevStage)}
                className="w-12 h-12 rounded-2xl bg-paper border border-line text-gray-600 flex items-center justify-center hover:bg-gray-50 transition"
                disabled={!prevStage}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                onClick={primaryAction.onClick}
                disabled={primaryAction.disabled}
                className={`flex-1 h-12 rounded-2xl font-extrabold shadow-lg shadow-green-200 active:scale-95 transition flex items-center justify-center gap-2 text-xs tracking-wide uppercase ${
                  primaryAction.disabled ? "bg-studio-light text-muted" : "bg-studio-green text-white"
                }`}
              >
                {primaryAction.label}
              </button>

              <button
                onClick={() => nextStage && scrollToStage(nextStage)}
                className="w-12 h-12 rounded-2xl bg-paper border border-line text-gray-600 flex items-center justify-center hover:bg-gray-50 transition"
                disabled={!nextStage}
              >
                <ChevronLeft className="w-5 h-5 rotate-180" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
