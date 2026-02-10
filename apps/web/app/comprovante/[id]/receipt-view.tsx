"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import "./receipt.module.css";

interface ReceiptData {
  id: string;
  clientName: string;
  serviceName: string;
  dateLabel: string;
  timeLabel: string;
  paymentStatusLabel: string;
  totalLabel: string;
  signalLabel: string;
  paidLabel: string;
  transactionId: string;
  generatedAtLabel: string;
}

interface ReceiptViewProps {
  data: ReceiptData;
}

export default function ReceiptView({ data }: ReceiptViewProps) {
  const receiptRef = useRef<HTMLDivElement | null>(null);
  const [downloading, setDownloading] = useState(false);
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
      <div className="receipt-page min-h-screen bg-[#1f2324] text-studio-text px-4 py-10 flex items-center justify-center">
        <div className="w-full max-w-2xl">
          <div className="receipt-shell relative rounded-[32px] bg-white shadow-2xl border border-white/70 overflow-hidden">
            <div className="absolute -top-4 left-0 right-0 h-8">
              <svg viewBox="0 0 600 40" preserveAspectRatio="none" className="w-full h-full">
                <path
                  d="M0,28 Q30,10 60,28 T120,28 T180,28 T240,28 T300,28 T360,28 T420,28 T480,28 T540,28 T600,28 L600,40 L0,40 Z"
                  fill="#ffffff"
                />
              </svg>
            </div>

            <div ref={receiptRef} id="receipt-content" className="receipt-paper relative px-8 pb-10 pt-12">
              <header className="flex flex-col items-start gap-3 border-b border-dashed border-gray-200 pb-6">
                <div className="flex items-center gap-3">
                  <Image src="/logo.png" alt="Corpo & Alma" width={160} height={40} className="h-10 w-auto" priority />
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-muted font-semibold">
                      Corpo & Alma Humanizado
                    </p>
                    <h1 className="text-2xl font-serif font-bold text-studio-text">
                      Comprovante de Pagamento
                    </h1>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-[11px] text-muted font-semibold">
                  <span>Agendamento: {data.dateLabel}</span>
                  <span>•</span>
                  <span>{data.timeLabel}</span>
                  <span>•</span>
                  <span>{data.paymentStatusLabel}</span>
                </div>
              </header>

              <section className="mt-6 grid gap-4 text-sm">
                <div className="rounded-2xl border border-gray-100 bg-[#faf9f6] p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted font-semibold mb-2">Dados do cliente</p>
                  <p className="text-base font-semibold text-studio-text">{data.clientName}</p>
                  <p className="text-xs text-muted">{data.serviceName}</p>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted font-semibold mb-3">Resumo financeiro</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Valor total</span>
                      <span className="font-semibold text-studio-text">{data.totalLabel}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Sinal / Entrada</span>
                      <span className="font-semibold text-studio-text">{data.signalLabel}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Total pago</span>
                      <span className="font-semibold text-studio-text">{data.paidLabel}</span>
                    </div>
                  </div>
                </div>
              </section>

              <footer className="mt-8 border-t border-dashed border-gray-200 pt-4 text-[11px] text-muted flex flex-wrap items-center justify-between gap-2">
                <span>Transação: {data.transactionId}</span>
                <span>Gerado por Flora • {data.generatedAtLabel}</span>
              </footer>
            </div>

            <div className="absolute -bottom-4 left-0 right-0 h-8 rotate-180">
              <svg viewBox="0 0 600 40" preserveAspectRatio="none" className="w-full h-full">
                <path
                  d="M0,28 Q30,10 60,28 T120,28 T180,28 T240,28 T300,28 T360,28 T420,28 T480,28 T540,28 T600,28 L600,40 L0,40 Z"
                  fill="#ffffff"
                />
              </svg>
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
