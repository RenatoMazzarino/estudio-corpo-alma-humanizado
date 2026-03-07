"use client";

import { format } from "date-fns";
import Script from "next/script";
import type { BookingFlowProps } from "./booking-flow.types";
import { Toast } from "../../../../components/ui/toast";
import { BookingFooter } from "./components/booking-footer";
import { BookingHeader } from "./components/booking-header";
import { BookingStepContent } from "./components/booking-step-content";
import { CardProcessingOverlay } from "./components/card-processing-overlay";
import { AddressSearchModal } from "./components/address-search-modal";
import { VoucherOverlay } from "./components/voucher-overlay";
import { cardProcessingStages, stepLabels } from "./booking-flow-config";
import { usePublicBookingFlowController } from "./hooks/use-public-booking-flow-controller";

export function BookingFlow(props: BookingFlowProps) {
  const controller = usePublicBookingFlowController(props);

  return (
    <div className="h-full flex flex-col bg-studio-bg relative">
      <Script
        src="https://sdk.mercadopago.com/js/v2"
        strategy="afterInteractive"
        onLoad={() => controller.setMpReady(true)}
      />

      <BookingHeader clientName={controller.clientHeaderFirstName} />

      <main className="flex-1 relative overflow-hidden flex flex-col">
        <BookingStepContent
          step={controller.step}
          stepLabels={stepLabels}
          onStartWelcome={() => controller.setStep("IDENT")}
          onTalkToAssistant={controller.handleTalkToFlora}
          phoneInputRef={controller.phoneInputRef}
          clientLookupStatus={controller.clientLookupStatus}
          clientPhone={controller.clientPhone}
          onPhoneChange={controller.handleIdentityPhoneChange}
          isPhoneValid={controller.isPhoneValid}
          suggestedClient={controller.suggestedClient}
          clientCpf={controller.clientCpf}
          onClientCpfChange={controller.handleIdentityCpfChange}
          identityCaptchaPrompt={controller.identityCaptchaPrompt}
          identityCaptchaAnswer={controller.identityCaptchaAnswer}
          onCaptchaAnswerChange={controller.handleIdentityCaptchaAnswerChange}
          identityGuardNotice={controller.identityGuardNotice}
          onVerifyExistingClientCpf={() => void controller.handleVerifyExistingClientCpf()}
          isCpfValid={controller.isCpfValid}
          isVerifyingClientCpf={controller.isVerifyingClientCpf}
          identityCpfAttempts={controller.identityCpfAttempts}
          suggestedClientInitials={controller.suggestedClientInitials}
          suggestedClientPublicName={controller.suggestedClientPublicName}
          identityWelcomeCountdown={controller.identityWelcomeCountdown}
          onGoServiceNow={() => controller.setStep("SERVICE")}
          isEmailValid={controller.isEmailValid}
          clientEmail={controller.clientEmail}
          onClientEmailChange={controller.setClientEmail}
          onSwitchAccount={controller.handleSwitchAccount}
          suggestedClientFirstName={controller.suggestedClientFirstName}
          clientFirstName={controller.clientFirstName}
          onClientFirstNameChange={controller.handleNewClientFirstNameChange}
          clientLastName={controller.clientLastName}
          onClientLastNameChange={controller.handleNewClientLastNameChange}
          acceptPrivacyPolicy={controller.acceptPrivacyPolicy}
          onAcceptPrivacyPolicyChange={controller.setAcceptPrivacyPolicy}
          acceptTermsOfService={controller.acceptTermsOfService}
          onAcceptTermsOfServiceChange={controller.setAcceptTermsOfService}
          acceptCommunicationConsent={controller.acceptCommunicationConsent}
          onAcceptCommunicationConsentChange={controller.setAcceptCommunicationConsent}
          services={controller.services}
          selectedService={controller.selectedService}
          onSelectService={controller.handleServiceSelect}
          totalPrice={controller.totalPrice}
          activeMonth={controller.activeMonth}
          selectedDateObj={controller.selectedDateObj}
          onSelectDay={controller.handleSelectDay}
          onChangeMonth={controller.handleChangeMonth}
          isDayDisabled={controller.isDayDisabled}
          isLoadingDaySlots={controller.isLoadingDaySlots}
          availableSlots={controller.availableSlots}
          selectedTime={controller.selectedTime}
          onSelectTime={controller.setSelectedTime}
          isHomeVisit={controller.isHomeVisit}
          displacementEstimate={controller.displacementEstimate}
          displacementStatus={controller.displacementStatus}
          hasSuggestedAddress={controller.hasSuggestedAddress}
          useSuggestedAddress={Boolean(controller.useSuggestedAddress)}
          suggestedAddressSummary={controller.suggestedAddressSummary}
          addressMode={controller.addressMode}
          cep={controller.cep}
          logradouro={controller.logradouro}
          numero={controller.numero}
          complemento={controller.complemento}
          bairro={controller.bairro}
          cidade={controller.cidade}
          estado={controller.estado}
          mapsQuery={controller.mapsQuery}
          onSelectStudio={controller.handleSelectStudioLocation}
          onSelectHomeVisit={controller.handleSelectHomeVisitLocation}
          onUseSuggestedAddress={controller.handleUseSuggestedAddress}
          onChooseOtherAddress={controller.handleChooseOtherAddress}
          onSelectAddressMode={controller.handleSelectLocationAddressMode}
          onChangeCep={controller.handleLocationCepChange}
          onLookupCep={() => void controller.handleCepLookup()}
          onOpenSearchModal={() => controller.setIsAddressSearchModalOpen(true)}
          onChangeLogradouro={controller.setLogradouro}
          onChangeNumero={controller.setNumero}
          onChangeComplemento={controller.setComplemento}
          onChangeBairro={controller.setBairro}
          onChangeCidade={controller.setCidade}
          onChangeEstado={controller.handleLocationStateChange}
          resolvedClientFullName={controller.resolvedClientFullName}
          paymentMethod={controller.paymentMethod}
          isMercadoPagoMinimumInvalid={controller.isMercadoPagoMinimumInvalid}
          protocol={controller.protocol}
          onSelectPayment={controller.handleSelectPayment}
          payableSignalAmount={controller.payableSignalAmount}
          pixPayment={controller.pixPayment}
          pixStatus={controller.pixStatus}
          pixRemainingLabel={controller.pixRemainingLabel}
          pixProgressPct={controller.pixProgressPct}
          pixQrExpired={controller.pixQrExpired}
          cardStatus={controller.cardStatus}
          checkoutStatusMessage={controller.checkoutStatusMessage}
          normalizedClientEmail={controller.normalizedClientEmail}
          appointmentId={controller.appointmentId}
          onCopyPix={controller.handleCopyPix}
          onRegeneratePix={controller.onCreatePixPayment}
          onReset={controller.handleReset}
          onOpenVoucher={() => controller.setIsVoucherOpen(true)}
        />
      </main>

      <CardProcessingOverlay
        open={controller.showCardProcessingOverlay}
        stages={cardProcessingStages}
        stageIndex={controller.cardProcessingStageIndex}
        awaitingConfirmation={controller.cardAwaitingConfirmation}
        currentStage={controller.currentCardProcessingStage}
      />

      <VoucherOverlay
        open={controller.isVoucherOpen}
        busy={controller.voucherBusy}
        onClose={() => controller.setIsVoucherOpen(false)}
        onDownload={controller.handleDownloadVoucher}
        onShare={controller.handleShareVoucher}
        voucherRef={controller.voucherRef}
        clientName={controller.resolvedClientFullName || controller.clientName}
        formattedDate={format(controller.selectedDateObj, "dd/MM/yyyy")}
        selectedTime={controller.selectedTime}
        selectedServiceName={controller.selectedService?.name ?? "Serviço"}
        isHomeVisit={controller.isHomeVisit}
        mapsQuery={controller.mapsQuery}
        protocol={controller.protocol}
      />

      <AddressSearchModal
        open={controller.isAddressSearchModalOpen}
        query={controller.addressSearchQuery}
        results={controller.addressSearchResults}
        loading={controller.addressSearchLoading}
        onClose={controller.closeAddressSearchModal}
        onQueryChange={controller.setAddressSearchQuery}
        onSelectResult={controller.handleSelectAddressResult}
      />

      <BookingFooter
        visible={controller.showFooter}
        showNextButton={controller.showNextButton}
        isNextDisabled={controller.isNextDisabled}
        nextLabel={controller.nextLabel}
        onBack={controller.handleBack}
        onNext={controller.handleNext}
      />

      <Toast toast={controller.toast} />
    </div>
  );
}
