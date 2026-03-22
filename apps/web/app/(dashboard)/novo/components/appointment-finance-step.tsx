import { useEffect, useState } from "react";
import { Check, CreditCard, Gift, Plus, Trash2, Wallet } from "lucide-react";

import { PaymentMethodSelector } from "../../../../components/ui/payment-method-selector";
import { formatCurrencyInput, formatCurrencyLabel } from "../../../../src/shared/currency";
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
  chargeNowSignalValueConfirmed: boolean;
  onConfirmSignalValue: () => void;
  onResetSignalValueConfirmation: () => void;
  onClearChargeFlowError: () => void;
}

function SectionTitle({ title }: { title: string }) {
  return <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted">{title}</p>;
}

function CompactSegmentOption({
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
      className={`h-9 rounded-lg border px-3 text-[12px] font-semibold transition ${
        selected
          ? "border-studio-green bg-studio-light text-studio-green"
          : "border-line bg-white text-muted hover:bg-paper"
      }`}
      aria-pressed={selected}
    >
      {label}
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
  chargeNowSignalValueConfirmed,
  onConfirmSignalValue,
  onResetSignalValueConfirmation,
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
      label: "Credito",
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
      <div className="flex h-11 items-center gap-2 border-b border-line px-3 wl-surface-card-header">
        <div className={sectionNumberClass}>4</div>
        <h2 className={`${sectionHeaderTextClass} leading-none`}>Financeiro</h2>
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
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-line bg-white text-muted hover:text-red-600"
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
          <div className="flex items-center justify-between rounded-xl border border-line bg-white px-3 py-2.5">
            <div>
              <p className="text-[12px] font-semibold text-studio-text">Adicionar item</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                {isAddItemEnabled
                  ? hasExtraItems
                    ? `${financeExtraItems.length} ${financeExtraItems.length === 1 ? "item ativo" : "itens ativos"}`
                    : "Ativado"
                  : "Desativado"}
              </p>
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
              isAddItemEnabled ? "max-h-48 opacity-100" : "max-h-0 opacity-0"
            }`}
            aria-hidden={!isAddItemEnabled}
          >
            <div className="grid grid-cols-[1fr_88px_40px] gap-2 pt-1">
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
                className="inline-flex h-9 w-10 items-center justify-center rounded-xl border border-line text-studio-text hover:bg-paper"
                onClick={onAddFinanceItem}
                aria-label="Adicionar item"
                title="Adicionar item"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-line bg-white px-3 py-2.5">
            <div>
              <p className="text-[12px] font-semibold text-studio-text">Desconto</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                {isDiscountEnabled
                  ? hasDiscountApplied
                    ? `Aplicado - R$ ${formatCurrencyLabel(effectiveScheduleDiscount)}`
                    : "Ativado"
                  : "Desativado"}
              </p>
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
              isDiscountEnabled ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
            }`}
            aria-hidden={!isDiscountEnabled}
          >
            <div className="grid grid-cols-2 gap-2 pt-1">
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

          <div className="flex items-center justify-between rounded-xl border border-line bg-white px-3 py-2.5">
            <div>
              <p className="text-[12px] font-semibold text-studio-text">Cobrar agora</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                {isChargeNowEnabled ? "Ativado" : "No atendimento"}
              </p>
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
            className={`overflow-hidden transition-[max-height,opacity,margin] duration-300 ease-out ${
              isChargeNowEnabled ? "mt-0 max-h-[680px] opacity-100" : "max-h-0 opacity-0"
            }`}
            aria-hidden={!isChargeNowEnabled}
          >
            <div className="space-y-3 pt-1">
              <p className="text-[11px] font-semibold text-muted">Forma de pagamento</p>
              <PaymentMethodSelector
                options={chargeNowMethodOptions}
                value={chargeNowMethodDraft}
                variant="modal-grid"
                columnsClassName="grid-cols-4"
                onChangeAction={(value) => {
                  onChangeChargeNowMethod(value);
                  onResetSignalValueConfirmation();
                }}
              />

              {chargeNowMethodDraft === "waiver" ? (
                <p className="text-[11px] text-sky-900">Cortesia selecionada. O agendamento sera criado sem fluxo de cobranca.</p>
              ) : null}

              {chargeNowMethodDraft !== null && chargeNowMethodDraft !== "waiver" ? (
                <div className="space-y-3 rounded-xl border border-line bg-white p-3">
                  <p className="text-[11px] font-semibold text-muted">Valor da cobranca</p>
                  <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-line bg-paper p-1.5">
                    <CompactSegmentOption
                      label="Integral"
                      selected={hasChargeNowAmountModeChoice && chargeNowAmountMode === "full"}
                      onClickAction={() => {
                        onChangeChargeNowAmountMode("full");
                        onResetSignalValueConfirmation();
                      }}
                    />
                    <CompactSegmentOption
                      label={`Sinal (${Number.isInteger(effectiveSignalPercentageDraft) ? effectiveSignalPercentageDraft : Number(effectiveSignalPercentageDraft.toFixed(2))}%)`}
                      selected={hasChargeNowAmountModeChoice && chargeNowAmountMode === "signal"}
                      onClickAction={() => {
                        onChangeChargeNowAmountMode("signal");
                        onResetSignalValueConfirmation();
                        if (!chargeNowCustomAmount.trim() && chargeNowSuggestedSignalAmount > 0) {
                          onChangeChargeNowCustomAmount(formatCurrencyInput(chargeNowSuggestedSignalAmount));
                        }
                      }}
                    />
                  </div>

                  {hasChargeNowAmountModeChoice && chargeNowAmountMode === "signal" ? (
                    <div className="space-y-2 rounded-xl border border-line bg-paper p-3">
                      <div className="grid grid-cols-[1fr_130px_auto] items-center gap-2">
                        <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted">Valor do sinal</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={chargeNowCustomAmount}
                          onChange={(event) => {
                            onChangeChargeNowCustomAmount(event.target.value);
                            onResetSignalValueConfirmation();
                          }}
                          className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm font-black text-studio-text tabular-nums outline-none focus:border-studio-green focus:ring-1 focus:ring-studio-green"
                          placeholder={formatCurrencyInput(chargeNowSuggestedSignalAmount || 0)}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!chargeNowAmountError) {
                              onConfirmSignalValue();
                            }
                          }}
                          className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border ${
                            chargeNowSignalValueConfirmed
                              ? "border-studio-green bg-studio-light text-studio-green"
                              : "border-line text-muted hover:bg-paper"
                          }`}
                          aria-label={chargeNowSignalValueConfirmed ? "Valor confirmado" : "Confirmar valor"}
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      </div>
                      {chargeNowAmountError ? <p className="text-[11px] font-semibold text-red-700">{chargeNowAmountError}</p> : null}
                      {!chargeNowAmountError && chargeNowMethodDraft === "pix_mp" && chargeNowDraftAmount > 0 ? (
                        <p className="text-[11px] text-muted">Valor minimo do PIX Mercado Pago: R$ 1,00.</p>
                      ) : null}
                    </div>
                  ) : null}

                  {hasChargeNowAmountModeChoice && chargeNowAmountMode === "full" && chargeNowAmountError ? (
                    <p className="text-[11px] font-semibold text-red-700">{chargeNowAmountError}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
