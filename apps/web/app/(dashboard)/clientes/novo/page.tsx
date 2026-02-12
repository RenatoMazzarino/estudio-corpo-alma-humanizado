"use client";

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronLeft, Phone, Mail, Plus, Trash2 } from "lucide-react";
import { AppHeader } from "../../../../components/ui/app-header";
import { createClientAction, searchClientsByName } from "./actions";
import { fetchAddressByCep, normalizeCep } from "../../../../src/shared/address/cep";
import { formatBrazilPhone } from "../../../../src/shared/phone";
import { parsePhoneNumberFromString } from "libphonenumber-js";

interface ClientSuggestion {
  id: string;
  name: string;
  phone: string | null;
}

interface PhoneEntry {
  id: string;
  label: string;
  number: string;
  isPrimary: boolean;
  isWhatsapp: boolean;
}

interface EmailEntry {
  id: string;
  label: string;
  email: string;
  isPrimary: boolean;
}

interface AddressEntry {
  label: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
}

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

function formatCpf(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function formatCep(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.replace(/^(\d{5})(\d)/, "$1-$2");
}

function normalizePhone(raw: string) {
  const parsed = parsePhoneNumberFromString(raw, "BR");
  return {
    number_raw: raw,
    number_e164: parsed?.isValid() ? parsed.format("E.164") : null,
  };
}

export default function NewClientPage() {
  const router = useRouter();
  const [name, setName] = useState("");
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
  const [extraData] = useState<Record<string, unknown>>({});
  const [suggestions, setSuggestions] = useState<ClientSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const avatarPreview = useMemo(() => {
    if (!avatarFile) return null;
    return URL.createObjectURL(avatarFile);
  }, [avatarFile]);

  useEffect(() => {
    if (!name.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const handle = setTimeout(async () => {
      const result = await searchClientsByName(name.trim());
      setSuggestions(result.data ?? []);
      setShowSuggestions((result.data?.length ?? 0) > 0);
    }, 300);

    return () => clearTimeout(handle);
  }, [name]);

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
    if (!name.trim()) return "CA";
    return name.trim().slice(0, 2).toUpperCase();
  }, [name]);

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
          <input type="hidden" name="phones_json" value={JSON.stringify(phonesPayload)} />
          <input type="hidden" name="emails_json" value={JSON.stringify(emailsPayload)} />
          <input type="hidden" name="addresses_json" value={JSON.stringify(addressesPayload)} />
          <input type="hidden" name="extra_data_json" value={JSON.stringify(extraData)} />
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
                <label className="text-xs font-extrabold text-muted uppercase tracking-widest">Nome completo</label>
                <input
                  name="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Digite o nome"
                  className="w-full mt-2 px-4 py-3 rounded-2xl bg-paper border border-line focus:outline-none focus:ring-2 focus:ring-studio-green/20 text-sm font-semibold"
                  required
                />
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

          <section className="bg-white rounded-3xl shadow-soft p-5 border border-white space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted">Contato</p>
                <h2 className="text-lg font-serif text-studio-text">Telefones</h2>
              </div>
              <button
                type="button"
                onClick={() =>
                  setPhones((prev) => [
                    ...prev,
                    { id: createId(), label: "Outro", number: "", isPrimary: false, isWhatsapp: false },
                  ])
                }
                className="w-9 h-9 rounded-full bg-studio-light text-studio-green flex items-center justify-center"
                aria-label="Adicionar telefone"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {phones.map((phone) => (
              <div key={phone.id} className="border border-line rounded-2xl p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted" />
                  <input
                    value={phone.number}
                    onChange={(event) =>
                      setPhones((prev) =>
                        prev.map((item) =>
                          item.id === phone.id
                            ? { ...item, number: formatBrazilPhone(event.target.value) }
                            : item
                        )
                      )
                    }
                    placeholder="(00) 00000-0000"
                    inputMode="numeric"
                    className="flex-1 px-3 py-2 rounded-xl bg-paper border border-line text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setPhones((prev) => prev.filter((item) => item.id !== phone.id))}
                    className="text-muted hover:text-danger"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    value={phone.label}
                    onChange={(event) =>
                      setPhones((prev) =>
                        prev.map((item) =>
                          item.id === phone.id ? { ...item, label: event.target.value } : item
                        )
                      )
                    }
                    placeholder="Etiqueta"
                    className="flex-1 px-3 py-2 rounded-xl bg-paper border border-line text-[11px]"
                  />
                  <button
                    type="button"
                    onClick={() => handlePhonePrimary(phone.id)}
                    className={`px-3 py-2 rounded-xl text-[11px] font-extrabold uppercase tracking-widest border ${
                      phone.isPrimary
                        ? "bg-studio-green text-white border-studio-green"
                        : "bg-white text-muted border-line"
                    }`}
                  >
                    Principal
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePhoneWhatsapp(phone.id)}
                    className={`px-3 py-2 rounded-xl text-[11px] font-extrabold uppercase tracking-widest border ${
                      phone.isWhatsapp
                        ? "bg-studio-green text-white border-studio-green"
                        : "bg-white text-muted border-line"
                    }`}
                  >
                    WhatsApp
                  </button>
                </div>
              </div>
            ))}
          </section>

          <section className="bg-white rounded-3xl shadow-soft p-5 border border-white space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted">Contato</p>
                <h2 className="text-lg font-serif text-studio-text">Emails</h2>
              </div>
              <button
                type="button"
                onClick={() =>
                  setEmails((prev) => [
                    ...prev,
                    { id: createId(), label: "Outro", email: "", isPrimary: false },
                  ])
                }
                className="w-9 h-9 rounded-full bg-studio-light text-studio-green flex items-center justify-center"
                aria-label="Adicionar email"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {emails.map((email) => (
              <div key={email.id} className="border border-line rounded-2xl p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted" />
                  <input
                    value={email.email}
                    onChange={(event) =>
                      setEmails((prev) =>
                        prev.map((item) =>
                          item.id === email.id ? { ...item, email: event.target.value } : item
                        )
                      )
                    }
                    placeholder="email@cliente.com"
                    className="flex-1 px-3 py-2 rounded-xl bg-paper border border-line text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setEmails((prev) => prev.filter((item) => item.id !== email.id))}
                    className="text-muted hover:text-danger"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    value={email.label}
                    onChange={(event) =>
                      setEmails((prev) =>
                        prev.map((item) =>
                          item.id === email.id ? { ...item, label: event.target.value } : item
                        )
                      )
                    }
                    placeholder="Etiqueta"
                    className="flex-1 px-3 py-2 rounded-xl bg-paper border border-line text-[11px]"
                  />
                  <button
                    type="button"
                    onClick={() => handleEmailPrimary(email.id)}
                    className={`px-3 py-2 rounded-xl text-[11px] font-extrabold uppercase tracking-widest border ${
                      email.isPrimary
                        ? "bg-studio-green text-white border-studio-green"
                        : "bg-white text-muted border-line"
                    }`}
                  >
                    Principal
                  </button>
                </div>
              </div>
            ))}
          </section>

          <section className="bg-white rounded-3xl shadow-soft p-5 border border-white space-y-4">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted">Endereço</p>
              <h2 className="text-lg font-serif text-studio-text">Principal</h2>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="text-[10px] font-extrabold text-muted uppercase tracking-widest">CEP</label>
                <input
                  name="address_cep"
                  value={address.cep}
                  onChange={(event) => setAddress((prev) => ({ ...prev, cep: formatCep(event.target.value) }))}
                  inputMode="numeric"
                  className="mt-2 w-full px-4 py-3 rounded-2xl bg-paper border border-line text-sm"
                />
              </div>
              <button
                type="button"
                onClick={handleCepLookup}
                className="mt-6 h-11.5 rounded-2xl bg-studio-light text-studio-green font-extrabold text-xs border border-studio-green/10"
              >
                {cepStatus === "loading" ? "Buscando" : "Buscar"}
              </button>
            </div>

            <input
              name="address_logradouro"
              value={address.logradouro}
              onChange={(event) => setAddress((prev) => ({ ...prev, logradouro: event.target.value }))}
              placeholder="Rua / Avenida"
              className="w-full px-4 py-3 rounded-2xl bg-paper border border-line text-sm"
            />

            <div className="grid grid-cols-3 gap-3">
              <input
                name="address_numero"
                value={address.numero}
                onChange={(event) => setAddress((prev) => ({ ...prev, numero: event.target.value }))}
                placeholder="Número"
                className="w-full px-4 py-3 rounded-2xl bg-paper border border-line text-sm"
              />
              <input
                name="address_complemento"
                value={address.complemento}
                onChange={(event) => setAddress((prev) => ({ ...prev, complemento: event.target.value }))}
                placeholder="Complemento"
                className="col-span-2 w-full px-4 py-3 rounded-2xl bg-paper border border-line text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input
                name="address_bairro"
                value={address.bairro}
                onChange={(event) => setAddress((prev) => ({ ...prev, bairro: event.target.value }))}
                placeholder="Bairro"
                className="w-full px-4 py-3 rounded-2xl bg-paper border border-line text-sm"
              />
              <input
                name="address_cidade"
                value={address.cidade}
                onChange={(event) => setAddress((prev) => ({ ...prev, cidade: event.target.value }))}
                placeholder="Cidade"
                className="w-full px-4 py-3 rounded-2xl bg-paper border border-line text-sm"
              />
            </div>

            <input
              name="address_estado"
              value={address.estado}
              onChange={(event) => setAddress((prev) => ({ ...prev, estado: event.target.value.toUpperCase() }))}
              placeholder="UF"
              className="w-full px-4 py-3 rounded-2xl bg-paper border border-line text-sm uppercase"
            />
          </section>

          <section className="bg-white rounded-3xl shadow-soft p-5 border border-white space-y-4">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted">Saúde & Cuidados</p>
              <h2 className="text-lg font-serif text-studio-text">Tags e informações</h2>
            </div>

            <div>
              <label className="text-[10px] font-extrabold text-muted uppercase tracking-widest">Alergias</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {allergyTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setAllergyTags((prev) => prev.filter((item) => item !== tag))}
                    className="px-3 py-1 rounded-full bg-red-50 text-red-600 text-[11px] font-extrabold border border-red-100"
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <input
                value={allergyInput}
                onChange={(event) => setAllergyInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleAddTag(allergyInput, setAllergyTags, () => setAllergyInput(""));
                  }
                }}
                placeholder="Adicionar alergia e pressione Enter"
                className="mt-2 w-full px-4 py-3 rounded-2xl bg-paper border border-line text-sm"
              />
            </div>

            <div>
              <label className="text-[10px] font-extrabold text-muted uppercase tracking-widest">Condições & Atenções</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {conditionTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setConditionTags((prev) => prev.filter((item) => item !== tag))}
                    className="px-3 py-1 rounded-full bg-orange-50 text-orange-600 text-[11px] font-extrabold border border-orange-100"
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <input
                value={conditionInput}
                onChange={(event) => setConditionInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleAddTag(conditionInput, setConditionTags, () => setConditionInput(""));
                  }
                }}
                placeholder="Adicionar condição e pressione Enter"
                className="mt-2 w-full px-4 py-3 rounded-2xl bg-paper border border-line text-sm"
              />
            </div>

            <textarea
              name="contraindications"
              value={contraindications}
              onChange={(event) => setContraindications(event.target.value)}
              placeholder="Contraindicações"
              rows={3}
              className="w-full px-4 py-3 rounded-2xl bg-paper border border-line text-sm"
            />

            <textarea
              name="preferences_notes"
              value={preferencesNotes}
              onChange={(event) => setPreferencesNotes(event.target.value)}
              placeholder="Preferências"
              rows={3}
              className="w-full px-4 py-3 rounded-2xl bg-paper border border-line text-sm"
            />

            <textarea
              name="clinical_history"
              value={clinicalHistory}
              onChange={(event) => setClinicalHistory(event.target.value)}
              placeholder="Histórico clínico / anamnese"
              rows={3}
              className="w-full px-4 py-3 rounded-2xl bg-paper border border-line text-sm"
            />

            <input
              name="anamnese_url"
              value={anamneseUrl}
              onChange={(event) => setAnamneseUrl(event.target.value)}
              placeholder="Link da anamnese (opcional)"
              className="w-full px-4 py-3 rounded-2xl bg-paper border border-line text-sm"
            />
          </section>

          <section className="bg-white rounded-3xl shadow-soft p-5 border border-white space-y-4">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted">Sinalizações</p>
              <h2 className="text-lg font-serif text-studio-text">Preferências do atendimento</h2>
            </div>

            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 text-xs font-extrabold text-studio-text">
                <input
                  type="checkbox"
                  name="is_vip"
                  checked={isVip}
                  onChange={(event) => setIsVip(event.target.checked)}
                  className="w-4 h-4"
                />
                VIP
              </label>
              <label className="flex items-center gap-2 text-xs font-extrabold text-studio-text">
                <input
                  type="checkbox"
                  name="needs_attention"
                  checked={needsAttention}
                  onChange={(event) => setNeedsAttention(event.target.checked)}
                  className="w-4 h-4"
                />
                Atenção
              </label>
              <label className="flex items-center gap-2 text-xs font-extrabold text-studio-text">
                <input
                  type="checkbox"
                  name="marketing_opt_in"
                  checked={marketingOptIn}
                  onChange={(event) => setMarketingOptIn(event.target.checked)}
                  className="w-4 h-4"
                />
                Aceita novidades
              </label>
            </div>
          </section>

          <section className="bg-white rounded-3xl shadow-soft p-5 border border-white space-y-4">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted">Menor de idade</p>
              <h2 className="text-lg font-serif text-studio-text">Responsável</h2>
            </div>

            <label className="flex items-center gap-2 text-xs font-extrabold text-studio-text">
              <input
                type="checkbox"
                name="is_minor"
                checked={isMinor}
                onChange={(event) => setIsMinor(event.target.checked)}
                className="w-4 h-4"
              />
              Cliente é menor de idade
            </label>

            {isMinor && (
              <div className="space-y-3">
                <input
                  name="guardian_name"
                  value={guardianName}
                  onChange={(event) => setGuardianName(event.target.value)}
                  placeholder="Nome do responsável"
                  className="w-full px-4 py-3 rounded-2xl bg-paper border border-line text-sm"
                />
                <input
                  name="guardian_phone"
                  value={guardianPhone}
                  onChange={(event) => setGuardianPhone(formatBrazilPhone(event.target.value))}
                  placeholder="Telefone do responsável"
                  className="w-full px-4 py-3 rounded-2xl bg-paper border border-line text-sm"
                />
                <input
                  name="guardian_cpf"
                  value={guardianCpf}
                  onChange={(event) => setGuardianCpf(formatCpf(event.target.value))}
                  placeholder="CPF do responsável"
                  className="w-full px-4 py-3 rounded-2xl bg-paper border border-line text-sm"
                />
              </div>
            )}
          </section>

          <section className="bg-white rounded-3xl shadow-soft p-5 border border-white space-y-4">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted">Observações internas</p>
              <h2 className="text-lg font-serif text-studio-text">Notas do cliente</h2>
            </div>
            <textarea
              name="observacoes_gerais"
              value={observacoesGerais}
              onChange={(event) => setObservacoesGerais(event.target.value)}
              placeholder="Observações internas do cliente"
              rows={3}
              className="w-full px-4 py-3 rounded-2xl bg-paper border border-line text-sm"
            />
          </section>

          <section className="bg-white rounded-3xl shadow-soft p-5 border border-white space-y-4">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted">Dados adicionais</p>
              <h2 className="text-lg font-serif text-studio-text">Profissão e origem</h2>
            </div>
            <input
              name="profissao"
              value={profissao}
              onChange={(event) => setProfissao(event.target.value)}
              placeholder="Profissão"
              className="w-full px-4 py-3 rounded-2xl bg-paper border border-line text-sm"
            />
            <input
              name="como_conheceu"
              value={comoConheceu}
              onChange={(event) => setComoConheceu(event.target.value)}
              placeholder="Como conheceu?"
              className="w-full px-4 py-3 rounded-2xl bg-paper border border-line text-sm"
            />
          </section>

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
