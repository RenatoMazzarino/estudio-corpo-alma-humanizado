"use client";

import { useEffect, useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { differenceInYears } from "date-fns";
import { Camera, ChevronLeft, ImagePlus, Trash2, UserRound } from "lucide-react";
import { parsePhoneNumberFromString } from "libphonenumber-js";

import { FooterRail } from "../../../../components/ui/footer-rail";
import { Toast, useToast } from "../../../../components/ui/toast";
import { fetchAddressByCep, normalizeCep } from "../../../../src/shared/address/cep";
import { formatCpf } from "../../../../src/shared/cpf";
import type { ActionResult } from "../../../../src/shared/errors/result";
import {
  composeInternalClientName,
} from "../../../../src/modules/clients/name-profile";
import {
  appointmentFormButtonPrimaryClass,
  appointmentFormHeaderIconButtonClass,
  appointmentFormSectionHeaderPrimaryClass,
  appointmentFormSectionHeaderTextClass,
  appointmentFormScreenHeaderTopRowClass,
} from "../../novo/appointment-form.styles";
import { NewClientAddressSection } from "../novo/components/new-client-address-section";
import { NewClientContactChannelsSection } from "../novo/components/new-client-contact-channels-section";
import { NewClientExtraDataSection } from "../novo/components/new-client-extra-data-section";
import { NewClientHealthSection } from "../novo/components/new-client-health-section";
import { NewClientMinorSection } from "../novo/components/new-client-minor-section";
import { NewClientNotesSection } from "../novo/components/new-client-notes-section";
import { NewClientPreferencesSection } from "../novo/components/new-client-preferences-section";
import type {
  AddressEntry,
  ClinicalItemFormEntry,
  EmailEntry,
  PhoneEntry,
} from "../novo/components/new-client.types";
import {
  createDefaultAddressEntry,
  createDefaultEmailEntry,
  createDefaultPhoneEntry,
  type ClientFormInitialData,
} from "./client-form-data";

interface ClientSuggestion {
  id: string;
  name: string;
  phone: string | null;
}

type SubmitResult = void | ActionResult<{ id: string }>;

type ClientFormScreenProps = {
  mode: "create" | "edit";
  title: string;
  subtitle: string;
  submitLabel: string;
  backHref: string;
  submitMode: "form-action" | "imperative";
  initialData: ClientFormInitialData;
  submitActionAction: (formData: FormData) => Promise<SubmitResult>;
  searchClientsByNameAction?: (query: string) => Promise<{ data: ClientSuggestion[] }>;
  successRedirectHref?: string;
};

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

function normalizePhone(raw: string) {
  const parsed = parsePhoneNumberFromString(raw, "BR");
  return {
    number_raw: raw,
    number_e164: parsed?.isValid() ? parsed.format("E.164") : null,
  };
}

export function ClientFormScreen({
  mode,
  title,
  subtitle,
  submitLabel,
  backHref,
  submitMode,
  initialData,
  submitActionAction,
  searchClientsByNameAction,
  successRedirectHref,
}: ClientFormScreenProps) {
  const router = useRouter();
  const { toast, showToast } = useToast();
  const [firstName, setFirstName] = useState(initialData.firstName);
  const [lastName, setLastName] = useState(initialData.lastName);
  const [clientCode] = useState(initialData.clientCode);
  const [publicName, setPublicName] = useState(initialData.publicName);
  const [reference, setReference] = useState(initialData.reference);
  const [birthDate, setBirthDate] = useState(initialData.birthDate);
  const [cpf, setCpf] = useState(initialData.cpf);
  const [isVip, setIsVip] = useState(initialData.isVip);
  const [needsAttention, setNeedsAttention] = useState(initialData.needsAttention);
  const [marketingOptIn, setMarketingOptIn] = useState(initialData.marketingOptIn);
  const [isMinorOverride, setIsMinorOverride] = useState<boolean | null>(initialData.isMinorOverride);
  const [guardianName, setGuardianName] = useState(initialData.guardianName);
  const [guardianPhone, setGuardianPhone] = useState(initialData.guardianPhone);
  const [guardianCpf, setGuardianCpf] = useState(initialData.guardianCpf);
  const [guardianRelationship, setGuardianRelationship] = useState(initialData.guardianRelationship);
  const [preferencesNotes, setPreferencesNotes] = useState(initialData.preferencesNotes);
  const [clinicalHistory, setClinicalHistory] = useState(initialData.clinicalHistory);
  const [anamneseUrl, setAnamneseUrl] = useState(initialData.anamneseUrl);
  const [anamneseFormStatus, setAnamneseFormStatus] = useState(initialData.anamneseFormStatus);
  const [anamneseFormSentAt, setAnamneseFormSentAt] = useState(initialData.anamneseFormSentAt);
  const [anamneseFormAnsweredAt, setAnamneseFormAnsweredAt] = useState(initialData.anamneseFormAnsweredAt);
  const [observacoesGerais, setObservacoesGerais] = useState(initialData.observacoesGerais);
  const [profissao, setProfissao] = useState(initialData.profissao);
  const [comoConheceu, setComoConheceu] = useState(initialData.comoConheceu);
  const [allergyItems, setAllergyItems] = useState<ClinicalItemFormEntry[]>(initialData.allergyItems);
  const [conditionItems, setConditionItems] = useState<ClinicalItemFormEntry[]>(initialData.conditionItems);
  const [contraindicationItems, setContraindicationItems] = useState<ClinicalItemFormEntry[]>(
    initialData.contraindicationItems
  );
  const [allergyInput, setAllergyInput] = useState("");
  const [conditionInput, setConditionInput] = useState("");
  const [contraindicationInput, setContraindicationInput] = useState("");
  const [phones, setPhones] = useState<PhoneEntry[]>(initialData.phones.length > 0 ? initialData.phones : [createDefaultPhoneEntry()]);
  const [emails, setEmails] = useState<EmailEntry[]>(initialData.emails.length > 0 ? initialData.emails : [createDefaultEmailEntry()]);
  const [addresses, setAddresses] = useState<AddressEntry[]>(
    initialData.addresses.length > 0 ? initialData.addresses : [createDefaultAddressEntry()]
  );
  const [cepStatusByAddressId, setCepStatusByAddressId] = useState<
    Record<string, "idle" | "loading" | "error" | "success">
  >({});
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(initialData.avatarUrl);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [suggestions, setSuggestions] = useState<ClientSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const internalDisplayName = useMemo(
    () => composeInternalClientName(firstName.trim(), lastName.trim(), reference.trim() || null),
    [firstName, lastName, reference]
  );

  const shortDisplayName = useMemo(() => firstName.trim(), [firstName]);

  const publicDisplayName = useMemo(() => {
    const trimmedPublicName = publicName.trim();
    if (trimmedPublicName.length > 0) return trimmedPublicName;
    return [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
  }, [publicName, firstName, lastName]);

  const isMinorAuto = useMemo(() => {
    if (!birthDate) return initialData.isMinor;
    const parsedDate = new Date(`${birthDate}T12:00:00`);
    if (Number.isNaN(parsedDate.getTime())) return initialData.isMinor;
    return differenceInYears(new Date(), parsedDate) < 18;
  }, [birthDate, initialData.isMinor]);

  const isMinor = isMinorOverride ?? isMinorAuto;

  const initials = useMemo(() => {
    if (!internalDisplayName.trim()) return "CA";
    return internalDisplayName.trim().slice(0, 2).toUpperCase();
  }, [internalDisplayName]);

  const primaryEmailValue = useMemo(
    () => emails.find((email) => email.isPrimary)?.email ?? emails[0]?.email ?? "",
    [emails]
  );

  useEffect(() => {
    if (removeAvatar) {
      setAvatarPreviewUrl(null);
      return;
    }

    if (!avatarFile) {
      setAvatarPreviewUrl(initialData.avatarUrl);
      return;
    }

    const objectUrl = URL.createObjectURL(avatarFile);
    setAvatarPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [avatarFile, initialData.avatarUrl, removeAvatar]);

  useEffect(() => {
    if (!searchClientsByNameAction) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (!internalDisplayName.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const handle = setTimeout(async () => {
      const result = await searchClientsByNameAction(internalDisplayName.trim());
      setSuggestions(result.data ?? []);
      setShowSuggestions((result.data?.length ?? 0) > 0);
    }, 300);

    return () => clearTimeout(handle);
  }, [internalDisplayName, searchClientsByNameAction]);

  useEffect(() => {
    if (anamneseFormAnsweredAt && anamneseFormStatus !== "respondido") {
      setAnamneseFormStatus("respondido");
      return;
    }
    if (
      anamneseFormSentAt &&
      anamneseFormStatus === "nao_enviado" &&
      !anamneseFormAnsweredAt
    ) {
      setAnamneseFormStatus("enviado");
    }
  }, [anamneseFormAnsweredAt, anamneseFormSentAt, anamneseFormStatus]);

  const createClinicalItem = (label: string): ClinicalItemFormEntry => ({
    id: createId(),
    label,
    notes: "",
    severity: null,
    isActive: true,
  });

  const handleAddClinicalItem = (
    value: string,
    setItems: Dispatch<SetStateAction<ClinicalItemFormEntry[]>>,
    clear: () => void
  ) => {
    const next = value.trim();
    if (!next) return;
    setItems((prev) =>
      prev.some((item) => item.label.toLowerCase() === next.toLowerCase())
        ? prev
        : [...prev, createClinicalItem(next)]
    );
    clear();
  };

  const handleRemoveClinicalItem = (
    label: string,
    setItems: Dispatch<SetStateAction<ClinicalItemFormEntry[]>>
  ) => {
    setItems((prev) => prev.filter((item) => item.label !== label));
  };

  const handleUpdateClinicalItem = (
    label: string,
    setItems: Dispatch<SetStateAction<ClinicalItemFormEntry[]>>,
    update: Partial<ClinicalItemFormEntry>
  ) => {
    setItems((prev) =>
      prev.map((item) => (item.label === label ? { ...item, ...update } : item))
    );
  };

  const handlePhonePrimary = (id: string) => {
    setPhones((prev) => prev.map((phone) => ({ ...phone, isPrimary: phone.id === id })));
  };

  const handlePhoneWhatsapp = (id: string) => {
    setPhones((prev) => prev.map((phone) => ({ ...phone, isWhatsapp: phone.id === id })));
  };

  const handleEmailPrimary = (id: string) => {
    setEmails((prev) => prev.map((email) => ({ ...email, isPrimary: email.id === id })));
  };

  const handleAddAddress = () => {
    setAddresses((prev) => {
      const hasPrimary = prev.some((entry) => entry.isPrimary);
      return [
        ...prev,
        {
          ...createDefaultAddressEntry(),
          id: createId(),
          label: "outro",
          isPrimary: !hasPrimary,
        },
      ];
    });
  };

  const handleRemoveAddress = (id: string) => {
    setAddresses((prev) => {
      const next = prev.filter((entry) => entry.id !== id);
      if (next.length === 0) {
        return [createDefaultAddressEntry()];
      }
      if (!next.some((entry) => entry.isPrimary)) {
        const [first, ...rest] = next;
        if (!first) return [createDefaultAddressEntry()];
        return [{ ...first, isPrimary: true }, ...rest];
      }
      return next;
    });
    setCepStatusByAddressId((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleChangeAddress = (id: string, nextAddress: AddressEntry) => {
    setAddresses((prev) => prev.map((entry) => (entry.id === id ? nextAddress : entry)));
  };

  const handleSetPrimaryAddress = (id: string) => {
    setAddresses((prev) => prev.map((entry) => ({ ...entry, isPrimary: entry.id === id })));
  };

  const handleCepLookup = async (addressId: string) => {
    const targetAddress = addresses.find((item) => item.id === addressId);
    if (!targetAddress) return;

    const normalized = normalizeCep(targetAddress.cep);
    if (normalized.length !== 8) {
      setCepStatusByAddressId((prev) => ({ ...prev, [addressId]: "error" }));
      return;
    }
    setCepStatusByAddressId((prev) => ({ ...prev, [addressId]: "loading" }));
    const result = await fetchAddressByCep(normalized);
    if (!result) {
      setCepStatusByAddressId((prev) => ({ ...prev, [addressId]: "error" }));
      return;
    }
    setAddresses((prev) =>
      prev.map((item) =>
        item.id === addressId
          ? {
              ...item,
              logradouro: result.logradouro,
              bairro: result.bairro,
              cidade: result.cidade,
              estado: result.estado,
            }
          : item
      )
    );
    setCepStatusByAddressId((prev) => ({ ...prev, [addressId]: "success" }));
  };

  const phonesPayload = useMemo(() => {
    return phones
      .filter((phone) => phone.number.trim().length > 0)
      .map((phone) => {
        const normalized = normalizePhone(phone.number);
        return {
          label: phone.label,
          number_raw: normalized.number_raw,
          number_e164: normalized.number_e164,
          is_primary: phone.isPrimary,
          is_whatsapp: phone.isWhatsapp,
        };
      });
  }, [phones]);

  const emailsPayload = useMemo(() => {
    return emails
      .filter((email) => email.email.trim().length > 0)
      .map((email) => ({
        label: email.label,
        email: email.email,
        is_primary: email.isPrimary,
      }));
  }, [emails]);

  const primaryAddress = useMemo(
    () => addresses.find((addressEntry) => addressEntry.isPrimary) ?? addresses[0] ?? null,
    [addresses]
  );

  const addressesPayload = useMemo(() => {
    return addresses
      .filter((addressEntry) =>
        [
          addressEntry.cep,
          addressEntry.logradouro,
          addressEntry.numero,
          addressEntry.complemento,
          addressEntry.bairro,
          addressEntry.cidade,
          addressEntry.estado,
        ].some((value) => value.trim().length > 0)
      )
      .map((addressEntry, index) => ({
        id: addressEntry.id,
        label: addressEntry.label || (index === 0 ? "Principal" : "Outro"),
        is_primary: addressEntry.isPrimary,
        address_cep: addressEntry.cep || null,
        address_logradouro: addressEntry.logradouro || null,
        address_numero: addressEntry.numero || null,
        address_complemento: addressEntry.complemento || null,
        address_bairro: addressEntry.bairro || null,
        address_cidade: addressEntry.cidade || null,
        address_estado: addressEntry.estado || null,
      }));
  }, [addresses]);

  const allergyTags = useMemo(
    () => allergyItems.map((item) => item.label.trim()).filter(Boolean),
    [allergyItems]
  );

  const conditionTags = useMemo(
    () => conditionItems.map((item) => item.label.trim()).filter(Boolean),
    [conditionItems]
  );

  const contraindicationTags = useMemo(
    () => contraindicationItems.map((item) => item.label.trim()).filter(Boolean),
    [contraindicationItems]
  );

  const healthTagsCombined = useMemo(() => {
    const combined = [...allergyTags, ...conditionTags];
    return Array.from(new Set(combined.map((tag) => tag.trim()).filter(Boolean)));
  }, [allergyTags, conditionTags]);

  const healthItemsPayload = useMemo(() => {
    return [
      ...allergyItems.map((item) => ({
        type: "allergy",
        label: item.label.trim(),
        notes: item.notes.trim() || null,
        severity: item.severity,
        is_active: item.isActive,
      })),
      ...conditionItems.map((item) => ({
        type: "condition",
        label: item.label.trim(),
        notes: item.notes.trim() || null,
        severity: item.severity,
        is_active: item.isActive,
      })),
      ...contraindicationItems.map((item) => ({
        type: "contraindication",
        label: item.label.trim(),
        notes: item.notes.trim() || null,
        severity: item.severity,
        is_active: item.isActive,
      })),
    ];
  }, [allergyItems, conditionItems, contraindicationItems]);

  const handleImperativeSubmit = async (event: FormEvent<HTMLFormElement>) => {
    if (submitMode !== "imperative") return;
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData(event.currentTarget);
      const result = await submitActionAction(formData);

      if (result && typeof result === "object" && "ok" in result && !result.ok) {
        showToast(result.error.message ?? "NÃ£o foi possÃ­vel salvar o cadastro do cliente.", "error");
        return;
      }

      showToast("Cadastro do cliente atualizado.", "success");
      const redirectHref = successRedirectHref ?? backHref;
      router.push(redirectHref);
      router.refresh();
    } catch {
      showToast("NÃ£o foi possÃ­vel salvar o cadastro do cliente.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formId = mode === "create" ? "client-create-form" : "client-edit-form";

  return (
    <div className="-mx-4 -mt-4 flex h-full min-h-0 flex-col">
      <header className="z-30 min-h-27 bg-studio-green text-white safe-top safe-top-4 px-5 pb-0 pt-4">
        <div className={appointmentFormScreenHeaderTopRowClass}>
          <Link
            href={backHref}
            className={appointmentFormHeaderIconButtonClass}
            aria-label="Voltar"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate wl-typo-card-name-lg font-bold text-white">{title}</h1>
            <p className="truncate text-xs text-white/80">{subtitle}</p>
          </div>
        </div>
        <div className="border-b border-white/25 pb-1" />
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-4">
        <form
          id={formId}
          action={
            submitMode === "form-action"
              ? (submitActionAction as (formData: FormData) => void | Promise<void>)
              : undefined
          }
          onSubmit={submitMode === "imperative" ? handleImperativeSubmit : undefined}
          className="space-y-6"
        >
          {initialData.clientId ? <input type="hidden" name="clientId" value={initialData.clientId} /> : null}
          <input type="hidden" name="name" value={internalDisplayName} />
          <input type="hidden" name="client_code" value={clientCode.trim()} />
          <input type="hidden" name="public_name" value={publicDisplayName} />
          <input type="hidden" name="system_name" value={internalDisplayName} />
          <input type="hidden" name="short_name" value={shortDisplayName} />
          <input type="hidden" name="public_first_name" value={firstName.trim()} />
          <input type="hidden" name="public_last_name" value={lastName.trim()} />
          <input type="hidden" name="internal_reference" value={reference.trim()} />
          <input type="hidden" name="is_minor" value={isMinor ? "on" : ""} />
          <input
            type="hidden"
            name="is_minor_override"
            value={isMinorOverride === null ? "auto" : isMinorOverride ? "on" : "off"}
          />
          <input type="hidden" name="guardian_relationship" value={guardianRelationship.trim()} />
          <input type="hidden" name="email" value={primaryEmailValue} />
          <input type="hidden" name="phones_json" value={JSON.stringify(phonesPayload)} />
          <input type="hidden" name="emails_json" value={JSON.stringify(emailsPayload)} />
          <input type="hidden" name="addresses_json" value={JSON.stringify(addressesPayload)} />
          <input type="hidden" name="address_cep" value={primaryAddress?.cep ?? ""} />
          <input type="hidden" name="address_logradouro" value={primaryAddress?.logradouro ?? ""} />
          <input type="hidden" name="address_numero" value={primaryAddress?.numero ?? ""} />
          <input type="hidden" name="address_complemento" value={primaryAddress?.complemento ?? ""} />
          <input type="hidden" name="address_bairro" value={primaryAddress?.bairro ?? ""} />
          <input type="hidden" name="address_cidade" value={primaryAddress?.cidade ?? ""} />
          <input type="hidden" name="address_estado" value={primaryAddress?.estado ?? ""} />
          <input type="hidden" name="contraindications" value={contraindicationTags.join(", ")} />
          <input type="hidden" name="health_tags" value={[...healthTagsCombined, ...contraindicationTags].join(", ")} />
          <input type="hidden" name="health_items_json" value={JSON.stringify(healthItemsPayload)} />
          <input type="hidden" name="remove_avatar" value={removeAvatar ? "on" : ""} />
          <p className="text-xs text-muted">Campos com * sao obrigatorios.</p>

          <section className="wl-surface-card overflow-hidden">
            <div className={appointmentFormSectionHeaderPrimaryClass}>
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-studio-green" />
                <h2 className={appointmentFormSectionHeaderTextClass}>Foto de perfil</h2>
              </div>
            </div>
            <div className="px-3 py-3">
              <div className="flex items-center gap-4">
                <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-line bg-studio-light font-serif text-xl text-studio-green">
                  {avatarPreviewUrl ? (
                    <Image src={avatarPreviewUrl} alt="Preview" fill sizes="80px" className="object-cover" unoptimized />
                  ) : (
                    initials
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <label
                    htmlFor="client-avatar-input"
                    className="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-line bg-white px-3 text-sm font-semibold text-studio-text transition hover:bg-paper"
                  >
                    <ImagePlus className="h-4 w-4" />
                    {avatarPreviewUrl ? "Trocar foto" : "Adicionar foto"}
                  </label>
                  <input
                    id="client-avatar-input"
                    type="file"
                    name="avatar"
                    accept="image/*"
                    className="sr-only"
                    onChange={(event) => {
                      const selectedFile = event.target.files?.[0] ?? null;
                      setAvatarFile(selectedFile);
                      setRemoveAvatar(false);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarFile(null);
                      setAvatarPreviewUrl(null);
                      setRemoveAvatar(true);
                    }}
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!avatarPreviewUrl}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remover foto
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="wl-surface-card overflow-hidden">
            <div className={appointmentFormSectionHeaderPrimaryClass}>
                <div className="flex items-center gap-2">
                  <UserRound className="h-4 w-4 text-studio-green" />
                  <h2 className={appointmentFormSectionHeaderTextClass}>Perfil e identificacao</h2>
                </div>
              </div>

            <div className="divide-y divide-line px-3 py-3">
              <div className="pb-3">
                <div className="rounded-xl border border-line bg-studio-light/60 p-3">
                  <div className="mb-2">
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted">Codigo do cliente</label>
                    <input
                      value={clientCode}
                      readOnly
                      placeholder="Gerado automaticamente"
                      className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm font-semibold text-muted"
                    />
                    <p className="mt-1 text-xs text-muted">Gerado automaticamente e nao editavel.</p>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div>
                      <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted">Primeiro nome *</label>
                      <input
                        value={firstName}
                        onChange={(event) => setFirstName(event.target.value)}
                        placeholder="Ex: Renato"
                        className="mt-1 w-full rounded-xl border border-line wl-surface-input px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-studio-green/20"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted">Sobrenome *</label>
                      <input
                        value={lastName}
                        onChange={(event) => setLastName(event.target.value)}
                        placeholder="Sobrenome"
                        className="mt-1 w-full rounded-xl border border-line wl-surface-input px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-studio-green/20"
                        required
                      />
                    </div>
                  </div>

                  <div className="mt-2">
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted">Referencia interna</label>
                    <input
                      value={reference}
                      onChange={(event) => setReference(event.target.value)}
                      placeholder="Referencia (uso interno)"
                      className="mt-1 w-full rounded-xl border border-line wl-surface-input px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-studio-green/20"
                    />
                  </div>

                  <div className="mt-2">
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted">Nome publico</label>
                    <input
                      value={publicName}
                      onChange={(event) => setPublicName(event.target.value)}
                      placeholder="Exibicao em mensagens e telas publicas"
                      className="mt-1 w-full rounded-xl border border-line wl-surface-input px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-studio-green/20"
                    />
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted">Nome curto</p>
                      <p className="mt-1 text-sm font-semibold text-studio-text">
                        {shortDisplayName || "Primeiro nome"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted">Nome no sistema</p>
                      <p className="mt-1 text-sm font-semibold text-studio-text">
                        {internalDisplayName || "Primeiro Nome (Referencia)"}
                      </p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted">Nome publico final</p>
                      <p className="mt-1 text-sm font-semibold text-studio-text">
                        {publicDisplayName || "Primeiro Nome Sobrenome"}
                      </p>
                    </div>
                  </div>
                </div>

                {showSuggestions && (
                  <div className="mt-2 space-y-1 rounded-2xl border border-line bg-white p-2 shadow-soft">
                    {suggestions.map((client) => (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => router.push(`/clientes/${client.id}`)}
                        className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-studio-light"
                      >
                        <span className="font-semibold text-studio-text">{client.name}</span>
                        {client.phone && <span className="ml-2 text-xs text-muted">{client.phone}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted">Data de nascimento</label>
                <input
                  name="data_nascimento"
                  type="date"
                  value={birthDate}
                  onChange={(event) => setBirthDate(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-line wl-surface-input px-4 py-3 text-sm"
                />
              </div>

              <div className="pt-3">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted">CPF (opcional)</label>
                <input
                  name="cpf"
                  value={cpf}
                  onChange={(event) => setCpf(formatCpf(event.target.value))}
                  inputMode="numeric"
                  className="mt-2 w-full rounded-xl border border-line wl-surface-input px-4 py-3 text-sm"
                />
              </div>

            </div>
          </section>

          <NewClientContactChannelsSection
            phones={phones}
            emails={emails}
            createIdAction={createId}
            onChangePhonesAction={setPhones}
            onChangeEmailsAction={setEmails}
            onSetPhonePrimaryAction={handlePhonePrimary}
            onSetPhoneWhatsappAction={handlePhoneWhatsapp}
            onSetEmailPrimaryAction={handleEmailPrimary}
          />

          <NewClientAddressSection
            addresses={addresses}
            cepStatusByAddressId={cepStatusByAddressId}
            onAddAddressAction={handleAddAddress}
            onRemoveAddressAction={handleRemoveAddress}
            onChangeAddressAction={handleChangeAddress}
            onSetPrimaryAddressAction={handleSetPrimaryAddress}
            onLookupCepAction={(addressId) => void handleCepLookup(addressId)}
          />

          <NewClientHealthSection
            allergyItems={allergyItems}
            conditionItems={conditionItems}
            contraindicationItems={contraindicationItems}
            allergyInput={allergyInput}
            conditionInput={conditionInput}
            contraindicationInput={contraindicationInput}
            preferencesNotes={preferencesNotes}
            clinicalHistory={clinicalHistory}
            anamneseUrl={anamneseUrl}
            anamneseFormStatus={anamneseFormStatus}
            anamneseFormSentAt={anamneseFormSentAt}
            anamneseFormAnsweredAt={anamneseFormAnsweredAt}
            onAddAllergyTagAction={() =>
              handleAddClinicalItem(allergyInput, setAllergyItems, () => setAllergyInput(""))
            }
            onRemoveAllergyTagAction={(tag) => handleRemoveClinicalItem(tag, setAllergyItems)}
            onChangeAllergyInputAction={setAllergyInput}
            onAddConditionTagAction={() =>
              handleAddClinicalItem(conditionInput, setConditionItems, () => setConditionInput(""))
            }
            onRemoveConditionTagAction={(tag) => handleRemoveClinicalItem(tag, setConditionItems)}
            onChangeConditionInputAction={setConditionInput}
            onAddContraindicationTagAction={() =>
              handleAddClinicalItem(contraindicationInput, setContraindicationItems, () =>
                setContraindicationInput("")
              )
            }
            onRemoveContraindicationTagAction={(tag) =>
              handleRemoveClinicalItem(tag, setContraindicationItems)
            }
            onChangeContraindicationInputAction={setContraindicationInput}
            onChangeAllergyItemAction={(tag, update) =>
              handleUpdateClinicalItem(tag, setAllergyItems, update)
            }
            onChangeConditionItemAction={(tag, update) =>
              handleUpdateClinicalItem(tag, setConditionItems, update)
            }
            onChangeContraindicationItemAction={(tag, update) =>
              handleUpdateClinicalItem(tag, setContraindicationItems, update)
            }
            onChangePreferencesNotesAction={setPreferencesNotes}
            onChangeClinicalHistoryAction={setClinicalHistory}
            onChangeAnamneseUrlAction={setAnamneseUrl}
            onChangeAnamneseFormStatusAction={setAnamneseFormStatus}
            onChangeAnamneseFormSentAtAction={setAnamneseFormSentAt}
            onChangeAnamneseFormAnsweredAtAction={setAnamneseFormAnsweredAt}
          />

          <NewClientPreferencesSection
            isVip={isVip}
            needsAttention={needsAttention}
            marketingOptIn={marketingOptIn}
            onChangeIsVipAction={setIsVip}
            onChangeNeedsAttentionAction={setNeedsAttention}
            onChangeMarketingOptInAction={setMarketingOptIn}
          />

          <NewClientMinorSection
            isMinor={isMinor}
            guardianName={guardianName}
            guardianPhone={guardianPhone}
            guardianCpf={guardianCpf}
            guardianRelationship={guardianRelationship}
            isMinorAuto={isMinorAuto}
            isMinorOverride={isMinorOverride}
            onChangeGuardianNameAction={setGuardianName}
            onChangeGuardianPhoneAction={setGuardianPhone}
            onChangeGuardianCpfAction={setGuardianCpf}
            onChangeGuardianRelationshipAction={setGuardianRelationship}
            onChangeIsMinorOverrideAction={setIsMinorOverride}
          />

          <NewClientNotesSection
            notes={observacoesGerais}
            onChangeNotesAction={setObservacoesGerais}
          />

          <NewClientExtraDataSection
            profession={profissao}
            referralSource={comoConheceu}
            onChangeProfessionAction={setProfissao}
            onChangeReferralSourceAction={setComoConheceu}
          />
        </form>
      </main>

      <FooterRail
        className="-mx-4"
        surfaceClassName="bg-[rgba(247,242,234,0.96)]"
        paddingXClassName="px-4"
        rowClassName="grid grid-cols-1"
      >
        <button
          type="submit"
          form={formId}
          disabled={isSubmitting}
          className={`${appointmentFormButtonPrimaryClass} w-full`}
        >
          {isSubmitting ? "Salvando..." : submitLabel}
        </button>
      </FooterRail>

      <Toast toast={toast} />
    </div>
  );
}


