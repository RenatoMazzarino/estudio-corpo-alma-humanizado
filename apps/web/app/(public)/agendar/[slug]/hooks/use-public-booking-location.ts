"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchAddressByCep, normalizeCep } from "../../../../../src/shared/address/cep";
import { feedbackById } from "../../../../../src/shared/feedback/user-feedback";
import { buildMapsQuery } from "../booking-flow.helpers";
import { formatCep } from "../booking-flow-formatters";
import type {
  AddressSearchResult,
  DisplacementEstimate,
  LocationAddressMode,
  SuggestedClientLookup,
} from "../booking-flow.types";

type UsePublicBookingLocationParams = {
  isHomeVisit: boolean;
  setIsHomeVisit: (next: boolean) => void;
  homeVisitAllowed: boolean;
  suggestedClient: SuggestedClientLookup | null;
  showToast: (feedback: ReturnType<typeof feedbackById>) => void;
};

export function usePublicBookingLocation({
  isHomeVisit,
  setIsHomeVisit,
  homeVisitAllowed,
  suggestedClient,
  showToast,
}: UsePublicBookingLocationParams) {
  const [cep, setCep] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [useSuggestedAddress, setUseSuggestedAddress] = useState<boolean | null>(null);
  const [addressMode, setAddressMode] = useState<LocationAddressMode>(null);
  const [isAddressSearchModalOpen, setIsAddressSearchModalOpen] = useState(false);
  const [addressSearchQuery, setAddressSearchQuery] = useState("");
  const [addressSearchResults, setAddressSearchResults] = useState<AddressSearchResult[]>([]);
  const [addressSearchLoading, setAddressSearchLoading] = useState(false);
  const [, setAddressSearchError] = useState<string | null>(null);
  const [displacementEstimate, setDisplacementEstimate] = useState<DisplacementEstimate | null>(
    null
  );
  const [displacementStatus, setDisplacementStatus] = useState<"idle" | "loading" | "error">(
    "idle"
  );
  const [, setDisplacementError] = useState<string | null>(null);
  const [, setCepStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const displacementFailureNotifiedRef = useRef(false);

  const mapsQuery = useMemo(
    () => buildMapsQuery([logradouro, numero, complemento, bairro, cidade, estado, cep]),
    [bairro, cep, cidade, complemento, estado, logradouro, numero]
  );
  const hasSuggestedAddress = Boolean(
    suggestedClient?.address_logradouro || suggestedClient?.address_cep
  );
  const suggestedAddressSummary = useMemo(() => {
    const parts = [
      suggestedClient?.address_logradouro ?? "",
      suggestedClient?.address_numero ? `, ${suggestedClient.address_numero}` : "",
      suggestedClient?.address_bairro ? ` - ${suggestedClient.address_bairro}` : "",
    ]
      .join("")
      .trim();
    return parts;
  }, [
    suggestedClient?.address_bairro,
    suggestedClient?.address_logradouro,
    suggestedClient?.address_numero,
  ]);

  const requiresAddress = Boolean(homeVisitAllowed && isHomeVisit);
  const hasAddressFields = Boolean(logradouro && numero && bairro && cidade && estado);
  const addressComplete = !requiresAddress
    ? true
    : hasSuggestedAddress && useSuggestedAddress === null
      ? false
      : hasAddressFields;
  const displacementReady = !requiresAddress
    ? true
    : displacementStatus !== "loading" && Boolean(displacementEstimate);

  const clearAddressFields = useCallback(() => {
    setCep("");
    setLogradouro("");
    setNumero("");
    setComplemento("");
    setBairro("");
    setCidade("");
    setEstado("");
    setCepStatus("idle");
  }, []);

  const resetDisplacementState = useCallback(() => {
    setDisplacementEstimate(null);
    setDisplacementStatus("idle");
    setDisplacementError(null);
    displacementFailureNotifiedRef.current = false;
  }, []);

  const applySuggestedAddress = useCallback(() => {
    if (!suggestedClient) return;
    setCep(suggestedClient.address_cep ?? "");
    setLogradouro(suggestedClient.address_logradouro ?? "");
    setNumero(suggestedClient.address_numero ?? "");
    setComplemento(suggestedClient.address_complemento ?? "");
    setBairro(suggestedClient.address_bairro ?? "");
    setCidade(suggestedClient.address_cidade ?? "");
    setEstado(suggestedClient.address_estado ?? "");
  }, [suggestedClient]);

  const calculateDisplacement = useCallback(async () => {
    if (!requiresAddress || !addressComplete) {
      resetDisplacementState();
      return;
    }

    setDisplacementStatus("loading");
    setDisplacementError(null);
    try {
      const response = await fetch("/api/displacement-fee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cep,
          logradouro,
          numero,
          complemento,
          bairro,
          cidade,
          estado,
        }),
      });
      const payload = (await response.json()) as
        | DisplacementEstimate
        | {
            error?: string;
          };
      if (!response.ok) {
        const errorPayload = payload as { error?: string };
        throw new Error(errorPayload.error || "Não foi possível calcular a taxa de deslocamento.");
      }
      if (
        !("fee" in payload) ||
        typeof payload.fee !== "number" ||
        typeof payload.distanceKm !== "number"
      ) {
        throw new Error("Não foi possível calcular a taxa de deslocamento.");
      }
      setDisplacementEstimate(payload);
      setDisplacementStatus("idle");
      displacementFailureNotifiedRef.current = false;
    } catch (error) {
      setDisplacementEstimate(null);
      setDisplacementStatus("error");
      const message =
        error instanceof Error ? error.message : "Não foi possível calcular a taxa de deslocamento.";
      setDisplacementError(message);
      if (!displacementFailureNotifiedRef.current) {
        displacementFailureNotifiedRef.current = true;
        showToast(feedbackById("displacement_calc_failed"));
      }
    }
  }, [
    addressComplete,
    bairro,
    cep,
    cidade,
    complemento,
    estado,
    logradouro,
    numero,
    requiresAddress,
    resetDisplacementState,
    showToast,
  ]);

  useEffect(() => {
    if (!requiresAddress || !addressComplete) {
      setDisplacementEstimate(null);
      setDisplacementStatus("idle");
      setDisplacementError(null);
      return;
    }

    const timer = window.setTimeout(() => {
      void calculateDisplacement();
    }, 350);

    return () => window.clearTimeout(timer);
  }, [addressComplete, calculateDisplacement, requiresAddress]);

  useEffect(() => {
    if (!isAddressSearchModalOpen) return;
    const query = addressSearchQuery.trim();
    if (query.length < 3) {
      setAddressSearchResults([]);
      setAddressSearchError(null);
      setAddressSearchLoading(false);
      return;
    }
    const controller = new AbortController();
    const runSearch = async () => {
      setAddressSearchLoading(true);
      setAddressSearchError(null);
      try {
        const response = await fetch(`/api/address-search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error("Falha na busca");
        }
        const data = (await response.json()) as AddressSearchResult[];
        setAddressSearchResults(Array.isArray(data) ? data : []);
      } catch (error) {
        if ((error as { name?: string }).name === "AbortError") return;
        setAddressSearchResults([]);
        setAddressSearchError("Não foi possível buscar endereços. Tente novamente.");
        showToast(feedbackById("address_search_failed"));
      } finally {
        setAddressSearchLoading(false);
      }
    };
    void runSearch();
    return () => controller.abort();
  }, [addressSearchQuery, isAddressSearchModalOpen, showToast]);

  const closeAddressSearchModal = useCallback(() => {
    setIsAddressSearchModalOpen(false);
    setAddressSearchQuery("");
    setAddressSearchResults([]);
    setAddressSearchLoading(false);
    setAddressSearchError(null);
  }, []);

  const handleSelectAddressResult = useCallback(
    async (result: AddressSearchResult) => {
      setAddressSearchLoading(true);
      setAddressSearchError(null);
      try {
        const response = await fetch(
          `/api/address-details?placeId=${encodeURIComponent(result.placeId)}`
        );
        if (!response.ok) {
          throw new Error("Falha ao carregar endereço");
        }
        const data = (await response.json()) as {
          cep?: string;
          logradouro?: string;
          numero?: string;
          bairro?: string;
          cidade?: string;
          estado?: string;
        };
        setCep(data.cep ?? "");
        setLogradouro(data.logradouro ?? "");
        setNumero(data.numero ?? "");
        setBairro(data.bairro ?? "");
        setCidade(data.cidade ?? "");
        setEstado(data.estado ?? "");
        setCepStatus(data.cep ? "success" : "idle");
        closeAddressSearchModal();
      } catch {
        setAddressSearchError("Não foi possível carregar o endereço. Tente novamente.");
        showToast(feedbackById("address_details_failed"));
      } finally {
        setAddressSearchLoading(false);
      }
    },
    [closeAddressSearchModal, showToast]
  );

  const handleSelectStudioLocation = useCallback(() => {
    setIsHomeVisit(false);
    resetDisplacementState();
  }, [resetDisplacementState, setIsHomeVisit]);

  const handleSelectHomeVisitLocation = useCallback(() => {
    if (homeVisitAllowed) {
      setIsHomeVisit(true);
    }
  }, [homeVisitAllowed, setIsHomeVisit]);

  const handleUseSuggestedAddress = useCallback(() => {
    setUseSuggestedAddress(true);
    applySuggestedAddress();
    setAddressMode(null);
  }, [applySuggestedAddress]);

  const handleChooseOtherAddress = useCallback(() => {
    setUseSuggestedAddress(false);
    clearAddressFields();
    setAddressMode("cep");
    resetDisplacementState();
  }, [clearAddressFields, resetDisplacementState]);

  const handleSelectLocationAddressMode = useCallback((mode: Exclude<LocationAddressMode, null>) => {
    setAddressMode(mode);
    if (mode === "text") {
      setIsAddressSearchModalOpen(true);
    }
  }, []);

  const handleLocationCepChange = useCallback((value: string) => {
    setCep(formatCep(value));
    setCepStatus("idle");
  }, []);

  const handleLocationStateChange = useCallback((value: string) => {
    setEstado(value.toUpperCase());
  }, []);

  const handleCepLookup = useCallback(async () => {
    const normalized = normalizeCep(cep);
    if (normalized.length !== 8) {
      setCepStatus("error");
      showToast(feedbackById("address_cep_invalid"));
      return;
    }
    setCepStatus("loading");
    const result = await fetchAddressByCep(normalized);
    if (!result) {
      setCepStatus("error");
      showToast(feedbackById("address_cep_not_found"));
      return;
    }
    setLogradouro(result.logradouro);
    setBairro(result.bairro);
    setCidade(result.cidade);
    setEstado(result.estado);
    setCepStatus("success");
    showToast(feedbackById("address_cep_found"));
  }, [cep, showToast]);

  const resetLocationState = useCallback(() => {
    setUseSuggestedAddress(null);
    setAddressMode(null);
    clearAddressFields();
    closeAddressSearchModal();
    resetDisplacementState();
  }, [clearAddressFields, closeAddressSearchModal, resetDisplacementState]);

  const enforceStudioLocationOnly = useCallback(() => {
    setIsHomeVisit(false);
    resetDisplacementState();
  }, [resetDisplacementState, setIsHomeVisit]);

  return {
    cep,
    logradouro,
    numero,
    complemento,
    bairro,
    cidade,
    estado,
    setLogradouro,
    setNumero,
    setComplemento,
    setBairro,
    setCidade,
    useSuggestedAddress,
    addressMode,
    isAddressSearchModalOpen,
    setIsAddressSearchModalOpen,
    addressSearchQuery,
    setAddressSearchQuery,
    addressSearchResults,
    addressSearchLoading,
    displacementEstimate,
    displacementStatus,
    mapsQuery,
    hasSuggestedAddress,
    suggestedAddressSummary,
    requiresAddress,
    addressComplete,
    displacementReady,
    closeAddressSearchModal,
    handleSelectAddressResult,
    handleSelectStudioLocation,
    handleSelectHomeVisitLocation,
    handleUseSuggestedAddress,
    handleChooseOtherAddress,
    handleSelectLocationAddressMode,
    handleLocationCepChange,
    handleLocationStateChange,
    handleCepLookup,
    resetLocationState,
    enforceStudioLocationOnly,
  };
}
