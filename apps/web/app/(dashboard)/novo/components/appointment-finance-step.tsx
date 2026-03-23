import { useEffect, useState } from "react";
import { CreditCard, Gift, Plus, Trash2, Wallet } from "lucide-react";

import { PaymentMethodSelector } from "../../../../components/ui/payment-method-selector";
import { formatCurrencyInput, formatCurrencyLabel } from "../../../../src/shared/currency";
import {
  appointmentFormButtonInlineClass,
  appointmentFormSectionHeaderPrimaryClass,
} from "../appointment-form.styles";
import type {
  ChargeNowAmountMode,
  ChargeNowMethodDraft,
  CollectionTimingDraft,
  DisplacementEstimate,
  FinanceDraftItem,
} from "../appointment-form.types";

interface AppointmentFinanceStepProps {
  sectionCardClass: string;
  sectionNumberClass: string;
  sectionHeaderTextClass: string;
  financeDraftItems: Array<{
    type: FinanceDraftItem["type"];
    label: string;
    qty: number;
    amount: number;
  }>;
  financeExtraItems: FinanceDraftItem[];
  displacementEstimate: DisplacementEstimate | null;
  scheduleSubtotal: number;
  effectiveScheduleDiscount: number;
  scheduleDiscountType: "value" | "pct";
  effectiveScheduleDiscountInputValue: number;
  scheduleTotal: number;
  financeNewItemLabel: string;
  financeNewItemAmount: string;
  onChangeFinanceNewItemLabel: (value: string) => void;
  onChangeFinanceNewItemAmount: (value: string) => void;
  onAddFinanceItem: () => void;
  onRemoveFinanceItem: (id: string) => void;
  scheduleDiscountValue: string;
  onChangeScheduleDiscountType: (value: "value" | "pct") => void;
  onChangeScheduleDiscountValue: (value: string) => void;
  collectionTimingDraft: CollectionTimingDraft | null;
  onChangeCollectionTiming: (value: CollectionTimingDraft) => void;
  chargeNowMethodDraft: ChargeNowMethodDraft | null;
  onChangeChargeNowMethod: (value: ChargeNowMethodDraft) => void;
  chargeNowAmountMode: ChargeNowAmountMode;
  hasChargeNowAmountModeChoice: boolean;
  onChangeChargeNowAmountMode: (value: ChargeNowAmountMode) => void;
  effectiveSignalPercentageDraft: number;
  chargeNowSuggestedSignalAmount: number;
  chargeNowCustomAmount: string;
  onChangeChargeNowCustomAmount: (value: string) => void;
  chargeNowAmountError: string | null;
  chargeNowDraftAmount: number;
  onClearChargeFlowError: () => void;
}

