"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { CheckCircle2, Download, MapPin, Sparkles } from "lucide-react";
import { downloadReceiptBlob, renderReceiptImageBlob } from "./receipt-export";

interface ReceiptData {
  clientName: string;
  serviceName: string;
  dateLabel: string;
  timeLabel: string;
  paymentStatus: "paid" | "partial";
  paymentMethodLabel?: string;
  locationLabel: string;
  locationDetail?: string;
  totalLabel: string;
  signalLabel: string;
  paidLabel: string;
  remainingLabel: string;
  transactionId: string;
  generatedAtLabel: string;
}

interface ReceiptViewProps {
  data: ReceiptData;
}

export default function ReceiptView({ data }: ReceiptViewProps) {
  const receiptRef = useRef<HTMLDivElement | null>(null);
  const [downloading, setDownloading] = useState(false);
  const isPaid = data.paymentStatus === "paid";
  const statusPill = isPaid ? "Pagamento confirmado" : "Pagamento parcial";
  const partialPaymentLabel = data.paymentMethodLabel
    ? `Pagamento (${data.paymentMethodLabel})`
    : "Pagamento parcial";
  const paidPaymentLabel = data.paymentMethodLabel
    ? `Pagamento (${data.paymentMethodLabel})`
    : "Pagamento integral";
  const fileName = useMemo(() => {
    const safeDate = data.dateLabel.replace(/\//g, "-");
    return `recibo-corpo-alma-${safeDate}.png`;
  }, [data.dateLabel]);

  const handleDownload = async () => {
    if (!receiptRef.current || downloading) return;
    setDownloading(true);
    try {
      const blob = await renderReceiptImageBlob(receiptRef.current);
      if (!blob) return;
      downloadReceiptBlob(blob, fileName, window.navigator.userAgent);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1f2324] text-studio-text px-4 py-10 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div
          ref={receiptRef}
          className="relative rounded-[20px] overflow-hidden border border-black/5"
          style={{ backgroundColor: "#faf9f6", boxShadow: "0 22px 40px rgba(0,0,0,0.28)" }}
        >
          <div className="bg-studio-green text-white px-6 pt-7 pb-8 text-center">
            <div className="flex justify-center mb-2">
              <Image
                src="/brand/logo-white.png"
                alt="Estúdio Corpo & Alma Humanizado"
                width={62}
                height={62}
                className="h-14 w-14 object-contain"
                priority
              />
            </div>
            <h1 className="font-serif text-[30px] leading-[1.05] tracking-tight">Estúdio Corpo & Alma Humanizado</h1>
            <p
              className="mt-1 font-serif italic text-xs text-white/85"
              style={{ fontFamily: "var(--font-playfair), serif" }}
            >
              Toque que alivia, cuidado que transforma.
            </p>
            <div className="mt-4">
              <span className="inline-flex items-center rounded-full border border-white/20 bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em]">
                {statusPill}
              </span>
            </div>
          </div>

          <div className="px-6 py-6">
            <div className="flex justify-between items-start mb-5">
              <div>
                <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-[0.14em]">Cliente</p>
                <p className="font-serif text-xl leading-tight text-studio-text">{data.clientName}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-[0.14em]">Data</p>
                <p className="font-bold text-studio-text text-sm">{data.dateLabel}</p>
                <p className="text-[11px] text-muted mt-1">{data.timeLabel}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-line bg-white px-4 py-4 mb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-studio-light text-studio-green flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-studio-text">{data.serviceName}</p>
                  <p className="text-[10px] text-muted">Serviço realizado</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-dom/20 text-studio-accent flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-studio-text">{data.locationLabel}</p>
                  {data.locationDetail && <p className="text-[10px] text-muted">{data.locationDetail}</p>}
                </div>
              </div>
            </div>

            <div className="border-t border-dashed border-line my-5" />

            <div className="space-y-3">
              <div className="flex justify-between text-sm text-muted">
                <span>Valor total</span>
                <span className="font-bold text-studio-text">{data.totalLabel}</span>
              </div>

              {!isPaid && (
                <div className="flex justify-between items-center text-studio-green font-bold text-sm bg-emerald-50 p-2.5 rounded-xl">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{partialPaymentLabel}</span>
                  </div>
                  <span>{data.signalLabel}</span>
                </div>
              )}

              {isPaid ? (
                <div className="flex justify-between items-center text-studio-green font-bold text-sm bg-emerald-50 p-2.5 rounded-xl">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{paidPaymentLabel}</span>
                  </div>
                  <span>{data.paidLabel}</span>
                </div>
              ) : (
                <div className="flex justify-between items-end pt-1">
                  <span className="text-xs font-extrabold text-muted uppercase tracking-wide">Restante a pagar</span>
                  <span className="font-serif text-2xl leading-none text-studio-text">{data.remainingLabel}</span>
                </div>
              )}
            </div>

            <div className="mt-7 border-t border-line pt-3 text-center">
              <p className="text-[10px] text-muted uppercase tracking-[0.14em] font-bold">
                Gerado por Flora • ID {data.transactionId}
              </p>
              <p className="mt-1 text-[10px] text-muted">Em {data.generatedAtLabel}</p>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-studio-green text-white px-4 py-3 text-xs font-extrabold uppercase tracking-wide shadow-lg shadow-green-900/20 disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            {downloading ? "Gerando recibo..." : "Baixar recibo"}
          </button>
        </div>
      </div>
    </div>
  );
}
