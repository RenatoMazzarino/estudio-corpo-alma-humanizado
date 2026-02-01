"use client";

import { useEffect, useState } from "react";
import { CreditCard, Tag, Receipt, Plus, Banknote, QrCode } from "lucide-react";
import type { AttendanceRow, CheckoutItem, CheckoutRow, PaymentRow } from "../../../../../lib/attendance/attendance-types";
import { StageHeader } from "./stage-header";
import { StageStatusBadge } from "./stage-status";

interface CheckoutStageProps {
  attendance: AttendanceRow;
  checkout: CheckoutRow | null;
  items: CheckoutItem[];
  payments: PaymentRow[];
  onBack: () => void;
  onMinimize: () => void;
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
  onBack,
  onMinimize,
  onSaveItems,
  onSetDiscount,
  onRecordPayment,
  onConfirmCheckout,
}: CheckoutStageProps) {
  const [draftItems, setDraftItems] = useState(items.map((item) => ({
    type: item.type,
    label: item.label,
    qty: item.qty,
    amount: item.amount,
  })));
  const [newItem, setNewItem] = useState({ type: "addon" as CheckoutItem["type"], label: "", qty: 1, amount: 0 });
  const [discountType, setDiscountType] = useState<"value" | "pct" | null>(checkout?.discount_type ?? "value");
  const [discountValue, setDiscountValue] = useState<number>(checkout?.discount_value ?? 0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentRow["method"]>("pix");
  const [paymentAmount, setPaymentAmount] = useState<number>(checkout?.total ?? 0);

  const subtotal = checkout?.subtotal ?? 0;
  const total = checkout?.total ?? 0;

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
    setPaymentAmount(total);
  }, [total]);

  return (
    <div className="relative -mx-4 -mt-4">
      <StageHeader
        kicker="Etapa"
        title="Checkout"
        subtitle="Taxas, desconto e pagamento"
        onBack={onBack}
        onMinimize={onMinimize}
      />

      <main className="px-6 pt-6 pb-32">
        <div className="bg-white border border-stone-100 rounded-[28px] shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-gray-400">Financeiro</div>
              <div className="mt-2 text-lg font-black text-gray-800">Fechamento do atendimento</div>
              <div className="text-xs text-gray-400 font-semibold mt-1">Itens, deslocamento, desconto e pagamento.</div>
            </div>
            <StageStatusBadge status={attendance.checkout_status} />
          </div>

          <div className="px-5 pb-5">
            <div className="flex gap-4 py-4 border-t border-stone-100">
              <div className="w-10 h-10 rounded-2xl bg-studio-bg text-studio-green flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-gray-400">Itens</div>
                <div className="mt-3 space-y-2">
                  {draftItems.map((item, index) => (
                    <div key={`${item.label}-${index}`} className="flex items-center justify-between gap-3 text-sm font-semibold text-gray-700">
                      <span>{item.label}</span>
                      <span className="tabular-nums">R$ {item.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-4 gap-2">
                  <select
                    value={newItem.type}
                    onChange={(event) => setNewItem({ ...newItem, type: event.target.value as CheckoutItem["type"] })}
                    className="col-span-1 rounded-xl border border-gray-200 px-2 py-2 text-xs"
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
                    className="col-span-2 rounded-xl border border-gray-200 px-3 py-2 text-xs"
                  />
                  <input
                    type="number"
                    value={newItem.amount}
                    onChange={(event) => setNewItem({ ...newItem, amount: Number(event.target.value) })}
                    placeholder="0"
                    className="col-span-1 rounded-xl border border-gray-200 px-3 py-2 text-xs"
                  />
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => {
                      if (!newItem.label.trim()) return;
                      setDraftItems([...draftItems, newItem]);
                      setNewItem({ type: "addon", label: "", qty: 1, amount: 0 });
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-studio-bg text-studio-green text-xs font-bold"
                  >
                    <Plus className="w-3 h-3" /> Adicionar item
                  </button>
                  <button
                    onClick={() => onSaveItems(draftItems)}
                    className="px-3 py-2 rounded-xl bg-studio-green text-white text-xs font-bold"
                  >
                    Salvar itens
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-4 py-4 border-t border-stone-100">
              <div className="w-10 h-10 rounded-2xl bg-yellow-50 text-yellow-600 flex items-center justify-center">
                <Tag className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-gray-400">Desconto</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDiscountType("value")}
                      className={`px-3 py-1 rounded-full text-[10px] font-extrabold border ${
                        discountType === "value" ? "bg-white text-studio-green border-studio-green/20" : "bg-white text-gray-400 border-gray-200"
                      }`}
                    >
                      R$
                    </button>
                    <button
                      onClick={() => setDiscountType("pct")}
                      className={`px-3 py-1 rounded-full text-[10px] font-extrabold border ${
                        discountType === "pct" ? "bg-white text-studio-green border-studio-green/20" : "bg-white text-gray-400 border-gray-200"
                      }`}
                    >
                      %
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <input
                    type="number"
                    value={discountValue}
                    onChange={(event) => setDiscountValue(Number(event.target.value))}
                    className="w-full px-4 py-3 rounded-2xl bg-white border border-gray-200 focus:ring-2 focus:ring-studio-green/20 text-sm font-black text-gray-800 transition-all"
                  />
                  <button
                    onClick={() => onSetDiscount(discountType, discountValue)}
                    className="px-4 py-3 rounded-2xl bg-studio-green text-white font-extrabold text-xs uppercase tracking-wide shadow-lg shadow-green-200 active:scale-[0.99] transition"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-4 py-4 border-t border-stone-100">
              <div className="w-10 h-10 rounded-2xl bg-studio-bg text-studio-green flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-gray-400">Pagamentos</div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  {(["pix", "card", "cash", "other"] as PaymentRow["method"][]).map((method) => (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={`py-3 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                        paymentMethod === method
                          ? "border-studio-green bg-studio-bg text-studio-green"
                          : "border-gray-200 text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      {method === "pix" ? <QrCode className="w-4 h-4" /> : method === "cash" ? <Banknote className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                      {paymentLabels[method]}
                    </button>
                  ))}
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(event) => setPaymentAmount(Number(event.target.value))}
                    className="w-full px-4 py-3 rounded-2xl bg-white border border-gray-200 text-sm font-bold"
                  />
                  <button
                    onClick={() => onRecordPayment(paymentMethod, paymentAmount)}
                    className="px-4 py-3 rounded-2xl bg-studio-green text-white font-extrabold text-xs uppercase tracking-wide shadow-lg shadow-green-200 active:scale-[0.99] transition"
                  >
                    Registrar
                  </button>
                </div>

                {payments.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {payments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between text-xs text-gray-600">
                        <span>{paymentLabels[payment.method]}</span>
                        <span className="font-bold">R$ {Number(payment.amount).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 bg-studio-bg border border-gray-200 rounded-2xl p-4 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Total a pagar</p>
                    <p className="text-2xl font-serif font-bold text-studio-green tabular-nums">R$ {total.toFixed(2)}</p>
                  </div>
                  <button
                    onClick={onConfirmCheckout}
                    className="px-4 py-3 rounded-2xl bg-studio-green text-white font-extrabold text-xs uppercase tracking-wide shadow-lg shadow-green-200 active:scale-[0.99] transition"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-stone-100 pt-4 text-xs text-gray-400">
              <span>Subtotal: R$ {subtotal.toFixed(2)}</span>
              <span>Status: {checkout?.payment_status ?? "pending"}</span>
            </div>
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 flex justify-center">
        <div className="w-full max-w-[414px] bg-white border-t border-stone-100 px-6 py-4 pb-6 rounded-t-[28px] shadow-[0_-10px_40px_rgba(0,0,0,0.06)]">
          <button
            onClick={onConfirmCheckout}
            className="w-full h-12 rounded-2xl bg-studio-green text-white font-extrabold text-xs uppercase tracking-wide shadow-lg shadow-green-200"
          >
            Ir para Pós
          </button>
        </div>
      </div>
    </div>
  );
}
