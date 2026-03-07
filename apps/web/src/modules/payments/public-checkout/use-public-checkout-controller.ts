"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CardFormInstance, MercadoPagoConstructor } from "../../../../app/(public)/agendar/[slug]/booking-flow.types";
import type { CardOrderResult, PixOrderResult } from "../mercadopago-orders";
import type { ActionResult } from "../../../shared/errors/result";
import { cardProcessingStages } from "../../../../app/(public)/agendar/[slug]/booking-flow-config";
import { computePixProgress } from "../../../../app/(public)/agendar/[slug]/booking-flow.helpers";
import { formatCountdown } from "../../../../app/(public)/agendar/[slug]/booking-flow-formatters";
import type {
  PublicCheckoutCardPayload,
  PublicCheckoutEvent,
  PublicCheckoutPaymentMethod,
  PublicCheckoutPixPayment,
  PublicCheckoutStatusResult,
} from "./types";

type UsePublicCheckoutControllerParams = {
  active: boolean;
  initialPaymentMethod?: PublicCheckoutPaymentMethod;
  amount: number;
  payerName: string;
  payerEmail: string;
  mercadoPagoPublicKey: string | null;
  initialCompleted?: boolean;
  autoCreatePix?: boolean;
  createPixPayment: (params: { attempt: number }) => Promise<ActionResult<PixOrderResult>>;
  getPixPaymentStatus: () => Promise<ActionResult<PublicCheckoutStatusResult>>;
  createCardPayment: (params: PublicCheckoutCardPayload) => Promise<ActionResult<CardOrderResult>>;
  getCardPaymentStatus: () => Promise<ActionResult<PublicCheckoutStatusResult>>;
  onPaymentApproved?: () => void;
  onEvent?: (event: PublicCheckoutEvent) => void;
};

