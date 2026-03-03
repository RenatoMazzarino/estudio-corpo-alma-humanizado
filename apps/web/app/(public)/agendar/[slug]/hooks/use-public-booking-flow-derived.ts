
import { parseISO } from "date-fns";
import { useMemo } from "react";
import { resolveClientNames } from "../../../../../src/modules/clients/name-profile";
import {
  isValidCpfDigits,
  isValidEmailAddress,
  isValidPhoneDigits,
  normalizeCpfDigits,
  normalizePhoneDigits,
  resolveClientHeaderFirstName,
  resolvePublicClientFullName,
} from "../booking-flow.helpers";
import type { Service, SuggestedClientLookup } from "../booking-flow.types";

type Params = {
  clientPhone: string;
  clientCpf: string;
  clientEmail: string;
  clientName: string;
  clientFirstName: string;
  clientLastName: string;
  clientLookupStatus: "idle" | "loading" | "found" | "confirmed" | "declined" | "not_found";
  selectedService: Service | null;
  isHomeVisit: boolean;
  displacementFee: number;
  date: string;
  suggestedClient: SuggestedClientLookup | null;
};

export function usePublicBookingFlowDerived(params: Params) {
  const formattedPhoneDigits = normalizePhoneDigits(params.clientPhone);
  const isPhoneValid = isValidPhoneDigits(formattedPhoneDigits);
  const normalizedCpfDigits = normalizeCpfDigits(params.clientCpf);
  const isCpfValid = isValidCpfDigits(normalizedCpfDigits);
  const normalizedClientEmail = params.clientEmail.trim().toLowerCase();
  const isEmailValid = isValidEmailAddress(normalizedClientEmail);
  const isExistingClientConfirmed = params.clientLookupStatus === "confirmed";

  const publicClientFullName = useMemo(
    () =>
      resolvePublicClientFullName({
        firstName: params.clientFirstName,
        lastName: params.clientLastName,
        fallbackName: params.clientName,
      }),
    [params.clientFirstName, params.clientLastName, params.clientName]
  );

  const resolvedClientFullName = useMemo(
    () => (isExistingClientConfirmed ? params.clientName : publicClientFullName).trim(),
    [params.clientName, isExistingClientConfirmed, publicClientFullName]
  );

  const isIdentityNameReady = isExistingClientConfirmed
    ? resolvedClientFullName.length > 0
    : params.clientFirstName.trim().length > 0 && params.clientLastName.trim().length > 0;

  const clientHeaderFirstName = useMemo(
    () => resolveClientHeaderFirstName(params.clientName || publicClientFullName || ""),
    [params.clientName, publicClientFullName]
  );

  const totalPrice = useMemo(() => {
    if (!params.selectedService) return 0;
    const basePrice = Number(params.selectedService.price);
    const displacement = params.isHomeVisit ? Number(params.displacementFee ?? 0) : 0;
    return Number((basePrice + displacement).toFixed(2));
  }, [params.displacementFee, params.isHomeVisit, params.selectedService]);

  const selectedDateObj = useMemo(
    () => parseISO(`${params.date || new Date().toISOString().slice(0, 10)}T00:00:00`),
    [params.date]
  );

  const suggestedClientPublicName = useMemo(
    () =>
      resolveClientNames({
        name: params.suggestedClient?.name ?? null,
        publicFirstName: params.suggestedClient?.public_first_name ?? null,
        publicLastName: params.suggestedClient?.public_last_name ?? null,
        internalReference: params.suggestedClient?.internal_reference ?? null,
      }).publicFullName,
    [
      params.suggestedClient?.name,
      params.suggestedClient?.public_first_name,
      params.suggestedClient?.public_last_name,
      params.suggestedClient?.internal_reference,
    ]
  );

  const suggestedClientFirstName = useMemo(() => {
    const raw = suggestedClientPublicName.trim();
    if (!raw) return "";
    const [first] = raw.split(/\s+/);
    return first ?? "";
  }, [suggestedClientPublicName]);

  const suggestedClientInitials = useMemo(() => {
    const raw = suggestedClientPublicName.trim();
    if (!raw) return "";
    const parts = raw.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "";
    if (parts.length === 1) return (parts[0] ?? "").slice(0, 2).toUpperCase();
    return `${parts[0]?.[0] ?? ""}${parts[parts.length - 1]?.[0] ?? ""}`.toUpperCase();
  }, [suggestedClientPublicName]);

  return {
    formattedPhoneDigits,
    isPhoneValid,
    normalizedCpfDigits,
    isCpfValid,
    normalizedClientEmail,
    isEmailValid,
    isExistingClientConfirmed,
    publicClientFullName,
    resolvedClientFullName,
    isIdentityNameReady,
    clientHeaderFirstName,
    totalPrice,
    selectedDateObj,
    suggestedClientPublicName,
    suggestedClientFirstName,
    suggestedClientInitials,
  };
}

