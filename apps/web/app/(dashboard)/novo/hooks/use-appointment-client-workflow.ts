import { useMemo, type MutableRefObject } from "react";
import { normalizeReferenceLabel, resolveClientNames } from "../../../../src/modules/clients/name-profile";
import { formatCpf, normalizeCpfDigits } from "../../../../src/shared/cpf";
import { formatBrazilPhone } from "../../../../src/shared/phone";
import type { UserFeedback } from "../../../../src/shared/feedback/user-feedback";
import { splitSeedName, isValidEmailAddress } from "../appointment-form.helpers";
import type { ClientRecordLite, ClientSelectionMode } from "../appointment-form.types";

type Params = {
  clientName: string;
  setClientName: (value: string) => void;
  clientPhone: string;
  setClientPhone: (value: string) => void;
  clientCpf: string;
  setClientCpf: (value: string) => void;
  clientEmail: string;
  setClientEmail: (value: string) => void;
  clientFirstName: string;
  setClientFirstName: (value: string) => void;
  clientLastName: string;
  setClientLastName: (value: string) => void;
  clientReference: string;
  setClientReference: (value: string) => void;
  clientRecords: ClientRecordLite[];
  setClientRecords: (updater: (current: ClientRecordLite[]) => ClientRecordLite[]) => void;
  setSelectedClientId: (value: string | null) => void;
  setClientSelectionMode: (value: ClientSelectionMode) => void;
  setIsClientDropdownOpen: (value: boolean) => void;
  setClientCreateError: (value: string | null) => void;
  setIsClientCreateModalOpen: (value: boolean) => void;
  setIsClientCreateSaving: (value: boolean) => void;
  duplicateCpfClient: ClientRecordLite | null;
  isEditing: boolean;
  formRef: MutableRefObject<HTMLFormElement | null>;
  clientCreateFirstNameInputRef: MutableRefObject<HTMLInputElement | null>;
  clientPhoneInputRef: MutableRefObject<HTMLInputElement | null>;
  clientCpfInputRef: MutableRefObject<HTMLInputElement | null>;
  createClientFromAppointmentDraft: (payload: {
    firstName: string;
    lastName: string;
    reference: string | null;
    phone: string | null;
    email: string | null;
    cpf: string | null;
  }) => Promise<{
    ok: boolean;
    error?: string;
    data?: {
      id: string;
      name: string;
      phone: string | null;
      email: string | null;
      cpf: string | null;
      public_first_name: string | null;
      public_last_name: string | null;
      internal_reference: string | null;
    } | null;
  }>;
  showToast: (feedback: UserFeedback) => void;
};

