
import { useEffect } from "react";
import type { MutableRefObject } from "react";

type Params = {
  selectedClientId: string | null;
  previousClientIdRef: MutableRefObject<string | null>;
  setAddressModeAction: (value: "none" | "existing" | "new") => void;
  setSelectedAddressIdAction: (value: string | null) => void;
  setShowAddressSelectionListAction: (value: boolean) => void;
  setAddressConfirmedAction: (value: boolean) => void;
  setIsAddressModalOpenAction: (value: boolean) => void;
  setAddressModalStepAction: (value: "chooser" | "cep" | "search" | "form") => void;
  setCepAction: (value: string) => void;
  setLogradouroAction: (value: string) => void;
  setNumeroAction: (value: string) => void;
  setComplementoAction: (value: string) => void;
  setBairroAction: (value: string) => void;
  setCidadeAction: (value: string) => void;
  setEstadoAction: (value: string) => void;
  setAddressLabelAction: (value: string) => void;
  setAddressIsPrimaryDraftAction: (value: boolean) => void;
  setAddressSaveErrorAction: (value: string | null) => void;
  setDisplacementEstimateAction: (value: null) => void;
  setDisplacementStatusAction: (value: "idle" | "loading" | "error") => void;
  setDisplacementErrorAction: (value: string | null) => void;
};

export function useAppointmentClientChangeReset({
  selectedClientId,
  previousClientIdRef,
  setAddressModeAction,
  setSelectedAddressIdAction,
  setShowAddressSelectionListAction,
  setAddressConfirmedAction,
  setIsAddressModalOpenAction,
  setAddressModalStepAction,
  setCepAction,
  setLogradouroAction,
  setNumeroAction,
  setComplementoAction,
  setBairroAction,
  setCidadeAction,
  setEstadoAction,
  setAddressLabelAction,
  setAddressIsPrimaryDraftAction,
  setAddressSaveErrorAction,
  setDisplacementEstimateAction,
  setDisplacementStatusAction,
  setDisplacementErrorAction,
}: Params) {
  useEffect(() => {
    if (previousClientIdRef.current && previousClientIdRef.current !== selectedClientId) {
      setAddressModeAction("none");
      setSelectedAddressIdAction(null);
      setShowAddressSelectionListAction(false);
      setAddressConfirmedAction(false);
      setIsAddressModalOpenAction(false);
      setAddressModalStepAction("chooser");
      setCepAction("");
      setLogradouroAction("");
      setNumeroAction("");
      setComplementoAction("");
      setBairroAction("");
      setCidadeAction("");
      setEstadoAction("");
      setAddressLabelAction("Principal");
      setAddressIsPrimaryDraftAction(false);
      setAddressSaveErrorAction(null);
      setDisplacementEstimateAction(null);
      setDisplacementStatusAction("idle");
      setDisplacementErrorAction(null);
    }
    previousClientIdRef.current = selectedClientId ?? null;
  }, [
    selectedClientId,
    setAddressModeAction,
    setSelectedAddressIdAction,
    setShowAddressSelectionListAction,
    setAddressConfirmedAction,
    setIsAddressModalOpenAction,
    setAddressModalStepAction,
    setCepAction,
    setLogradouroAction,
    setNumeroAction,
    setComplementoAction,
    setBairroAction,
    setCidadeAction,
    setEstadoAction,
    setAddressLabelAction,
    setAddressIsPrimaryDraftAction,
    setAddressSaveErrorAction,
    setDisplacementEstimateAction,
    setDisplacementStatusAction,
    setDisplacementErrorAction,
    previousClientIdRef,
  ]);
}
