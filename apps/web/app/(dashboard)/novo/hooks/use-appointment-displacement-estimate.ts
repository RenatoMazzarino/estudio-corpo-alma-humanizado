
import { useEffect, useMemo } from "react";
import type { DisplacementEstimate } from "../appointment-form.types";

type AddressMode = "none" | "existing" | "new";

type AddressLike = {
  address_cep?: string | null;
  address_logradouro?: string | null;
  address_numero?: string | null;
  address_complemento?: string | null;
  address_bairro?: string | null;
  address_cidade?: string | null;
  address_estado?: string | null;
};

type Params = {
  isHomeVisit: boolean;
  addressMode: AddressMode;
  selectedAddress: AddressLike | null;
  addressConfirmed: boolean;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  setDisplacementEstimateAction: (value: DisplacementEstimate | null) => void;
  setDisplacementStatusAction: (value: "idle" | "loading" | "error") => void;
  setDisplacementErrorAction: (value: string | null) => void;
  setManualDisplacementFeeAction: (value: string) => void;
};

export function useAppointmentDisplacementEstimate({
  isHomeVisit,
  addressMode,
  selectedAddress,
  addressConfirmed,
  cep,
  logradouro,
  numero,
  complemento,
  bairro,
  cidade,
  estado,
  setDisplacementEstimateAction,
  setDisplacementStatusAction,
  setDisplacementErrorAction,
  setManualDisplacementFeeAction,
}: Params) {
  const displacementInput = useMemo(() => {
    if (!isHomeVisit) return null;
    if (addressMode === "existing" && selectedAddress) {
      return {
        cep: selectedAddress.address_cep ?? "",
        logradouro: selectedAddress.address_logradouro ?? "",
        numero: selectedAddress.address_numero ?? "",
        complemento: selectedAddress.address_complemento ?? "",
        bairro: selectedAddress.address_bairro ?? "",
        cidade: selectedAddress.address_cidade ?? "",
        estado: selectedAddress.address_estado ?? "",
      };
    }
    if (addressMode === "new" && addressConfirmed) {
      return { cep, logradouro, numero, complemento, bairro, cidade, estado };
    }
    return null;
  }, [
    addressConfirmed,
    addressMode,
    bairro,
    cep,
    cidade,
    complemento,
    estado,
    isHomeVisit,
    logradouro,
    numero,
    selectedAddress,
  ]);

  useEffect(() => {
    if (!displacementInput) {
      setDisplacementEstimateAction(null);
      setDisplacementStatusAction("idle");
      setDisplacementErrorAction(null);
      setManualDisplacementFeeAction("");
      return;
    }

    if (!displacementInput.logradouro || !displacementInput.cidade || !displacementInput.estado) {
      setDisplacementEstimateAction(null);
      setDisplacementStatusAction("idle");
      setDisplacementErrorAction(null);
      setManualDisplacementFeeAction("");
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setDisplacementStatusAction("loading");
      setDisplacementErrorAction(null);
      try {
        const response = await fetch("/api/displacement-fee", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(displacementInput),
          signal: controller.signal,
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
        if (!("fee" in payload) || typeof payload.fee !== "number" || typeof payload.distanceKm !== "number") {
          throw new Error("Não foi possível calcular a taxa de deslocamento.");
        }
        setDisplacementEstimateAction(payload);
        setDisplacementStatusAction("idle");
        setManualDisplacementFeeAction(payload.fee.toFixed(2).replace(".", ","));
      } catch (error) {
        if (controller.signal.aborted) return;
        setDisplacementEstimateAction(null);
        setDisplacementStatusAction("error");
        setDisplacementErrorAction(
          error instanceof Error ? error.message : "Não foi possível calcular a taxa de deslocamento."
        );
        setManualDisplacementFeeAction("");
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [
    displacementInput,
    setDisplacementErrorAction,
    setDisplacementEstimateAction,
    setDisplacementStatusAction,
    setManualDisplacementFeeAction,
  ]);

  return { displacementInput };
}
