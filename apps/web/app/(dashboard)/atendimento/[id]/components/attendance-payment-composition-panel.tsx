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
  return (
    <section className="mt-5 rounded-2xl border border-line px-4 py-4 bg-white">
      <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-muted mb-3">
        <PaymentMethodIcon method="card" className="h-3.5 w-3.5" />
        Composição da cobrança
      </div>

      <div className="space-y-2">
        {serviceItems.map(({ item, index }) => (
          <div key={`service-${index}`} className="flex items-center justify-between gap-3 text-sm text-studio-text">
            <span className="truncate pr-3">
              {item.label}
              {(item.qty ?? 1) > 1 ? ` x${item.qty}` : ""}
            </span>
            <span className="font-bold">{formatCurrency(item.amount * (item.qty ?? 1))}</span>
          </div>
        ))}

        {displacementItems.map(({ item, index }) => (
          <div key={`displacement-${index}`} className="flex items-center justify-between gap-3 text-sm text-studio-text">
            <span className="truncate pr-3">
              {item.label}
              {(item.qty ?? 1) > 1 ? ` x${item.qty}` : ""}
            </span>
            <span className="font-bold">{formatCurrency(item.amount * (item.qty ?? 1))}</span>
          </div>
        ))}

        {otherItems.map(({ item, index }) => (
          <div key={`extra-${index}`} className="flex items-center justify-between gap-3 text-sm text-studio-text">
            <span className="truncate pr-3">
              {item.label}
              {(item.qty ?? 1) > 1 ? ` x${item.qty}` : ""}
            </span>
            <div className="flex items-center gap-2">
              <span className="font-bold">{formatCurrency(item.amount * (item.qty ?? 1))}</span>
              {isRemovableItem(item) && (
                <button
                  type="button"
                  onClick={() => onRemoveItem(index)}
                  disabled={checkoutSaving}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-line bg-white text-muted hover:text-red-600"
                  aria-label={`Remover item ${item.label}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 border-t border-line pt-4">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted">Adicionar item</p>
        <div className="mt-2 grid grid-cols-[1fr_88px_40px] gap-2">
          <input
            className="rounded-xl border border-line px-3 py-2 text-xs"
            placeholder="Novo item"
            value={newItem.label}
            disabled={checkoutSaving}
            onChange={(event) => onChangeNewItemLabel(event.target.value)}
          />
          <input
            className="rounded-xl border border-line px-3 py-2 text-xs"
            type="number"
            value={newItem.amount}
            disabled={checkoutSaving}
            onChange={(event) => onChangeNewItemAmount(Number(event.target.value))}
          />
          <button
            className="inline-flex h-9 w-10 items-center justify-center rounded-xl border border-line text-studio-text hover:bg-paper disabled:opacity-60"
            onClick={onAddItem}
            disabled={checkoutSaving}
            aria-label="Adicionar item"
            title="Adicionar item"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 border-t border-line pt-4">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted">Desconto</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <select
            value={discountTypeInput}
            disabled={checkoutSaving}
            onChange={(event) => onChangeDiscountType(event.target.value === "pct" ? "pct" : "value")}
            className="rounded-xl border border-line px-3 py-2 text-xs"
          >
            <option value="value">Desconto em R$</option>
            <option value="pct">Desconto em %</option>
          </select>
          <input
            type="number"
            value={discountValueInput}
            disabled={checkoutSaving}
            onChange={(event) => onChangeDiscountValue(Number(event.target.value))}
            className="rounded-xl border border-line px-3 py-2 text-xs"
          />
        </div>
        <input
          value={discountReasonInput}
          disabled={checkoutSaving}
          onChange={(event) => onChangeDiscountReason(event.target.value)}
          className="mt-2 w-full rounded-xl border border-line px-3 py-2 text-xs"
          placeholder="Motivo do desconto"
        />
      </div>

      <div className="mt-4 border-t border-dashed border-line pt-3 space-y-2">
        {appliedDiscountAmount > 0 && (
          <div className="flex items-center justify-between text-sm text-studio-text">
            <span className="truncate pr-3">
              {appliedDiscountReason
                ? `Desconto • ${appliedDiscountReason}`
                : appliedDiscountType === "pct"
                  ? `Desconto aplicado (${appliedDiscountValue}%)`
                  : "Desconto aplicado"}
            </span>
            <span className="font-bold text-studio-green">- {formatCurrency(appliedDiscountAmount)}</span>
          </div>
        )}
        {paidTotal > 0 && (
          <div className="flex items-center justify-between text-sm text-studio-text">
            <span>Já pago</span>
            <span className="font-bold text-studio-green">- {formatCurrency(paidTotal)}</span>
          </div>
        )}
        <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-muted">
          <span>Total do checkout</span>
          <span className="text-base font-black text-studio-text">{totalLabel}</span>
        </div>
        <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-muted">
          <span>Valor a cobrar agora</span>
          <span className="text-lg font-black text-studio-text">{effectiveChargeAmountLabel}</span>
        </div>
      </div>
    </section>
  );
}
