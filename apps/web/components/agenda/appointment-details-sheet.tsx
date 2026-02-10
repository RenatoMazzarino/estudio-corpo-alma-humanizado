"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { format, isToday, isYesterday } from "date-fns";
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
import type { AttendanceOverview, AppointmentMessage, MessageType } from "../../lib/attendance/attendance-types";
import { DEFAULT_PUBLIC_BASE_URL } from "../../src/shared/config";

interface AppointmentDetailsSheetProps {
  open: boolean;
  loading?: boolean;
  actionPending?: boolean;
  details: AttendanceOverview | null;
  signalPercentage?: number;
  publicBaseUrl?: string;
  onClose: () => void;
  onStartSession: () => void;
  onSendCreatedMessage: () => void;
  onSendReminder: () => void;
  onConfirmClient: () => void;
  onCancelAppointment: () => void;
  onRecordPayment?: (payload: { type: "signal" | "full"; amount: number; method: "pix" | "card" | "cash" | "other" }) => void;
}

const messageByType = (messages: AppointmentMessage[], type: MessageType) =>
  messages.find((message) => message.type === type) ?? null;

const isMessageSent = (status?: string | null) =>
  status === "sent_manual" || status === "sent_auto" || status === "delivered";

const formatSentLabel = (sentAt?: string | null) => {
  if (!sentAt) return "Pendente de envio";
  const sentDate = new Date(sentAt);
  if (isToday(sentDate)) {
    return `Enviada hoje às ${format(sentDate, "HH:mm", { locale: ptBR })}`;
  }
  if (isYesterday(sentDate)) {
    return `Enviada ontem às ${format(sentDate, "HH:mm", { locale: ptBR })}`;
  }
  return `Enviada em ${format(sentDate, "dd MMM 'às' HH:mm", { locale: ptBR })}`;
};

const getInitials = (name: string) => {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) return "";
  const first = parts[0] ?? "";
  const last = parts[parts.length - 1] ?? "";
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
};

const getStatusInfo = (status?: string | null) => {
  switch (status) {
    case "confirmed":
      return { label: "Confirmado", className: "bg-studio-green/10 text-studio-green", dotClass: "bg-studio-green" };
    case "in_progress":
      return { label: "Em andamento", className: "bg-amber-100 text-amber-700", dotClass: "bg-sky-500" };
    case "completed":
      return { label: "Concluído", className: "bg-emerald-100 text-emerald-700", dotClass: "bg-emerald-500" };
    case "canceled_by_client":
      return { label: "Cancelado (cliente)", className: "bg-red-100 text-red-600", dotClass: "bg-red-500" };
    case "canceled_by_studio":
      return { label: "Cancelado", className: "bg-red-100 text-red-600", dotClass: "bg-red-500" };
    case "no_show":
      return { label: "Não compareceu", className: "bg-gray-100 text-gray-500", dotClass: "bg-gray-400" };
    default:
      return { label: "Agendado", className: "bg-orange-50 text-orange-600", dotClass: "bg-amber-400" };
  }
};

const paymentStatusMap = {
  paid: { label: "PAGO", className: "bg-emerald-50 text-emerald-700", textClass: "text-emerald-600" },
  partial: { label: "SINAL PAGO", className: "bg-amber-50 text-amber-700", textClass: "text-amber-600" },
  pending: { label: "A RECEBER", className: "bg-gray-100 text-gray-500", textClass: "text-gray-500" },
} as const;

type PaymentStatus = keyof typeof paymentStatusMap;
type PaymentMethod = "pix" | "card" | "cash" | "other";