export function useAppointmentClientWorkflow(params: Params) {
  const filteredClients = useMemo(() => {
    if (!params.clientName.trim()) return [];
    const query = params.clientName.trim();
    const lower = query.toLowerCase();
    const digits = query.replace(/\D/g, "");
    return params.clientRecords
      .filter((client) => {
        const byName = client.name.toLowerCase().includes(lower);
        if (byName) return true;
        if (!digits) return false;
        const phoneDigits = (client.phone ?? "").replace(/\D/g, "");
        const cpfDigits = normalizeCpfDigits(client.cpf ?? null);
        return (
          (phoneDigits.length > 0 && phoneDigits.includes(digits)) ||
          (cpfDigits.length > 0 && cpfDigits.includes(digits))
        );
      })
      .slice(0, 8);
  }, [params.clientName, params.clientRecords]);

  const exactClientMatch = useMemo(() => {
    const trimmed = params.clientName.trim();
    if (!trimmed) return null;
    return (
      params.clientRecords.find((client) => client.name.trim().toLowerCase() === trimmed.toLowerCase()) ?? null
    );
  }, [params.clientName, params.clientRecords]);

  const handleSelectClient = (client: ClientRecordLite) => {
    params.setClientName(client.name);
    params.setClientPhone(client.phone ? formatBrazilPhone(client.phone) : "");
    params.setClientCpf(formatCpf(client.cpf ?? ""));
    params.setClientEmail(client.email?.trim().toLowerCase() ?? "");
    const names = resolveClientNames({
      name: client.name,
      publicFirstName: client.public_first_name ?? null,
      publicLastName: client.public_last_name ?? null,
      internalReference: client.internal_reference ?? null,
    });
    params.setClientFirstName(names.publicFirstName);
    params.setClientLastName(names.publicLastName);
    params.setClientReference(names.reference);
    params.setSelectedClientId(client.id);
    params.setClientSelectionMode("existing");
    params.setIsClientDropdownOpen(false);
    params.setClientCreateError(null);
  };

  const handleCreateNewClientFromName = () => {
    const normalizedName = params.clientName.trim();
    const seed = splitSeedName(normalizedName);
    params.setClientCreateError(null);
    params.setClientFirstName(seed.firstName);
    params.setClientLastName(seed.lastName);
    params.setClientReference(seed.reference);
    params.setClientPhone("");
    params.setClientEmail("");
    params.setClientCpf("");
    params.setIsClientDropdownOpen(false);
    params.setIsClientCreateModalOpen(true);
    window.setTimeout(() => {
      params.clientCreateFirstNameInputRef.current?.focus();
    }, 40);
  };

  const clearSelectedClient = () => {
    params.setSelectedClientId(null);
    params.setClientSelectionMode("idle");
    params.setClientName("");
    params.setClientPhone("");
    params.setClientCpf("");
    params.setClientEmail("");
    params.setClientFirstName("");
    params.setClientLastName("");
    params.setClientReference("");
    params.setIsClientDropdownOpen(false);
    params.setClientCreateError(null);
    window.setTimeout(() => {
      params.formRef.current?.querySelector<HTMLInputElement>('input[name="clientName"]')?.focus();
    }, 30);
  };

  const handleSaveClientDraftFromModal = async () => {
    const firstName = params.clientFirstName.trim();
    const lastName = params.clientLastName.trim();
    const reference = normalizeReferenceLabel(params.clientReference);
    const phoneDigits = params.clientPhone.replace(/\D/g, "");
    const emailValue = params.clientEmail.trim().toLowerCase();
    const cpfDigits = normalizeCpfDigits(params.clientCpf);

    if (!firstName) {
      params.setClientCreateError("Informe o primeiro nome do cliente.");
      params.clientCreateFirstNameInputRef.current?.focus();
      return;
    }
    if (!lastName) {
      params.setClientCreateError("Informe o sobrenome do cliente.");
      return;
    }
    if (phoneDigits.length > 0 && !(phoneDigits.length === 10 || phoneDigits.length === 11)) {
      params.setClientCreateError("WhatsApp inválido. Informe um número com DDD.");
      params.clientPhoneInputRef.current?.focus();
      return;
    }
    if (emailValue && !isValidEmailAddress(emailValue)) {
      params.setClientCreateError("Email inválido. Verifique e tente novamente.");
      return;
    }
    if (params.clientCpf.trim() && cpfDigits.length !== 11) {
      params.setClientCreateError("CPF inválido. Informe os 11 números do CPF.");
      params.clientCpfInputRef.current?.focus();
      return;
    }

    params.setIsClientCreateSaving(true);
    params.setClientCreateError(null);
    try {
      const result = await params.createClientFromAppointmentDraft({
        firstName,
        lastName,
        reference: reference || null,
        phone: phoneDigits ? formatBrazilPhone(phoneDigits) : null,
        email: emailValue || null,
        cpf: cpfDigits.length === 11 ? cpfDigits : null,
      });

      if (!result.ok || !result.data) {
        params.setClientCreateError(result.error ?? "Não foi possível salvar o cliente agora.");
        return;
      }

      const createdClient: ClientRecordLite = {
        id: result.data.id,
        name: result.data.name,
        phone: result.data.phone,
        email: result.data.email,
        cpf: result.data.cpf,
        public_first_name: result.data.public_first_name,
        public_last_name: result.data.public_last_name,
        internal_reference: result.data.internal_reference,
      };

      params.setClientRecords((current) => {
        const next = current.filter((client) => client.id !== createdClient.id);
        return [createdClient, ...next];
      });
      handleSelectClient(createdClient);
      params.setClientName(createdClient.name);
      params.setClientPhone(createdClient.phone ? formatBrazilPhone(createdClient.phone) : "");
      params.setClientEmail(createdClient.email?.trim().toLowerCase() ?? "");
      params.setClientCpf(formatCpf(createdClient.cpf ?? ""));
      params.setClientFirstName(firstName);
      params.setClientLastName(lastName);
      params.setClientReference(reference);
      params.setIsClientCreateModalOpen(false);
      params.showToast({
        title: "Cliente",
        message: "Cliente salvo com sucesso.",
        tone: "success",
        durationMs: 1800,
      });
    } finally {
      params.setIsClientCreateSaving(false);
    }
  };

  const handleLinkExistingClientByCpf = () => {
    if (!params.duplicateCpfClient) return;
    handleSelectClient(params.duplicateCpfClient);
    params.showToast({
      title: "CPF já cadastrado",
      message: `Agendamento vinculado ao cliente existente: ${params.duplicateCpfClient.name}.`,
      tone: "warning",
    });
  };

  const handleChangeCpfAfterConflict = () => {
    params.setClientCpf("");
    window.setTimeout(() => {
      params.clientCpfInputRef.current?.focus();
    }, 40);
  };

  return {
    filteredClients,
    exactClientMatch,
    handleSelectClient,
    handleCreateNewClientFromName,
    clearSelectedClient,
    handleSaveClientDraftFromModal,
    handleLinkExistingClientByCpf,
    handleChangeCpfAfterConflict,
  };
}
