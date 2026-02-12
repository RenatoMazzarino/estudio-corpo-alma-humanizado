"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { CheckCircle2, MapPin, Sparkles } from "lucide-react";
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
          <div className="receipt-shell relative rounded-[20px] bg-[#faf9f6] shadow-2xl overflow-hidden">
            <div className="receipt-header bg-studio-green text-white px-6 pt-8 pb-10 text-center rounded-b-[30px]">
              <div className="flex justify-center mb-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Image src="/brand/logo.png" alt="Estúdio Corpo & Alma Humanizado" width={28} height={28} className="h-7 w-7" priority />
                </div>
              </div>
              <h1 className="font-serif text-2xl font-bold tracking-wide">Estúdio Corpo & Alma Humanizado</h1>
              <p className="text-[10px] uppercase tracking-widest opacity-80 mt-1">Estúdio de bem-estar</p>
              <div className="mt-6">
                <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md">
                  {statusPill}
                </span>
              </div>
            </div>

            <div ref={receiptRef} id="receipt-content" className="receipt-paper px-6 py-6 pb-8">
              <div className="flex justify-between items-end mb-6">
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Cliente</p>
                  <p className="font-serif text-lg font-bold text-gray-800">{data.clientName}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Data</p>
                  <p className="font-bold text-gray-800 text-sm">{data.dateLabel}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">{data.timeLabel}</p>
                </div>
              </div>

              <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-green-50 text-studio-green flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">{data.serviceName}</p>
                    <p className="text-[10px] text-gray-400">Serviço confirmado</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-50 text-studio-accent flex items-center justify-center">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">{data.locationLabel}</p>
                    {data.locationDetail && <p className="text-[10px] text-gray-400">{data.locationDetail}</p>}
                  </div>
                </div>
              </div>

              <div className="dashed-line"></div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Valor Total</span>
                  <span>{data.totalLabel}</span>
                </div>

                {!isPaid && (
                  <div className="flex justify-between items-center text-studio-green font-bold text-sm bg-green-50 p-2 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Sinal Pago (PIX)</span>
                    </div>
                    <span>- {data.signalLabel}</span>
                  </div>
                )}

                {isPaid ? (
                  <div className="flex justify-between items-center text-studio-green font-bold text-sm bg-green-50 p-2 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Pagamento Integral</span>
                    </div>
                    <span>{data.paidLabel}</span>
                  </div>
                ) : (
                  <div className="flex justify-between items-end pt-2">
                    <span className="text-xs font-bold text-gray-400 uppercase">Restante a Pagar</span>
                    <span className="font-serif text-2xl font-bold text-gray-800">{data.remainingLabel}</span>
                  </div>
                )}
              </div>

              <div className="mt-8 pt-4 border-t border-gray-100 flex items-center justify-center gap-2 opacity-60">
                <CheckCircle2 className="w-4 h-4 text-studio-green" />
                <p className="text-[10px] text-gray-500 font-medium">Gerado por Flora • ID: {data.transactionId}</p>
              </div>
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
