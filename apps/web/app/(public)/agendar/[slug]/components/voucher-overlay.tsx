"use client";

import type { RefObject } from "react";
import { VoucherTicketCard } from "../../../../../components/voucher/voucher-ticket-card";

interface VoucherOverlayProps {
  open: boolean;
  busy: boolean;
  onCloseAction: () => void;
  onDownloadAction: () => void;
  onShareAction: () => void;
  voucherRef: RefObject<HTMLDivElement | null>;
  clientName: string;
  formattedDate: string;
  selectedTime: string;
  selectedServiceName: string;
  isHomeVisit: boolean;
  mapsQuery: string;
  protocol: string;
}

export function VoucherOverlay({
  open,
  busy,
  onCloseAction,
  onDownloadAction,
  onShareAction,
  voucherRef,
  clientName,
  formattedDate,
  selectedTime,
  selectedServiceName,
  isHomeVisit,
  mapsQuery,
  protocol,
}: VoucherOverlayProps) {
  if (!open) return null;

  const [dayPart = "", monthPart = "", yearPart = ""] = formattedDate.split("/");
  const monthIndex = Number(monthPart) - 1;
  const monthNames = [
    "JAN",
    "FEV",
    "MAR",
    "ABR",
    "MAI",
    "JUN",
    "JUL",
    "AGO",
    "SET",
    "OUT",
    "NOV",
    "DEZ",
  ];
  const monthLabel = monthNames[monthIndex] ?? monthPart;
  const dayAndMonth = `${dayPart} ${monthLabel}`.trim();
  const locationLabel = isHomeVisit
    ? `Home Care - ${mapsQuery || "Endereço informado"}`
    : "No Estúdio - Estúdio Corpo & Alma Humanizado";
  const bookingId = protocol || `AGD-${dayPart || "00"}${monthPart || "00"}${yearPart.slice(-2) || "00"}`;
  const colors = {
    overlayBackdrop: "rgba(0, 0, 0, 0.68)",
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 backdrop-blur-[1px]"
        style={{ backgroundColor: colors.overlayBackdrop }}
        onClick={onCloseAction}
      />
      <div className="relative z-10 w-full max-w-117">
        <div className="absolute right-2 top-2 z-20">
          <button
            type="button"
            onClick={onCloseAction}
            className="w-10 h-10 rounded-full bg-white/95 border border-stone-100 text-gray-400 flex items-center justify-center shadow-soft"
          >
            ✕
          </button>
        </div>
        <div className="max-h-[78vh] overflow-y-auto pt-12 no-scrollbar">
          <VoucherTicketCard
            innerRef={voucherRef}
            capture
            clientName={clientName || "CLIENTE"}
            dayLabel={dayAndMonth}
            timeLabel={selectedTime}
            serviceName={selectedServiceName}
            locationLabel={locationLabel}
            bookingId={bookingId}
          />
        </div>

        <div className="mt-3 rounded-2xl border border-white/30 bg-white/95 p-3 flex gap-2 shadow-2xl">
          <button
            type="button"
            onClick={onDownloadAction}
            disabled={busy}
            className="flex-1 h-11 rounded-2xl border border-stone-200 text-xs font-bold text-studio-text uppercase tracking-widest"
          >
            {busy ? "Gerando..." : "Baixar imagem"}
          </button>
          <button
            type="button"
            onClick={onShareAction}
            disabled={busy}
            className="flex-1 h-11 rounded-2xl bg-studio-green text-white text-xs font-bold uppercase tracking-widest"
          >
            Enviar WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
