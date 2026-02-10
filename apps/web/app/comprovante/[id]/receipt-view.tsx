"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { CheckCircle2, MapPin } from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import "./receipt.module.css";

interface ReceiptData {
  clientName: string;
  serviceName: string;
  dateLabel: string;
  timeLabel: string;
  paymentStatus: "paid" | "partial";
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
  const statusPill = isPaid ? "Pagamento confirmado" : "Sinal confirmado";
  const fileName = useMemo(() => {
    const safeDate = data.dateLabel.replace(/\//g, "-");
    return `Recibo-CorpoAlma-${safeDate}.pdf`;
  }, [data.dateLabel]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    if (!receiptRef.current || downloading) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? "landscape" : "portrait",
        unit: "px",
        format: [canvas.width, canvas.height],
      });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save(fileName);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <div className="receipt-page min-h-screen bg-[#333333] text-studio-text px-4 py-10 flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="receipt-shell relative rounded-[28px] bg-white shadow-2xl border border-white/70 overflow-hidden">
            <div className="bg-studio-green text-white px-8 pt-10 pb-8">
              <div className="mx-auto w-14 h-14 rounded-full bg-white/15 flex items-center justify-center">
                <Image src="/logo.png" alt="Estúdio Corpo & Alma Humanizado" width={42} height={42} className="h-9 w-auto" priority />
              </div>
              <div className="mt-4 text-center">
                <h1 className="text-2xl font-serif font-semibold">Estúdio Corpo & Alma Humanizado</h1>
                <p className="text-[11px] uppercase tracking-[0.3em] text-white/80 mt-1">Estúdio de bem-estar</p>
              </div>
              <div className="mt-4 flex justify-center">
                <span className="px-4 py-1 rounded-full bg-white/20 text-[10px] font-extrabold uppercase tracking-[0.16em]">
                  {statusPill}
                </span>
              </div>
            </div>

            <div ref={receiptRef} id="receipt-content" className="receipt-paper bg-[#f9f7f2] px-8 pb-10 pt-6">
              <div className="flex items-start justify-between text-sm">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted font-bold">Cliente</p>
                  <p className="text-lg font-serif font-semibold text-studio-text">{data.clientName}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted font-bold">Data</p>
                  <p className="text-sm font-semibold text-studio-text">{data.dateLabel}</p>
                  <p className="text-xs text-muted">{data.timeLabel}</p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl bg-white border border-gray-100 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-studio-text">{data.serviceName}</p>
                    <p className="text-xs text-muted">Serviço</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-purple-50 text-dom flex items-center justify-center">
                    <MapPin className="w-4 h-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-studio-text">{data.locationLabel}</p>
                    {data.locationDetail && <p className="text-xs text-muted">{data.locationDetail}</p>}
                  </div>
                </div>
              </div>

              <div className="relative mt-6">
                <div className="border-t border-dashed border-gray-200"></div>
                <span className="receipt-cutout absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-[#333333]" />
                <span className="receipt-cutout absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-[#333333]" />
              </div>

              <div className="mt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between text-muted">
                  <span>Valor total</span>
                  <span className="font-semibold text-studio-text">{data.totalLabel}</span>
                </div>
                {!isPaid && (
                  <div className="flex items-center justify-between text-muted">
                    <span>Sinal pago (PIX)</span>
                    <span className="font-semibold text-emerald-600">- {data.signalLabel}</span>
                  </div>
                )}
                {isPaid ? (
                  <div className="flex items-center justify-between text-muted">
                    <span>Total pago</span>
                    <span className="font-semibold text-emerald-600">{data.paidLabel}</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-muted">
                    <span className="uppercase text-[10px] tracking-[0.2em]">Restante a pagar</span>
                    <span className="text-lg font-serif font-bold text-studio-text">{data.remainingLabel}</span>
                  </div>
                )}
              </div>

              <footer className="mt-6 flex items-center justify-between text-[11px] text-muted">
                <span>Gerado por Flora</span>
                <span>ID: {data.transactionId}</span>
              </footer>
            </div>
          </div>
        </div>

        <div className="receipt-actions fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:bottom-auto md:top-1/2 md:-translate-y-1/2">
          <div className="flex w-full md:w-auto gap-2 md:flex-col bg-white/90 backdrop-blur border border-white/60 shadow-xl rounded-2xl p-3">
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 md:w-40 inline-flex items-center justify-center gap-2 rounded-xl bg-studio-green text-white px-4 py-3 text-xs font-extrabold uppercase tracking-wide shadow-lg shadow-green-200"
            >
              🖨️ Imprimir
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="flex-1 md:w-40 inline-flex items-center justify-center gap-2 rounded-xl border border-studio-text/10 bg-white text-studio-text px-4 py-3 text-xs font-extrabold uppercase tracking-wide disabled:opacity-60"
            >
              {downloading ? "Gerando..." : "📥 Baixar PDF"}
            </button>
          </div>
        </div>
      </div>

    </>
  );
}
