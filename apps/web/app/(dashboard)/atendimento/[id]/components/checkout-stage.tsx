"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { AttendanceRow, CheckoutItem, CheckoutRow, PaymentRow } from "../../../../../lib/attendance/attendance-types";
import { PaymentMethodIcon } from "../../../../../components/ui/payment-method-icon";
import { StageStatusBadge } from "./stage-status";

interface CheckoutStageProps {
  attendance: AttendanceRow;
  checkout: CheckoutRow | null;
  items: CheckoutItem[];
  payments: PaymentRow[];
  onSaveItems: (items: Array<{ type: CheckoutItem["type"]; label: string; qty: number; amount: number }>) => void;
  onSetDiscount: (type: "value" | "pct" | null, value: number | null, reason?: string) => void;
  onRecordPayment: (method: PaymentRow["method"], amount: number) => void;
  onConfirmCheckout: () => void;
}

const paymentLabels: Record<PaymentRow["method"], string> = {
  pix: "Pix",
  card: "Cartão",
  cash: "Dinheiro",
  other: "Outro",
};

export function CheckoutStage({
  attendance,
  checkout,
  items,
  payments,
  onSaveItems,
  onSetDiscount,
  onRecordPayment,
  onConfirmCheckout,
}: CheckoutStageProps) {
  const router = useRouter();
  const [draftItems, setDraftItems] = useState(
    items.map((item) => ({
      type: item.type,
      label: item.label,
      qty: item.qty,
      amount: item.amount,
    }))
  );
  const [newItem, setNewItem] = useState({ type: "addon" as CheckoutItem["type"], label: "", qty: 1, amount: 0 });
  const [discountType, setDiscountType] = useState<"value" | "pct" | null>(checkout?.discount_type ?? "value");
  const [discountValue, setDiscountValue] = useState<number>(checkout?.discount_value ?? 0);
  const [discountReason, setDiscountReason] = useState<string>(checkout?.discount_reason ?? "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentRow["method"]>("pix");
  const [paymentAmount, setPaymentAmount] = useState<number>(checkout?.total ?? 0);

  const isPaid = checkout?.payment_status === "paid";
  const isLocked = isPaid || attendance.checkout_status === "locked";

  const subtotal = checkout?.subtotal ?? 0;
  const total = checkout?.total ?? 0;
  const paidTotal = useMemo(
    () => payments.filter((payment) => payment.status === "paid").reduce((acc, payment) => acc + Number(payment.amount ?? 0), 0),
    [payments]
  );
  const remainingTotal = useMemo(() => Math.max(total - paidTotal, 0), [total, paidTotal]);

  const appliedDiscountValue = useMemo(() => Math.max(0, subtotal - total), [subtotal, total]);

  useEffect(() => {
    setDraftItems(
      items.map((item) => ({
        type: item.type,
        label: item.label,
        qty: item.qty,
        amount: item.amount,
      }))
    );
  }, [items]);

  useEffect(() => {
    setPaymentAmount(remainingTotal);
  }, [remainingTotal]);

  useEffect(() => {
    setDiscountType(checkout?.discount_type ?? "value");
    setDiscountValue(checkout?.discount_value ?? 0);
    setDiscountReason(checkout?.discount_reason ?? "");
  }, [checkout?.discount_type, checkout?.discount_value, checkout?.discount_reason]);

  useEffect(() => {
    if (isLocked) return;
    const normalizedValue = Number.isFinite(Number(discountValue)) ? Math.max(Number(discountValue), 0) : 0;
    const nextType: "value" | "pct" | null = normalizedValue > 0 ? discountType : null;
    const nextReason = discountReason.trim();
    const currentType = checkout?.discount_type ?? null;
    const currentValue = Number.isFinite(Number(checkout?.discount_value ?? 0))
      ? Math.max(Number(checkout?.discount_value ?? 0), 0)
      : 0;
    const currentReason = (checkout?.discount_reason ?? "").trim();
    const hasChange =
      nextType !== currentType ||
      Math.abs(normalizedValue - currentValue) > 0.009 ||
      nextReason !== currentReason;

    if (!hasChange) return;

    const timeout = window.setTimeout(() => {
      onSetDiscount(nextType, normalizedValue > 0 ? normalizedValue : null, nextReason || undefined);
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [checkout?.discount_reason, checkout?.discount_type, checkout?.discount_value, discountReason, discountType, discountValue, isLocked, onSetDiscount]);

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-3xl p-5 shadow-soft border border-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-serif font-bold text-studio-text">Checkout</h2>
            <p className="text-xs text-muted mt-1">Itens, desconto e confirmação de pagamento.</p>
          </div>
          <StageStatusBadge status={attendance.checkout_status} variant="compact" />
        </div>

        <div className="mt-4 bg-paper border border-line rounded-3xl p-4">
          <p className="text-[10px] font-extrabold text-muted uppercase tracking-widest mb-3">Itens</p>
          <div className="space-y-2 text-sm">
            {draftItems.map((item, index) => (
              <div key={`${item.label}-${index}`} className="flex justify-between font-bold text-studio-text">
                <span className={item.type === "fee" ? "text-dom-strong" : ""}>{item.label}</span>
                <span className="tabular-nums">R$ {Number(item.amount).toFixed(2)}</span>
              </div>
            ))}
            <div className="h-px bg-gray-100 my-2"></div>
            <div className="flex justify-between text-muted font-bold">
              <span>Subtotal</span>
              <span className="tabular-nums">R$ {subtotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 bg-white border border-gray-100 rounded-3xl p-4">
          <p className="text-[10px] font-extrabold text-muted uppercase tracking-widest">Adicionar item</p>
          <div className="mt-3 grid grid-cols-[86px_1fr_80px_40px] gap-2">
            <select
              value={newItem.type}
              onChange={(event) => setNewItem({ ...newItem, type: event.target.value as CheckoutItem["type"] })}
              disabled={isLocked}
              className={`rounded-xl border border-line px-2 py-2 text-xs ${isLocked ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              <option value="service">Serviço</option>
              <option value="fee">Taxa</option>
              <option value="addon">Addon</option>
              <option value="adjustment">Ajuste</option>
            </select>
            <input
              value={newItem.label}
              onChange={(event) => setNewItem({ ...newItem, label: event.target.value })}
              placeholder="Descrição"
              disabled={isLocked}
              className={`rounded-xl border border-line px-3 py-2 text-xs ${isLocked ? "opacity-60 cursor-not-allowed" : ""}`}
            />
            <input
              type="number"
              value={newItem.amount}
              onChange={(event) => setNewItem({ ...newItem, amount: Number(event.target.value) })}
              placeholder="0"
              disabled={isLocked}
              className={`rounded-xl border border-line px-3 py-2 text-xs ${isLocked ? "opacity-60 cursor-not-allowed" : ""}`}
            />
            <button
              onClick={() => {
                if (!newItem.label.trim()) return;
                setDraftItems([...draftItems, newItem]);
                setNewItem({ type: "addon", label: "", qty: 1, amount: 0 });
              }}
              disabled={isLocked}
              className={`inline-flex h-9 w-10 items-center justify-center rounded-xl border border-line ${
                isLocked ? "bg-studio-light text-muted cursor-not-allowed" : "text-studio-text hover:bg-paper"
              }`}
              aria-label="Adicionar item"
              title="Adicionar item"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => onSaveItems(draftItems)}
              disabled={isLocked}
              className={`px-3 py-2 rounded-xl text-xs font-bold ${
                isLocked ? "bg-studio-light text-muted cursor-not-allowed" : "bg-studio-green text-white"
              }`}
            >
              Salvar itens
            </button>
          </div>
        </div>

        <div className="mt-4 bg-white border border-gray-100 rounded-3xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-extrabold text-muted uppercase tracking-widest">Desconto</p>
            <div className="flex gap-2">
              <button
                onClick={() => setDiscountType("value")}
                disabled={isLocked}
                className={`px-3 py-1.5 rounded-2xl text-[11px] font-extrabold border ${
                  discountType === "value"
                    ? "bg-studio-light text-studio-green border-studio-green/10"
                    : "bg-paper text-muted border-gray-200"
                } ${isLocked ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                R$
              </button>
              <button
                onClick={() => setDiscountType("pct")}
                disabled={isLocked}
                className={`px-3 py-1.5 rounded-2xl text-[11px] font-extrabold border ${
                  discountType === "pct"
                    ? "bg-studio-light text-studio-green border-studio-green/10"
                    : "bg-paper text-muted border-gray-200"
                } ${isLocked ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                %
              </button>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 bg-paper border border-gray-100 rounded-2xl px-4 py-3">
              <label className="text-[10px] font-extrabold text-muted uppercase tracking-widest">Valor</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={discountValue}
                onChange={(event) => setDiscountValue(Number(event.target.value))}
                className="w-full bg-transparent outline-none text-lg font-black text-studio-text tabular-nums mt-1"
                disabled={isLocked}
              />
            </div>
            <div className="bg-paper border border-gray-100 rounded-2xl px-4 py-3">
              <label className="text-[10px] font-extrabold text-muted uppercase tracking-widest">Aplicado</label>
              <p className="text-lg font-black text-studio-text tabular-nums mt-1">R$ {appliedDiscountValue.toFixed(2)}</p>
            </div>
          </div>

          <div className="mt-3 bg-paper border border-gray-100 rounded-2xl px-4 py-3">
            <label className="text-[10px] font-extrabold text-muted uppercase tracking-widest">Motivo</label>
            <input
              value={discountReason}
              onChange={(event) => setDiscountReason(event.target.value)}
              type="text"
              placeholder="Ex.: fidelidade / ajuste"
              className="w-full bg-transparent outline-none text-sm font-bold text-studio-text mt-1"
              disabled={isLocked}
            />
          </div>
        </div>

        <div className="mt-4 bg-white border border-gray-100 rounded-3xl p-4">
          <p className="text-[10px] font-extrabold text-muted uppercase tracking-widest">Pagamento</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {([
              { method: "pix", label: "Pix", icon: <PaymentMethodIcon method="pix" className="h-4 w-4" /> },
              { method: "card", label: "Cartão", icon: <PaymentMethodIcon method="card" className="h-4 w-4" /> },
              { method: "cash", label: "Dinheiro", icon: <PaymentMethodIcon method="cash" className="h-4 w-4" /> },
              { method: "other", label: "Outro", icon: <Plus className="w-4 h-4" /> },
            ] as const).map((item) => (
              <button
                key={item.method}
                type="button"
                onClick={() => setPaymentMethod(item.method)}
                disabled={isLocked}
                className={`py-3 px-4 rounded-2xl border text-xs font-extrabold flex items-center justify-center gap-2 transition ${
                  paymentMethod === item.method
                    ? "border-studio-green bg-studio-light text-studio-green"
                    : "border-gray-200 text-muted hover:bg-gray-50"
                } ${isLocked ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-3">
            <input
              type="number"
              value={paymentAmount}
              onChange={(event) => {
                const nextValue = Number(event.target.value);
                if (Number.isNaN(nextValue)) {
                  setPaymentAmount(0);
                  return;
                }
                setPaymentAmount(Math.min(Math.max(nextValue, 0), remainingTotal));
              }}
              max={remainingTotal}
              className="w-full px-4 py-3 rounded-2xl bg-paper border border-gray-100 text-sm font-bold"
              disabled={isLocked}
            />
            <button
              onClick={() => onRecordPayment(paymentMethod, Math.min(paymentAmount, remainingTotal))}
              disabled={isLocked}
              className={`px-4 py-3 rounded-2xl text-xs font-extrabold uppercase tracking-wide shadow-soft active:scale-[0.99] transition ${
                isLocked ? "bg-studio-light text-muted cursor-not-allowed" : "bg-studio-green text-white"
              }`}
            >
              Registrar
            </button>
          </div>

          {payments.length > 0 && (
            <div className="mt-4 space-y-2">
              {payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between text-xs text-muted">
                  <span>{paymentLabels[payment.method]}</span>
                  <span className="font-bold">R$ {Number(payment.amount).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={onConfirmCheckout}
            disabled={isLocked}
            className={`mt-4 w-full h-12 rounded-2xl bg-studio-green text-white font-extrabold shadow-lg shadow-green-200 active:scale-95 transition flex items-center justify-center gap-2 text-xs tracking-wide uppercase ${
              isLocked ? "opacity-60 cursor-not-allowed" : ""
            }`}
          >
            Confirmar pagamento
          </button>

          {isPaid && (
            <div className="mt-4 bg-white border border-dashed border-gray-200 rounded-3xl p-4">
              <p className="text-sm font-bold text-studio-text">Checkout confirmado</p>
              <p className="text-xs text-muted mt-1">Somente leitura. Ajustes via Financeiro.</p>
              <button
                onClick={() => router.push("/caixa")}
                className="mt-3 w-full h-12 rounded-2xl bg-paper border border-gray-200 text-gray-700 font-extrabold text-xs hover:bg-gray-50 transition"
              >
                Ver no Financeiro
              </button>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-muted">
          <span>Subtotal: R$ {subtotal.toFixed(2)}</span>
          <span>Status: {checkout?.payment_status ?? "pending"}</span>
        </div>
      </div>
    </div>
  );
}
