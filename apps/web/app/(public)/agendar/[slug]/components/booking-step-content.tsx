import type { RefObject } from "react";

import { ConfirmStep } from "./confirm-step";
import { DatetimeStep } from "./datetime-step";
import { IdentityStep } from "./identity-step";
import { LocationStep } from "./location-step";
import { PaymentStep } from "./payment-step";
import { ServiceStep } from "./service-step";
import { SuccessStep } from "./success-step";
import { WelcomeStep } from "./welcome-step";
import type {
  PaymentMethod,
  Service,
  Step,
  SuggestedClientLookup,
} from "../booking-flow.types";

interface BookingStepContentProps {
  step: Step;
  stepLabels: {
    IDENT: string;
    SERVICE: string;
    DATETIME: string;
    LOCATION: string;
    CONFIRM: string;
  };
  onStartWelcome: () => void;
  onTalkToAssistant: () => void;
  phoneInputRef: RefObject<HTMLInputElement | null>;
  clientLookupStatus: "idle" | "loading" | "found" | "confirmed" | "declined" | "not_found";
  clientPhone: string;
  onPhoneChange: (value: string) => void;
  isPhoneValid: boolean;
  suggestedClient: SuggestedClientLookup | null;
  clientCpf: string;
  onClientCpfChange: (value: string) => void;
  identityCaptchaPrompt: string | null;
  identityCaptchaAnswer: string;
  onCaptchaAnswerChange: (value: string) => void;
  identityGuardNotice: string | null;
  onVerifyExistingClientCpf: () => void;
  isCpfValid: boolean;
  isVerifyingClientCpf: boolean;
  identityCpfAttempts: number;
  suggestedClientInitials: string;
  suggestedClientPublicName: string;
  identityWelcomeCountdown: number | null;
  onGoServiceNow: () => void;
  isEmailValid: boolean;
  clientEmail: string;
  onClientEmailChange: (value: string) => void;
  onSwitchAccount: () => void;
  suggestedClientFirstName: string;
  clientFirstName: string;
  onClientFirstNameChange: (value: string) => void;
  clientLastName: string;
  onClientLastNameChange: (value: string) => void;
  acceptPrivacyPolicy: boolean;
  onAcceptPrivacyPolicyChange: (value: boolean) => void;
  acceptTermsOfService: boolean;
  onAcceptTermsOfServiceChange: (value: boolean) => void;
  acceptCommunicationConsent: boolean;
  onAcceptCommunicationConsentChange: (value: boolean) => void;
  services: Service[];
  selectedService: Service | null;
  onSelectService: (service: Service) => void;
  totalPrice: number;
  activeMonth: Date;
  selectedDateObj: Date;
  onSelectDay: (day: Date) => void;
  onChangeMonth: (month: Date) => void;
  isDayDisabled: (day: Date) => boolean;
  isLoadingDaySlots: boolean;
  availableSlots: string[];
  selectedTime: string;
  onSelectTime: (time: string) => void;
  isHomeVisit: boolean;
  displacementEstimate: { distanceKm: number; fee: number; rule: "urban" | "road" } | null;
  displacementStatus: "idle" | "loading" | "error";
  hasSuggestedAddress: boolean;
  useSuggestedAddress: boolean | null;
  suggestedAddressSummary: string;
  addressMode: "cep" | "text" | null;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  mapsQuery: string;
  onSelectStudio: () => void;
  onSelectHomeVisit: () => void;
  onUseSuggestedAddress: () => void;
  onChooseOtherAddress: () => void;
  onSelectAddressMode: (mode: "cep" | "text") => void;
  onChangeCep: (value: string) => void;
  onLookupCep: () => void;
  onOpenSearchModal: () => void;
  onChangeLogradouro: (value: string) => void;
  onChangeNumero: (value: string) => void;
  onChangeComplemento: (value: string) => void;
  onChangeBairro: (value: string) => void;
  onChangeCidade: (value: string) => void;
  onChangeEstado: (value: string) => void;
  resolvedClientFullName: string;
  paymentMethod: PaymentMethod;
  isMercadoPagoMinimumInvalid: boolean;
  protocol: string;
  onSelectPayment: (method: PaymentMethod) => void;
  payableSignalAmount: number;
  pixPayment: {
    id: string;
    status: string;
    ticket_url: string | null;
    qr_code: string | null;
    qr_code_base64: string | null;
    transaction_amount: number;
    created_at: string;
    expires_at: string;
  } | null;
  pixStatus: "idle" | "loading" | "error";
  pixRemainingLabel: string;
  pixProgressPct: number;
  pixQrExpired: boolean;
  cardStatus: "idle" | "loading" | "error";
  normalizedClientEmail: string;
  appointmentId: string | null;
  onCopyPix: () => void;
  onReset: () => void;
  onOpenVoucher: () => void;
}