export function usePublicCheckoutController({
  active,
  initialPaymentMethod = "pix",
  amount,
  mercadoPagoPublicKey,
  initialCompleted = false,
  autoCreatePix = true,
  createPixPayment,
  getPixPaymentStatus,
  createCardPayment,
  getCardPaymentStatus,
  onPaymentApproved,
  onEvent,
}: UsePublicCheckoutControllerParams) {
  const [paymentMethod, setPaymentMethod] = useState<PublicCheckoutPaymentMethod>(initialPaymentMethod);
  const [pixPayment, setPixPayment] = useState<PublicCheckoutPixPayment | null>(null);
  const [pixStatus, setPixStatus] = useState<"idle" | "loading" | "error">("idle");
  const [pixMessage, setPixMessage] = useState<string | null>(null);
  const [pixAttempt, setPixAttempt] = useState(0);
  const [pixNowMs, setPixNowMs] = useState(() => Date.now());
  const [cardStatus, setCardStatus] = useState<"idle" | "loading" | "error">("idle");
  const [cardMessage, setCardMessage] = useState<string | null>(null);
  const [cardAwaitingConfirmation, setCardAwaitingConfirmation] = useState(false);
  const [cardProcessingStageIndex, setCardProcessingStageIndex] = useState(0);
  const [mpReady, setMpReady] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(initialCompleted);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const cardFormRef = useRef<CardFormInstance | null>(null);
  const cardSubmitInFlightRef = useRef(false);

  const pixProgress = useMemo(
    () =>
      computePixProgress({
        createdAt: pixPayment?.created_at ?? null,
        expiresAt: pixPayment?.expires_at ?? null,
        nowMs: pixNowMs,
      }),
    [pixNowMs, pixPayment?.created_at, pixPayment?.expires_at]
  );
  const pixQrExpired = pixProgress.isExpired;
  const pixProgressPct = pixProgress.progressPct;
  const pixRemainingLabel = formatCountdown(pixProgress.remainingMs);

  const showCardProcessingOverlay =
    active && paymentMethod === "card" && (cardStatus === "loading" || cardAwaitingConfirmation);
  const currentCardProcessingStage =
    cardProcessingStages[Math.min(cardProcessingStageIndex, cardProcessingStages.length - 1)] ?? cardProcessingStages[0];
  const statusMessage = copyFeedback ?? (paymentMethod === "pix" ? pixMessage : cardMessage);

  useEffect(() => {
    if (!copyFeedback) return;
    const timeout = window.setTimeout(() => setCopyFeedback(null), 1800);
    return () => window.clearTimeout(timeout);
  }, [copyFeedback]);

  useEffect(() => {
    if (!active || !pixPayment || paymentCompleted) return;
    const interval = window.setInterval(() => setPixNowMs(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [active, paymentCompleted, pixPayment]);

  useEffect(() => {
    if (!active || paymentCompleted || !autoCreatePix || paymentMethod !== "pix" || pixPayment || pixStatus === "loading") {
      return;
    }

    void (async () => {
      setPixStatus("loading");
      setPixMessage(null);
      const result = await createPixPayment({ attempt: pixAttempt });
      if (!result.ok) {
        const message = result.error.message;
        setPixStatus("error");
        setPixMessage(message);
        onEvent?.({ type: "pix_error", message });
        return;
      }
      setPixPayment(result.data);
      setPixStatus("idle");
      setPixMessage("Pix gerado. O pagamento será confirmado automaticamente assim que for aprovado.");
      setPixNowMs(Date.now());
      onEvent?.({ type: "pix_generated" });
    })();
  }, [active, autoCreatePix, createPixPayment, onEvent, paymentCompleted, paymentMethod, pixAttempt, pixPayment, pixStatus]);

  useEffect(() => {
    if (!active || paymentCompleted || paymentMethod !== "pix" || !pixPayment) return;

    let isMounted = true;
    const poll = async () => {
      const result = await getPixPaymentStatus();
      if (!isMounted || !result.ok) return;
      if (result.data.internal_status === "paid") {
        setPaymentCompleted(true);
        setPixMessage("Pagamento confirmado com sucesso.");
        onEvent?.({ type: "payment_paid" });
        onPaymentApproved?.();
        return;
      }
      if (result.data.internal_status === "failed") {
        const message = "O Pix não foi aprovado. Gere um novo Pix para tentar novamente.";
        setPixStatus("error");
        setPixMessage(message);
        onEvent?.({ type: "pix_error", message });
      }
    };

    void poll();
    const interval = window.setInterval(() => void poll(), 4000);
    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [active, getPixPaymentStatus, onEvent, onPaymentApproved, paymentCompleted, paymentMethod, pixPayment]);

  useEffect(() => {
    if (!active || paymentCompleted || paymentMethod !== "card" || !cardAwaitingConfirmation) return;

    let isMounted = true;
    const poll = async () => {
      const result = await getCardPaymentStatus();
      if (!isMounted || !result.ok) return;
      if (result.data.internal_status === "paid") {
        setCardAwaitingConfirmation(false);
        setPaymentCompleted(true);
        setCardMessage("Pagamento aprovado com sucesso.");
        onEvent?.({ type: "payment_paid" });
        onPaymentApproved?.();
        return;
      }
      if (result.data.internal_status === "failed") {
        const message = "Pagamento recusado. Tente novamente com outro cartão ou use Pix.";
        setCardAwaitingConfirmation(false);
        setCardStatus("error");
        setCardMessage(message);
        onEvent?.({ type: "card_error", message });
      }
    };

    void poll();
    const interval = window.setInterval(() => void poll(), 5000);
    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [active, cardAwaitingConfirmation, getCardPaymentStatus, onEvent, onPaymentApproved, paymentCompleted, paymentMethod]);

  useEffect(() => {
    if (!showCardProcessingOverlay) {
      setCardProcessingStageIndex(0);
      return;
    }

    setCardProcessingStageIndex(0);
    const interval = window.setInterval(() => {
      setCardProcessingStageIndex((current) => Math.min(current + 1, cardProcessingStages.length - 1));
    }, 1700);
    return () => window.clearInterval(interval);
  }, [showCardProcessingOverlay]);

  useEffect(() => {
    if (!active || paymentCompleted || paymentMethod !== "card") {
      try {
        cardFormRef.current?.unmount?.();
      } catch {
        // ignore SDK teardown errors
      }
      cardFormRef.current = null;
      return;
    }

    if (!mercadoPagoPublicKey) {
      setCardStatus("error");
      setCardMessage("Chave pública do Mercado Pago ausente.");
      return;
    }

    if (!mpReady) return;

    const mpConstructor = (window as Window & { MercadoPago?: MercadoPagoConstructor }).MercadoPago;
    if (!mpConstructor) {
      setCardStatus("error");
      setCardMessage("Não foi possível carregar o formulário de cartão.");
      return;
    }

    try {
      cardFormRef.current?.unmount?.();
    } catch {
      // ignore SDK teardown errors
    }
    cardFormRef.current = null;

    const mp = new mpConstructor(mercadoPagoPublicKey, { locale: "pt-BR" });
    cardFormRef.current = mp.cardForm({
      amount: amount.toFixed(2),
      iframe: true,
      form: {
        id: "mp-card-form",
        cardNumber: { id: "mp-card-number", placeholder: "Número do cartão" },
        expirationDate: { id: "mp-card-expiration", placeholder: "MM/AA" },
        securityCode: { id: "mp-card-security", placeholder: "CVC" },
        cardholderName: { id: "mp-cardholder-name", placeholder: "Nome no cartão" },
        issuer: { id: "mp-card-issuer", placeholder: "Banco emissor" },
        installments: { id: "mp-card-installments", placeholder: "Parcelas" },
        identificationType: { id: "mp-card-identification-type", placeholder: "Tipo" },
        identificationNumber: { id: "mp-card-identification-number", placeholder: "CPF" },
        cardholderEmail: { id: "mp-card-email", placeholder: "Email" },
      },
      callbacks: {
        onFormMounted: (error) => {
          if (error) {
            setCardStatus("error");
            setCardMessage("Não foi possível carregar o formulário de cartão.");
          }
        },
        onSubmit: async (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (cardSubmitInFlightRef.current) return;

          const data = cardFormRef.current?.getCardFormData();
          if (!data?.token || !data.paymentMethodId) {
            const message = "Preencha os dados do cartão para continuar.";
            setCardStatus("error");
            setCardMessage(message);
            onEvent?.({ type: "card_error", message });
            return;
          }

          cardSubmitInFlightRef.current = true;
          setCardStatus("loading");
          setCardMessage(null);

          const result = await createCardPayment({
            token: data.token,
            paymentMethodId: data.paymentMethodId,
            installments: Number(data.installments) || 1,
            identificationType: data.identificationType,
            identificationNumber: data.identificationNumber,
          });

          cardSubmitInFlightRef.current = false;

          if (!result.ok) {
            const message = result.error.message;
            setCardStatus("error");
            setCardMessage(message);
            setCardAwaitingConfirmation(false);
            onEvent?.({ type: "card_error", message });
            return;
          }

          if (result.data.internal_status === "paid") {
            setCardStatus("idle");
            setCardAwaitingConfirmation(false);
            setPaymentCompleted(true);
            setCardMessage("Pagamento aprovado com sucesso.");
            onEvent?.({ type: "payment_paid" });
            onPaymentApproved?.();
            return;
          }

          if (result.data.internal_status === "failed") {
            const message = "Pagamento recusado. Tente novamente com outro cartão ou use Pix.";
            setCardStatus("error");
            setCardAwaitingConfirmation(false);
            setCardMessage(message);
            onEvent?.({ type: "card_error", message });
            return;
          }

          const message = "Pagamento em processamento. A confirmação é feita automaticamente.";
          setCardStatus("idle");
          setCardAwaitingConfirmation(true);
          setCardMessage(message);
          onEvent?.({ type: "card_pending", message });
        },
      },
    });

    return () => {
      try {
        cardFormRef.current?.unmount?.();
      } catch {
        // ignore SDK teardown errors
      }
      cardFormRef.current = null;
      cardSubmitInFlightRef.current = false;
    };
  }, [active, amount, createCardPayment, mercadoPagoPublicKey, mpReady, onEvent, onPaymentApproved, paymentCompleted, paymentMethod]);

  const handleSelectPaymentMethod = (method: Exclude<PublicCheckoutPaymentMethod, null>) => {
    if (method === paymentMethod) return;
    if (method === "pix") {
      setCardMessage(null);
      setCardStatus("idle");
      setCardAwaitingConfirmation(false);
    }
    if (method === "card") {
      setPixMessage(null);
      setPixStatus("idle");
    }
    setPaymentMethod(method);
  };

  async function handleCopyPix() {
    if (!pixPayment?.qr_code) {
      setCopyFeedback("Pix ainda não disponível para cópia.");
      onEvent?.({ type: "pix_copy_error" });
      return;
    }
    try {
      await navigator.clipboard.writeText(pixPayment.qr_code);
      setCopyFeedback("Chave Pix copiada.");
      onEvent?.({ type: "pix_copy_success" });
    } catch {
      setCopyFeedback("Não foi possível copiar a chave Pix.");
      onEvent?.({ type: "pix_copy_error" });
    }
  }

  function handleRegeneratePix() {
    setPixPayment(null);
    setPixStatus("idle");
    setPixMessage(null);
    setPixAttempt((current) => current + 1);
  }

  function resetCheckout() {
    setPaymentMethod(initialPaymentMethod);
    setPixPayment(null);
    setPixStatus("idle");
    setPixMessage(null);
    setPixAttempt(0);
    setPixNowMs(Date.now());
    setCardStatus("idle");
    setCardMessage(null);
    setCardAwaitingConfirmation(false);
    setCardProcessingStageIndex(0);
    setPaymentCompleted(false);
    setCopyFeedback(null);
    try {
      cardFormRef.current?.unmount?.();
    } catch {
      // ignore sdk teardown errors
    }
    cardFormRef.current = null;
    cardSubmitInFlightRef.current = false;
  }

  return {
    paymentMethod,
    setPaymentMethod: handleSelectPaymentMethod,
    pixPayment,
    pixStatus,
    pixRemainingLabel,
    pixProgressPct,
    pixQrExpired,
    cardStatus,
    paymentCompleted,
    setMpReady,
    handleCopyPix,
    handleRegeneratePix,
    resetCheckout,
    showCardProcessingOverlay,
    currentCardProcessingStage,
    cardProcessingStageIndex,
    cardAwaitingConfirmation,
    statusMessage,
  };
}
