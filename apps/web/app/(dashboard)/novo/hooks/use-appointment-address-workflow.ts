
import { useEffect, useState } from "react";
import { fetchAddressByCep, formatCep, normalizeCep } from "../../../../src/shared/address/cep";
import { getClientAddresses, saveClientAddress } from "../appointment-actions";
import type { AddressModalStep, AddressSearchResult, AppointmentFormProps, ClientAddress } from "../appointment-form.types";

type Params = {
  initialAppointment?: AppointmentFormProps["initialAppointment"];
  selectedClientId: string | null;
  isHomeVisit: boolean;
};

export function useAppointmentAddressWorkflow({
  initialAppointment,
  selectedClientId,
  isHomeVisit,
}: Params) {
  const hasInitialManualAddress =
    !!initialAppointment?.isHomeVisit &&
    !initialAppointment?.clientAddressId &&
    (initialAppointment?.addressCep ||
      initialAppointment?.addressLogradouro ||
      initialAppointment?.addressNumero ||
      initialAppointment?.addressComplemento ||
      initialAppointment?.addressBairro ||
      initialAppointment?.addressCidade ||
      initialAppointment?.addressEstado);

  const initialAddressMode: "none" | "existing" | "new" = initialAppointment?.clientAddressId
    ? "existing"
    : hasInitialManualAddress
      ? "new"
      : "none";

  const [clientAddresses, setClientAddresses] = useState<ClientAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    initialAppointment?.clientAddressId ?? null
  );
  const [addressMode, setAddressMode] = useState<"none" | "existing" | "new">(initialAddressMode);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [addressModalStep, setAddressModalStep] = useState<AddressModalStep>("chooser");
  const [showAddressSelectionList, setShowAddressSelectionList] = useState(false);
  const [addressConfirmed, setAddressConfirmed] = useState(
    Boolean(initialAppointment?.clientAddressId || hasInitialManualAddress)
  );
  const [cepDraft, setCepDraft] = useState("");
  const [cepDraftStatus, setCepDraftStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [addressSearchQuery, setAddressSearchQuery] = useState("");
  const [addressSearchResults, setAddressSearchResults] = useState<AddressSearchResult[]>([]);
  const [addressSearchLoading, setAddressSearchLoading] = useState(false);
  const [addressSearchError, setAddressSearchError] = useState<string | null>(null);
  const [addressSavePending, setAddressSavePending] = useState(false);
  const [addressSaveError, setAddressSaveError] = useState<string | null>(null);
  const [addressIsPrimaryDraft, setAddressIsPrimaryDraft] = useState(false);
  const [addressLabel, setAddressLabel] = useState("Principal");
  const [cep, setCep] = useState(initialAppointment?.addressCep ?? "");
  const [logradouro, setLogradouro] = useState(initialAppointment?.addressLogradouro ?? "");
  const [numero, setNumero] = useState(initialAppointment?.addressNumero ?? "");
  const [complemento, setComplemento] = useState(initialAppointment?.addressComplemento ?? "");
  const [bairro, setBairro] = useState(initialAppointment?.addressBairro ?? "");
  const [cidade, setCidade] = useState(initialAppointment?.addressCidade ?? "");
  const [estado, setEstado] = useState(initialAppointment?.addressEstado ?? "");

  const applyAddressDraftFields = (payload: {
    cep?: string | null;
    logradouro?: string | null;
    numero?: string | null;
    complemento?: string | null;
    bairro?: string | null;
    cidade?: string | null;
    estado?: string | null;
  }) => {
    setCep(payload.cep ?? "");
    setLogradouro(payload.logradouro ?? "");
    setNumero(payload.numero ?? "");
    setComplemento(payload.complemento ?? "");
    setBairro(payload.bairro ?? "");
    setCidade(payload.cidade ?? "");
    setEstado((payload.estado ?? "").toUpperCase());
  };

  useEffect(() => {
    if (!isHomeVisit) {
      setIsAddressModalOpen(false);
      setAddressModalStep("chooser");
      setCepDraft("");
      setCepDraftStatus("idle");
      setAddressSearchQuery("");
      setAddressSearchResults([]);
      setAddressSearchLoading(false);
      setAddressSearchError(null);
    }
  }, [isHomeVisit]);

  useEffect(() => {
    let active = true;
    if (!selectedClientId) {
      setClientAddresses([]);
      setSelectedAddressId(null);
      setShowAddressSelectionList(false);
      setAddressConfirmed(false);
      return;
    }

    (async () => {
      const result = await getClientAddresses(selectedClientId);
      if (!active) return;
      const addresses = (result.data as ClientAddress[]) ?? [];
      setClientAddresses(addresses);
      const primary = addresses.find((address) => address.is_primary) ?? addresses[0] ?? null;
      const hasSelected = !!selectedAddressId && addresses.some((address) => address.id === selectedAddressId);
      const nextSelectedId = hasSelected ? selectedAddressId : primary?.id ?? null;
      if (nextSelectedId !== selectedAddressId) {
        setSelectedAddressId(nextSelectedId);
      }
      if (addresses.length <= 1) {
        setShowAddressSelectionList(false);
      } else if (!hasSelected && nextSelectedId) {
        setShowAddressSelectionList(true);
      }
      if (addressMode !== "new") {
        setAddressMode(nextSelectedId ? "existing" : "none");
        setAddressConfirmed(Boolean(nextSelectedId));
      }
      if (nextSelectedId && addressMode !== "new") {
        const selected = addresses.find((address) => address.id === nextSelectedId) ?? null;
        if (selected) {
          setAddressLabel(selected.label ?? "Casa");
          setCep(selected.address_cep ?? "");
          setLogradouro(selected.address_logradouro ?? "");
          setNumero(selected.address_numero ?? "");
          setComplemento(selected.address_complemento ?? "");
          setBairro(selected.address_bairro ?? "");
          setCidade(selected.address_cidade ?? "");
          setEstado(selected.address_estado ?? "");
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [selectedClientId, addressMode, selectedAddressId]);

  useEffect(() => {
    if (!isHomeVisit) return;
    if (addressMode === "new" && addressConfirmed) return;
    if (clientAddresses.length > 0) {
      setAddressMode("existing");
      setAddressConfirmed(true);
      return;
    }
    setAddressMode(addressConfirmed ? "new" : "none");
  }, [isHomeVisit, clientAddresses, addressMode, addressConfirmed]);

  useEffect(() => {
    if (!(isAddressModalOpen && addressModalStep === "search")) return;
    const query = addressSearchQuery.trim();
    if (query.length < 3) {
      setAddressSearchResults([]);
      setAddressSearchError(null);
      setAddressSearchLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setAddressSearchLoading(true);
      setAddressSearchError(null);
      try {
        const response = await fetch(`/api/address-search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Falha ao buscar endereço");
        const data = (await response.json()) as AddressSearchResult[];
        if (!controller.signal.aborted) {
          setAddressSearchResults(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error(error);
          setAddressSearchResults([]);
          setAddressSearchError("Não foi possível buscar endereços. Tente novamente.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setAddressSearchLoading(false);
        }
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [addressSearchQuery, isAddressModalOpen, addressModalStep]);

  const handleCepDraftLookup = async () => {
    const normalized = normalizeCep(cepDraft);
    if (normalized.length !== 8) {
      setCepDraftStatus("error");
      return null;
    }
    setCepDraftStatus("loading");
    const result = await fetchAddressByCep(normalized);
    if (!result) {
      setCepDraftStatus("error");
      return null;
    }
    const nextResult = {
      cep: formatCep(normalized),
      logradouro: result.logradouro,
      bairro: result.bairro,
      cidade: result.cidade,
      estado: result.estado,
    };
    setCepDraftStatus("success");
    return nextResult;
  };

  const handleAddressSearchResultSelect = async (result: AddressSearchResult) => {
    setAddressSearchLoading(true);
    setAddressSearchError(null);
    try {
      const response = await fetch(`/api/address-details?placeId=${encodeURIComponent(result.placeId)}`);
      if (!response.ok) throw new Error("Falha ao buscar endereço");
      const data = (await response.json()) as {
        cep?: string;
        logradouro?: string;
        numero?: string;
        bairro?: string;
        cidade?: string;
        estado?: string;
      };

      applyAddressDraftFields({
        cep: data.cep ? formatCep(data.cep) : "",
        logradouro: data.logradouro ?? result.label,
        numero: data.numero ?? "",
        bairro: data.bairro ?? "",
        cidade: data.cidade ?? "",
        estado: data.estado ?? "",
      });
      setAddressModalStep("form");
      setAddressSaveError(null);
      return true;
    } catch (error) {
      console.error(error);
      setAddressSearchError("Não foi possível carregar o endereço. Tente novamente.");
      return false;
    } finally {
      setAddressSearchLoading(false);
    }
  };

  const openAddressCreateModal = () => {
    if (!isHomeVisit) return;
    setIsAddressModalOpen(true);
    setAddressModalStep("chooser");
    setAddressSaveError(null);
    setAddressSavePending(false);
    setCepDraft("");
    setCepDraftStatus("idle");
    setAddressSearchQuery("");
    setAddressSearchResults([]);
    setAddressSearchLoading(false);
    setAddressSearchError(null);
    setAddressIsPrimaryDraft(clientAddresses.length === 0);
    if (!addressLabel.trim()) {
      setAddressLabel("Principal");
    }
    if (addressMode !== "new") {
      setCep("");
      setLogradouro("");
      setNumero("");
      setComplemento("");
      setBairro("");
      setCidade("");
      setEstado("");
      setAddressLabel("Principal");
    }
  };

  const closeAddressCreateModal = () => {
    setIsAddressModalOpen(false);
    setAddressModalStep("chooser");
    setAddressSaveError(null);
    setAddressSavePending(false);
    setCepDraft("");
    setCepDraftStatus("idle");
    setAddressSearchQuery("");
    setAddressSearchResults([]);
    setAddressSearchLoading(false);
    setAddressSearchError(null);
  };

  const handleSelectExistingAddress = (addressId: string) => {
    const selected = clientAddresses.find((address) => address.id === addressId) ?? null;
    setSelectedAddressId(addressId);
    setAddressMode("existing");
    setAddressConfirmed(true);
    setShowAddressSelectionList(false);
    if (selected) {
      setAddressLabel(selected.label ?? "Principal");
      setCep(selected.address_cep ?? "");
      setLogradouro(selected.address_logradouro ?? "");
      setNumero(selected.address_numero ?? "");
      setComplemento(selected.address_complemento ?? "");
      setBairro(selected.address_bairro ?? "");
      setCidade(selected.address_cidade ?? "");
      setEstado(selected.address_estado ?? "");
    }
  };

  const handleAddressModalSave = async (resolvedClientId: string | null) => {
    const normalizedLabel = addressLabel.trim() || "Principal";
    if (!logradouro.trim() || !cidade.trim() || estado.trim().length < 2) {
      setAddressSaveError("Preencha rua, cidade e UF para salvar o endereço.");
      setAddressModalStep("form");
      return;
    }

    setAddressSaveError(null);

    if (!resolvedClientId) {
      setAddressLabel(normalizedLabel);
      setAddressMode("new");
      setSelectedAddressId(null);
      setAddressConfirmed(true);
      setShowAddressSelectionList(false);
      closeAddressCreateModal();
      return;
    }

    setAddressSavePending(true);
    const result = await saveClientAddress({
      clientId: resolvedClientId,
      label: normalizedLabel,
      isPrimary: clientAddresses.length === 0 ? true : addressIsPrimaryDraft,
      addressCep: cep || null,
      addressLogradouro: logradouro,
      addressNumero: numero || null,
      addressComplemento: complemento || null,
      addressBairro: bairro || null,
      addressCidade: cidade,
      addressEstado: estado.toUpperCase(),
    });

    if (result.error || !result.data?.id) {
      setAddressSavePending(false);
      setAddressSaveError(result.error ?? "Não foi possível salvar o endereço.");
      setAddressModalStep("form");
      return;
    }

    const refreshed = await getClientAddresses(resolvedClientId);
    const refreshedAddresses = (refreshed.data as ClientAddress[]) ?? [];
    setClientAddresses(refreshedAddresses);
    setAddressLabel(normalizedLabel);
    setAddressMode("existing");
    setSelectedAddressId(result.data.id);
    setAddressConfirmed(true);
    setShowAddressSelectionList(false);
    setAddressSavePending(false);
    closeAddressCreateModal();
  };

  return {
    clientAddresses,
    setClientAddresses,
    selectedAddressId,
    setSelectedAddressId,
    addressMode,
    setAddressMode,
    isAddressModalOpen,
    setIsAddressModalOpen,
    addressModalStep,
    setAddressModalStep,
    showAddressSelectionList,
    setShowAddressSelectionList,
    addressConfirmed,
    setAddressConfirmed,
    cepDraft,
    setCepDraft,
    cepDraftStatus,
    setCepDraftStatus,
    addressSearchQuery,
    setAddressSearchQuery,
    addressSearchResults,
    setAddressSearchResults,
    addressSearchLoading,
    setAddressSearchLoading,
    addressSearchError,
    setAddressSearchError,
    addressSavePending,
    setAddressSavePending,
    addressSaveError,
    setAddressSaveError,
    addressIsPrimaryDraft,
    setAddressIsPrimaryDraft,
    addressLabel,
    setAddressLabel,
    cep,
    setCep,
    logradouro,
    setLogradouro,
    numero,
    setNumero,
    complemento,
    setComplemento,
    bairro,
    setBairro,
    cidade,
    setCidade,
    estado,
    setEstado,
    applyAddressDraftFields,
    handleCepDraftLookup,
    handleAddressSearchResultSelect,
    openAddressCreateModal,
    closeAddressCreateModal,
    handleSelectExistingAddress,
    handleAddressModalSave,
  };
}
