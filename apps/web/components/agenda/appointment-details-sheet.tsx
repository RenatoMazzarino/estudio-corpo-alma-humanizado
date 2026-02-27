"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Bell,
  CheckCircle2,
  Eye,
  Wallet,
  MapPin,
  MessageSquare,
  StickyNote,
  ThumbsUp,
  User,
} from "lucide-react";
import Image from "next/image";
import type { AttendanceOverview } from "../../lib/attendance/attendance-types";
import { PaymentMethodIcon } from "../ui/payment-method-icon";
import { AppointmentDetailsCancelDialog } from "./appointment-details-cancel-dialog";
import { AppointmentDetailsEvolutionModal } from "./appointment-details-evolution-modal";
import { DEFAULT_PUBLIC_BASE_URL } from "../../src/shared/config";
import type { AutoMessageTemplates } from "../../src/shared/auto-messages.types";
import { applyAutoMessageTemplate } from "../../src/shared/auto-messages.utils";
import { buildAppointmentReceiptPath } from "../../src/shared/public-links";
import { feedbackById, type UserFeedback } from "../../src/shared/feedback/user-feedback";
import {
  formatSentLabel,
  getAutomationStatusLabel,
  getInitials,
  getStatusInfo,
  isMessageSent,
  messageByRawType,
  messageByType,
  paymentStatusMap,
  type PaymentStatus,
} from "./appointment-details-sheet.helpers";

interface AppointmentDetailsSheetProps {
  open: boolean;
  loading?: boolean;
  actionPending?: boolean;
  details: AttendanceOverview | null;
  attendanceCode?: string | null;
  signalPercentage?: number;
  publicBaseUrl?: string;
  messageTemplates: AutoMessageTemplates;
  onClose: () => void;
  onStartSession: () => void;
  onSendCreatedMessage: () => void;
  onSendReminder: () => void;
  onSendSurvey: () => void;
  onSendPaymentCharge: () => void;
  onSendPaymentReceipt: (paymentId: string | null) => void;
  onConfirmClient: () => void;
  onCancelAppointment: (options?: { notifyClient?: boolean }) => void;
  onRecordPayment?: (payload: { type: "signal" | "full"; amount: number; method: "pix" | "card" | "cash" | "other" }) => void;
  onSaveEvolution?: (text: string) => Promise<{ ok: boolean }>;
  onStructureEvolution?: (text: string) => Promise<{ ok: boolean; structuredText: string | null }>;
  onNotify?: (feedback: UserFeedback) => void;
}

type PaymentMethod = "pix" | "card" | "cash" | "other";

