"use client";

import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";
import { BottomSheetHeaderV2 } from "../../../../../components/ui/bottom-sheet-header-v2";
import { FooterRail } from "../../../../../components/ui/footer-rail";
import { AttendancePaymentCompositionPanel } from "./attendance-payment-composition-panel";
import { AttendancePaymentMethodSection } from "./attendance-payment-method-section";
import { AttendancePaymentSuccessPanel } from "./attendance-payment-success-panel";
import { useAttendancePaymentModalController } from "./use-attendance-payment-modal-controller";

export function AttendancePaymentModal(
  props: Parameters<typeof useAttendancePaymentModalController>[0]
) {
  const controller = useAttendancePaymentModalController(props);

  if (!controller.open) return null;

  const manualRegisterDisabled =
    controller.busy ||
    controller.isFullyPaid ||
    controller.isWaived ||
    controller.method === "waiver" ||
    controller.effectiveChargeAmount <= 0;
  const isSelectStep = controller.checkoutStep === "select";

  const modalNode = (
    <div
      className={
        controller.isEmbedded
          ? "relative w-full"
          : `${controller.portalTarget ? "absolute" : "fixed"} inset-0 z-50 flex items-end justify-center pointer-events-none`
      }
    >
      {!controller.isEmbedded ? (
        <button
          type="button"
          aria-label="Fechar checkout"
          className="pointer-events-auto absolute inset-0 bg-studio-text/45 backdrop-blur-[2px]"
          onClick={controller.handleDismiss}
        />
      ) : null}

      <div
        className={`pointer-events-auto relative flex w-full flex-col overflow-hidden ${
          controller.isEmbedded
            ? "wl-surface-card max-h-[90vh]"
            : "max-h-[95vh] max-w-105 wl-radius-sheet wl-surface-modal shadow-float"
        }`}
      >
        <BottomSheetHeaderV2
          title="Checkout do atendimento"
          subtitle="Registre pagamentos, desconto e composicao financeira."
          onCloseAction={controller.handleDismiss}
        />

        <div
          className={`max-h-[72vh] overflow-y-auto px-5 pt-5 wl-surface-modal-body ${
            controller.isSuccessState ? "pb-8" : "pb-36"
          }`}
        >
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
              onCreateSameClientAppointment={controller.onCreateSameClientAppointment}
            />
          ) : (
            <>
              {isSelectStep ? (
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
              ) : null}

              <AttendancePaymentMethodSection
                viewMode={isSelectStep ? "select" : "charge"}
                method={controller.method}
                hideWaiverOption={controller.hideWaiverOption}
                isWaived={controller.isWaived}
                waiverSuccess={controller.waiverSuccess}
                isFullyPaid={controller.isFullyPaid}
                pointEnabled={controller.pointEnabled}
                pointTerminalName={controller.pointTerminalName}
                pointTerminalModel={controller.pointTerminalModel}
                cashAmount={controller.cashAmount}
                effectiveChargeAmount={controller.effectiveChargeAmount}
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
                onSetMethodAction={controller.setMethod}
                onSetCashAmountAction={controller.setCashAmount}
                onCreatePixAction={() => void controller.handleCreatePix()}
                onCopyPixAction={() => void controller.handleCopyPix()}
                onCopyPixKeyAction={() => void controller.handleCopyPixKey()}
                onPointChargeAction={(cardMode) => void controller.handlePointCharge(cardMode)}
                onWaiveAsCourtesyAction={() => void controller.handleWaiveAsCourtesy()}
                onLeaveOpenAction={controller.handleDismiss}
                onResetCurrentChargeAction={controller.handleResetActiveCharge}
                onForceRefreshAction={() => void controller.handleForceRefreshStatus()}
                onBackToSelectAction={controller.handleBackToSelectStep}
              />
            </>
          )}
        </div>

        {!controller.isSuccessState ? (
          <FooterRail
            className="absolute inset-x-0 bottom-0"
            surfaceClassName="bg-[rgba(250,247,242,0.96)]"
            paddingXClassName="px-5"
            rowClassName="grid grid-cols-2 gap-2"
          >
            <button
              type="button"
              onClick={controller.handleDismiss}
              className="wl-typo-button inline-flex h-12 items-center justify-center rounded-xl border border-line bg-white px-4 text-studio-text transition hover:bg-paper"
            >
              Deixar em aberto
            </button>
            {isSelectStep ? (
              <button
                type="button"
                onClick={() => void controller.handleStartChargeFlow()}
                disabled={
                  controller.busy ||
                  controller.isSuccessState ||
                  controller.isFullyPaid ||
                  controller.isWaived
                }
                className="wl-typo-button inline-flex h-12 items-center justify-center rounded-xl bg-studio-green px-5 text-white shadow-[0_10px_22px_-14px_rgba(11,28,19,.6)] transition hover:bg-studio-green-dark disabled:cursor-not-allowed disabled:opacity-70"
              >
                {controller.busy ? "Processando..." : "Cobrar"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void controller.handleRegisterManualForCurrentMethod()}
                disabled={manualRegisterDisabled}
                className="wl-typo-button inline-flex h-12 items-center justify-center rounded-xl bg-studio-green px-5 text-white shadow-[0_10px_22px_-14px_rgba(11,28,19,.6)] transition hover:bg-studio-green-dark disabled:cursor-not-allowed disabled:opacity-70"
              >
                {controller.busy ? "Registrando..." : "Confirmacao manual"}
              </button>
            )}
          </FooterRail>
        ) : null}
      </div>

      {controller.busy ? (
        <div className="absolute inset-0 z-90 flex items-center justify-center bg-black/35 backdrop-blur-sm">
          <div className="rounded-2xl bg-white px-5 py-4 text-center shadow-float">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-studio-green" />
            <p className="mt-3 text-sm font-bold text-studio-text">{controller.stageMessages[controller.stageIndex]}</p>
          </div>
        </div>
      ) : null}
    </div>
  );

  if (controller.isEmbedded) return modalNode;
  return controller.portalTarget ? createPortal(modalNode, controller.portalTarget) : modalNode;
}