export function AppointmentDetailsSheet({
  open,
  loading = false,
  actionPending = false,
  details,
  signalPercentage = 30,
  publicBaseUrl = DEFAULT_PUBLIC_BASE_URL,
  onClose,
  onStartSession,
  onSendCreatedMessage,
  onSendReminder,
  onConfirmClient,
  onCancelAppointment,
  onRecordPayment,
}: AppointmentDetailsSheetProps) {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<number | null>(null);
  const dragOffsetRef = useRef(0);

  useEffect(() => {
    setPortalTarget(document.getElementById("app-frame"));
  }, []);

  useEffect(() => {
    if (!open) {
      setCancelDialogOpen(false);
      setDragOffset(0);
      dragOffsetRef.current = 0;
      return;
    }
    setCancelDialogOpen(false);
    setDragOffset(0);
    setPaymentMethod("pix");
    dragOffsetRef.current = 0;
  }, [open, details?.appointment?.id]);

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
  const isConfirmed = Boolean(attendance?.confirmed_at);
  const confirmedLabel = attendance?.confirmed_at
    ? format(new Date(attendance.confirmed_at), "dd MMM 'às' HH:mm", { locale: ptBR })
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
  const canRegisterFull = paymentStatus !== "paid" && remainingAmount > 0;
  const showManualRegister = canRegisterSignal || canRegisterFull;
  const paymentDateLabel = paidAt ? format(new Date(paidAt), "dd/MM", { locale: ptBR }) : "";
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const openWhatsappWithMessage = (message: string) => {
    const phone = appointment?.clients?.phone ?? "";
    const digits = phone.replace(/\D/g, "");
    if (!digits) {
      window.alert("Sem telefone de WhatsApp cadastrado.");
      return;
    }
    const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
    const url = `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const resolvePublicBaseUrl = () => {
    const raw = publicBaseUrl.trim();
    if (!raw) return "";
    return /^https?:\/\//i.test(raw) ? raw.replace(/\/$/, "") : `https://${raw.replace(/\/$/, "")}`;
  };

  const buildPaymentLink = () => {
    const base = resolvePublicBaseUrl();
    return base ? `${base}/pagamento` : "";
  };

  const buildReceiptLink = () => {
    const base = resolvePublicBaseUrl();
    const appointmentId = appointment?.id;
    return base && appointmentId ? `${base}/comprovante/${appointmentId}` : "";
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
    return `${greeting} Tudo bem? 🌿\n\nAqui é a Flora, assistente virtual do Estúdio Corpo & Alma Humanizado.\n\nFiquei muito feliz com seu agendamento! Para deixarmos o seu horário de ${serviceName} reservadinho e confirmado para o dia ${dateValue} às ${timeValue}, precisamos apenas da confirmação do sinal/reserva.\n\n${linkBlock}É rapidinho! Assim que confirmar, eu já te envio o comprovante e garantimos a sua vaga.\n\nQualquer dúvida, estou por aqui! Um abraço 🌸`;
  };

  const buildSignalReceiptMessage = () => {
    const serviceName = appointment?.service_name ?? "";
    const paidValue = formatCurrency(paidAmount);
    const greeting = clientName ? `Olá, ${clientName}!` : "Olá!";
    const receiptLink = buildReceiptLink();
    const receiptLine = receiptLink
      ? `🧾 Acesse seu recibo digital aqui:\n${receiptLink}\n\nVocê pode baixar ou imprimir direto pelo link.\n\n`
      : "";
    return `${greeting} Tudo bem? 🌿 Aqui é a Flora. Passando para confirmar que recebemos seu sinal de ${paidValue}! ✨ Seu horário para ${serviceName} está reservado.\n\n${receiptLine}Até o dia do atendimento! 🌸`;
  };

  const buildPaidReceiptMessage = () => {
    const serviceName = appointment?.service_name ?? "";
    const greeting = clientName ? `Olá, ${clientName}!` : "Olá!";
    const receiptLink = buildReceiptLink();
    const receiptLine = receiptLink
      ? `🧾 Acesse seu recibo digital aqui:\n${receiptLink}\n\nVocê pode baixar ou imprimir direto pelo link.\n\n`
      : "";
    return `${greeting} Tudo bem? 🌿\n\nAqui é a Flora, assistente virtual do Estúdio Corpo & Alma. Passando para avisar que recebemos o seu pagamento e está tudo certinho! ✨\n\nSeu horário para ${serviceName} está super confirmado.\n\n${receiptLine}Até o dia do atendimento! 🌸`;
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
                  <span className="px-2.5 py-1 rounded-full bg-purple-50 text-dom text-[9px] font-extrabold uppercase tracking-[0.08em]">
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
                          <span className="text-[9px] font-bold uppercase tracking-wider text-dom">
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
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center text-dom shadow-sm border border-line"
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

                  {showManualRegister && (
                    <div className="border-t border-line pt-3">
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted">
                        Registrar pagamento manual
                      </p>
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {([
                          { key: "pix", label: "Pix" },
                          { key: "card", label: "Cartão" },
                          { key: "cash", label: "Dinheiro" },
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
                            {item.label}
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
          )}
        </div>

        <div className="border-t border-line px-6 py-4 bg-white/95 backdrop-blur">
          <button
            type="button"
            onClick={onStartSession}
            disabled={!details || actionPending}
            className="w-full h-12 rounded-2xl bg-studio-green text-white font-extrabold text-xs uppercase tracking-wide shadow-lg shadow-green-200 active:scale-95 transition disabled:opacity-60"
          >
            Iniciar sessão
          </button>
        </div>
      </div>

      {cancelDialogOpen && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center pointer-events-auto">
          <button
            type="button"
            aria-label="Fechar confirmação"
            onClick={() => setCancelDialogOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <div className="relative mx-6 w-full max-w-xs rounded-2xl bg-white p-5 shadow-float">
            <h3 className="text-sm font-extrabold text-studio-text">Cancelar agendamento?</h3>
            <p className="text-xs text-muted mt-2">
              Se cancelar, este card vai sumir da agenda e o horário ficará livre novamente.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setCancelDialogOpen(false)}
                className="flex-1 rounded-full border border-line px-3 py-2 text-[10px] font-extrabold text-studio-text"
              >
                Manter
              </button>
              <button
                type="button"
                onClick={() => {
                  setCancelDialogOpen(false);
                  onCancelAppointment();
                }}
                disabled={actionPending}
                className="flex-1 rounded-full bg-red-600 px-3 py-2 text-[10px] font-extrabold text-white transition disabled:opacity-60"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    portalTarget
  );
}
