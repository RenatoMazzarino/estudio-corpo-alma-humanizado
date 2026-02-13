"use client";

import Image from "next/image";
import { MapPin } from "lucide-react";
import type { RefObject } from "react";

interface VoucherOverlayProps {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onDownload: () => void;
  onShare: () => void;
  voucherRef: RefObject<HTMLDivElement | null>;
  clientName: string;
  clientPhone: string;
  formattedDate: string;
  selectedTime: string;
  selectedServiceName: string;
  selectedServiceDescription?: string | null;
  selectedServiceDurationMinutes: number;
  isHomeVisit: boolean;
  mapsQuery: string;
  protocol: string;
}

export function VoucherOverlay({
  open,
  busy,
  onClose,
  onDownload,
  onShare,
  voucherRef,
  clientName,
  clientPhone,
  formattedDate,
  selectedTime,
  selectedServiceName,
  selectedServiceDescription,
  selectedServiceDurationMinutes,
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
  const procedureSubtitle =
    selectedServiceDescription?.trim() || "Terapêutica e Relaxante";
  const bookingId = protocol || `AGD-${dayPart || "00"}${monthPart || "00"}${yearPart.slice(-2) || "00"}`;
  const barcodePattern = [1, 2, 1, 3, 1, 4, 2, 1, 3, 1, 2, 1];

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-[1px]" onClick={onClose} />
      <div className="relative z-10 w-full max-w-[430px]">
        <div className="absolute right-2 top-2 z-20">
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/95 border border-stone-100 text-gray-400 flex items-center justify-center shadow-soft"
          >
            ✕
          </button>
        </div>
        <div className="max-h-[78vh] overflow-y-auto pt-12 no-scrollbar">
          <div
            ref={voucherRef}
            data-voucher-capture="true"
            className="w-full max-w-[380px] mx-auto bg-transparent relative rounded-[14px] overflow-hidden"
            style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.22)" }}
          >
            <div className="bg-studio-green px-8 py-7 pb-9 text-center relative overflow-hidden">
              <svg
                className="absolute top-0 right-0 w-32 h-32 text-white/12 pointer-events-none"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M17 8c-9 2-11.1 8.17-13.18 13.34L5.71 22l.95-2.3c.48.17.98.3 1.34.3 11 0 14-17 14-17-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8Z" />
              </svg>
              <div className="relative z-10 flex flex-col items-center">
                <Image
                  src="/brand/logo-horizontal.png"
                  alt="Estúdio Corpo & Alma Humanizado"
                  width={170}
                  height={55}
                  className="h-11 w-auto object-contain mb-3"
                />
                <h3 className="font-serif text-[39px] sm:text-[45px] text-white leading-[1.1] mb-2">
                  Estúdio Corpo & Alma
                  <br />
                  Humanizado
                </h3>                
                <p className="font-signature text-[52px] text-dom/95 -rotate-2 leading-none">
                  Voucher de Serviço
                </p>
              </div>
            </div>

            <div className="relative h-0 z-10">
              <div className="absolute top-0 left-5 right-5 border-t-[3px] border-dotted border-black/30" />
              <div className="absolute -left-4 -top-4 w-8 h-8 rounded-full bg-[#171717]" />
              <div className="absolute -right-4 -top-4 w-8 h-8 rounded-full bg-[#171717]" />
            </div>

            <div className="voucher-paper-texture px-6 py-8 pb-7 text-center text-studio-text">
              <div className="flex items-center justify-center gap-3 mb-1">
                <span className="font-serif text-5xl font-bold leading-none">{dayAndMonth}</span>
                <span className="h-8 w-[2px] bg-studio-text/30" />
                <span className="font-serif text-5xl font-bold leading-none">{selectedTime}</span>
              </div>
              <p className="text-[24px] font-bold uppercase tracking-[0.09em] mb-7 truncate px-2">
                CLIENTE: {clientName || "CLIENTE"}
              </p>

              <div className="border border-studio-green/25 rounded-xl p-5 mb-7 bg-white/50">
                <p className="text-xs font-bold uppercase tracking-[0.2em] mb-2 text-studio-green">
                  Procedimento
                </p>
                <h3 className="font-serif text-[48px] text-studio-green leading-[1.05] mb-2 break-words">
                  {selectedServiceName}
                </h3>
                <p className="text-sm text-studio-text/70">
                  {procedureSubtitle}
                  {selectedServiceDurationMinutes > 0
                    ? ` • ${selectedServiceDurationMinutes} min`
                    : ""}
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 text-studio-text/80 px-2">
                <MapPin className="w-5 h-5 text-studio-green shrink-0" />
                <p className="text-sm font-medium truncate">{locationLabel}</p>
              </div>
            </div>

            <div className="relative h-0 z-10">
              <div className="absolute top-0 left-5 right-5 border-t-[3px] border-dotted border-black/30" />
              <div className="absolute -left-4 -top-4 w-8 h-8 rounded-full bg-[#171717]" />
              <div className="absolute -right-4 -top-4 w-8 h-8 rounded-full bg-[#171717]" />
            </div>

            <div className="voucher-paper-texture px-6 py-6 rounded-b-[14px] flex items-end justify-between gap-4">
              <div className="text-left min-w-0">
                <p
                  className="font-signature text-[64px] text-studio-text mb-1 ml-[-5px] leading-none"
                  style={{ transform: "rotate(-3deg)" }}
                >
                  Janaina Santos
                </p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-studio-text/60">
                  BOOKING ID: {bookingId}
                </p>
                {clientPhone && (
                  <p className="text-[10px] font-semibold text-studio-text/50 mt-1">{clientPhone}</p>
                )}
              </div>
              <div className="h-12 flex items-end gap-[3px] opacity-85 shrink-0">
                {barcodePattern.map((width, index) => (
                  <span
                    key={`${index}-${width}`}
                    className="inline-block h-full bg-studio-text"
                    style={{ width: `${Math.max(1, width) * 3}px` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-white/30 bg-white/95 p-3 flex gap-2 shadow-2xl">
          <button
            type="button"
            onClick={onDownload}
            disabled={busy}
            className="flex-1 h-11 rounded-2xl border border-stone-200 text-xs font-bold text-studio-text uppercase tracking-widest"
          >
            {busy ? "Gerando..." : "Baixar imagem"}
          </button>
          <button
            type="button"
            onClick={onShare}
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
