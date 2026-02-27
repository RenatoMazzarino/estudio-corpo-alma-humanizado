import { Check, Plus, Trash2 } from "lucide-react";

import { PaymentMethodIcon } from "../../../../components/ui/payment-method-icon";
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
  return (
    <section className={sectionCardClass}>
      <div className="flex items-center gap-2 mb-4">
        <div className={sectionNumberClass}>4</div>
        <h2 className={sectionHeaderTextClass}>Financeiro</h2>
      </div>

      <div className="space-y-4">
        <div className="bg-white border border-gray-100 rounded-3xl p-4">
          <p className="text-[10px] font-extrabold text-muted uppercase tracking-widest">Itens</p>

          <div className="mt-3 space-y-2 text-sm">
            {financeDraftItems.some((item) => item.type === "service" || item.type === "fee") ? (
              financeDraftItems
                .filter((item) => item.type === "service" || item.type === "fee")
                .map((item, index) => (
                  <div
                    key={`${item.type}-${item.label}-${index}`}
                    className="grid grid-cols-[1fr_auto] gap-3 items-start"
                  >
                    <div>
                      <span className={item.type === "fee" ? "text-dom-strong font-semibold" : "text-studio-text"}>
                        {item.label}
                      </span>
                      {item.type === "fee" && (
                        <p className="mt-1 text-[11px] text-muted">
                          Distância estimada: {displacementEstimate?.distanceKm?.toFixed(2) ?? "0.00"} km
                        </p>
                      )}
                    </div>
                    <span className="tabular-nums font-bold text-studio-text">
                      R$ {formatCurrencyLabel(Number(item.amount) * Number(item.qty ?? 1))}
                    </span>
                  </div>
                ))
            ) : (
              <p className="text-xs text-muted">Selecione um serviço para montar o financeiro.</p>
            )}

            {financeExtraItems.length > 0 && (
              <div className="pt-2">
                <div className="h-px bg-stone-100 mb-2" />
                <div className="space-y-2">
                  {financeExtraItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 text-sm text-studio-text">
                      <span className="truncate pr-3">{item.label || "Item adicional"}</span>
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums font-bold">
                          R$ {formatCurrencyLabel(item.amount * (item.qty ?? 1))}
                        </span>
                        <button
                          type="button"
                          onClick={() => onRemoveFinanceItem(item.id)}
                          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line bg-white text-muted hover:text-red-600"
                          aria-label={`Remover item ${item.label}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="h-px bg-gray-100 my-2" />
            <div className="flex justify-between text-muted font-bold">
              <span>Subtotal</span>
              <span className="tabular-nums">R$ {formatCurrencyLabel(scheduleSubtotal)}</span>
            </div>
            {effectiveScheduleDiscount > 0 && (
              <div className="flex justify-between text-muted font-bold">
                <span>
                  Desconto {scheduleDiscountType === "pct" ? `(${effectiveScheduleDiscountInputValue}%)` : ""}
                </span>
                <span className="tabular-nums">- R$ {formatCurrencyLabel(effectiveScheduleDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between text-studio-text font-black text-base pt-1">
              <span>Total</span>
              <span className="tabular-nums">R$ {formatCurrencyLabel(scheduleTotal)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl p-4">
          <div className="border-t border-line pt-1">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted">Adicionar item</p>
            <div className="mt-2 grid grid-cols-[1fr_88px_40px] gap-2">
              <input
                className="rounded-xl border border-line px-3 py-2 text-xs"
                placeholder="Novo item"
                value={financeNewItemLabel}
                onChange={(event) => onChangeFinanceNewItemLabel(event.target.value)}
              />
              <input
                className="rounded-xl border border-line px-3 py-2 text-xs"
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
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl p-4">
          <p className="text-[10px] font-extrabold text-muted uppercase tracking-widest">Desconto</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <select
              value={scheduleDiscountType}
              onChange={(event) => onChangeScheduleDiscountType(event.target.value === "pct" ? "pct" : "value")}
              className="rounded-xl border border-line px-3 py-2 text-xs"
            >
              <option value="value">Desconto em R$</option>
              <option value="pct">Desconto em %</option>
            </select>
            <input
              type="text"
              inputMode="decimal"
              value={scheduleDiscountValue}
              onChange={(event) => onChangeScheduleDiscountValue(event.target.value)}
              className="rounded-xl border border-line px-3 py-2 text-xs"
              placeholder="0,00"
            />
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl p-4">
          <p className="text-[10px] font-extrabold text-muted uppercase tracking-widest">Quando cobrar</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                onChangeCollectionTiming("at_attendance");
                onClearChargeFlowError();
              }}
              className={`rounded-2xl border px-4 py-3 text-xs font-extrabold uppercase tracking-wide ${
                collectionTimingDraft === "at_attendance"
                  ? "border-studio-green bg-studio-light text-studio-green"
                  : "border-gray-200 text-muted hover:bg-gray-50"
              }`}
            >
              Cobrar no atendimento
            </button>
            <button
              type="button"
              onClick={() => {
                onChangeCollectionTiming("charge_now");
                onClearChargeFlowError();
              }}
              className={`rounded-2xl border px-4 py-3 text-xs font-extrabold uppercase tracking-wide ${
                collectionTimingDraft === "charge_now"
                  ? "border-studio-green bg-studio-light text-studio-green"
                  : "border-gray-200 text-muted hover:bg-gray-50"
              }`}
              title="Cobrança no agendamento"
            >
              Cobrar agora
            </button>
          </div>

          {collectionTimingDraft === "charge_now" && (
            <div className="mt-4 space-y-3 border-t border-line pt-4">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted">Forma de pagamento</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onChangeChargeNowMethod("pix_mp");
                      onResetSignalValueConfirmation();
                    }}
                    className={`rounded-xl border px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide flex items-center justify-center gap-2 ${
                      chargeNowMethodDraft === "pix_mp"
                        ? "border-studio-green bg-studio-light text-studio-green"
                        : "border-line text-muted hover:bg-paper"
                    }`}
                  >
                    <PaymentMethodIcon method="pix" className="h-4 w-4" />
                    PIX
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onChangeChargeNowMethod("card");
                      onResetSignalValueConfirmation();
                    }}
                    className={`rounded-xl border px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide flex items-center justify-center gap-2 ${
                      chargeNowMethodDraft === "card"
                        ? "border-studio-green bg-studio-light text-studio-green"
                        : "border-line text-muted hover:bg-paper"
                    }`}
                  >
                    <PaymentMethodIcon method="card" className="h-4 w-4" />
                    Cartão
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onChangeChargeNowMethod("cash");
                      onResetSignalValueConfirmation();
                    }}
                    className={`rounded-xl border px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide flex items-center justify-center gap-2 ${
                      chargeNowMethodDraft === "cash"
                        ? "border-studio-green bg-studio-light text-studio-green"
                        : "border-line text-muted hover:bg-paper"
                    }`}
                  >
                    <PaymentMethodIcon method="cash" className="h-4 w-4" />
                    Dinheiro
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onChangeChargeNowMethod("waiver");
                      onResetSignalValueConfirmation();
                    }}
                    className={`rounded-xl border px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide flex items-center justify-center gap-2 ${
                      chargeNowMethodDraft === "waiver"
                        ? "border-sky-500 bg-sky-50 text-sky-700"
                        : "border-line text-muted hover:bg-paper"
                    }`}
                  >
                    <PaymentMethodIcon method="waiver" className="h-4 w-4" />
                    Cortesia
                  </button>
                </div>
              </div>

              {chargeNowMethodDraft === "waiver" && (
                <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-sky-700">
                    Cortesia interna
                  </p>
                  <p className="mt-1 text-[11px] text-sky-900">
                    O agendamento será criado com pagamento liberado (<strong>Cortesia</strong>) e não abrirá fluxo
                    de cobrança.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {collectionTimingDraft === "charge_now" &&
          chargeNowMethodDraft !== null &&
          chargeNowMethodDraft !== "waiver" && (
            <div className="bg-white border border-gray-100 rounded-3xl p-4">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted">Valor a cobrar agora</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onChangeChargeNowAmountMode("full");
                    onResetSignalValueConfirmation();
                  }}
                  className={`rounded-xl border px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide ${
                    hasChargeNowAmountModeChoice && chargeNowAmountMode === "full"
                      ? "border-studio-green bg-studio-light text-studio-green"
                      : "border-line text-muted hover:bg-paper"
                  }`}
                >
                  Integral
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChangeChargeNowAmountMode("signal");
                    onResetSignalValueConfirmation();
                    if (!chargeNowCustomAmount.trim() && chargeNowSuggestedSignalAmount > 0) {
                      onChangeChargeNowCustomAmount(formatCurrencyInput(chargeNowSuggestedSignalAmount));
                    }
                  }}
                  className={`rounded-xl border px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide ${
                    hasChargeNowAmountModeChoice && chargeNowAmountMode === "signal"
                      ? "border-studio-green bg-studio-light text-studio-green"
                      : "border-line text-muted hover:bg-paper"
                  }`}
                >
                  Sinal (
                  {Number.isInteger(effectiveSignalPercentageDraft)
                    ? effectiveSignalPercentageDraft
                    : Number(effectiveSignalPercentageDraft.toFixed(2))}
                  %)
                </button>
              </div>

              {hasChargeNowAmountModeChoice && chargeNowAmountMode === "signal" && (
                <div className="mt-3 rounded-2xl border border-line bg-paper px-4 py-3">
                  <div className="grid grid-cols-[1fr_140px_auto] items-center gap-2">
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted">
                      Valor do sinal
                    </label>
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
                      title={chargeNowSignalValueConfirmed ? "Valor confirmado" : "Confirmar valor"}
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  </div>
                  {chargeNowAmountError && (
                    <p className="mt-2 text-[11px] font-semibold text-red-700">{chargeNowAmountError}</p>
                  )}
                  {!chargeNowAmountError && chargeNowMethodDraft === "pix_mp" && chargeNowDraftAmount > 0 && (
                    <p className="mt-2 text-[11px] text-muted">Valor mínimo do PIX Mercado Pago: R$ 1,00.</p>
                  )}
                </div>
              )}

              {hasChargeNowAmountModeChoice && chargeNowAmountMode === "full" && chargeNowAmountError && (
                <p className="mt-2 text-[11px] font-semibold text-red-700">{chargeNowAmountError}</p>
              )}
            </div>
          )}
      </div>
    </section>
  );
}
