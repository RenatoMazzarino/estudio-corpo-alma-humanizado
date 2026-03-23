"use client";

import { useEffect, useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { parsePhoneNumberFromString } from "libphonenumber-js";

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
  appointmentFormScreenHeaderClass,
  appointmentFormScreenHeaderTopRowClass,
} from "../../novo/appointment-form.styles";
import { NewClientAddressSection } from "../novo/components/new-client-address-section";
import { NewClientContactChannelsSection } from "../novo/components/new-client-contact-channels-section";
import { NewClientExtraDataSection } from "../novo/components/new-client-extra-data-section";
import { NewClientHealthSection } from "../novo/components/new-client-health-section";
import { NewClientMinorSection } from "../novo/components/new-client-minor-section";
import { NewClientNotesSection } from "../novo/components/new-client-notes-section";
import { NewClientPreferencesSection } from "../novo/components/new-client-preferences-section";
import type { AddressEntry, EmailEntry, PhoneEntry } from "../novo/components/new-client.types";
import {
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

function syncPrimaryEmail(
  emails: EmailEntry[],
  nextValue: string
): EmailEntry[] {
  if (emails.length === 0) {
    return [{ ...createDefaultEmailEntry(), email: nextValue }];
  }

  let changed = false;
  const next = emails.map((email, index) => {
    if (email.isPrimary || (!changed && index === 0)) {
      changed = true;
      return { ...email, email: nextValue };
    }
    return email;
  });

  return next;
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
  const [reference, setReference] = useState(initialData.reference);
  const [birthDate, setBirthDate] = useState(initialData.birthDate);
  const [cpf, setCpf] = useState(initialData.cpf);
  const [isVip, setIsVip] = useState(initialData.isVip);
  const [needsAttention, setNeedsAttention] = useState(initialData.needsAttention);
  const [marketingOptIn, setMarketingOptIn] = useState(initialData.marketingOptIn);
  const [isMinor, setIsMinor] = useState(initialData.isMinor);
  const [guardianName, setGuardianName] = useState(initialData.guardianName);
  const [guardianPhone, setGuardianPhone] = useState(initialData.guardianPhone);
  const [guardianCpf, setGuardianCpf] = useState(initialData.guardianCpf);
  const [preferencesNotes, setPreferencesNotes] = useState(initialData.preferencesNotes);
  const [contraindications, setContraindications] = useState(initialData.contraindications);
  const [clinicalHistory, setClinicalHistory] = useState(initialData.clinicalHistory);
  const [anamneseUrl, setAnamneseUrl] = useState(initialData.anamneseUrl);
  const [observacoesGerais, setObservacoesGerais] = useState(initialData.observacoesGerais);
  const [profissao, setProfissao] = useState(initialData.profissao);
  const [comoConheceu, setComoConheceu] = useState(initialData.comoConheceu);
  const [allergyTags, setAllergyTags] = useState<string[]>(initialData.allergyTags);
  const [conditionTags, setConditionTags] = useState<string[]>(initialData.conditionTags);
  const [allergyInput, setAllergyInput] = useState("");
  const [conditionInput, setConditionInput] = useState("");
  const [phones, setPhones] = useState<PhoneEntry[]>(initialData.phones.length > 0 ? initialData.phones : [createDefaultPhoneEntry()]);
  const [emails, setEmails] = useState<EmailEntry[]>(initialData.emails.length > 0 ? initialData.emails : [createDefaultEmailEntry()]);
  const [address, setAddress] = useState<AddressEntry>(initialData.address);
  const [cepStatus, setCepStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(initialData.avatarUrl);
  const [suggestions, setSuggestions] = useState<ClientSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const internalDisplayName = useMemo(
    () => composeInternalClientName(firstName.trim(), lastName.trim(), reference.trim() || null),
    [firstName, lastName, reference]
  );

  const publicDisplayName = useMemo(
    () => [firstName.trim(), lastName.trim()].filter(Boolean).join(" "),
    [firstName, lastName]
  );

  const initials = useMemo(() => {
    if (!internalDisplayName.trim()) return "CA";
    return internalDisplayName.trim().slice(0, 2).toUpperCase();
  }, [internalDisplayName]);

  const primaryEmailValue = useMemo(
    () => emails.find((email) => email.isPrimary)?.email ?? emails[0]?.email ?? "",
    [emails]
  );

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreviewUrl(initialData.avatarUrl);
      return;
    }

    const objectUrl = URL.createObjectURL(avatarFile);
    setAvatarPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [avatarFile, initialData.avatarUrl]);

  useEffect(() => {
    if (!searchClientsByNameAction || mode !== "create") {
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
  }, [internalDisplayName, mode, searchClientsByNameAction]);

  const handleAddTag = (value: string, setTags: Dispatch<SetStateAction<string[]>>, clear: () => void) => {
    const next = value.trim();
    if (!next) return;
    setTags((prev) => (prev.includes(next) ? prev : [...prev, next]));
    clear();
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

  const handleCepLookup = async () => {
    const normalized = normalizeCep(address.cep);
    if (normalized.length !== 8) {
      setCepStatus("error");
      return;
    }
    setCepStatus("loading");
    const result = await fetchAddressByCep(normalized);
    if (!result) {
      setCepStatus("error");
      return;
    }
    setAddress((prev) => ({
      ...prev,
      logradouro: result.logradouro,
      bairro: result.bairro,
      cidade: result.cidade,
      estado: result.estado,
    }));
    setCepStatus("success");
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

  const addressesPayload = useMemo(() => {
    const hasData = [
      address.cep,
      address.logradouro,
      address.numero,
      address.complemento,
      address.bairro,
      address.cidade,
      address.estado,
    ].some((value) => value.trim().length > 0);

    if (!hasData) return [];

    return [
      {
        label: address.label,
        is_primary: true,
        address_cep: address.cep || null,
        address_logradouro: address.logradouro || null,
        address_numero: address.numero || null,
        address_complemento: address.complemento || null,
        address_bairro: address.bairro || null,
        address_cidade: address.cidade || null,
        address_estado: address.estado || null,
      },
    ];
  }, [address]);

  const healthTagsCombined = useMemo(() => {
    const combined = [...allergyTags, ...conditionTags];
    return Array.from(new Set(combined.map((tag) => tag.trim()).filter(Boolean)));
  }, [allergyTags, conditionTags]);

  const healthItemsPayload = useMemo(() => {
    return [
      ...allergyTags.map((tag) => ({ type: "allergy", label: tag })),
      ...conditionTags.map((tag) => ({ type: "condition", label: tag })),
    ];
  }, [allergyTags, conditionTags]);

  const handleImperativeSubmit = async (event: FormEvent<HTMLFormElement>) => {
    if (submitMode !== "imperative") return;
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData(event.currentTarget);
      const result = await submitActionAction(formData);

      if (result && typeof result === "object" && "ok" in result && !result.ok) {
        showToast(result.error.message ?? "Não foi possível salvar o cadastro do cliente.", "error");
        return;
      }

      showToast("Cadastro do cliente atualizado.", "success");
      const redirectHref = successRedirectHref ?? backHref;
      router.push(redirectHref);
      router.refresh();
    } catch {
      showToast("Não foi possível salvar o cadastro do cliente.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="-mx-4 -mt-4 h-full min-h-0">
      <header className={appointmentFormScreenHeaderClass}>
        <div className={appointmentFormScreenHeaderTopRowClass}>
          <Link href={backHref} className={appointmentFormHeaderIconButtonClass} aria-label="Voltar">
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate wl-typo-card-name-lg font-bold text-white">{title}</h1>
            <p className="truncate text-xs text-white/80">{subtitle}</p>
          </div>
        </div>
        <div className="border-b border-white/25 pb-1" />
      </header>

      <main className="min-h-0 overflow-y-auto px-4 pb-28 pt-4">
        <form
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
          <input type="hidden" name="public_first_name" value={firstName.trim()} />
          <input type="hidden" name="public_last_name" value={lastName.trim()} />
          <input type="hidden" name="internal_reference" value={reference.trim()} />
          <input type="hidden" name="email" value={primaryEmailValue} />
          <input type="hidden" name="phones_json" value={JSON.stringify(phonesPayload)} />
          <input type="hidden" name="emails_json" value={JSON.stringify(emailsPayload)} />
          <input type="hidden" name="addresses_json" value={JSON.stringify(addressesPayload)} />
          <input type="hidden" name="health_tags" value={healthTagsCombined.join(", ")} />
          <input type="hidden" name="health_items_json" value={JSON.stringify(healthItemsPayload)} />

          <section className="wl-surface-card space-y-4 overflow-hidden px-3 py-3">
            <div className="-mx-3 -mt-3 mb-1 flex h-12 items-center border-b border-line px-3 wl-surface-card-header">
              <h2 className="wl-typo-card-name-md font-bold text-studio-text">Dados principais</h2>
            </div>

            <div className="flex items-center gap-4">
              <label className="relative flex h-20 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-studio-light font-serif text-xl text-studio-green">
                {avatarPreviewUrl ? (
                  <Image src={avatarPreviewUrl} alt="Preview" fill sizes="80px" className="object-cover" unoptimized />
                ) : (
                  initials
                )}
                <input
                  type="file"
                  name="avatar"
                  accept="image/*"
                  className="absolute inset-0 cursor-pointer opacity-0"
                  onChange={(event) => setAvatarFile(event.target.files?.[0] ?? null)}
                />
              </label>
              <div className="flex-1">
                <label className="text-xs font-extrabold uppercase tracking-widest text-muted">Primeiro nome</label>
                <input
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  placeholder="Ex: Renato"
                  className="mt-2 w-full rounded-xl border border-line wl-surface-input px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-studio-green/20"
                  required
                />
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <input
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    placeholder="Sobrenome"
                    className="w-full rounded-xl border border-line wl-surface-input px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-studio-green/20"
                    required
                  />
                  <input
                    value={reference}
                    onChange={(event) => setReference(event.target.value)}
                    placeholder="Referência (uso interno)"
                    className="w-full rounded-xl border border-line wl-surface-input px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-studio-green/20"
                  />
                </div>
                <div className="mt-2 rounded-xl border border-line wl-surface-card-body px-3 py-2">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted">
                    Nome no sistema
                  </p>
                  <p className="mt-1 text-sm font-semibold text-studio-text">
                    {internalDisplayName || "Primeiro Nome (Referência)"}
                  </p>
                  <p className="mt-2 text-[10px] text-muted">Nome público (mensagens/telas públicas)</p>
                  <p className="text-sm font-semibold text-studio-text">
                    {publicDisplayName || "Primeiro Nome Sobrenome"}
                  </p>
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
                {mode === "create" ? (
                  <p className="mt-2 text-[11px] text-muted">
                    Se já existir, escolha na lista para evitar duplicidade.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted">Data de nascimento</label>
                <input
                  name="data_nascimento"
                  type="date"
                  value={birthDate}
                  onChange={(event) => setBirthDate(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-line wl-surface-input px-4 py-3 text-sm"
                />
              </div>
              <div>
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

            <div>
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted">Email principal</label>
              <input
                value={primaryEmailValue}
                onChange={(event) => setEmails((current) => syncPrimaryEmail(current, event.target.value))}
                placeholder="cliente@email.com"
                className="mt-2 w-full rounded-xl border border-line wl-surface-input px-4 py-3 text-sm"
              />
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
            address={address}
            cepStatus={cepStatus}
            onChangeAddressAction={setAddress}
            onLookupCepAction={() => void handleCepLookup()}
          />

          <NewClientHealthSection
            allergyTags={allergyTags}
            conditionTags={conditionTags}
            allergyInput={allergyInput}
            conditionInput={conditionInput}
            contraindications={contraindications}
            preferencesNotes={preferencesNotes}
            clinicalHistory={clinicalHistory}
            anamneseUrl={anamneseUrl}
            onAddAllergyTagAction={() => handleAddTag(allergyInput, setAllergyTags, () => setAllergyInput(""))}
            onRemoveAllergyTagAction={(tag) =>
              setAllergyTags((prev) => prev.filter((item) => item !== tag))
            }
            onChangeAllergyInputAction={setAllergyInput}
            onAddConditionTagAction={() =>
              handleAddTag(conditionInput, setConditionTags, () => setConditionInput(""))
            }
            onRemoveConditionTagAction={(tag) =>
              setConditionTags((prev) => prev.filter((item) => item !== tag))
            }
            onChangeConditionInputAction={setConditionInput}
            onChangeContraindicationsAction={setContraindications}
            onChangePreferencesNotesAction={setPreferencesNotes}
            onChangeClinicalHistoryAction={setClinicalHistory}
            onChangeAnamneseUrlAction={setAnamneseUrl}
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
            onChangeIsMinorAction={setIsMinor}
            onChangeGuardianNameAction={setGuardianName}
            onChangeGuardianPhoneAction={setGuardianPhone}
            onChangeGuardianCpfAction={setGuardianCpf}
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

          <button
            type="submit"
            disabled={isSubmitting}
            className={`${appointmentFormButtonPrimaryClass} w-full`}
          >
            {isSubmitting ? "Salvando..." : submitLabel}
          </button>
        </form>
      </main>

      <Toast toast={toast} />
    </div>
  );
}