export function AppointmentDetailsSheet({
  open,
  loading = false,
  actionPending = false,
  details,
  attendanceCode = null,
  signalPercentage = 30,
  publicBaseUrl = DEFAULT_PUBLIC_BASE_URL,
  messageTemplates,
  onClose,
  onStartSession,
  onSendCreatedMessage,
  onSendReminder,
  onSendSurvey,
  onSendPaymentCharge,
  onSendPaymentReceipt,
  onConfirmClient,
  onCancelAppointment,
  onRecordPayment,
  onSaveEvolution,
  onStructureEvolution,
  onNotify,
}: AppointmentDetailsSheetProps) {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [notifyClientOnCancel, setNotifyClientOnCancel] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [evolutionModalOpen, setEvolutionModalOpen] = useState(false);
  const [evolutionDraft, setEvolutionDraft] = useState("");
  const [evolutionSaving, setEvolutionSaving] = useState(false);
  const [evolutionStructuring, setEvolutionStructuring] = useState(false);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<number | null>(null);
  const dragOffsetRef = useRef(0);

  useEffect(() => {
    setPortalTarget(document.getElementById("app-frame"));
  }, []);

  useEffect(() => {
    if (!open) {
      setCancelDialogOpen(false);
      setNotifyClientOnCancel(false);
      setDragOffset(0);
      setEvolutionModalOpen(false);
      setEvolutionSaving(false);
      setEvolutionStructuring(false);
      dragOffsetRef.current = 0;
      return;
    }
    setCancelDialogOpen(false);
    setNotifyClientOnCancel(false);
    setDragOffset(0);
    setPaymentMethod("pix");
    setEvolutionModalOpen(false);
    setEvolutionSaving(false);
    setEvolutionStructuring(false);
    setEvolutionDraft(details?.evolution?.[0]?.evolution_text?.trim() ?? "");
    dragOffsetRef.current = 0;
  }, [open, details?.appointment?.id, details?.evolution]);

  const handleDragStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragStartRef.current = event.clientY;
    dragOffsetRef.current = 0;
    setIsDragging(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handleDragMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStartRef.current === null) return;
    const delta = Math.max(0, event.clientY - dragStartRef.current);
    dragOffsetRef.current = delta;
    setDragOffset(delta);
  };

  const finishDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStartRef.current === null) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    const sheetHeight = sheetRef.current?.getBoundingClientRect().height ?? 0;
    const threshold = Math.max(80, sheetHeight * 0.25);
    const finalOffset = dragOffsetRef.current;
    dragStartRef.current = null;
    setIsDragging(false);
    if (finalOffset > threshold) {
      setDragOffset(0);
      dragOffsetRef.current = 0;
      onClose();
      return;
    }
    setDragOffset(0);
    dragOffsetRef.current = 0;
  };

  if (!open || !portalTarget) return null;

  const appointment = details?.appointment ?? null;
  const attendance = details?.attendance ?? null;
  const messages = details?.messages ?? [];
  const clientName = appointment?.clients?.name?.trim() ?? "";
  const clientInitials = getInitials(clientName);
  const isVip = Boolean(appointment?.clients?.is_vip);
  const avatarUrl = appointment?.clients?.avatar_url ?? null;
  const startDate = appointment?.start_time ? new Date(appointment.start_time) : null;
  const dateLabel = startDate ? format(startDate, "dd MMM", { locale: ptBR }) : "";
  const timeLabel = startDate ? format(startDate, "HH:mm", { locale: ptBR }) : "";

  const appointmentAddress = [
    appointment?.address_logradouro,
    appointment?.address_numero,
    appointment?.address_complemento,
    appointment?.address_bairro,
    appointment?.address_cidade,
    appointment?.address_estado,
  ]
    .filter((value) => value && value.trim().length > 0)
    .join(", ");

  const clientAddress = [
    appointment?.clients?.address_logradouro,
    appointment?.clients?.address_numero,
    appointment?.clients?.address_complemento,
    appointment?.clients?.address_bairro,
    appointment?.clients?.address_cidade,
    appointment?.clients?.address_estado,
  ]
    .filter((value) => value && value.trim().length > 0)
    .join(", ");

  const isHomeVisit = typeof appointment?.is_home_visit === "boolean"
    ? appointment.is_home_visit
    : appointmentAddress.length > 0;

  const addressLine = appointmentAddress || clientAddress;

  const createdMessage = messageByType(messages, "created_confirmation");
  const reminderMessage = messageByType(messages, "reminder_24h");
  const createdAutoMessage = messageByRawType(messages, "auto_appointment_created");
  const reminderAutoMessage = messageByRawType(messages, "auto_appointment_reminder");
  const paymentChargeMessage = messageByType(messages, "payment_charge");
  const paymentReceiptMessage = messageByType(messages, "payment_receipt");
  const postSurveyMessage = messageByType(messages, "post_survey");
  const appointmentStatus = appointment?.status ?? "pending";
  const isCompleted = appointmentStatus === "completed";
  const shouldShowConfirmed = ["confirmed", "in_progress", "completed"].includes(appointmentStatus);
  const confirmedAt = shouldShowConfirmed ? attendance?.confirmed_at ?? null : null;
  const isConfirmed = Boolean(confirmedAt);
  const confirmedLabel = confirmedAt
    ? format(new Date(confirmedAt), "dd MMM 'às' HH:mm", { locale: ptBR })
    : "";
  const confirmedText = confirmedLabel ? `Confirmado em ${confirmedLabel}` : "Confirmado";
  const statusInfo = getStatusInfo(appointment?.status ?? "pending");
  const appointmentStatusDot = statusInfo.dotClass ?? "bg-amber-400";
  const rawPaymentStatus = appointment?.payment_status ?? "pending";
  const paymentStatus = Object.prototype.hasOwnProperty.call(paymentStatusMap, rawPaymentStatus)
    ? (rawPaymentStatus as PaymentStatus)
    : "pending";
  const paymentInfo = paymentStatusMap[paymentStatus];
  const hasAddress = addressLine.length > 0;
  const mapsHref = isHomeVisit && hasAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressLine)}`
    : null;
  const payments = details?.payments ?? [];
  const paidPayments = payments.filter((payment) => payment.status === "paid");
  const paidAmount = paidPayments.reduce((acc, payment) => acc + Number(payment.amount ?? 0), 0);
  const lastPaid = paidPayments.length > 0 ? paidPayments[paidPayments.length - 1] : null;
  const latestPaymentMethod = (() => {
    if (!lastPaid) return "Não informado";
    if (lastPaid.method === "pix") return "Pix";
    if (lastPaid.method === "cash") return "Dinheiro";
    if (lastPaid.method === "card") {
      if (lastPaid.card_mode === "debit") return "Cartão débito";
      if (lastPaid.card_mode === "credit") return "Cartão crédito";
      return "Cartão";
    }
    return "Outro";
  })();
  const paidAt = lastPaid?.paid_at ?? lastPaid?.created_at ?? null;
  const totalAmount = Number(details?.checkout?.total ?? appointment?.price ?? 0);
  const normalizedSignalPercentage = Number.isFinite(signalPercentage)
    ? Math.min(Math.max(signalPercentage, 0), 100)
    : 30;
  const signalBaseAmount = totalAmount > 0 ? totalAmount * (normalizedSignalPercentage / 100) : 0;
  const signalAmount = Math.round(signalBaseAmount * 100) / 100;
  const remainingAmount = Math.max(totalAmount - paidAmount, 0);
  const signalRemaining = Math.min(Math.max(signalAmount - paidAmount, 0), remainingAmount);
  const canRegisterSignal = paymentStatus === "pending" && paidAmount <= 0 && signalRemaining > 0;
  const canRegisterFull = paymentStatus !== "paid" && paymentStatus !== "waived" && remainingAmount > 0;
  const showManualRegister = canRegisterSignal || canRegisterFull;
  const paymentStatusLabel =
    paymentStatus === "paid"
      ? "Pago"
      : paymentStatus === "partial"
        ? "Parcial"
        : paymentStatus === "waived"
          ? "Liberado"
          : paymentStatus === "refunded"
            ? "Estornado"
            : "Não pago";
  const hasReceiptSent = isMessageSent(paymentReceiptMessage?.status);
  const hasChargeSent = isMessageSent(paymentChargeMessage?.status);
  const hasSurveySent = isMessageSent(postSurveyMessage?.status);
  const appointmentDurationMinutes = appointment?.actual_duration_minutes
    ? Math.max(1, appointment.actual_duration_minutes)
    : attendance?.actual_seconds
      ? Math.max(1, Math.round(attendance.actual_seconds / 60))
      : appointment?.total_duration_minutes ?? appointment?.service_duration_minutes ?? 0;
  const durationLabel = appointmentDurationMinutes > 0 ? `${appointmentDurationMinutes} min` : "Não informado";
  const followUpDateLabel =
    details?.post?.follow_up_due_at
      ? format(new Date(details.post.follow_up_due_at), "dd/MM/yyyy", { locale: ptBR })
      : "Não definido";
  const followUpNoteLabel =
    details?.post?.follow_up_note?.trim() && details.post.follow_up_note.trim().length > 0
      ? details.post.follow_up_note.trim()
      : "Sem observação registrada";
  const latestEvolutionText = details?.evolution?.[0]?.evolution_text?.trim() ?? "";
  const evolutionPreviewText = latestEvolutionText || "Sem evolução registrada nesta sessão.";
  const paymentDateLabel = paidAt ? format(new Date(paidAt), "dd/MM", { locale: ptBR }) : "";
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const openWhatsappWithMessage = (message: string) => {
    const phone = appointment?.clients?.phone ?? "";
    const digits = phone.replace(/\D/g, "");
    if (!digits) {
      onNotify?.(feedbackById("whatsapp_missing_phone"));
      return;
    }
    const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
    const url = `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const resolvePublicBaseUrl = () => {
    const raw = publicBaseUrl.trim();
    if (!raw) {
      if (typeof window === "undefined") return "";
      return window.location.origin.replace(/\/$/, "");
    }
    return /^https?:\/\//i.test(raw) ? raw.replace(/\/$/, "") : `https://${raw.replace(/\/$/, "")}`;
  };

  const buildPaymentLink = () => {
    const base = resolvePublicBaseUrl();
    return base ? `${base}/pagamento` : "";
  };

  const buildReceiptLink = (_paymentId?: string | null) => {
    void _paymentId;
    const base = resolvePublicBaseUrl();
    if (!base) return "";
    const receiptPath = buildAppointmentReceiptPath({
      appointmentId: appointment?.id ?? null,
      attendanceCode: appointment?.attendance_code ?? null,
    });
    return receiptPath ? `${base}${receiptPath}` : "";
  };

  const buildSignalChargeMessage = () => {
    const serviceName = appointment?.service_name ?? "";
    const dateValue = startDate ? format(startDate, "dd/MM", { locale: ptBR }) : "";
    const timeValue = startDate ? format(startDate, "HH:mm", { locale: ptBR }) : "";
    const signalValue = formatCurrency(signalAmount);
    const paymentLink = buildPaymentLink();
    const greeting = clientName ? `Olá, ${clientName}!` : "Olá!";
    const linkBlock = paymentLink
      ? `👇 Segue o link para pagamento:\n\n💰 Valor do Sinal: ${signalValue}\nLink:\n${paymentLink}\n\n`
      : "";

    return applyAutoMessageTemplate(messageTemplates.signal_charge, {
      greeting,
      service_name: serviceName,
      date_line: dateValue,
      time: timeValue,
      signal_amount: signalValue,
      payment_link_block: linkBlock,
    }).trim();
  };

  const buildSignalReceiptMessage = () => {
    const serviceName = appointment?.service_name ?? "";
    const paidValue = formatCurrency(paidAmount);
    const greeting = clientName ? `Olá, ${clientName}!` : "Olá!";
    const receiptLink = buildReceiptLink(lastPaid?.id ?? null);
    const receiptLine = receiptLink
      ? `🧾 Acesse seu recibo digital aqui:\n${receiptLink}\n\nVocê pode baixar ou imprimir direto pelo link.\n\n`
      : "";
    return applyAutoMessageTemplate(messageTemplates.signal_receipt, {
      greeting,
      service_name: serviceName,
      signal_amount: paidValue,
      receipt_link_block: receiptLine,
    }).trim();
  };

  const buildPaidReceiptMessage = (paymentId?: string | null) => {
    const serviceName = appointment?.service_name ?? "";
    const greeting = clientName ? `Olá, ${clientName}!` : "Olá!";
    const receiptLink = buildReceiptLink(paymentId ?? lastPaid?.id ?? null);
    const receiptLine = receiptLink
      ? `🧾 Acesse seu recibo digital aqui:\n${receiptLink}\n\nVocê pode baixar ou imprimir direto pelo link.\n\n`
      : "";
    return applyAutoMessageTemplate(messageTemplates.payment_receipt, {
      greeting,
      service_name: serviceName,
      receipt_link_block: receiptLine,
    }).trim();
  };

  const attendanceClientToken = attendanceCode ? attendanceCode.split("-")[1] ?? null : null;
  const attendanceCodeHint = attendanceClientToken?.startsWith("N")
    ? "ID cliente por nome"
    : attendanceClientToken?.startsWith("T")
      ? "ID cliente por telefone"
      : attendanceClientToken?.startsWith("A")
        ? "ID cliente de apoio"
        : null;

  const handleStructureEvolution = async () => {
    if (!onStructureEvolution || !evolutionDraft.trim()) return;
    setEvolutionStructuring(true);
    const result = await onStructureEvolution(evolutionDraft);
    if (result.ok && result.structuredText) {
      setEvolutionDraft(result.structuredText);
    }
    setEvolutionStructuring(false);
  };

  const handleSaveEvolution = async () => {
    if (!onSaveEvolution) return;
    setEvolutionSaving(true);
    const result = await onSaveEvolution(evolutionDraft);
    setEvolutionSaving(false);
    if (result.ok) {
      setEvolutionModalOpen(false);
    }
  };

  return createPortal(
    <div className="absolute inset-0 z-50 flex items-end justify-center pointer-events-none">
      <button
        type="button"
        aria-label="Fechar detalhes"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
      />

      <div
        ref={sheetRef}
        className={`relative w-full max-w-105 rounded-t-3xl bg-white shadow-float flex flex-col max-h-[90vh] pointer-events-auto ${
          isDragging ? "transition-none" : "transition-transform duration-200"
        }`}
        style={{ transform: dragOffset ? `translateY(${dragOffset}px)` : "translateY(0)" }}
      >
        <div
          className="flex items-center justify-center px-6 pt-4 pb-2 touch-none"
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
        >
          <div className="mx-auto h-1.5 w-12 rounded-full bg-gray-200" />
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              <div className="relative w-12 h-12 rounded-full overflow-hidden border border-line">
                <Image
                  src={avatarUrl}
                  alt={clientName}
                  fill
                  sizes="48px"
                  className="object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-studio-light text-studio-green flex items-center justify-center font-serif font-bold">
                {clientInitials ? clientInitials : <User className="w-5 h-5" />}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${appointmentStatusDot}`} title={statusInfo.label} />
                <p className="text-2xl font-serif font-bold text-studio-text truncate">{clientName}</p>
                {isVip && (
                  <span className="px-2.5 py-1 rounded-full bg-dom/20 text-dom-strong text-[9px] font-extrabold uppercase tracking-[0.08em]">
                    VIP
                  </span>
                )}
              </div>
              <p className="text-sm text-muted truncate">
                {appointment?.service_name ?? ""}{" "}
                {appointment?.service_duration_minutes ? `• ${appointment.service_duration_minutes} min` : ""}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span
                className={`px-3 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-[0.08em] ${paymentInfo.className}`}
              >
                {paymentInfo.label}
              </span>
            </div>
          </div>

          {loading && (
            <div className="mt-6 text-xs text-muted">Carregando detalhes...</div>
          )}

          {!loading && details && (
            isCompleted ? (
              <div className="mt-6 space-y-5">
                <section>
                  <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-muted mb-3">
                    <MapPin className="w-3.5 h-3.5" />
                    Logística
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white rounded-2xl p-3 border border-line text-center">
                      <span className="text-xs font-bold text-studio-text block">{dateLabel}</span>
                      <span className="text-[10px] font-bold text-muted uppercase">{timeLabel}</span>
                    </div>
                    <div className="bg-white rounded-2xl p-3 border border-line text-center">
                      <span className="text-xs font-bold text-studio-text block">{durationLabel}</span>
                      <span className="text-[10px] font-bold text-muted uppercase">Duração</span>
                    </div>
                    <div className="bg-white rounded-2xl p-3 border border-line text-center">
                      <span className="text-xs font-bold text-studio-text block">
                        {isHomeVisit ? "Domicílio" : "Estúdio"}
                      </span>
                      <span className="text-[10px] font-bold text-muted uppercase">Local</span>
                    </div>
                  </div>
                  {attendanceCode && (
                    <div className="mt-3 rounded-2xl border border-line bg-paper px-3 py-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted">
                          Código de atendimento
                        </span>
                        <code className="text-xs font-extrabold tracking-[0.08em] text-studio-text">
                          {attendanceCode}
                        </code>
                      </div>
                      {attendanceCodeHint && (
                        <p className="mt-1 text-[10px] text-muted">{attendanceCodeHint}</p>
                      )}
                    </div>
                  )}
                  {isHomeVisit && hasAddress && mapsHref && (
                    <a
                      href={mapsHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wide text-dom-strong"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      Abrir localização
                    </a>
                  )}
                </section>

                <section>
                  <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-muted mb-3">
                    <Wallet className="w-3.5 h-3.5" />
                    Pagamento
                  </div>
                  <div className="bg-white rounded-2xl border border-line px-4 py-3 shadow-sm space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted">Status</span>
                      <span className={`font-extrabold ${paymentInfo.textClass}`}>{paymentStatusLabel}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted">Valor pago</span>
                      <span className="font-bold text-studio-text">{formatCurrency(paidAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted">Método</span>
                      <span className="font-bold text-studio-text">{latestPaymentMethod}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted">A receber</span>
                      <span className="font-bold text-studio-text">{formatCurrency(remainingAmount)}</span>
                    </div>

                    <div className="pt-2 flex flex-wrap gap-2">
                      <span className="px-2 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-widest bg-stone-100 text-muted">
                        {hasReceiptSent ? "Recibo enviado" : "Recibo pendente"}
                      </span>
                      <span className="px-2 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-widest bg-stone-100 text-muted">
                        {hasChargeSent ? "Cobrança enviada" : "Cobrança pendente"}
                      </span>
                    </div>

                    {paymentStatus !== "paid" && paymentStatus !== "waived" && (
                      <div className="border-t border-line pt-3">
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted">
                          Incluir pagamento manual
                        </p>
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          {([
                            { key: "pix", label: "Pix", icon: <PaymentMethodIcon method="pix" className="h-3.5 w-3.5" /> },
                            { key: "card", label: "Cartão", icon: <PaymentMethodIcon method="card" className="h-3.5 w-3.5" /> },
                            { key: "cash", label: "Dinheiro", icon: <PaymentMethodIcon method="cash" className="h-3.5 w-3.5" /> },
                          ] as const).map((item) => (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() => setPaymentMethod(item.key)}
                              disabled={actionPending}
                              className={`h-9 rounded-xl text-[10px] font-extrabold border transition ${
                                paymentMethod === item.key
                                  ? "border-studio-green bg-studio-light text-studio-green"
                                  : "border-line text-muted hover:bg-paper"
                              } ${actionPending ? "opacity-60 cursor-not-allowed" : ""}`}
                            >
                              <span className="flex items-center justify-center gap-1.5">
                                {item.icon}
                                {item.label}
                              </span>
                            </button>
                          ))}
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={onSendPaymentCharge}
                            disabled={actionPending}
                            className="h-10 rounded-xl border border-studio-text/10 bg-white text-[10px] font-extrabold uppercase tracking-wide text-studio-text disabled:opacity-60"
                          >
                            {hasChargeSent ? "Reenviar cobrança" : "Enviar cobrança"}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onRecordPayment?.({
                                type: "full",
                                amount: remainingAmount,
                                method: paymentMethod,
                              })
                            }
                            disabled={actionPending || remainingAmount <= 0}
                            className="h-10 rounded-xl border border-studio-green bg-studio-light text-[10px] font-extrabold uppercase tracking-wide text-studio-green disabled:opacity-60"
                          >
                            Incluir pagamento
                          </button>
                        </div>
                      </div>
                    )}

                    {paymentStatus === "paid" && (
                      <div className="border-t border-line pt-3">
                        <button
                          type="button"
                          onClick={() => onSendPaymentReceipt(lastPaid?.id ?? null)}
                          disabled={actionPending || !lastPaid?.id}
                          className="w-full h-10 rounded-xl border border-studio-green bg-studio-light text-[10px] font-extrabold uppercase tracking-wide text-studio-green disabled:opacity-60"
                        >
                          {!lastPaid?.id
                            ? "Recibo indisponível"
                            : hasReceiptSent
                              ? "Reenviar recibo"
                              : "Enviar recibo"}
                        </button>
                      </div>
                    )}
                  </div>
                </section>

                <section>
                  <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-muted mb-3">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Avaliação e feedback
                  </div>
                  <div className="bg-white rounded-2xl border border-line px-4 py-3 shadow-sm space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted">Pesquisa</span>
                      <span className="font-bold text-studio-text">{hasSurveySent ? "Enviada" : "Pendente"}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted">Resposta</span>
                      <span className="font-bold text-studio-text">
                        {details.post?.survey_score !== null && details.post?.survey_score !== undefined
                          ? `Nota ${details.post?.survey_score}`
                          : "Sem resposta"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={onSendSurvey}
                      disabled={actionPending}
                      className="w-full h-10 rounded-xl border border-studio-text/10 bg-white text-[10px] font-extrabold uppercase tracking-wide text-studio-text disabled:opacity-60"
                    >
                      {hasSurveySent ? "Reenviar pesquisa" : "Enviar pesquisa"}
                    </button>
                  </div>
                </section>

                <section>
                  <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-muted mb-3">
                    <Eye className="w-3.5 h-3.5" />
                    Follow-up e evolução
                  </div>
                  <div className="bg-white rounded-2xl border border-line px-4 py-3 shadow-sm space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted">Próximo contato</span>
                      <span className="font-bold text-studio-text">{followUpDateLabel}</span>
                    </div>
                    <div className="text-xs text-muted">{followUpNoteLabel}</div>

                    <div className="rounded-xl border border-line bg-paper p-3">
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted mb-1">
                        Evolução da sessão
                      </p>
                      <p className="max-h-24 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-studio-text">
                        {evolutionPreviewText}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setEvolutionModalOpen(true)}
                      disabled={actionPending}
                      className="mt-1 w-full h-10 rounded-xl bg-studio-green text-[10px] font-extrabold uppercase tracking-wide text-white disabled:opacity-60"
                    >
                      Editar evolução
                    </button>
                  </div>
                </section>
              </div>
            ) : (
              <div className="mt-6 space-y-5">
              <section>
                <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-muted mb-3">
                  <MapPin className="w-3.5 h-3.5" />
                  Logística
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white rounded-2xl p-3 border border-line text-center">
                    <span className="text-xs font-bold text-studio-text block">{dateLabel}</span>
                    <span className="text-[10px] font-bold text-muted uppercase">{timeLabel}</span>
                  </div>
                  <div
                    className={`bg-white rounded-2xl p-3 border border-line col-span-2 relative ${
                      isHomeVisit ? "" : "flex items-center justify-center"
                    }`}
                  >
                    {isHomeVisit ? (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-dom-strong">
                            Domicílio
                          </span>
                        </div>
                        {hasAddress && (
                          <p className="text-xs font-bold text-studio-text truncate pr-8 mt-1">
                            {addressLine}
                          </p>
                        )}
                        {hasAddress && mapsHref && (
                          <a
                            href={mapsHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center text-dom-strong shadow-sm border border-line"
                            aria-label="Abrir rota no mapa"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </>
                    ) : (
                      <p className="text-base font-extrabold text-studio-green tracking-wide w-full text-center">
                        Estúdio
                      </p>
                    )}
                  </div>
                </div>
                {attendanceCode && (
                  <div className="mt-3 rounded-2xl border border-line bg-paper px-3 py-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted">
                        Código de atendimento
                      </span>
                      <code className="text-xs font-extrabold tracking-[0.08em] text-studio-text">
                        {attendanceCode}
                      </code>
                    </div>
                    {attendanceCodeHint && (
                      <p className="mt-1 text-[10px] text-muted">{attendanceCodeHint}</p>
                    )}
                  </div>
                )}
              </section>

              <section>
                <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-muted mb-3">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Comunicação
                </div>

                <div className="bg-white rounded-2xl border border-line px-4 py-2 shadow-sm">
                  <div className="flex items-center justify-between gap-3 py-3 border-b border-line">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-red-50 text-red-400 flex items-center justify-center">
                        <Bell className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-studio-text">Aviso de Agendamento</p>
                        <p className="text-[10px] text-muted">
                          {isMessageSent(createdMessage?.status) ? formatSentLabel(createdMessage?.sent_at ?? null) : "Pendente de envio"}
                        </p>
                        <p className="text-[10px] text-muted">{getAutomationStatusLabel(createdAutoMessage)}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={onSendCreatedMessage}
                      disabled={actionPending}
                      className="px-3 py-1.5 bg-studio-text text-white rounded-full text-[10px] font-extrabold transition disabled:opacity-60"
                    >
                      {isMessageSent(createdMessage?.status) ? "Reenviar" : "Enviar"}
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-3 py-3 border-b border-line">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-50 text-green-500 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-studio-text">Lembrete 24h</p>
                        <p className="text-[10px] text-muted">
                          {isMessageSent(reminderMessage?.status)
                            ? formatSentLabel(reminderMessage?.sent_at ?? null)
                            : "Pendente de envio"}
                        </p>
                        <p className="text-[10px] text-muted">{getAutomationStatusLabel(reminderAutoMessage)}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={onSendReminder}
                      disabled={actionPending}
                      className="px-3 py-1.5 bg-studio-text text-white rounded-full text-[10px] font-extrabold transition disabled:opacity-60"
                    >
                      {isMessageSent(reminderMessage?.status) ? "Reenviar" : "Enviar"}
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-3 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center">
                        <ThumbsUp className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-studio-text">Confirmação do Cliente</p>
                        <p className="text-[10px] text-muted">
                          {isConfirmed ? confirmedText : "Aguardando resposta..."}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isConfirmed && (
                        <button
                          type="button"
                          onClick={onConfirmClient}
                          disabled={actionPending}
                          className="px-3 py-1.5 border border-studio-green text-studio-green rounded-full text-[10px] font-extrabold transition disabled:opacity-60"
                        >
                          Confirmar
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setCancelDialogOpen(true)}
                        disabled={actionPending}
                        className="px-3 py-1.5 border border-red-200 text-red-600 rounded-full text-[10px] font-extrabold transition disabled:opacity-60"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-muted mb-3">
                  <Wallet className="w-3.5 h-3.5" />
                  Financeiro
                </div>

                <div className="bg-white rounded-2xl border border-line px-4 py-2 shadow-sm">
                  {paymentStatus === "pending" && (
                    <div className="flex items-center justify-between gap-3 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center">
                          <Wallet className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-studio-text">Sinal / Reserva</p>
                          <p className="text-[10px] text-amber-600 font-semibold">Pendente</p>
                          {signalAmount > 0 && (
                            <p className="text-[10px] text-muted">Valor do sinal: {formatCurrency(signalAmount)}</p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => openWhatsappWithMessage(buildSignalChargeMessage())}
                        disabled={actionPending}
                        className="px-3 py-1.5 bg-studio-text text-white rounded-full text-[10px] font-extrabold transition disabled:opacity-60"
                      >
                        Cobrar Sinal
                      </button>
                    </div>
                  )}

                  {paymentStatus === "partial" && (
                    <div className="flex items-center justify-between gap-3 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center">
                          <Wallet className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-studio-text">Sinal / Reserva</p>
                          <p className="text-[10px] text-emerald-600 font-semibold">
                            {paymentDateLabel ? `Pago em ${paymentDateLabel}` : "Pago"}
                          </p>
                          {paidAmount > 0 && (
                            <p className="text-[10px] text-muted">Valor pago: {formatCurrency(paidAmount)}</p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => openWhatsappWithMessage(buildSignalReceiptMessage())}
                        disabled={actionPending}
                        className="px-3 py-1.5 bg-studio-text text-white rounded-full text-[10px] font-extrabold transition disabled:opacity-60"
                      >
                        Enviar comprovante
                      </button>
                    </div>
                  )}

                  {paymentStatus === "paid" && (
                    <div className="flex items-center justify-between gap-3 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center">
                          <Wallet className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-studio-text">Pagamento integral</p>
                          <p className="text-[10px] text-emerald-600 font-semibold">
                            {paymentDateLabel ? `Pago integralmente em ${paymentDateLabel}` : "Pago integralmente"}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => openWhatsappWithMessage(buildPaidReceiptMessage())}
                        disabled={actionPending}
                        className="px-3 py-1.5 bg-studio-text text-white rounded-full text-[10px] font-extrabold transition disabled:opacity-60"
                      >
                        Enviar comprovante
                      </button>
                    </div>
                  )}

                  {paymentStatus === "waived" && (
                    <div className="flex items-center justify-between gap-3 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-sky-50 text-sky-500 flex items-center justify-center">
                          <Wallet className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-studio-text">Pagamento liberado</p>
                          <p className="text-[10px] text-sky-600 font-semibold">
                            Cobrança dispensada por decisão interna
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1.5 rounded-full bg-sky-50 text-sky-700 text-[10px] font-extrabold">
                        Sem cobrança
                      </span>
                    </div>
                  )}

                  {paymentStatus === "refunded" && (
                    <div className="flex items-center justify-between gap-3 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center">
                          <Wallet className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-studio-text">Pagamento estornado</p>
                          <p className="text-[10px] text-slate-600 font-semibold">
                            Reavalie cobrança complementar, se necessário
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {showManualRegister && (
                    <div className="border-t border-line pt-3">
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted">
                        Registrar pagamento manual
                      </p>
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {([
                          { key: "pix", label: "Pix", icon: <PaymentMethodIcon method="pix" className="h-3.5 w-3.5" /> },
                          { key: "card", label: "Cartão", icon: <PaymentMethodIcon method="card" className="h-3.5 w-3.5" /> },
                          { key: "cash", label: "Dinheiro", icon: <PaymentMethodIcon method="cash" className="h-3.5 w-3.5" /> },
                        ] as const).map((item) => (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => setPaymentMethod(item.key)}
                            disabled={actionPending}
                            className={`h-9 rounded-xl text-[10px] font-extrabold border transition ${
                              paymentMethod === item.key
                                ? "border-studio-green bg-studio-light text-studio-green"
                                : "border-line text-muted hover:bg-paper"
                            } ${actionPending ? "opacity-60 cursor-not-allowed" : ""}`}
                          >
                            <span className="flex items-center justify-center gap-1.5">
                              {item.icon}
                              {item.label}
                            </span>
                          </button>
                        ))}
                      </div>

                      <div className={`mt-3 grid gap-2 ${canRegisterSignal && canRegisterFull ? "grid-cols-2" : "grid-cols-1"}`}>
                        {canRegisterSignal && (
                          <button
                            type="button"
                            onClick={() =>
                              onRecordPayment?.({
                                type: "signal",
                                amount: signalRemaining,
                                method: paymentMethod,
                              })
                            }
                            disabled={actionPending}
                            className={`h-10 rounded-xl text-[10px] font-extrabold uppercase tracking-wide border transition ${
                              "border-amber-200 text-amber-700 bg-amber-50"
                            } ${actionPending ? "opacity-60 cursor-not-allowed" : ""}`}
                          >
                            Registrar sinal ({formatCurrency(signalRemaining)})
                          </button>
                        )}
                        {canRegisterFull && (
                          <button
                            type="button"
                            onClick={() =>
                              onRecordPayment?.({
                                type: "full",
                                amount: remainingAmount,
                                method: paymentMethod,
                              })
                            }
                            disabled={actionPending}
                            className={`h-10 rounded-xl text-[10px] font-extrabold uppercase tracking-wide border transition ${
                              "border-studio-green text-studio-green bg-studio-light"
                            } ${actionPending ? "opacity-60 cursor-not-allowed" : ""}`}
                          >
                            Pagamento integral ({formatCurrency(remainingAmount)})
                          </button>
                        )}
                      </div>
                      <p className="mt-2 text-[10px] text-muted">
                        O valor do sinal segue a porcentagem configurada nas configurações.
                      </p>
                    </div>
                  )}
                </div>
              </section>

              <section>
                <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-muted mb-3">
                  <Eye className="w-3.5 h-3.5" />
                  Atenção
                </div>
                {appointment?.internal_notes?.trim() && (
                  <div className="bg-yellow-50 border border-yellow-100 p-3 rounded-xl flex gap-3 items-start">
                    <StickyNote className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-yellow-700 mb-1">
                        Observação do formulário de agendamento
                      </p>
                      <p className="text-xs text-yellow-800 leading-relaxed">{appointment.internal_notes}</p>
                    </div>
                  </div>
                )}
              </section>
              </div>
            )
          )}
        </div>

        {isCompleted && (
          <AppointmentDetailsEvolutionModal
            open={evolutionModalOpen}
            draft={evolutionDraft}
            saving={evolutionSaving}
            structuring={evolutionStructuring}
            actionPending={actionPending}
            canSave={Boolean(onSaveEvolution)}
            canStructure={Boolean(onStructureEvolution)}
            onClose={() => setEvolutionModalOpen(false)}
            onChangeDraft={setEvolutionDraft}
            onStructure={() => void handleStructureEvolution()}
            onSave={() => void handleSaveEvolution()}
          />
        )}

        {!isCompleted && (
          <div className="border-t border-line px-6 py-4 bg-white/95 backdrop-blur">
            <button
              type="button"
              onClick={onStartSession}
              disabled={!details || actionPending}
              className="w-full h-12 rounded-2xl bg-studio-green text-white font-extrabold text-xs uppercase tracking-wide shadow-lg shadow-green-200 active:scale-95 transition disabled:opacity-60"
            >
              Ver atendimento
            </button>
          </div>
        )}
      </div>

      <AppointmentDetailsCancelDialog
        open={cancelDialogOpen}
        notifyClientOnCancel={notifyClientOnCancel}
        actionPending={actionPending}
        onClose={() => {
          setCancelDialogOpen(false);
          setNotifyClientOnCancel(false);
        }}
        onChangeNotifyClient={setNotifyClientOnCancel}
        onConfirmCancel={() => {
          setCancelDialogOpen(false);
          onCancelAppointment({ notifyClient: notifyClientOnCancel });
          setNotifyClientOnCancel(false);
        }}
      />
    </div>,
    portalTarget
  );
}
