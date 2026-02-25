"use client";

import { useCallback, useRef, useState } from "react";
import { VoucherTicketCard } from "../../../components/voucher/voucher-ticket-card";
import {
  downloadVoucherBlob,
  renderVoucherImageBlob,
  shareVoucherBlob,
} from "../../../components/voucher/voucher-export";

interface VoucherPageViewProps {
  clientName: string;
  dateTimeLabel: string;
  dayLabel: string;
  timeLabel: string;
  serviceName: string;
  locationLabel: string;
  bookingId: string;
}

export default function VoucherPageView({
  clientName,
  dateTimeLabel,
  dayLabel,
  timeLabel,
  serviceName,
  locationLabel,
  bookingId,
}: VoucherPageViewProps) {
  const voucherRef = useRef<HTMLDivElement | null>(null);
  const [busy, setBusy] = useState(false);

  const buildVoucherBlob = useCallback(async () => {
    if (!voucherRef.current) return null;
    return await renderVoucherImageBlob(voucherRef.current);
  }, []);

  const handleDownload = useCallback(async () => {
    setBusy(true);
    try {
      const blob = await buildVoucherBlob();
      if (!blob) return;
      downloadVoucherBlob(blob, `voucher-${bookingId}.png`, window.navigator.userAgent);
    } finally {
      setBusy(false);
    }
  }, [bookingId, buildVoucherBlob]);

  const handleShare = useCallback(async () => {
    setBusy(true);
    try {
      const blob = await buildVoucherBlob();
      if (!blob) return;
      const fallbackMessage = `Segue o voucher do seu agendamento: ${window.location.href}`;
      await shareVoucherBlob(blob, `voucher-${bookingId}.png`, fallbackMessage);
    } finally {
      setBusy(false);
    }
  }, [bookingId, buildVoucherBlob]);

  return (
    <div className="h-dvh overflow-y-auto overscroll-y-contain bg-[#1f2324] px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-117 pb-6">
        <div className="mb-4 text-center text-white">
          <h1 className="font-serif text-2xl font-bold">Voucher de Agendamento</h1>
          <p className="mt-1 text-sm text-white/75">{dateTimeLabel}</p>
        </div>

        <VoucherTicketCard
          innerRef={voucherRef}
          capture
          clientName={clientName}
          dayLabel={dayLabel}
          timeLabel={timeLabel}
          serviceName={serviceName}
          locationLabel={locationLabel}
          bookingId={bookingId}
        />

        <div className="mt-3 rounded-2xl border border-white/20 bg-white/95 p-3 flex gap-2 shadow-2xl">
          <button
            type="button"
            onClick={handleDownload}
            disabled={busy}
            className="flex-1 h-11 rounded-2xl border border-stone-200 text-xs font-bold text-studio-text uppercase tracking-widest"
          >
            {busy ? "Gerando..." : "Baixar imagem"}
          </button>
          <button
            type="button"
            onClick={handleShare}
            disabled={busy}
            className="flex-1 h-11 rounded-2xl bg-studio-green text-white text-xs font-bold uppercase tracking-widest"
          >
            Compartilhar
          </button>
        </div>
      </div>
    </div>
  );
}
