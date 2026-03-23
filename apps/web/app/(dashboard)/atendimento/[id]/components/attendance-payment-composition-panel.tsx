import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import type { CheckoutItem } from "../../../../../lib/attendance/attendance-types";
import { PaymentMethodIcon } from "../../../../../components/ui/payment-method-icon";

type IndexedItem = {
  index: number;
  item: {
    type: CheckoutItem["type"];
    label: string;
    qty: number;
    amount: number;
  };
};

interface AttendancePaymentCompositionPanelProps {
  serviceItems: IndexedItem[];
  displacementItems: IndexedItem[];
  otherItems: IndexedItem[];
  checkoutSaving: boolean;
  newItem: { label: string; amount: number };
  discountTypeInput: "value" | "pct";
  discountValueInput: number;
  discountReasonInput: string;
  appliedDiscountAmount: number;
  appliedDiscountType: "value" | "pct" | null;
  appliedDiscountValue: number;
  appliedDiscountReason: string;
  paidTotal: number;
  totalLabel: string;
  effectiveChargeAmountLabel: string;
  formatCurrency: (value: number) => string;
  isRemovableItem: (item: { type: CheckoutItem["type"]; label: string }) => boolean;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onChangeNewItemLabel: (label: string) => void;
  onChangeNewItemAmount: (amount: number) => void;
  onChangeDiscountType: (type: "value" | "pct") => void;
  onChangeDiscountValue: (value: number) => void;
  onChangeDiscountReason: (value: string) => void;
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

export function AttendancePaymentCompositionPanel({
  serviceItems,
  displacementItems,
  otherItems,
  checkoutSaving,
  newItem,
  discountTypeInput,
  discountValueInput,
  discountReasonInput,
  appliedDiscountAmount,
  appliedDiscountType,
  appliedDiscountValue,
  appliedDiscountReason,
  paidTotal,
  totalLabel,
  effectiveChargeAmountLabel,
  formatCurrency,
  isRemovableItem,
  onAddItem,
  onRemoveItem,
  onChangeNewItemLabel,
  onChangeNewItemAmount,
  onChangeDiscountType,
  onChangeDiscountValue,
  onChangeDiscountReason,
}: AttendancePaymentCompositionPanelProps) {
  const [isAddItemEnabled, setIsAddItemEnabled] = useState(otherItems.length > 0);
  const [isDiscountEnabled, setIsDiscountEnabled] = useState(appliedDiscountAmount > 0);

  useEffect(() => {
    if (otherItems.length > 0) setIsAddItemEnabled(true);
  }, [otherItems.length]);

  useEffect(() => {
    if (appliedDiscountAmount > 0) setIsDiscountEnabled(true);
  }, [appliedDiscountAmount]);

  return (
    <section className="wl-surface-card mt-4 overflow-hidden">
      <div className="wl-surface-card-header flex h-12 items-center gap-2 border-b border-line px-3">
        <PaymentMethodIcon method="card" className="h-4 w-4" />
        <p className="wl-typo-card-name-sm text-studio-text">Composicao da cobranca</p>
      </div>

      <div className="wl-surface-card-body space-y-3 px-3 py-3">
        <div className="space-y-2 text-sm">
          {serviceItems.map(({ item, index }) => (
            <div key={`service-${index}`} className="flex items-start justify-between gap-3">
              <span className="pr-3 text-studio-text">
                {item.label}
                {(item.qty ?? 1) > 1 ? ` x${item.qty}` : ""}
              </span>
              <span className="font-bold text-studio-text">{formatCurrency(item.amount * (item.qty ?? 1))}</span>
            </div>
          ))}

          {displacementItems.map(({ item, index }) => (
            <div key={`displacement-${index}`} className="flex items-start justify-between gap-3">
              <span className="pr-3 text-dom-strong">
                {item.label}
                {(item.qty ?? 1) > 1 ? ` x${item.qty}` : ""}
              </span>
              <span className="font-bold text-studio-text">{formatCurrency(item.amount * (item.qty ?? 1))}</span>
            </div>
          ))}

          {otherItems.length > 0 ? (
            <div className="space-y-2 border-t border-line pt-2">
              {otherItems.map(({ item, index }) => (
                <div key={`extra-${index}`} className="flex items-center justify-between gap-3">
                  <span className="truncate pr-3 text-studio-text">
                    {item.label}
                    {(item.qty ?? 1) > 1 ? ` x${item.qty}` : ""}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-studio-text">{formatCurrency(item.amount * (item.qty ?? 1))}</span>
                    {isRemovableItem(item) ? (
                      <button
                        type="button"
                        onClick={() => onRemoveItem(index)}
                        disabled={checkoutSaving}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-line bg-white text-muted transition hover:text-red-600"
                        aria-label={`Remover item ${item.label}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="space-y-1 border-t border-line pt-2">
            {appliedDiscountAmount > 0 ? (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">
                  {appliedDiscountReason
                    ? `Desconto - ${appliedDiscountReason}`
                    : appliedDiscountType === "pct"
                      ? `Desconto aplicado (${appliedDiscountValue}%)`
                      : "Desconto aplicado"}
                </span>
                <span className="font-bold text-studio-green">- {formatCurrency(appliedDiscountAmount)}</span>
              </div>
            ) : null}

            {paidTotal > 0 ? (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Ja pago</span>
                <span className="font-bold text-studio-green">- {formatCurrency(paidTotal)}</span>
              </div>
            ) : null}

            <div className="flex items-center justify-between pt-1">
              <span className="wl-typo-body-sm-strong uppercase tracking-[0.08em] text-muted">Total checkout</span>
              <span className="wl-typo-card-name-sm text-studio-text">{totalLabel}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="wl-typo-body-sm-strong uppercase tracking-[0.08em] text-muted">Valor a cobrar</span>
              <span className="wl-typo-card-name-sm text-studio-text">{effectiveChargeAmountLabel}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="overflow-hidden rounded-xl border border-line">
            <div className="wl-surface-card-header flex items-center justify-between px-3 py-2.5">
              <p className="text-[14px] font-bold text-studio-text">Adicionar item</p>
              <PillSwitch
                checked={isAddItemEnabled}
                onToggleAction={() => {
                  if (isAddItemEnabled && otherItems.length > 0) {
                    const indexes = otherItems
                      .map(({ index }) => index)
                      .sort((a, b) => b - a);
                    for (const index of indexes) {
                      onRemoveItem(index);
                    }
                  }
                  if (isAddItemEnabled) {
                    onChangeNewItemLabel("");
                    onChangeNewItemAmount(0);
                  }
                  setIsAddItemEnabled((current) => !current);
                }}
              />
            </div>
            <div
              className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${
                isAddItemEnabled ? "max-h-52 opacity-100" : "max-h-0 opacity-0"
              }`}
              aria-hidden={!isAddItemEnabled}
            >
              <div className="wl-surface-card-header grid grid-cols-[1fr_88px_40px] gap-2 border-t border-line px-3 pb-3 pt-2">
                <input
                  className="wl-surface-input rounded-xl border border-line px-3 py-2 text-xs"
                  placeholder="Novo item"
                  value={newItem.label}
                  onChange={(event) => onChangeNewItemLabel(event.target.value)}
                />
                <input
                  className="wl-surface-input rounded-xl border border-line px-3 py-2 text-xs"
                  type="number"
                  value={newItem.amount}
                  onChange={(event) => onChangeNewItemAmount(Number(event.target.value))}
                />
                <button
                  type="button"
                  className="inline-flex h-9 w-10 items-center justify-center rounded-xl border border-line bg-white text-studio-text transition hover:bg-paper"
                  onClick={onAddItem}
                  aria-label="Adicionar item"
                  title="Adicionar item"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-line">
            <div className="wl-surface-card-header flex items-center justify-between px-3 py-2.5">
              <p className="text-[14px] font-bold text-studio-text">Desconto</p>
              <PillSwitch
                checked={isDiscountEnabled}
                onToggleAction={() => {
                  if (isDiscountEnabled) {
                    onChangeDiscountValue(0);
                    onChangeDiscountReason("");
                  }
                  setIsDiscountEnabled((current) => !current);
                }}
              />
            </div>
            <div
              className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${
                isDiscountEnabled ? "max-h-52 opacity-100" : "max-h-0 opacity-0"
              }`}
              aria-hidden={!isDiscountEnabled}
            >
              <div className="wl-surface-card-header space-y-2 border-t border-line px-3 pb-3 pt-2">
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={discountTypeInput}
                    onChange={(event) => onChangeDiscountType(event.target.value === "pct" ? "pct" : "value")}
                    className="wl-surface-input rounded-xl border border-line px-3 py-2 text-xs"
                  >
                    <option value="value">Desconto em R$</option>
                    <option value="pct">Desconto em %</option>
                  </select>
                  <input
                    type="number"
                    value={discountValueInput}
                    onChange={(event) => onChangeDiscountValue(Number(event.target.value))}
                    className="wl-surface-input rounded-xl border border-line px-3 py-2 text-xs"
                  />
                </div>
                <input
                  value={discountReasonInput}
                  onChange={(event) => onChangeDiscountReason(event.target.value)}
                  className="wl-surface-input w-full rounded-xl border border-line px-3 py-2 text-xs"
                  placeholder="Motivo do desconto"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
