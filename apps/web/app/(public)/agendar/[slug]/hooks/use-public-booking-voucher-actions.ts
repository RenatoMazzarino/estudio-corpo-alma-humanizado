"use client";

import { useCallback, useState, type RefObject } from "react";
import { downloadVoucherBlob, renderVoucherImageBlob, shareVoucherBlob } from "../voucher-export";
import { feedbackById, type UserFeedback } from "../../../../../src/shared/feedback/user-feedback";

interface UsePublicBookingVoucherActionsParams {
  protocol: string;
  showToast: (feedback: UserFeedback) => void;
  voucherRef: RefObject<HTMLDivElement | null>;
}

export function usePublicBookingVoucherActions({
  protocol,
  showToast,
  voucherRef,
}: UsePublicBookingVoucherActionsParams) {
  const [voucherBusy, setVoucherBusy] = useState(false);

  const buildVoucherBlob = useCallback(async () => {
    if (!voucherRef.current) return null;
    setVoucherBusy(true);
    try {
      return await renderVoucherImageBlob(voucherRef.current);
    } catch (error) {
      console.error("Falha ao gerar imagem do voucher", error);
      return null;
    } finally {
      setVoucherBusy(false);
    }
  }, [voucherRef]);

  const handleDownloadVoucher = useCallback(async () => {
    const blob = await buildVoucherBlob();
    if (!blob) {
      showToast(feedbackById("voucher_generation_failed"));
      return;
    }
    downloadVoucherBlob(blob, `voucher-${protocol || "agendamento"}.png`, window.navigator.userAgent);
  }, [buildVoucherBlob, protocol, showToast]);

  const handleShareVoucher = useCallback(async () => {
    const blob = await buildVoucherBlob();
    if (!blob) return;
    await shareVoucherBlob(
      blob,
      `voucher-${protocol || "agendamento"}.png`,
      "Segue o voucher do seu agendamento. Baixe a imagem e envie pelo WhatsApp."
    );
  }, [buildVoucherBlob, protocol]);

  return {
    voucherBusy,
    handleDownloadVoucher,
    handleShareVoucher,
  };
}