function SectionTitle({ title }: { title: string }) {
  return <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted">{title}</p>;
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

function PillSwitch({
  checked,
  onToggleAction,
}: {
  checked: boolean;
  onToggleAction: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onToggleAction}
      className={`relative inline-flex h-7 w-12 items-center rounded-full border transition ${
        checked ? "border-studio-green bg-studio-green" : "border-line bg-white"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export function AppointmentFinanceStep({
  sectionCardClass,
  sectionNumberClass,
  sectionHeaderTextClass,
  financeDraftItems,
  financeExtraItems,
  displacementEstimate,
  scheduleSubtotal,
  effectiveScheduleDiscount,
  scheduleDiscountType,
  effectiveScheduleDiscountInputValue,
  scheduleTotal,
  financeNewItemLabel,
  financeNewItemAmount,
  onChangeFinanceNewItemLabel,
  onChangeFinanceNewItemAmount,
  onAddFinanceItem,
  onRemoveFinanceItem,
  scheduleDiscountValue,
  onChangeScheduleDiscountType,
  onChangeScheduleDiscountValue,
  collectionTimingDraft,
  onChangeCollectionTiming,
  chargeNowMethodDraft,
  onChangeChargeNowMethod,
  chargeNowAmountMode,
  hasChargeNowAmountModeChoice,
  onChangeChargeNowAmountMode,
  effectiveSignalPercentageDraft,
  chargeNowSuggestedSignalAmount,
  chargeNowCustomAmount,
  onChangeChargeNowCustomAmount,
  chargeNowAmountError,
  chargeNowDraftAmount,
  onClearChargeFlowError,
}: AppointmentFinanceStepProps) {
  const baseItems = financeDraftItems.filter((item) => item.type === "service" || item.type === "fee");
  const isChargeNowEnabled = collectionTimingDraft === "charge_now";
  const hasExtraItems = financeExtraItems.length > 0;
  const hasDiscountApplied = effectiveScheduleDiscount > 0;
  const [isAddItemEnabled, setIsAddItemEnabled] = useState(hasExtraItems);
  const [isDiscountEnabled, setIsDiscountEnabled] = useState(hasDiscountApplied);

  useEffect(() => {
    if (hasExtraItems) setIsAddItemEnabled(true);
  }, [hasExtraItems]);

  useEffect(() => {
    if (hasDiscountApplied) setIsDiscountEnabled(true);
  }, [hasDiscountApplied]);

  const chargeNowMethodOptions = [
    { value: "pix_mp", label: "Pix", icon: "pix" as const },
    {
      value: "card",
      label: "Cartao",
      icon: "card" as const,
      iconNode: <CreditCard className="mx-auto h-4 w-4" />,
    },
    {
      value: "cash",
      label: "Dinheiro",
      icon: "cash" as const,
      iconNode: <Wallet className="mx-auto h-4 w-4" />,
    },
    {
      value: "waiver",
      label: "Cortesia",
      icon: "waiver" as const,
      iconNode: <Gift className="mx-auto h-4 w-4" />,
      tone: "waiver" as const,
    },
  ] as const;

  return (
    <section className={`${sectionCardClass} overflow-hidden`}>
      <div className={appointmentFormSectionHeaderPrimaryClass}>
        <div className="flex min-w-0 items-center gap-2">
          <div className={sectionNumberClass}>4</div>
          <h2 className={`${sectionHeaderTextClass} leading-none`}>Financeiro</h2>
        </div>
      </div>

      <div className="space-y-3 px-4 py-4 wl-surface-card-body">
        <SectionTitle title="Resumo" />
        <div className="space-y-2 text-sm">
          {baseItems.length > 0 ? (
            baseItems.map((item, index) => (
              <div key={`${item.type}-${item.label}-${index}`} className="grid grid-cols-[1fr_auto] items-start gap-3">
                <div>
                  <p className={item.type === "fee" ? "font-semibold text-dom-strong" : "font-semibold text-studio-text"}>
                    {item.label}
                  </p>
                  {item.type === "fee" ? (
                    <p className="mt-1 text-[11px] text-muted">
                      Distancia estimada: {displacementEstimate?.distanceKm?.toFixed(2) ?? "0.00"} km
                    </p>
                  ) : null}
                </div>
                <p className="tabular-nums font-bold text-studio-text">R$ {formatCurrencyLabel(Number(item.amount) * Number(item.qty ?? 1))}</p>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted">Selecione um servico para montar o financeiro.</p>
          )}

          {financeExtraItems.length > 0 ? (
            <div className="space-y-2 border-t border-line pt-2">
              {financeExtraItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2 text-sm">
                  <p className="truncate text-studio-text">{item.label || "Item adicional"}</p>
                  <div className="flex items-center gap-2">
                    <p className="tabular-nums font-bold text-studio-text">R$ {formatCurrencyLabel(item.amount * (item.qty ?? 1))}</p>
                    <button
                      type="button"
                      onClick={() => onRemoveFinanceItem(item.id)}
                      className={`${appointmentFormButtonInlineClass} h-7 w-7 rounded-lg px-0 text-muted hover:text-red-600`}
                      aria-label={`Remover item ${item.label}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="space-y-1 border-t border-line pt-2">
            <div className="flex items-center justify-between text-muted">
              <span>Subtotal</span>
              <span className="tabular-nums font-semibold">R$ {formatCurrencyLabel(scheduleSubtotal)}</span>
            </div>
            {effectiveScheduleDiscount > 0 ? (
              <div className="flex items-center justify-between text-muted">
                <span>Desconto {scheduleDiscountType === "pct" ? `(${effectiveScheduleDiscountInputValue}%)` : ""}</span>
                <span className="tabular-nums font-semibold">- R$ {formatCurrencyLabel(effectiveScheduleDiscount)}</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between pt-1 text-base font-bold text-studio-text">
              <span>Total</span>
              <span className="tabular-nums">R$ {formatCurrencyLabel(scheduleTotal)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="overflow-hidden rounded-xl border border-line">
            <div className="flex items-center justify-between px-3 py-2.5 wl-surface-card-header">
              <div>
                <p className="text-[14px] font-bold text-studio-text">Adicionar item</p>
              </div>
              <PillSwitch
                checked={isAddItemEnabled}
                onToggleAction={() => {
                  if (isAddItemEnabled) {
                    for (const item of financeExtraItems) {
                      onRemoveFinanceItem(item.id);
                    }
                    onChangeFinanceNewItemLabel("");
                    onChangeFinanceNewItemAmount("");
                    setIsAddItemEnabled(false);
                    return;
                  }
                  setIsAddItemEnabled(true);
                }}
              />
            </div>

            <div
              className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${
                isAddItemEnabled ? "max-h-52 opacity-100" : "max-h-0 opacity-0"
              }`}
              aria-hidden={!isAddItemEnabled}
            >
              <div className="grid grid-cols-[1fr_88px_40px] gap-2 border-t border-line px-3 pb-3 pt-2 wl-surface-card-header">
                <input
                  className="rounded-xl border border-line px-3 py-2 text-xs wl-surface-input"
                  placeholder="Novo item"
                  value={financeNewItemLabel}
                  onChange={(event) => onChangeFinanceNewItemLabel(event.target.value)}
                />
                <input
                  className="rounded-xl border border-line px-3 py-2 text-xs wl-surface-input"
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={financeNewItemAmount}
                  onChange={(event) => onChangeFinanceNewItemAmount(event.target.value)}
                />
                <button
                  type="button"
                  className={`${appointmentFormButtonInlineClass} h-9 w-10 px-0`}
                  onClick={onAddFinanceItem}
                  aria-label="Adicionar item"
                  title="Adicionar item"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-line">
            <div className="flex items-center justify-between px-3 py-2.5 wl-surface-card-header">
              <div>
                <p className="text-[14px] font-bold text-studio-text">Desconto</p>
              </div>
              <PillSwitch
                checked={isDiscountEnabled}
                onToggleAction={() => {
                  if (isDiscountEnabled) {
                    onChangeScheduleDiscountValue("");
                    setIsDiscountEnabled(false);
                    return;
                  }
                  setIsDiscountEnabled(true);
                }}
              />
            </div>

            <div
              className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${
                isDiscountEnabled ? "max-h-44 opacity-100" : "max-h-0 opacity-0"
              }`}
              aria-hidden={!isDiscountEnabled}
            >
              <div className="grid grid-cols-2 gap-2 border-t border-line px-3 pb-3 pt-2 wl-surface-card-header">
                <select
                  value={scheduleDiscountType}
                  onChange={(event) => onChangeScheduleDiscountType(event.target.value === "pct" ? "pct" : "value")}
                  className="rounded-xl border border-line px-3 py-2 text-xs wl-surface-input"
                >
                  <option value="value">Desconto em R$</option>
                  <option value="pct">Desconto em %</option>
                </select>
                <input
                  type="text"
                  inputMode="decimal"
                  value={scheduleDiscountValue}
                  onChange={(event) => onChangeScheduleDiscountValue(event.target.value)}
                  className="rounded-xl border border-line px-3 py-2 text-xs wl-surface-input"
                  placeholder="0,00"
                />
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-line">
            <div className="flex items-center justify-between px-3 py-2.5 wl-surface-card-header">
              <div>
                <p className="text-[14px] font-bold text-studio-text">Cobrar agora</p>
              </div>
              <PillSwitch
                checked={isChargeNowEnabled}
                onToggleAction={() => {
                  if (isChargeNowEnabled) {
                    onChangeCollectionTiming("at_attendance");
                  } else {
                    onChangeCollectionTiming("charge_now");
                  }
                  onClearChargeFlowError();
                }}
              />
            </div>

            <div
              className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${
                isChargeNowEnabled ? "max-h-180 opacity-100" : "max-h-0 opacity-0"
              }`}
              aria-hidden={!isChargeNowEnabled}
            >
              <div className="space-y-3 border-t border-line px-3 pb-3 pt-2 wl-surface-card-header">
                <PaymentMethodSelector
                  options={chargeNowMethodOptions}
                  value={chargeNowMethodDraft}
                  variant="modal-grid"
                  columnsClassName="grid-cols-4"
                  onChangeAction={(value) => {
                    onChangeChargeNowMethod(value);
                  }}
                />

                {chargeNowMethodDraft === "waiver" ? (
                  <p className="text-[11px] text-sky-900">Cortesia selecionada. O agendamento sera criado sem fluxo de cobranca.</p>
                ) : null}

                {chargeNowMethodDraft !== null && chargeNowMethodDraft !== "waiver" ? (
                  <div className="space-y-2">
                    <div className="overflow-hidden rounded-xl border border-line bg-paper">
                      <div className="grid grid-cols-2">
                        <SheetSegmentOption
                          label="Integral"
                          selected={hasChargeNowAmountModeChoice && chargeNowAmountMode === "full"}
                          onClickAction={() => {
                            onChangeChargeNowAmountMode("full");
                          }}
                        />
                        <SheetSegmentOption
                          label={`Sinal (${Number.isInteger(effectiveSignalPercentageDraft) ? effectiveSignalPercentageDraft : Number(effectiveSignalPercentageDraft.toFixed(2))}%)`}
                          selected={hasChargeNowAmountModeChoice && chargeNowAmountMode === "signal"}
                          onClickAction={() => {
                            onChangeChargeNowAmountMode("signal");
                            if (!chargeNowCustomAmount.trim() && chargeNowSuggestedSignalAmount > 0) {
                              onChangeChargeNowCustomAmount(formatCurrencyInput(chargeNowSuggestedSignalAmount));
                            }
                          }}
                        />
                      </div>

                      {hasChargeNowAmountModeChoice && chargeNowAmountMode === "signal" ? (
                        <div className="space-y-2 border-t border-line px-3 py-3">
                          <div className="grid grid-cols-[1fr_140px] items-center gap-2">
                            <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted">Valor do sinal</label>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={chargeNowCustomAmount}
                              onChange={(event) => {
                                onChangeChargeNowCustomAmount(event.target.value);
                              }}
                              className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm font-black text-studio-text tabular-nums outline-none focus:border-studio-green focus:ring-1 focus:ring-studio-green"
                              placeholder={formatCurrencyInput(chargeNowSuggestedSignalAmount || 0)}
                            />
                          </div>
                          {chargeNowAmountError ? <p className="text-[11px] font-semibold text-red-700">{chargeNowAmountError}</p> : null}
                          {!chargeNowAmountError && chargeNowMethodDraft === "pix_mp" && chargeNowDraftAmount > 0 ? (
                            <p className="text-[11px] text-muted">Valor minimo do PIX Mercado Pago: R$ 1,00.</p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    {hasChargeNowAmountModeChoice && chargeNowAmountMode === "full" && chargeNowAmountError ? (
                      <p className="text-[11px] font-semibold text-red-700">{chargeNowAmountError}</p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