export function BookingStepContent({
  step,
  stepLabels,
  onStartWelcome,
  onTalkToAssistant,
  phoneInputRef,
  clientLookupStatus,
  clientPhone,
  onPhoneChange,
  isPhoneValid,
  suggestedClient,
  clientCpf,
  onClientCpfChange,
  identityCaptchaPrompt,
  identityCaptchaAnswer,
  onCaptchaAnswerChange,
  identityGuardNotice,
  onVerifyExistingClientCpf,
  isCpfValid,
  isVerifyingClientCpf,
  identityCpfAttempts,
  suggestedClientInitials,
  suggestedClientPublicName,
  identityWelcomeCountdown,
  onGoServiceNow,
  isEmailValid,
  clientEmail,
  onClientEmailChange,
  onSwitchAccount,
  suggestedClientFirstName,
  clientFirstName,
  onClientFirstNameChange,
  clientLastName,
  onClientLastNameChange,
  acceptPrivacyPolicy,
  onAcceptPrivacyPolicyChange,
  acceptTermsOfService,
  onAcceptTermsOfServiceChange,
  acceptCommunicationConsent,
  onAcceptCommunicationConsentChange,
  services,
  selectedService,
  onSelectService,
  totalPrice,
  activeMonth,
  selectedDateObj,
  onSelectDay,
  onChangeMonth,
  isDayDisabled,
  isLoadingDaySlots,
  availableSlots,
  selectedTime,
  onSelectTime,
  isHomeVisit,
  displacementEstimate,
  displacementStatus,
  hasSuggestedAddress,
  useSuggestedAddress,
  suggestedAddressSummary,
  addressMode,
  cep,
  logradouro,
  numero,
  complemento,
  bairro,
  cidade,
  estado,
  mapsQuery,
  onSelectStudio,
  onSelectHomeVisit,
  onUseSuggestedAddress,
  onChooseOtherAddress,
  onSelectAddressMode,
  onChangeCep,
  onLookupCep,
  onOpenSearchModal,
  onChangeLogradouro,
  onChangeNumero,
  onChangeComplemento,
  onChangeBairro,
  onChangeCidade,
  onChangeEstado,
  resolvedClientFullName,
  paymentMethod,
  isMercadoPagoMinimumInvalid,
  protocol,
  onSelectPayment,
  payableSignalAmount,
  pixPayment,
  pixStatus,
  pixRemainingLabel,
  pixProgressPct,
  pixQrExpired,
  cardStatus,
  normalizedClientEmail,
  appointmentId,
  onCopyPix,
  onReset,
  onOpenVoucher,
}: BookingStepContentProps) {
  return (
    <>
      {step === "WELCOME" && (
        <WelcomeStep
          onStart={onStartWelcome}
          onTalkToAssistant={onTalkToAssistant}
        />
      )}

      {step === "IDENT" && (
        <IdentityStep
          label={stepLabels.IDENT}
          clientLookupStatus={clientLookupStatus}
          phoneInputRef={phoneInputRef}
          clientPhone={clientPhone}
          onPhoneChange={onPhoneChange}
          isPhoneValid={isPhoneValid}
          hasSuggestedClient={Boolean(suggestedClient)}
          clientCpf={clientCpf}
          onClientCpfChange={onClientCpfChange}
          identityCaptchaPrompt={identityCaptchaPrompt}
          identityCaptchaAnswer={identityCaptchaAnswer}
          onCaptchaAnswerChange={onCaptchaAnswerChange}
          identityGuardNotice={identityGuardNotice}
          onVerifyExistingClientCpf={onVerifyExistingClientCpf}
          isCpfValid={isCpfValid}
          isVerifyingClientCpf={isVerifyingClientCpf}
          identityCpfAttempts={identityCpfAttempts}
          suggestedClientInitials={suggestedClientInitials}
          suggestedClientPublicName={suggestedClientPublicName}
          identityWelcomeCountdown={identityWelcomeCountdown}
          onGoServiceNow={onGoServiceNow}
          isEmailValid={isEmailValid}
          clientEmail={clientEmail}
          onClientEmailChange={onClientEmailChange}
          onSwitchAccount={onSwitchAccount}
          suggestedClientFirstName={suggestedClientFirstName}
          clientFirstName={clientFirstName}
          onClientFirstNameChange={onClientFirstNameChange}
          clientLastName={clientLastName}
          onClientLastNameChange={onClientLastNameChange}
          acceptPrivacyPolicy={acceptPrivacyPolicy}
          onAcceptPrivacyPolicyChange={onAcceptPrivacyPolicyChange}
          acceptTermsOfService={acceptTermsOfService}
          onAcceptTermsOfServiceChange={onAcceptTermsOfServiceChange}
          acceptCommunicationConsent={acceptCommunicationConsent}
          onAcceptCommunicationConsentChange={onAcceptCommunicationConsentChange}
        />
      )}

      {step === "SERVICE" && (
        <ServiceStep
          label={stepLabels.SERVICE}
          services={services}
          selectedServiceId={selectedService?.id ?? null}
          onSelectService={onSelectService}
        />
      )}

      {step === "DATETIME" && (
        <DatetimeStep
          label={stepLabels.DATETIME}
          serviceName={selectedService?.name ?? "—"}
          totalPrice={totalPrice}
          activeMonth={activeMonth}
          selectedDate={selectedDateObj}
          onSelectDay={onSelectDay}
          onChangeMonth={onChangeMonth}
          isDayDisabled={isDayDisabled}
          isLoadingDaySlots={isLoadingDaySlots}
          availableSlots={availableSlots}
          selectedTime={selectedTime}
          onSelectTime={onSelectTime}
        />
      )}

      {step === "LOCATION" && (
        <LocationStep
          label={stepLabels.LOCATION}
          isHomeVisit={isHomeVisit}
          homeVisitAllowed={Boolean(selectedService?.accepts_home_visit)}
          selectedServicePrice={Number(selectedService?.price ?? 0)}
          totalPrice={totalPrice}
          displacementEstimate={displacementEstimate}
          displacementStatus={displacementStatus}
          hasSuggestedAddress={hasSuggestedAddress}
          useSuggestedAddress={useSuggestedAddress}
          suggestedAddressSummary={suggestedAddressSummary}
          addressMode={addressMode}
          cep={cep}
          logradouro={logradouro}
          numero={numero}
          complemento={complemento}
          bairro={bairro}
          cidade={cidade}
          estado={estado}
          mapsQuery={mapsQuery}
          onSelectStudio={onSelectStudio}
          onSelectHomeVisit={onSelectHomeVisit}
          onUseSuggestedAddress={onUseSuggestedAddress}
          onChooseOtherAddress={onChooseOtherAddress}
          onSelectAddressMode={onSelectAddressMode}
          onChangeCep={onChangeCep}
          onLookupCep={onLookupCep}
          onOpenSearchModal={onOpenSearchModal}
          onChangeLogradouro={onChangeLogradouro}
          onChangeNumero={onChangeNumero}
          onChangeComplemento={onChangeComplemento}
          onChangeBairro={onChangeBairro}
          onChangeCidade={onChangeCidade}
          onChangeEstado={onChangeEstado}
        />
      )}

      {step === "CONFIRM" && (
        <ConfirmStep
          label={stepLabels.CONFIRM}
          clientName={resolvedClientFullName || "Cliente"}
          serviceName={selectedService?.name ?? "Serviço"}
          selectedDate={selectedDateObj}
          selectedTime={selectedTime}
          isHomeVisit={isHomeVisit}
          totalPrice={totalPrice}
          paymentMethod={paymentMethod}
          isMercadoPagoMinimumInvalid={isMercadoPagoMinimumInvalid}
          protocol={protocol}
          onSelectPayment={onSelectPayment}
        />
      )}

      {step === "PAYMENT" && (
        <PaymentStep
          payableSignalAmount={payableSignalAmount}
          paymentMethod={paymentMethod}
          pixPayment={pixPayment}
          pixStatus={pixStatus}
          pixRemainingLabel={pixRemainingLabel}
          pixProgressPct={pixProgressPct}
          pixQrExpired={pixQrExpired}
          cardStatus={cardStatus}
          resolvedClientFullName={resolvedClientFullName}
          normalizedClientEmail={normalizedClientEmail}
          appointmentId={appointmentId}
          onCopyPix={onCopyPix}
        />
      )}

      {step === "SUCCESS" && (
        <SuccessStep
          date={selectedDateObj}
          selectedTime={selectedTime}
          serviceName={selectedService?.name ?? "Serviço"}
          protocol={protocol}
          onOpenVoucher={onOpenVoucher}
          onReset={onReset}
        />
      )}
    </>
  );
}
