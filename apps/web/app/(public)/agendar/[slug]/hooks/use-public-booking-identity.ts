import { formatCpf } from "../../../../../src/shared/cpf";
import { formatBrazilPhone } from "../../../../../src/shared/phone";
import { feedbackById } from "../../../../../src/shared/feedback/user-feedback";
import { resolveClientNames } from "../../../../../src/modules/clients/name-profile";
import { lookupClientIdentity } from "../application/public-booking-service";
import { useCallback, useEffect, type Dispatch, type RefObject, type SetStateAction } from "react";
import type { ToastInput } from "../../../../../components/ui/toast";
import type { Service, Step, SuggestedClientLookup } from "../booking-flow.types";

type LookupStatus = "idle" | "loading" | "found" | "confirmed" | "declined" | "not_found";

interface UsePublicBookingIdentityParams {
  tenantId: string;
  step: Step;
  formattedPhoneDigits: string;
  isPhoneValid: boolean;
  normalizedCpfDigits: string;
  isCpfValid: boolean;
  clientLookupStatus: LookupStatus;
  suggestedClient: SuggestedClientLookup | null;
  identityCpfAttempts: number;
  identitySecuritySessionId: string;
  identityCaptchaToken: string | null;
  identityCaptchaAnswer: string;
  isVerifyingClientCpf: boolean;
  clientFirstName: string;
  clientLastName: string;
  showToast: (input: string | ToastInput) => void;
  setStep: Dispatch<SetStateAction<Step>>;
  setSelectedService: Dispatch<SetStateAction<Service | null>>;
  setIsHomeVisit: Dispatch<SetStateAction<boolean>>;
  resetAvailability: (nextDate: Date) => void;
  resetLocationState: () => void;
  phoneInputRef: RefObject<HTMLInputElement | null>;
  setClientLookupStatus: Dispatch<SetStateAction<LookupStatus>>;
  setSuggestedClient: Dispatch<SetStateAction<SuggestedClientLookup | null>>;
  setClientName: Dispatch<SetStateAction<string>>;
  setClientFirstName: Dispatch<SetStateAction<string>>;
  setClientLastName: Dispatch<SetStateAction<string>>;
  setClientEmail: Dispatch<SetStateAction<string>>;
  setClientPhone: Dispatch<SetStateAction<string>>;
  setClientCpf: Dispatch<SetStateAction<string>>;
  setAcceptPrivacyPolicy: Dispatch<SetStateAction<boolean>>;
  setAcceptTermsOfService: Dispatch<SetStateAction<boolean>>;
  setAcceptCommunicationConsent: Dispatch<SetStateAction<boolean>>;
  setIdentityCpfAttempts: Dispatch<SetStateAction<number>>;
  setIdentityWelcomeCountdown: Dispatch<SetStateAction<number | null>>;
  setIdentitySecuritySessionId: Dispatch<SetStateAction<string>>;
  setIdentityCaptchaPrompt: Dispatch<SetStateAction<string | null>>;
  setIdentityCaptchaToken: Dispatch<SetStateAction<string | null>>;
  setIdentityCaptchaAnswer: Dispatch<SetStateAction<string>>;
  setIdentityGuardNotice: Dispatch<SetStateAction<string | null>>;
  setIsVerifyingClientCpf: Dispatch<SetStateAction<boolean>>;
}

interface UsePublicBookingIdentityReturn {
  handleVerifyExistingClientCpf: () => Promise<void>;
  handleSwitchAccount: () => void;
  handleIdentityPhoneChange: (value: string) => void;
  handleIdentityCpfChange: (value: string) => void;
  handleIdentityCaptchaAnswerChange: (value: string) => void;
  handleNewClientFirstNameChange: (value: string) => void;
  handleNewClientLastNameChange: (value: string) => void;
  resetIdentityState: (options?: {
    clearPhone?: boolean;
    resetFlow?: boolean;
    clearSuggestedClient?: boolean;
    focusPhone?: boolean;
  }) => void;
}

