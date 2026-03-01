"use client";

import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";
import { AttendancePaymentCompositionPanel } from "./attendance-payment-composition-panel";
import { AttendancePaymentMethodSection } from "./attendance-payment-method-section";
import { AttendancePaymentSuccessPanel } from "./attendance-payment-success-panel";
import { useAttendancePaymentModalController } from "./use-attendance-payment-modal-controller";

export function AttendancePaymentModal(
  props: Parameters<typeof useAttendancePaymentModalController>[0]
) {
  const controller = useAttendancePaymentModalController(props);

  if (!controller.open) return null;

  const modalNode = (
    <div
      className={
        controller.isEmbedded
          ? "relative w-full"
          : `${controller.portalTarget ? "absolute" : "fixed"} inset-0 z-50 flex items-end justify-center pointer-events-none`
      }
    >
      {!controller.isEmbedded && (
        <button
          className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
          onClick={controller.handleDismiss}
          aria-label="Fechar modal"
        />
      )}
      <div
        className={`relative w-full flex flex-col ${
          controller.isEmbedded
            ? "rounded-2xl border border-line bg-white shadow-soft"
            : "max-w-105 rounded-t-3xl bg-white shadow-float max-h-[90vh] pointer-events-auto"
        }`}
      >
        <div className="flex items-center justify-center px-6 pt-4 pb-2">
          <div className="mx-auto h-1.5 w-12 rounded-full bg-gray-200" />
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-serif font-bold text-studio-text">Pagamento</h2>
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted mt-1">
                Registro financeiro da sessão
              </p>
            </div>
            <button
              className="rounded-full border border-line px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-gray-500"
              onClick={controller.handleDismiss}
            >
              Fechar
            </button>
          </div>

          {controller.isSuccessState ? (
            <AttendancePaymentSuccessPanel
              waiverSuccess={controller.waiverSuccess}
              totalLabel={controller.formatCurrency(controller.total)}
              remainingLabel={controller.remaining <= 0 ? "Quitado" : controller.formatCurrency(controller.remaining)}
              receiptFlowMode={controller.receiptFlowMode}
              autoReceiptStatus={controller.autoReceiptStatus}
              autoReceiptMessage={controller.autoReceiptMessage}
              receiptSent={controller.receiptSent}
              resolvingReceiptPrompt={controller.resolvingReceiptPrompt}
              successResolveLabel={controller.successResolveLabel}
              onSendReceipt={() => void controller.handleSendReceiptFromSuccess()}
              onResolve={() => void controller.resolveCheckoutSuccess()}
            />
          ) : (
            <>
              <AttendancePaymentCompositionPanel
                serviceItems={controller.serviceItems}
                displacementItems={controller.displacementItems}
                otherItems={controller.otherItems}
                checkoutSaving={controller.checkoutSaving}
                newItem={controller.newItem}
                discountTypeInput={controller.discountTypeInput}
                discountValueInput={controller.discountValueInput}
                discountReasonInput={controller.discountReasonInput}
                appliedDiscountAmount={controller.appliedDiscountAmount}
                appliedDiscountType={controller.appliedDiscountType}
                appliedDiscountValue={controller.appliedDiscountValue}
                appliedDiscountReason={controller.appliedDiscountReason}
                paidTotal={controller.paidTotal}
                totalLabel={controller.formatCurrency(controller.total)}
                effectiveChargeAmountLabel={controller.formatCurrency(controller.effectiveChargeAmount)}
                formatCurrency={controller.formatCurrency}
                isRemovableItem={controller.isRemovableItem}
                onAddItem={controller.handleAddItem}
                onRemoveItem={(index) => void controller.handleRemoveItem(index)}
                onChangeNewItemLabel={(label) =>
                  controller.setNewItem((current) => ({ ...current, label }))
                }
                onChangeNewItemAmount={(amount) =>
                  controller.setNewItem((current) => ({ ...current, amount }))
                }
                onChangeDiscountType={controller.setDiscountTypeInput}
                onChangeDiscountValue={controller.setDiscountValueInput}
                onChangeDiscountReason={controller.setDiscountReasonInput}
              />

              <AttendancePaymentMethodSection
                method={controller.method}
                hideWaiverOption={controller.hideWaiverOption}
                isWaived={controller.isWaived}
                waiverSuccess={controller.waiverSuccess}
                isFullyPaid={controller.isFullyPaid}
                pointEnabled={controller.pointEnabled}
                pointTerminalName={controller.pointTerminalName}
                pointTerminalModel={controller.pointTerminalModel}
                cashAmount={controller.cashAmount}
                pixPayment={controller.pixPayment}
                pixRemaining={controller.pixRemaining}
                pixKeyConfigured={controller.pixKeyConfigured}
                pixKeyType={controller.pixKeyType}
                normalizedPixKeyValue={controller.normalizedPixKeyValue}
                pixKeyGenerating={controller.pixKeyGenerating}
                pixKeyQrDataUrl={controller.pixKeyQrDataUrl}
                pixKeyCode={controller.pixKeyCode}
                pixKeyError={controller.pixKeyError}
                pointPayment={controller.pointPayment}
                busy={controller.busy}
                errorText={controller.errorText}
                onSetMethod={controller.setMethod}
                onSetCashAmount={controller.setCashAmount}
                onCreatePix={() => void controller.handleCreatePix()}
                onCopyPix={() => void controller.handleCopyPix()}
                onCopyPixKey={() => void controller.handleCopyPixKey()}
                onRegisterCash={() => void controller.handleRegisterCash()}
                onRegisterPixKey={() => void controller.handleRegisterPixKey()}
                onPointCharge={(cardMode) => void controller.handlePointCharge(cardMode)}
                onWaiveAsCourtesy={() => void controller.handleWaiveAsCourtesy()}
              />
            </>
          )}
        </div>
      </div>

      {controller.busy && (
        <div className="absolute inset-0 z-90 flex items-center justify-center bg-black/35 backdrop-blur-sm">
          <div className="rounded-2xl bg-white px-5 py-4 text-center shadow-float">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-studio-green" />
            <p className="mt-3 text-sm font-bold text-studio-text">{controller.stageMessages[controller.stageIndex]}</p>
          </div>
        </div>
      )}
    </div>
  );

  if (controller.isEmbedded) return modalNode;
  return controller.portalTarget ? createPortal(modalNode, controller.portalTarget) : modalNode;
}
