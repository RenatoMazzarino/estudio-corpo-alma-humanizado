"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AttendanceOverview, StageKey, StageStatus } from "../../../../lib/attendance/attendance-types";
import {
  confirmPre,
  sendReminder24h,
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
import { HubStage } from "./components/hub-stage";
import { PreStage } from "./components/pre-stage";
import { SessionStage } from "./components/session-stage";
import { CheckoutStage } from "./components/checkout-stage";
import { PostStage } from "./components/post-stage";
import { StageHeader } from "./components/stage-header";
import { computeElapsedSeconds } from "../../../../lib/attendance/attendance-domain";

interface AttendanceV4PageProps {
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

export function AttendanceV4Page({ data, initialStage }: AttendanceV4PageProps) {
  const router = useRouter();
  const [activeStage, setActiveStage] = useState<StageKey>(initialStage ?? "hub");
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  const { session, elapsedSeconds, isPaused, startSession, togglePause, stopSession, bubbleVisible, setBubbleVisible } = useTimer();

  const appointment = data.appointment;
  const attendance = data.attendance;

  const stageStatusMap: Record<StageKey, StageStatus> = {
    hub: "available",
    pre: attendance.pre_status,
    session: attendance.session_status,
    checkout: attendance.checkout_status,
    post: attendance.post_status,
  };

  const isActiveSession = session?.appointmentId === appointment.id;
  const isTimerRunning = isActiveSession && !isPaused;
  const timerLabel = formatTime(elapsedSeconds);

  const plannedMinutes =
    appointment.service_duration_minutes ?? appointment.total_duration_minutes ?? 30;

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

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 1800);
  };

  const handleOpenStage = (stage: StageKey) => {
    if (stage === "hub") {
      setActiveStage("hub");
      return;
    }
    if (stageStatusMap[stage] === "locked") {
      showToast("Etapa bloqueada. Conclua a anterior para liberar.");
      return;
    }
    setActiveStage(stage);
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

  const handleConfirmPre = async () => {
    const result = await confirmPre({ appointmentId: appointment.id, channel: "manual" });
    if (!result.ok) {
      showToast(result.error.message);
      return;
    }
    router.refresh();
    setActiveStage("session");
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
    if (status === "published") setActiveStage("checkout");
  };

  const handleSaveItems = async (items: Array<{ type: "service" | "fee" | "addon" | "adjustment"; label: string; qty: number; amount: number }>) => {
    const result = await setCheckoutItems({ appointmentId: appointment.id, items });
    if (!result.ok) {
      showToast(result.error.message);
      return;
    }
    router.refresh();
  };

  const handleSetDiscount = async (type: "value" | "pct" | null, value: number | null) => {
    const result = await setDiscount({ appointmentId: appointment.id, type, value, reason: null });
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
    setActiveStage("post");
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
    const result = await sendSurvey({ appointmentId: appointment.id });
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
    setActiveStage("hub");
  };

  const currentElapsed = computeElapsedSeconds({
    startedAt: attendance.timer_started_at,
    pausedAt: attendance.timer_paused_at,
    pausedTotalSeconds: attendance.paused_total_seconds,
  });

  const kpiLabel = formatTime(attendance.actual_seconds || currentElapsed);
  const hubTimerLabel = isActiveSession ? timerLabel : formatTime(currentElapsed);

  return (
    <div className="relative min-h-[100dvh]">
      {activeStage === "hub" && (
        <div className="relative -mx-4 -mt-4">
          <StageHeader
            kicker="Atendimento"
            title="Etapas"
            subtitle={`${appointment.clients?.name ?? "Cliente"} • ${appointment.service_name}`}
            rightAction={<div className="w-10" />}
          />
          <HubStage
            appointment={appointment}
            attendance={attendance}
            onOpenStage={handleOpenStage}
            onResumeSession={() => handleOpenStage("session")}
            timerLabel={hubTimerLabel}
            timerActive={isActiveSession || attendance.timer_status === "running" || attendance.timer_status === "paused"}
          />
        </div>
      )}

      {activeStage === "pre" && (
        <PreStage
          appointment={appointment}
          attendance={attendance}
          checklist={data.checklist}
          onBack={() => setActiveStage("hub")}
          onMinimize={() => setBubbleVisible(true)}
          onConfirm={handleConfirmPre}
          onSendReminder={async () => {
            const result = await sendReminder24h({ appointmentId: appointment.id });
            if (!result.ok) showToast(result.error.message);
            else showToast("Lembrete 24h registrado.");
          }}
          onToggleChecklist={handleToggleChecklist}
          onSaveNotes={handleSaveNotes}
          internalNotes={internalNotes}
          onInternalNotesChange={setInternalNotes}
          isTimerRunning={isTimerRunning}
          onToggleTimer={handleToggleTimer}
        />
      )}

      {activeStage === "session" && (
        <SessionStage
          attendance={attendance}
          evolution={data.evolution}
          onBack={() => setActiveStage("hub")}
          onMinimize={() => setBubbleVisible(true)}
          onNext={() => handleOpenStage("checkout")}
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
          isTimerRunning={isTimerRunning}
          onToggleTimer={handleToggleTimer}
        />
      )}

      {activeStage === "checkout" && (
        <CheckoutStage
          attendance={attendance}
          checkout={data.checkout}
          items={data.checkoutItems}
          payments={data.payments}
          onBack={() => setActiveStage("hub")}
          onMinimize={() => setBubbleVisible(true)}
          onSaveItems={handleSaveItems}
          onSetDiscount={handleSetDiscount}
          onRecordPayment={handleRecordPayment}
          onConfirmCheckout={handleConfirmCheckout}
        />
      )}

      {activeStage === "post" && (
        <PostStage
          attendance={attendance}
          post={data.post}
          kpiLabel={kpiLabel}
          onBack={() => setActiveStage("hub")}
          onMinimize={() => setBubbleVisible(true)}
          onSavePost={handleSavePost}
          onSendSurvey={handleSendSurvey}
          onRecordSurvey={handleRecordSurvey}
          onFinish={handleFinish}
        />
      )}

      {toast && (
        <div className="fixed top-6 left-0 right-0 flex justify-center z-[120]">
          <div className="w-full max-w-[414px] px-6">
            <div className="bg-white border border-gray-100 shadow-xl rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-studio-bg text-studio-green flex items-center justify-center">
                <span className="text-lg">✦</span>
              </div>
              <div className="flex-1">
                <p className="text-xs font-extrabold text-gray-800">Ação</p>
                <p className="text-xs text-gray-500">{toast}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {bubbleVisible && session && activeStage !== "hub" && (
        <button
          onClick={() => setBubbleVisible(false)}
          className="fixed top-24 right-6 z-40 text-[10px] uppercase font-bold text-gray-400"
        >
          Ocultar bolha
        </button>
      )}
    </div>
  );
}
