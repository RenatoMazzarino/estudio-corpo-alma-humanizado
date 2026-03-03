"use client";

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { AppHeader } from "../../../../components/ui/app-header";
import { createClientAction, searchClientsByName } from "./actions";
import { NewClientContactChannelsSection } from "./components/new-client-contact-channels-section";
import { NewClientAddressSection } from "./components/new-client-address-section";
import { NewClientHealthSection } from "./components/new-client-health-section";
import { NewClientPreferencesSection } from "./components/new-client-preferences-section";
import { NewClientMinorSection } from "./components/new-client-minor-section";
import { NewClientNotesSection } from "./components/new-client-notes-section";
import { NewClientExtraDataSection } from "./components/new-client-extra-data-section";
import type { AddressEntry, EmailEntry, PhoneEntry } from "./components/new-client.types";
import { fetchAddressByCep, normalizeCep } from "../../../../src/shared/address/cep";
import { formatCpf } from "../../../../src/shared/cpf";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import {
  composeInternalClientName,
} from "../../../../src/modules/clients/name-profile";

interface ClientSuggestion {
  id: string;
  name: string;
  phone: string | null;
}

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

export default function NewClientPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [reference, setReference] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [cpf, setCpf] = useState("");
  const [emailField, setEmailField] = useState("");
  const [isVip, setIsVip] = useState(false);
  const [needsAttention, setNeedsAttention] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [isMinor, setIsMinor] = useState(false);
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [guardianCpf, setGuardianCpf] = useState("");
  const [preferencesNotes, setPreferencesNotes] = useState("");
  const [contraindications, setContraindications] = useState("");
  const [clinicalHistory, setClinicalHistory] = useState("");
  const [anamneseUrl, setAnamneseUrl] = useState("");
  const [observacoesGerais, setObservacoesGerais] = useState("");
  const [profissao, setProfissao] = useState("");
  const [comoConheceu, setComoConheceu] = useState("");
  const [allergyTags, setAllergyTags] = useState<string[]>([]);
  const [conditionTags, setConditionTags] = useState<string[]>([]);
  const [allergyInput, setAllergyInput] = useState("");
  const [conditionInput, setConditionInput] = useState("");
  const [phones, setPhones] = useState<PhoneEntry[]>([
    { id: createId(), label: "Principal", number: "", isPrimary: true, isWhatsapp: true },
  ]);
  const [emails, setEmails] = useState<EmailEntry[]>([
    { id: createId(), label: "Principal", email: "", isPrimary: true },
  ]);
  const [address, setAddress] = useState<AddressEntry>({
    label: "Principal",
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
  });
  const [cepStatus, setCepStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [suggestions, setSuggestions] = useState<ClientSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const internalDisplayName = useMemo(
    () => composeInternalClientName(firstName.trim(), lastName.trim(), reference.trim() || null),
    [firstName, lastName, reference]
  );
  const publicDisplayName = useMemo(
    () => [firstName.trim(), lastName.trim()].filter(Boolean).join(" "),
    [firstName, lastName]
  );
  const avatarPreview = useMemo(() => {
    if (!avatarFile) return null;
    return URL.createObjectURL(avatarFile);
  }, [avatarFile]);

  useEffect(() => {
    if (!internalDisplayName.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const handle = setTimeout(async () => {
      const result = await searchClientsByName(internalDisplayName.trim());
      setSuggestions(result.data ?? []);
      setShowSuggestions((result.data?.length ?? 0) > 0);
    }, 300);

    return () => clearTimeout(handle);
  }, [internalDisplayName]);

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

  const initials = useMemo(() => {
    if (!internalDisplayName.trim()) return "CA";
    return internalDisplayName.trim().slice(0, 2).toUpperCase();
  }, [internalDisplayName]);

  return (
    <div className="-mx-4 -mt-4">
      <AppHeader
        label="Clientes"
        title="Novo Cliente"
        subtitle="Cadastre o cliente e mantenha o histórico sempre atualizado."
        leftSlot={
          <Link
            href="/clientes"
            className="w-10 h-10 rounded-full bg-studio-light text-studio-green flex items-center justify-center hover:bg-studio-green hover:text-white transition"
            aria-label="Voltar"
          >
            <ChevronLeft size={20} />
          </Link>
        }
      />

      <main className="p-6 pb-28">
        <form action={createClientAction} className="space-y-6">
          <input type="hidden" name="name" value={internalDisplayName} />
          <input type="hidden" name="public_first_name" value={firstName.trim()} />
          <input type="hidden" name="public_last_name" value={lastName.trim()} />
          <input type="hidden" name="internal_reference" value={reference.trim()} />
          <input type="hidden" name="phones_json" value={JSON.stringify(phonesPayload)} />
          <input type="hidden" name="emails_json" value={JSON.stringify(emailsPayload)} />
          <input type="hidden" name="addresses_json" value={JSON.stringify(addressesPayload)} />
          <input type="hidden" name="health_tags" value={healthTagsCombined.join(", ")} />
          <input type="hidden" name="health_items_json" value={JSON.stringify(healthItemsPayload)} />

          <section className="bg-white rounded-3xl shadow-soft p-5 border border-white space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted">Cliente</p>
                <h2 className="text-lg font-serif text-studio-text">Dados principais</h2>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="relative w-20 h-20 rounded-full bg-studio-light flex items-center justify-center text-studio-green font-serif text-xl cursor-pointer overflow-hidden">
                {avatarPreview ? (
                  <Image src={avatarPreview} alt="Preview" fill sizes="80px" className="object-cover" />
                ) : (
                  initials
                )}
                <input
                  type="file"
                  name="avatar"
                  accept="image/*"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={(event) => setAvatarFile(event.target.files?.[0] ?? null)}
                />
              </label>
              <div className="flex-1">
                <label className="text-xs font-extrabold text-muted uppercase tracking-widest">Primeiro nome</label>
                <input
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  placeholder="Ex: Renato"
                  className="w-full mt-2 px-4 py-3 rounded-2xl bg-paper border border-line focus:outline-none focus:ring-2 focus:ring-studio-green/20 text-sm font-semibold"
                  required
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  <input
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    placeholder="Sobrenome"
                    className="w-full px-4 py-3 rounded-2xl bg-paper border border-line focus:outline-none focus:ring-2 focus:ring-studio-green/20 text-sm font-semibold"
                    required
                  />
                  <input
                    value={reference}
                    onChange={(event) => setReference(event.target.value)}
                    placeholder="Referência (uso interno)"
                    className="w-full px-4 py-3 rounded-2xl bg-paper border border-line focus:outline-none focus:ring-2 focus:ring-studio-green/20 text-sm font-semibold"
                  />
                </div>
                <div className="mt-2 rounded-2xl bg-studio-light border border-line px-3 py-2">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted">
                    Nome no sistema
                  </p>
                  <p className="text-sm font-semibold text-studio-text mt-1">
                    {internalDisplayName || "Primeiro Nome (Referência)"}
                  </p>
                  <p className="text-[10px] text-muted mt-2">Nome público (mensagens/telas públicas)</p>
                  <p className="text-sm font-semibold text-studio-text">
                    {publicDisplayName || "Primeiro Nome Sobrenome"}
                  </p>
                </div>
                {showSuggestions && (
                  <div className="mt-2 bg-white border border-line rounded-2xl shadow-soft p-2 space-y-1">
                    {suggestions.map((client) => (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => router.push(`/clientes/${client.id}`)}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-studio-light text-sm"
                      >
                        <span className="font-semibold text-studio-text">{client.name}</span>
                        {client.phone && <span className="ml-2 text-xs text-muted">{client.phone}</span>}
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-muted mt-2">
                  Se já existir, escolha na lista para evitar duplicidade.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-extrabold text-muted uppercase tracking-widest">Data de nascimento</label>
                <input
                  name="data_nascimento"
                  type="date"
                  value={birthDate}
                  onChange={(event) => setBirthDate(event.target.value)}
                  className="mt-2 w-full px-4 py-3 rounded-2xl bg-paper border border-line text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] font-extrabold text-muted uppercase tracking-widest">CPF (opcional)</label>
                <input
                  name="cpf"
                  value={cpf}
                  onChange={(event) => setCpf(formatCpf(event.target.value))}
                  inputMode="numeric"
                  className="mt-2 w-full px-4 py-3 rounded-2xl bg-paper border border-line text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-extrabold text-muted uppercase tracking-widest">Email principal</label>
              <input
                name="email"
                value={emailField}
                onChange={(event) => setEmailField(event.target.value)}
                placeholder="cliente@email.com"
                className="mt-2 w-full px-4 py-3 rounded-2xl bg-paper border border-line text-sm"
              />
            </div>
          </section>

          <NewClientContactChannelsSection
            phones={phones}
            emails={emails}
            createId={createId}
            onChangePhones={setPhones}
            onChangeEmails={setEmails}
            onSetPhonePrimary={handlePhonePrimary}
            onSetPhoneWhatsapp={handlePhoneWhatsapp}
            onSetEmailPrimary={handleEmailPrimary}
          />
          <NewClientAddressSection
            address={address}
            cepStatus={cepStatus}
            onChangeAddress={setAddress}
            onLookupCep={() => void handleCepLookup()}
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
            onAddAllergyTag={() => handleAddTag(allergyInput, setAllergyTags, () => setAllergyInput(""))}
            onRemoveAllergyTag={(tag) =>
              setAllergyTags((prev) => prev.filter((item) => item !== tag))
            }
            onChangeAllergyInput={setAllergyInput}
            onAddConditionTag={() =>
              handleAddTag(conditionInput, setConditionTags, () => setConditionInput(""))
            }
            onRemoveConditionTag={(tag) =>
              setConditionTags((prev) => prev.filter((item) => item !== tag))
            }
            onChangeConditionInput={setConditionInput}
            onChangeContraindications={setContraindications}
            onChangePreferencesNotes={setPreferencesNotes}
            onChangeClinicalHistory={setClinicalHistory}
            onChangeAnamneseUrl={setAnamneseUrl}
          />
          <NewClientPreferencesSection
            isVip={isVip}
            needsAttention={needsAttention}
            marketingOptIn={marketingOptIn}
            onChangeIsVip={setIsVip}
            onChangeNeedsAttention={setNeedsAttention}
            onChangeMarketingOptIn={setMarketingOptIn}
          />
          <NewClientMinorSection
            isMinor={isMinor}
            guardianName={guardianName}
            guardianPhone={guardianPhone}
            guardianCpf={guardianCpf}
            onChangeIsMinor={setIsMinor}
            onChangeGuardianName={setGuardianName}
            onChangeGuardianPhone={setGuardianPhone}
            onChangeGuardianCpf={setGuardianCpf}
          />
          <NewClientNotesSection notes={observacoesGerais} onChangeNotes={setObservacoesGerais} />
          <NewClientExtraDataSection
            profession={profissao}
            referralSource={comoConheceu}
            onChangeProfession={setProfissao}
            onChangeReferralSource={setComoConheceu}
          />

          <button
            type="submit"
            className="w-full py-4 rounded-2xl bg-studio-green text-white font-extrabold shadow-soft"
          >
            Salvar cliente
          </button>
        </form>
      </main>
    </div>
  );
}