export function usePublicBookingIdentity({
  tenantId,
  step,
  formattedPhoneDigits,
  isPhoneValid,
  normalizedCpfDigits,
  isCpfValid,
  clientLookupStatus,
  suggestedClient,
  identityCpfAttempts,
  identitySecuritySessionId,
  identityCaptchaToken,
  identityCaptchaAnswer,
  isVerifyingClientCpf,
  clientFirstName,
  clientLastName,
  showToast,
  setStep,
  setSelectedService,
  setIsHomeVisit,
  resetAvailability,
  resetLocationState,
  phoneInputRef,
  setClientLookupStatus,
  setSuggestedClient,
  setClientName,
  setClientFirstName,
  setClientLastName,
  setClientEmail,
  setClientPhone,
  setClientCpf,
  setAcceptPrivacyPolicy,
  setAcceptTermsOfService,
  setAcceptCommunicationConsent,
  setIdentityCpfAttempts,
  setIdentityWelcomeCountdown,
  setIdentitySecuritySessionId,
  setIdentityCaptchaPrompt,
  setIdentityCaptchaToken,
  setIdentityCaptchaAnswer,
  setIdentityGuardNotice,
  setIsVerifyingClientCpf,
}: UsePublicBookingIdentityParams): UsePublicBookingIdentityReturn {
  const resetIdentityState = useCallback(
    (options?: { clearPhone?: boolean; resetFlow?: boolean; clearSuggestedClient?: boolean; focusPhone?: boolean }) => {
      if (options?.resetFlow) {
        setStep("WELCOME");
        setSelectedService(null);
        setIsHomeVisit(false);
        resetAvailability(new Date());
      }

      if (options?.clearPhone) {
        setClientPhone("");
      }

      setClientName("");
      setClientFirstName("");
      setClientLastName("");
      setClientEmail("");
      setClientCpf("");
      setAcceptPrivacyPolicy(false);
      setAcceptTermsOfService(false);
      setAcceptCommunicationConsent(false);

      if (options?.clearSuggestedClient ?? true) {
        setSuggestedClient(null);
      }
      setClientLookupStatus("idle");
      setIdentityCpfAttempts(0);
      setIdentityWelcomeCountdown(null);
      setIdentityCaptchaPrompt(null);
      setIdentityCaptchaToken(null);
      setIdentityCaptchaAnswer("");
      setIdentityGuardNotice(null);
      setIsVerifyingClientCpf(false);
      resetLocationState();

      if (options?.focusPhone) {
        window.setTimeout(() => phoneInputRef.current?.focus(), 0);
      }
    },
    [
      phoneInputRef,
      resetAvailability,
      resetLocationState,
      setAcceptCommunicationConsent,
      setAcceptPrivacyPolicy,
      setAcceptTermsOfService,
      setClientCpf,
      setClientEmail,
      setClientFirstName,
      setClientLastName,
      setClientLookupStatus,
      setClientName,
      setClientPhone,
      setIdentityCaptchaAnswer,
      setIdentityCaptchaPrompt,
      setIdentityCaptchaToken,
      setIdentityCpfAttempts,
      setIdentityGuardNotice,
      setIdentityWelcomeCountdown,
      setIsHomeVisit,
      setIsVerifyingClientCpf,
      setSelectedService,
      setStep,
      setSuggestedClient,
    ]
  );

  useEffect(() => {
    if (identitySecuritySessionId) return;
    try {
      const storageKey = `public-booking-lookup-session:${tenantId}`;
      const existing = window.sessionStorage.getItem(storageKey);
      if (existing) {
        setIdentitySecuritySessionId(existing);
        return;
      }
      const nextId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      window.sessionStorage.setItem(storageKey, nextId);
      setIdentitySecuritySessionId(nextId);
    } catch {
      setIdentitySecuritySessionId(`${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
    }
  }, [identitySecuritySessionId, setIdentitySecuritySessionId, tenantId]);

  useEffect(() => {
    setIdentityWelcomeCountdown(null);
    setIdentityCaptchaPrompt(null);
    setIdentityCaptchaToken(null);
    setIdentityCaptchaAnswer("");
    setIdentityGuardNotice(null);
    setIsVerifyingClientCpf(false);

    if (!isPhoneValid) {
      setClientLookupStatus("idle");
      setSuggestedClient(null);
      setClientName("");
      setClientFirstName("");
      setClientLastName("");
      setClientEmail("");
      setClientCpf("");
      setAcceptPrivacyPolicy(false);
      setAcceptTermsOfService(false);
      setAcceptCommunicationConsent(false);
      setIdentityCpfAttempts(0);
      return;
    }

    const lookupPhone = formattedPhoneDigits;
    const timer = window.setTimeout(async () => {
      setClientLookupStatus("loading");
      setSuggestedClient(null);
      const result = await lookupClientIdentity({
        tenantId,
        phone: lookupPhone,
      });

      if (lookupPhone !== formattedPhoneDigits) {
        return;
      }

      if (!result.ok) {
        setSuggestedClient(null);
        setClientLookupStatus("not_found");
        setClientName("");
        setClientFirstName("");
        setClientLastName("");
        setClientEmail("");
        setAcceptPrivacyPolicy(false);
        setAcceptTermsOfService(false);
        setAcceptCommunicationConsent(false);
        setIdentityCpfAttempts(0);
        return;
      }

      if (result.data.client) {
        setSuggestedClient({
          id: result.data.client.id,
          name: result.data.client.name ?? null,
          email: result.data.client.email ?? null,
          cpf: result.data.client.cpf ?? null,
          public_first_name: result.data.client.public_first_name ?? null,
          public_last_name: result.data.client.public_last_name ?? null,
          internal_reference: result.data.client.internal_reference ?? null,
          address_cep: result.data.client.address_cep ?? null,
          address_logradouro: result.data.client.address_logradouro ?? null,
          address_numero: result.data.client.address_numero ?? null,
          address_complemento: result.data.client.address_complemento ?? null,
          address_bairro: result.data.client.address_bairro ?? null,
          address_cidade: result.data.client.address_cidade ?? null,
          address_estado: result.data.client.address_estado ?? null,
        });
        setClientLookupStatus("found");
        setClientName("");
        setClientFirstName("");
        setClientLastName("");
        if (result.data.client.phone) {
          setClientPhone(formatBrazilPhone(result.data.client.phone));
        }
        setClientEmail("");
        setClientCpf("");
        setAcceptPrivacyPolicy(false);
        setAcceptTermsOfService(false);
        setAcceptCommunicationConsent(false);
        setIdentityCpfAttempts(0);
      } else {
        setSuggestedClient(null);
        setClientLookupStatus("not_found");
        setClientName("");
        setClientFirstName("");
        setClientLastName("");
        setClientEmail("");
        setClientCpf("");
        setAcceptPrivacyPolicy(false);
        setAcceptTermsOfService(false);
        setAcceptCommunicationConsent(false);
        setIdentityCpfAttempts(0);
      }
    }, 400);

    return () => window.clearTimeout(timer);
  }, [
    formattedPhoneDigits,
    isPhoneValid,
    setAcceptCommunicationConsent,
    setAcceptPrivacyPolicy,
    setAcceptTermsOfService,
    setClientCpf,
    setClientEmail,
    setClientFirstName,
    setClientLastName,
    setClientLookupStatus,
    setClientName,
    setClientPhone,
    setIdentityCaptchaAnswer,
    setIdentityCaptchaPrompt,
    setIdentityCaptchaToken,
    setIdentityCpfAttempts,
    setIdentityGuardNotice,
    setIdentityWelcomeCountdown,
    setIsVerifyingClientCpf,
    setSuggestedClient,
    tenantId,
  ]);

  const handleVerifyExistingClientCpf = useCallback(async () => {
    if (!suggestedClient || !(clientLookupStatus === "found" || clientLookupStatus === "declined")) return;
    if (!isCpfValid || !isPhoneValid || isVerifyingClientCpf) return;

    setIsVerifyingClientCpf(true);
    setIdentityGuardNotice(null);
    const result = await lookupClientIdentity({
      tenantId,
      phone: formattedPhoneDigits,
      cpf: normalizedCpfDigits,
      securitySessionId: identitySecuritySessionId,
      captchaToken: identityCaptchaToken ?? undefined,
      captchaAnswer: identityCaptchaAnswer || undefined,
    });
    setIsVerifyingClientCpf(false);

    if (!result.ok) {
      setClientLookupStatus("declined");
      setIdentityGuardNotice("Não foi possível validar seus dados agora. Tente novamente.");
      return;
    }

    const guard = result.data.guard;
    if (guard?.status === "captcha_required") {
      setIdentityCaptchaPrompt(guard.captcha?.prompt ?? "Confirme a verificação.");
      setIdentityCaptchaToken(guard.captcha?.token ?? null);
      setIdentityCaptchaAnswer("");
      setIdentityGuardNotice("Antes de continuar, confirme a verificação de segurança.");
      return;
    }

    if (guard?.status === "cooldown" || guard?.status === "blocked") {
      const message =
        guard.status === "blocked"
          ? "Detectamos muitas tentativas. Reiniciamos a tela e bloqueamos novas tentativas neste aparelho por 24h."
          : "Muitas tentativas. Reiniciamos a tela por segurança. Tente novamente em alguns minutos.";
      setIdentityGuardNotice(message);
      showToast(feedbackById("validation_invalid_data", { message, durationMs: 3200 }));
      window.setTimeout(() => {
        resetIdentityState({ clearPhone: true, resetFlow: true, focusPhone: true });
      }, 300);
      return;
    }

    if (!result.data.client || result.data.client.id !== suggestedClient.id) {
      setClientLookupStatus("declined");
      setIdentityWelcomeCountdown(null);
      setIdentityCaptchaAnswer("");
      setIdentityCaptchaToken(null);
      setIdentityCaptchaPrompt(null);
      setIdentityCpfAttempts(Math.min(guard?.attemptsInCycle ?? identityCpfAttempts + 1, 3));
      setIdentityGuardNotice("Não encontramos cliente com este WhatsApp e CPF. Confira e tente novamente.");
      return;
    }

    const names = resolveClientNames({
      name: result.data.client.name ?? null,
      publicFirstName: result.data.client.public_first_name ?? null,
      publicLastName: result.data.client.public_last_name ?? null,
      internalReference: result.data.client.internal_reference ?? null,
    });
    setSuggestedClient((current) =>
      current && current.id === result.data.client?.id
        ? {
            ...current,
            email: result.data.client.email ?? current.email ?? null,
            cpf: result.data.client.cpf ?? current.cpf ?? null,
            public_first_name: result.data.client.public_first_name ?? current.public_first_name ?? null,
            public_last_name: result.data.client.public_last_name ?? current.public_last_name ?? null,
            internal_reference: result.data.client.internal_reference ?? current.internal_reference ?? null,
          }
        : current
    );
    setClientFirstName(names.publicFirstName);
    setClientLastName(names.publicLastName);
    setClientName(names.publicFullName || result.data.client.name || "Cliente");
    setClientEmail(result.data.client.email ?? "");
    setClientCpf(formatCpf(result.data.client.cpf ?? normalizedCpfDigits));
    setClientLookupStatus("confirmed");
    setIdentityCpfAttempts(0);
    setIdentityGuardNotice(null);
    setIdentityCaptchaPrompt(null);
    setIdentityCaptchaToken(null);
    setIdentityCaptchaAnswer("");
  }, [
    clientLookupStatus,
    formattedPhoneDigits,
    identityCaptchaAnswer,
    identityCaptchaToken,
    identityCpfAttempts,
    identitySecuritySessionId,
    isCpfValid,
    isPhoneValid,
    isVerifyingClientCpf,
    normalizedCpfDigits,
    resetIdentityState,
    setClientCpf,
    setClientEmail,
    setClientFirstName,
    setClientLastName,
    setClientLookupStatus,
    setClientName,
    setIdentityCaptchaAnswer,
    setIdentityCaptchaPrompt,
    setIdentityCaptchaToken,
    setIdentityCpfAttempts,
    setIdentityGuardNotice,
    setIdentityWelcomeCountdown,
    setIsVerifyingClientCpf,
    setSuggestedClient,
    showToast,
    suggestedClient,
    tenantId,
  ]);

  useEffect(() => {
    if (step !== "IDENT" || clientLookupStatus !== "confirmed" || !suggestedClient) {
      setIdentityWelcomeCountdown(null);
      return;
    }
    setIdentityWelcomeCountdown(4);
    const interval = window.setInterval(() => {
      setIdentityWelcomeCountdown((value) => {
        if (value === null) return value;
        if (value <= 1) {
          window.clearInterval(interval);
          setStep("SERVICE");
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [clientLookupStatus, setIdentityWelcomeCountdown, setStep, step, suggestedClient]);

  const handleSwitchAccount = useCallback(() => {
    resetIdentityState({ clearPhone: true, clearSuggestedClient: true, focusPhone: true });
  }, [resetIdentityState]);

  const handleIdentityPhoneChange = useCallback(
    (value: string) => {
      setClientPhone(formatBrazilPhone(value));
    },
    [setClientPhone]
  );

  const handleIdentityCpfChange = useCallback(
    (value: string) => {
      setClientCpf(formatCpf(value));
      setIdentityGuardNotice(null);
      if (clientLookupStatus === "declined") {
        setClientLookupStatus("found");
      }
    },
    [clientLookupStatus, setClientCpf, setClientLookupStatus, setIdentityGuardNotice]
  );

  const handleIdentityCaptchaAnswerChange = useCallback(
    (value: string) => {
      setIdentityCaptchaAnswer(value.replace(/\D/g, "").slice(0, 2));
    },
    [setIdentityCaptchaAnswer]
  );

  const handleNewClientFirstNameChange = useCallback(
    (value: string) => {
      setClientFirstName(value);
      setClientName([value.trim(), clientLastName.trim()].filter(Boolean).join(" "));
    },
    [clientLastName, setClientFirstName, setClientName]
  );

  const handleNewClientLastNameChange = useCallback(
    (value: string) => {
      setClientLastName(value);
      setClientName([clientFirstName.trim(), value.trim()].filter(Boolean).join(" "));
    },
    [clientFirstName, setClientLastName, setClientName]
  );

  return {
    handleVerifyExistingClientCpf,
    handleSwitchAccount,
    handleIdentityPhoneChange,
    handleIdentityCpfChange,
    handleIdentityCaptchaAnswerChange,
    handleNewClientFirstNameChange,
    handleNewClientLastNameChange,
    resetIdentityState,
  };
}
