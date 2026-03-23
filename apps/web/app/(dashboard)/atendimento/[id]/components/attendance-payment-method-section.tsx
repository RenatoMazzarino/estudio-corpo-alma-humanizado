"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Copy, MoreHorizontal, RefreshCcw } from "lucide-react";
import Image from "next/image";
import { IconActionButton } from "../../../../../components/ui/icon-action-button";
import { PaymentMethodIcon } from "../../../../../components/ui/payment-method-icon";
import { PaymentMethodSelector } from "../../../../../components/ui/payment-method-selector";
import { WhatsAppIcon } from "../../../../../components/ui/whatsapp-icon";
import { formatCountdown, formatPixTypeLabel } from "./attendance-payment-modal.helpers";

type Method = "cash" | "pix_mp" | "pix_key" | "card" | "waiver";
type InternalStatus = "paid" | "pending" | "failed";
type PointCardMode = "debit" | "credit";

type PixPaymentData = {
  id: string;
  order_id: string;
  qr_code: string | null;
  qr_code_base64: string | null;
  expires_at: string;
  transaction_amount: number;
};

type PointPaymentData = {
  id: string;
  order_id: string;
  internal_status: InternalStatus;
  card_mode: PointCardMode;
  transaction_amount: number;
};

interface AttendancePaymentMethodSectionProps {
  viewMode: "select" | "charge";
  method: Method;
  hideWaiverOption: boolean;
  isWaived: boolean;
  waiverSuccess: boolean;
  isFullyPaid: boolean;
  pointEnabled: boolean;
  pointTerminalName: string;
  pointTerminalModel: string;
  cashAmount: number;
  effectiveChargeAmount: number;
  pixPayment: PixPaymentData | null;
  pixRemaining: number;
  pixKeyConfigured: boolean;
  pixKeyType: "cnpj" | "cpf" | "email" | "phone" | "evp" | null;
  normalizedPixKeyValue: string;
  pixKeyGenerating: boolean;
  pixKeyQrDataUrl: string | null;
  pixKeyCode: string;
  pixKeyError: string | null;
  pointPayment: PointPaymentData | null;
  busy: boolean;
  errorText: string | null;
  onSetMethodAction: (value: Method) => void;
  onSetCashAmountAction: (value: number) => void;
  onCreatePixAction: () => void;
  onCopyPixAction: () => void;
  onCopyPixKeyAction: () => void;
  onPointChargeAction: (cardMode: PointCardMode) => void;
  onWaiveAsCourtesyAction: () => void;
  onLeaveOpenAction: () => void;
  onResetCurrentChargeAction: () => Promise<void> | void;
  onForceRefreshAction: () => void;
  onBackToSelectAction: () => void;
  menuThirdActionLabel?: string;
  enableCardSimulation?: boolean;
  allowCardSendWithoutPoint?: boolean;
  onSimulateCardApprovedAction?: () => void;
  onSendPixViaWhatsappAction?: () => void;
}

function SheetSegmentOption({
  label,
  selected,
  onClickAction,
}: {
  label: string;
  selected: boolean;
  onClickAction: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClickAction}
      className={`relative flex h-10 items-center justify-center px-3 text-[12px] font-semibold transition ${
        selected ? "bg-white text-studio-green" : "bg-transparent text-muted hover:bg-paper/60"
      }`}
      aria-pressed={selected}
    >
      {label}
      <span
        className={`absolute inset-x-0 bottom-0 h-0.5 transition-opacity ${
          selected ? "bg-studio-green opacity-100" : "opacity-0"
        }`}
      />
    </button>
  );
}

