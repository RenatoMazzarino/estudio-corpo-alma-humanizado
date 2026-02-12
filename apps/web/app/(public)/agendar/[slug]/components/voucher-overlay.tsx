"use client";

import Image from "next/image";
import { CheckCircle2, MapPin, Sparkles } from "lucide-react";
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
  selectedServiceDurationMinutes,
  isHomeVisit,
  mapsQuery,
  protocol,
}: VoucherOverlayProps) {
  if (!open) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-[1px]" onClick={onClose} />
      <div className="relative z-10 w-full max-w-107.5">
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
            className="w-full max-w-95 mx-auto bg-transparent relative drop-shadow-2xl"
          >
            <div className="bg-studio-green rounded-t-4xl p-8 pb-10 text-center relative overflow-hidden">
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: "radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                }}
              />

              <div className="relative z-10 flex flex-col items-center">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mb-4 border"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.2)",
                    borderColor: "rgba(255,255,255,0.3)",
                  }}
                >
                  <Image
                    src="/brand/logo.png"
                    alt="Estúdio Corpo & Alma Humanizado"
                    width={26}
                    height={26}
                    className="h-6 w-6 object-contain"
                  />
                </div>

                <h3 className="font-sans font-bold text-2xl text-white leading-tight mb-1">
                  Estúdio Corpo & Alma
                  <br />
                  Humanizado
                </h3>
                <p className="text-white/80 text-[10px] uppercase tracking-[0.2em] font-bold">
                  Estúdio de bem-estar
                </p>

                <div
                  className="mt-6 px-4 py-1.5 rounded-full border"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.2)",
                    borderColor: "rgba(255,255,255,0.3)",
                  }}
                >
                  <span className="text-white text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3" /> Voucher de Serviço
                  </span>
                </div>
              </div>
            </div>

            <div className="relative bg-white h-6 overflow-visible">
              <div className="absolute -top-3 -left-3 w-6 h-6 rounded-full bg-[#faf9f6] z-20" />
              <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-[#faf9f6] z-20" />
              <div className="absolute top-1/2 left-4 right-4 border-t-2 border-dashed border-gray-200" />
            </div>

            <div className="bg-white rounded-b-4xl p-6 pt-2 pb-8">
              <div className="flex justify-between items-end mb-6">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                    Cliente
                  </p>
                  <p className="text-lg font-bold text-studio-dark leading-none">
                    {clientName || "Cliente"}
                  </p>
                  <p className="text-xs text-gray-500">{clientPhone || ""}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                    Data
                  </p>
                  <p className="text-sm font-bold text-studio-dark">{formattedDate}</p>
                  <p className="text-xs text-gray-500">{selectedTime}</p>
                </div>
              </div>

              <div className="bg-stone-50 border border-stone-100 rounded-2xl p-4 space-y-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-studio-green mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-studio-dark">{selectedServiceName}</p>
                    <p className="text-xs text-gray-400">Serviço confirmado</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 border-t border-stone-100 pt-3">
                  <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-orange-400 mt-0.5">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-studio-dark">
                      {isHomeVisit ? "Atendimento em Domicílio" : "Atendimento no Estúdio"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {isHomeVisit ? mapsQuery || "Endereço informado" : "Estúdio Corpo & Alma Humanizado"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-baseline border-t border-dashed border-gray-200 pt-4">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Voucher de serviço
                </span>
                <span className="text-sm font-bold text-studio-dark">
                  {selectedServiceDurationMinutes} min
                </span>
              </div>

              <div className="mt-8 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-50 border border-gray-100">
                  <CheckCircle2 className="w-3 h-3 text-gray-400" />
                  <span className="text-[10px] text-gray-400 font-mono">
                    Gerado por Flora • ID: {protocol || "AGD-000"}
                  </span>
                </div>
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
