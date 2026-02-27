"use client";

import { CheckCircle2, Phone } from "lucide-react";
import { StepTabs } from "./step-tabs";
import type { RefObject } from "react";

type ClientLookupStatus = "idle" | "loading" | "found" | "confirmed" | "declined" | "not_found";

type IdentityStepProps = {
  label: string;
  clientLookupStatus: ClientLookupStatus;
  phoneInputRef: RefObject<HTMLInputElement | null>;
  clientPhone: string;
  onPhoneChange: (value: string) => void;
  isPhoneValid: boolean;
  hasSuggestedClient: boolean;
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
  onAcceptPrivacyPolicyChange: (checked: boolean) => void;
  acceptTermsOfService: boolean;
  onAcceptTermsOfServiceChange: (checked: boolean) => void;
  acceptCommunicationConsent: boolean;
  onAcceptCommunicationConsentChange: (checked: boolean) => void;
};

export function IdentityStep({
  label,
  clientLookupStatus,
  phoneInputRef,
  clientPhone,
  onPhoneChange,
  isPhoneValid,
  hasSuggestedClient,
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
}: IdentityStepProps) {
  return (
    <section className="no-scrollbar animate-in fade-in slide-in-from-right-6 duration-500 flex flex-1 flex-col overflow-y-auto px-6 pb-24 pt-3">
      <div className="mb-4">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</span>
        <StepTabs step="IDENT" />
        <h2 className="mt-2 text-3xl font-serif text-studio-text">Quem é você?</h2>
      </div>

      <div className="space-y-5">
        {clientLookupStatus !== "not_found" && (
          <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 transition focus-within:border-studio-green focus-within:ring-4 focus-within:ring-studio-green/10">
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-400">WhatsApp</label>
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-studio-green" />
              <input
                ref={phoneInputRef}
                type="tel"
                inputMode="numeric"
                className="w-full bg-transparent text-lg font-bold text-studio-text placeholder:text-gray-300 outline-none"
                placeholder="(00) 00000-0000"
                value={clientPhone}
                onChange={(event) => onPhoneChange(event.target.value)}
              />
            </div>
            <p className="mt-2 text-[11px] text-gray-500">Digite seu WhatsApp para localizar seu cadastro e continuar o agendamento.</p>
          </div>
        )}

        {clientLookupStatus === "loading" && isPhoneValid && (
          <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-gray-600">Buscando cadastro para este WhatsApp...</div>
        )}

        {(clientLookupStatus === "found" || clientLookupStatus === "declined") && hasSuggestedClient && (
          <>
            <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 transition focus-within:border-studio-green focus-within:ring-4 focus-within:ring-studio-green/10">
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-400">CPF</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={14}
                className="w-full bg-transparent text-lg font-bold text-studio-text placeholder:text-gray-300 outline-none"
                placeholder="000.000.000-00"
                value={clientCpf}
                onChange={(event) => onClientCpfChange(event.target.value)}
              />
              <p className="mt-2 text-[11px] text-gray-500">Encontramos um cadastro com este WhatsApp. Informe seu CPF para confirmar.</p>
            </div>

            {identityCaptchaPrompt && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-widest text-amber-700">Verificação de segurança</p>
                <p className="mt-1 text-sm text-amber-900">{identityCaptchaPrompt}</p>
                <input
                  type="text"
                  inputMode="numeric"
                  className="mt-3 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-center text-base font-semibold text-studio-text outline-none focus:border-studio-green"
                  placeholder="Resposta"
                  value={identityCaptchaAnswer}
                  onChange={(event) => onCaptchaAnswerChange(event.target.value)}
                />
              </div>
            )}

            {identityGuardNotice && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{identityGuardNotice}</div>
            )}

            <button
              type="button"
              onClick={onVerifyExistingClientCpf}
              disabled={!isCpfValid || isVerifyingClientCpf || (!!identityCaptchaPrompt && identityCaptchaAnswer.trim().length === 0)}
              className="w-full rounded-2xl bg-studio-green-dark px-4 py-3 text-sm font-bold uppercase tracking-widest text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isVerifyingClientCpf ? "Validando..." : "Confirmar CPF"}
            </button>

            {clientLookupStatus === "declined" && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                Não encontramos cliente com este WhatsApp e CPF. Confira e tente novamente.
                {identityCpfAttempts > 0 && (
                  <span className="mt-1 block text-xs text-red-600">Tentativa {Math.min(identityCpfAttempts, 3)} de 3.</span>
                )}
              </div>
            )}
          </>
        )}

        {clientLookupStatus === "confirmed" && hasSuggestedClient && (
          <>
            <div className="animate-in slide-in-from-bottom-2 relative overflow-hidden rounded-2xl border border-studio-green/30 bg-green-50 p-4 shadow-soft duration-300 fade-in">
              <div className="absolute inset-y-0 right-0 w-16 bg-linear-to-l from-studio-green/15 to-transparent" />
              <div className="relative z-10 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-studio-green text-sm font-bold text-white">{suggestedClientInitials}</div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-studio-green">Olá</p>
                    <p className="truncate text-base font-bold text-studio-text">{suggestedClientPublicName}</p>
                  </div>
                </div>
                <div className="rounded-full bg-white p-1.5 text-studio-green shadow-sm">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-studio-green/20 bg-white px-4 py-3 text-center">
              <p className="text-sm text-studio-text">
                Tudo certo. Estamos te levando para a próxima etapa em <span className="font-bold text-studio-green">{identityWelcomeCountdown ?? 0}s</span>.
              </p>
              <div className="mt-3 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={onGoServiceNow}
                  className="w-full rounded-2xl bg-studio-green-dark px-4 py-3 text-sm font-bold uppercase tracking-widest text-white"
                >
                  Ir agora
                </button>
              </div>
            </div>

            {!isEmailValid && (
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-studio-green">Seu Email</label>
                <input
                  type="email"
                  inputMode="email"
                  className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-center text-base font-semibold text-studio-text outline-none transition focus:border-studio-green"
                  placeholder="voce@exemplo.com"
                  value={clientEmail}
                  onChange={(event) => onClientEmailChange(event.target.value)}
                />
                <p className="mt-2 text-center text-xs text-gray-500">Seu cadastro não tem email válido. Precisamos dele para concluir o agendamento.</p>
              </div>
            )}

            <div className="text-center">
              <button
                type="button"
                onClick={onSwitchAccount}
                className="text-xs font-bold text-gray-400 underline decoration-dotted underline-offset-2 transition hover:text-studio-text"
              >
                Não é {suggestedClientFirstName}? Trocar conta
              </button>
            </div>
          </>
        )}

        {clientLookupStatus === "not_found" && isPhoneValid && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Não encontramos cadastro com este WhatsApp. Para seu primeiro agendamento, complete os dados abaixo.
          </div>
        )}

        {clientLookupStatus === "not_found" && isPhoneValid && (
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-studio-green">Primeiro nome</label>
              <input
                type="text"
                className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-center text-base font-semibold text-studio-text outline-none transition focus:border-studio-green"
                placeholder="Ex: Maria"
                value={clientFirstName}
                onChange={(event) => onClientFirstNameChange(event.target.value)}
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-studio-green">Sobrenome</label>
              <p className="mb-2 text-xs text-gray-500">Use seu sobrenome completo para facilitar sua identificação.</p>
              <input
                type="text"
                className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-center text-base font-semibold text-studio-text outline-none transition focus:border-studio-green"
                placeholder="Ex: Silva Souza"
                value={clientLastName}
                onChange={(event) => onClientLastNameChange(event.target.value)}
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-studio-green">WhatsApp</label>
              <input
                ref={phoneInputRef}
                type="tel"
                inputMode="numeric"
                className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-center text-base font-semibold text-studio-text outline-none transition focus:border-studio-green"
                placeholder="(00) 00000-0000"
                value={clientPhone}
                onChange={(event) => onPhoneChange(event.target.value)}
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-studio-green">Seu Email</label>
              <input
                type="email"
                inputMode="email"
                className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-center text-base font-semibold text-studio-text outline-none transition focus:border-studio-green"
                placeholder="voce@exemplo.com"
                value={clientEmail}
                onChange={(event) => onClientEmailChange(event.target.value)}
              />
              {clientEmail && !isEmailValid && (
                <p className="mt-2 text-center text-xs text-red-500">Informe um email válido para confirmar o agendamento.</p>
              )}
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-studio-green">CPF</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={14}
                className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-center text-base font-semibold text-studio-text outline-none transition focus:border-studio-green"
                placeholder="000.000.000-00"
                value={clientCpf}
                onChange={(event) => onClientCpfChange(event.target.value)}
              />
              {clientCpf && !isCpfValid && (
                <p className="mt-2 text-center text-xs text-red-500">Informe um CPF válido com 11 números.</p>
              )}
              <p className="mt-2 text-center text-xs text-gray-500">Usamos seu CPF para emissão de nota fiscal e proteção dos seus dados conforme LGPD.</p>
            </div>

            <div className="space-y-3 rounded-2xl border border-stone-200 bg-white px-4 py-3">
              <label className="flex items-start gap-3 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={acceptPrivacyPolicy}
                  onChange={(event) => onAcceptPrivacyPolicyChange(event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-stone-300 text-studio-green focus:ring-studio-green"
                />
                <span>
                  Li e aceito a{" "}
                  <a href="/politica-de-privacidade" target="_blank" rel="noopener noreferrer" className="font-semibold text-studio-green underline">
                    Política de Privacidade
                  </a>
                  .
                </span>
              </label>
              <label className="flex items-start gap-3 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={acceptTermsOfService}
                  onChange={(event) => onAcceptTermsOfServiceChange(event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-stone-300 text-studio-green focus:ring-studio-green"
                />
                <span>
                  Li e aceito os{" "}
                  <a href="/termos-de-servico" target="_blank" rel="noopener noreferrer" className="font-semibold text-studio-green underline">
                    Termos de Serviço
                  </a>
                  .
                </span>
              </label>
              <label className="flex items-start gap-3 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={acceptCommunicationConsent}
                  onChange={(event) => onAcceptCommunicationConsentChange(event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-stone-300 text-studio-green focus:ring-studio-green"
                />
                <span>Autorizo comunicações sobre agendamento por WhatsApp e email.</span>
              </label>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