export function AttendancePaymentMethodSection({
  viewMode,
  method,
  hideWaiverOption,
  isWaived,
  waiverSuccess,
  isFullyPaid,
  pointEnabled,
  pointTerminalName,
  pointTerminalModel,
  cashAmount,
  effectiveChargeAmount,
  pixPayment,
  pixRemaining,
  pixKeyConfigured,
  pixKeyType,
  normalizedPixKeyValue,
  pixKeyGenerating,
  pixKeyQrDataUrl,
  pixKeyCode,
  pixKeyError,
  pointPayment,
  busy,
  errorText,
  onSetMethodAction,
  onSetCashAmountAction,
  onCreatePixAction,
  onCopyPixAction,
  onCopyPixKeyAction,
  onPointChargeAction,
  onWaiveAsCourtesyAction,
  onLeaveOpenAction,
  onResetCurrentChargeAction,
  onForceRefreshAction,
  onBackToSelectAction,
  menuThirdActionLabel = "Deixar em aberto",
  enableCardSimulation = false,
  allowCardSendWithoutPoint = false,
  onSimulateCardApprovedAction,
  onSendPixViaWhatsappAction,
}: AttendancePaymentMethodSectionProps) {
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [pixCopyCodeAccordionOpen, setPixCopyCodeAccordionOpen] = useState(false);
  const [selectedCardMode, setSelectedCardMode] = useState<"credit" | "debit">("credit");
  const [cardSimulationUnlocked, setCardSimulationUnlocked] = useState(false);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);
  const isPixMethod = method === "pix_mp" || method === "pix_key";
  const isPixMpMethod = method === "pix_mp";
  const isPixExpired = isPixMpMethod && pixRemaining <= 0;
  const pixHasChargeData = isPixMpMethod ? Boolean(pixPayment) : Boolean(pixKeyCode || pixKeyQrDataUrl);
  const pixProgressPercent = Math.min(100, Math.max((pixRemaining / (15 * 60)) * 100, 0));
  const pixCodeValue = isPixMpMethod ? pixPayment?.qr_code ?? null : pixKeyCode || null;
  const pixQrDataSrc = isPixMpMethod
    ? pixPayment?.qr_code_base64
      ? `data:image/png;base64,${pixPayment.qr_code_base64}`
      : null
    : pixKeyQrDataUrl;
  const pixHeaderLabel = isPixMpMethod ? "Checkout Pix" : "Pix por chave";
  const pixInfoLabel = isPixMpMethod
    ? null
    : pixKeyConfigured
      ? `${formatPixTypeLabel(pixKeyType)} ativa: ${normalizedPixKeyValue}`
      : "Nenhuma chave Pix ativa configurada.";
  const canCopyPixCode = Boolean(pixCodeValue);

  const methodOptions = [
    { value: "pix_mp", label: "Pix", icon: "pix" as const },
    { value: "pix_key", label: "Pix chave", icon: "pix_key" as const },
    { value: "card", label: "Cartao", icon: "card" as const },
    { value: "cash", label: "Dinheiro", icon: "cash" as const },
    ...(hideWaiverOption
      ? []
      : [
          {
            value: "waiver" as const,
            label: "Cortesia",
            icon: "waiver" as const,
            tone: "waiver" as const,
          },
        ]),
  ] as const;

  useEffect(() => {
    if (!actionMenuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!actionMenuRef.current?.contains(target)) {
        setActionMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [actionMenuOpen]);

  useEffect(() => {
    setActionMenuOpen(false);
  }, [method]);

  useEffect(() => {
    if (method !== "pix_mp") {
      setPixCopyCodeAccordionOpen(false);
      return;
    }
    setPixCopyCodeAccordionOpen(false);
  }, [method, pixPayment?.id]);

  useEffect(() => {
    if (pointPayment?.card_mode === "credit" || pointPayment?.card_mode === "debit") {
      setSelectedCardMode(pointPayment.card_mode);
    }
  }, [pointPayment?.card_mode]);

  useEffect(() => {
    if (!enableCardSimulation) return;
    if (method !== "card") {
      setCardSimulationUnlocked(false);
      return;
    }
    if (pointPayment) {
      setCardSimulationUnlocked(true);
    }
  }, [enableCardSimulation, method, pointPayment]);

  const isSelectMode = viewMode === "select";

  return (
    <section className={isSelectMode ? "wl-surface-card mt-4 overflow-hidden" : "mt-4 space-y-3"}>
      {isSelectMode ? (
        <div className="wl-surface-card-header flex h-12 items-center gap-2 border-b border-line px-3">
          <PaymentMethodIcon method="card" className="h-4 w-4" />
          <p className="wl-typo-card-name-sm text-studio-text">Forma de pagamento</p>
        </div>
      ) : null}

      <div className={isSelectMode ? "wl-surface-card-body space-y-3 px-3 py-3" : "space-y-3"}>
        {viewMode === "select" ? (
          <PaymentMethodSelector
            options={methodOptions}
            value={method}
            onChangeAction={onSetMethodAction}
            variant="modal-grid"
            columnsClassName={methodOptions.length === 5 ? "grid-cols-5" : "grid-cols-4"}
          />
        ) : null}

        {isWaived && !waiverSuccess ? (
          <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">
            Atendimento ja marcado como cortesia (pagamento liberado).
          </div>
        ) : null}

        {isFullyPaid ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
            Pagamento integral ja registrado. Nao ha saldo para cobrar.
          </div>
        ) : null}

        {viewMode === "charge" && !isFullyPaid && method === "cash" ? (
          <div className="overflow-hidden rounded-xl border border-line">
            <div className="wl-surface-card-header flex items-center gap-2 px-3 py-2.5">
              <PaymentMethodIcon method="cash" className="h-4 w-4" />
              <p className="wl-typo-label text-studio-text">Recebimento em dinheiro</p>
            </div>
            <div className="wl-surface-card-body border-t border-line px-3 pb-3 pt-2">
              <input
                type="number"
                className="wl-surface-input w-full rounded-xl border border-line px-3 py-2 text-sm"
                value={cashAmount}
                onChange={(event) => onSetCashAmountAction(Number(event.target.value))}
              />
            </div>
          </div>
        ) : null}

        {viewMode === "charge" && !isFullyPaid && isPixMethod ? (
          <div className="overflow-hidden rounded-xl border border-line">
            <div className="wl-surface-card-header flex items-center justify-between gap-2 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <PaymentMethodIcon method={isPixMpMethod ? "pix" : "pix_key"} className="h-4 w-4" />
                <p className="wl-typo-label text-studio-text">{pixHeaderLabel}</p>
              </div>
              <div ref={actionMenuRef} className="relative flex items-center gap-1.5">
                <IconActionButton
                  label={isPixMpMethod ? "Acoes do Pix" : "Acoes do Pix chave"}
                  icon={<MoreHorizontal className="h-4 w-4" />}
                  size="sm"
                  className="wl-header-icon-button-strong"
                  onClick={() => setActionMenuOpen((prev) => !prev)}
                />
                {actionMenuOpen ? (
                  <div className="absolute right-0 top-9 z-20 min-w-48 overflow-hidden rounded-xl border border-line wl-surface-card-body shadow-soft">
                    <button
                      type="button"
                      onClick={() => {
                        setActionMenuOpen(false);
                        onForceRefreshAction();
                      }}
                      className="wl-typo-menu-item flex w-full items-center gap-2.5 border-b border-line px-3 py-2.5 text-left transition hover:bg-paper"
                    >
                      <RefreshCcw className="h-4 w-4" />
                      Forcar atualizacao
                    </button>
                    {onSendPixViaWhatsappAction ? (
                      <button
                        type="button"
                        onClick={() => {
                          setActionMenuOpen(false);
                          onSendPixViaWhatsappAction();
                        }}
                        className="wl-typo-menu-item flex w-full items-center gap-2.5 border-b border-line px-3 py-2.5 text-left transition hover:bg-paper"
                      >
                        <WhatsAppIcon className="h-4 w-4" />
                        Enviar por WhatsApp
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        setActionMenuOpen(false);
                        onResetCurrentChargeAction();
                        onBackToSelectAction();
                      }}
                      className="wl-typo-menu-item flex w-full items-center gap-2.5 border-b border-line px-3 py-2.5 text-left transition hover:bg-paper"
                    >
                      Alterar forma de pagamento
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActionMenuOpen(false);
                        onLeaveOpenAction();
                      }}
                      className="wl-typo-menu-item flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-red-600 transition hover:bg-red-50"
                    >
                      {menuThirdActionLabel}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="wl-surface-card-body space-y-3 border-t border-line px-3 pb-3 pt-2">
              <p className="text-xs text-muted">
                Valor a cobrar agora: <strong>{effectiveChargeAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>
              </p>
              {pixInfoLabel ? <p className="text-[11px] text-muted">{pixInfoLabel}</p> : null}
              {!pixHasChargeData && isPixMpMethod ? (
                <button
                  type="button"
                  className="h-10 w-full rounded-xl bg-studio-green px-3 text-[11px] font-extrabold uppercase tracking-wider text-white disabled:opacity-60"
                  onClick={onCreatePixAction}
                  disabled={busy}
                >
                  Gerar Pix
                </button>
              ) : null}
              {pixKeyGenerating ? (
                <div className="inline-flex items-center gap-2 rounded-xl border border-line bg-paper px-3 py-2 text-xs text-studio-text">
                  Gerando QR Pix da chave...
                </div>
              ) : null}
              {pixQrDataSrc ? (
                <Image
                  src={pixQrDataSrc}
                  alt={isPixMpMethod ? "QR Code Pix" : "QR Code Pix por chave"}
                  width={200}
                  height={200}
                  unoptimized
                  className="mx-auto h-44 w-44 rounded-xl border border-line bg-white p-2"
                />
              ) : null}
              {isPixMpMethod && pixHasChargeData ? (
                <>
                  <p className="text-center text-xs font-semibold text-studio-green">
                    Tempo restante: {formatCountdown(pixRemaining)}
                  </p>
                  <div className="h-2 rounded-full bg-stone-200">
                    <div className="h-full rounded-full bg-studio-green transition-all" style={{ width: `${pixProgressPercent}%` }} />
                  </div>
                  {isPixExpired ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
                      QR Code expirado. Gere uma nova cobranca.
                    </div>
                  ) : null}
                </>
              ) : null}

              {pixHasChargeData ? (
                <div className="overflow-hidden rounded-xl border border-line wl-surface-card">
                  <div className="wl-surface-card-header flex items-center justify-between px-3 py-2">
                    <button
                      type="button"
                      onClick={() => setPixCopyCodeAccordionOpen((prev) => !prev)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      <ChevronDown
                        className={`h-3.5 w-3.5 text-studio-text transition-transform ${
                          pixCopyCodeAccordionOpen ? "rotate-180" : ""
                        }`}
                      />
                      <p className="wl-typo-label text-studio-text">Pix copia e cola</p>
                    </button>
                    <IconActionButton
                      label={isPixMpMethod ? "Copiar codigo Pix" : "Copiar codigo Pix chave"}
                      icon={<Copy className="h-3.5 w-3.5" />}
                      size="sm"
                      className="wl-header-icon-button-strong"
                      onClick={isPixMpMethod ? onCopyPixAction : onCopyPixKeyAction}
                      disabled={!canCopyPixCode}
                    />
                  </div>
                  {pixCopyCodeAccordionOpen ? (
                    <div className="wl-surface-card-body border-t border-line px-3 py-2.5">
                      <p className="break-all text-[11px] text-studio-text">
                        {pixCodeValue ?? "Codigo Pix indisponivel no momento."}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {pixKeyError ? <p className="text-xs font-semibold text-red-700">{pixKeyError}</p> : null}
            </div>
          </div>
        ) : null}

        {viewMode === "charge" && !isFullyPaid && method === "card" ? (
          <div className="overflow-hidden rounded-xl border border-line">
            <div className="wl-surface-card-header flex items-center justify-between gap-2 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <PaymentMethodIcon method="card" className="h-4 w-4" />
                <p className="wl-typo-label text-studio-text">Checkout na maquininha</p>
              </div>
              <div ref={actionMenuRef} className="relative flex items-center gap-1.5">
                <IconActionButton
                  label="Acoes do cartao"
                  icon={<MoreHorizontal className="h-4 w-4" />}
                  size="sm"
                  className="wl-header-icon-button-strong"
                  onClick={() => setActionMenuOpen((prev) => !prev)}
                />
                {actionMenuOpen ? (
                  <div className="absolute right-0 top-9 z-20 min-w-48 overflow-hidden rounded-xl border border-line wl-surface-card-body shadow-soft">
                    <button
                      type="button"
                      onClick={() => {
                        setActionMenuOpen(false);
                        onForceRefreshAction();
                      }}
                      className="wl-typo-menu-item flex w-full items-center gap-2.5 border-b border-line px-3 py-2.5 text-left transition hover:bg-paper"
                    >
                      <RefreshCcw className="h-4 w-4" />
                      Forcar atualizacao
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActionMenuOpen(false);
                        onResetCurrentChargeAction();
                        onBackToSelectAction();
                      }}
                      className="wl-typo-menu-item flex w-full items-center gap-2.5 border-b border-line px-3 py-2.5 text-left transition hover:bg-paper"
                    >
                      Alterar forma de pagamento
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActionMenuOpen(false);
                        onLeaveOpenAction();
                      }}
                      className="wl-typo-menu-item flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-red-600 transition hover:bg-red-50"
                    >
                      {menuThirdActionLabel}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="wl-surface-card-body space-y-3 border-t border-line px-3 pb-3 pt-2">
              <p className="text-xs text-muted">
                Valor a cobrar agora: <strong>{effectiveChargeAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>
              </p>
              <p className="text-xs text-muted">
                {pointEnabled ? pointTerminalName || "Maquininha Point configurada" : "Point nao configurada"}
              </p>
              <p className="text-[11px] text-muted">{pointTerminalModel || "Configure a maquininha em Configuracoes."}</p>
              {!pointEnabled ? <p className="text-[11px] text-amber-700">Nenhuma maquininha Point configurada.</p> : null}

              <div className="overflow-hidden rounded-xl border border-line bg-paper">
                <div className="grid grid-cols-2">
                  <SheetSegmentOption
                    label="Credito"
                    selected={selectedCardMode === "credit"}
                    onClickAction={() => setSelectedCardMode("credit")}
                  />
                  <SheetSegmentOption
                    label="Debito"
                    selected={selectedCardMode === "debit"}
                    onClickAction={() => setSelectedCardMode("debit")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (enableCardSimulation) {
                      setCardSimulationUnlocked(true);
                    }
                    onPointChargeAction(selectedCardMode);
                  }}
                  disabled={(!pointEnabled && !allowCardSendWithoutPoint) || busy}
                  className="h-10 rounded-xl border border-line px-3 text-[11px] font-extrabold uppercase tracking-wider text-studio-green disabled:opacity-60"
                >
                  Enviar p/ maquininha
                </button>
                {enableCardSimulation ? (
                  <button
                    type="button"
                    onClick={() => onSimulateCardApprovedAction?.()}
                    disabled={!cardSimulationUnlocked || busy}
                    className="h-10 rounded-xl border border-line px-3 text-[11px] font-extrabold uppercase tracking-wider text-studio-green disabled:opacity-60"
                  >
                    Simular aprovado (TEMP)
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onForceRefreshAction}
                    disabled={!pointPayment}
                    className="h-10 rounded-xl border border-line px-3 text-[11px] font-extrabold uppercase tracking-wider text-studio-green disabled:opacity-60"
                  >
                    Verificar agora
                  </button>
                )}
              </div>

              {pointPayment ? (
                <div className="rounded-xl border border-line bg-stone-50 px-3 py-2 text-xs text-muted">
                  Cobranca enviada ({pointPayment.card_mode === "debit" ? "debito" : "credito"}). Aguardando confirmacao...
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {viewMode === "charge" && !hideWaiverOption && method === "waiver" ? (
          <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-4">
            <p className="mb-2 text-[10px] font-extrabold uppercase tracking-widest text-sky-700">Cortesia interna</p>
            <p className="text-[11px] leading-relaxed text-sky-900">
              Use esta opcao quando o estudio decidir liberar a cobranca deste atendimento.
            </p>
            <button
              type="button"
              className="mt-3 h-10 w-full rounded-xl bg-sky-600 px-3 text-[11px] font-extrabold uppercase tracking-wider text-white disabled:opacity-60"
              onClick={onWaiveAsCourtesyAction}
              disabled={isWaived || busy}
            >
              {isWaived ? "Cortesia ja aplicada" : "Aplicar cortesia"}
            </button>
          </div>
        ) : null}

        {errorText ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-xs font-semibold text-red-700">
            {errorText}
          </div>
        ) : null}
      </div>
    </section>
  );
}
