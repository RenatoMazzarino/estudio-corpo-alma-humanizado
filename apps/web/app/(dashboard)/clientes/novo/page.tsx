"use client";

import { useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  RotateCcw,
  User,
  Phone,
  Mail,
  Calendar,
  IdCard,
  MapPin,
  ShieldAlert,
  BadgeCheck,
  Baby,
  ClipboardList,
  Search,
} from "lucide-react";
import Link from "next/link";
import { createClientAction } from "./actions";
import { fetchAddressByCep, normalizeCep } from "../../../../src/shared/address/cep";

const HEALTH_TAGS = [
  "Gestante",
  "Alergia a óleo",
  "Lombar sensível",
  "Pressão forte",
  "Pressão leve",
  "Pós-operatório",
  "Varizes",
];

function formatCpf(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digits
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

function formatCep(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.replace(/^(\d{5})(\d)/, "$1-$2");
}

function buildAddressLine(payload: {
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
}) {
  const parts = [
    payload.logradouro,
    payload.numero,
    payload.complemento,
    payload.bairro,
    payload.cidade,
    payload.estado,
    payload.cep,
  ].filter((value) => value && value.trim().length > 0);
  return parts.join(", ");
}

function getInitials(name: string) {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function NewClientPage() {
  const formRef = useRef<HTMLFormElement>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [cpf, setCpf] = useState("");
  const [cep, setCep] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [cepStatus, setCepStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [isVip, setIsVip] = useState(false);
  const [needsAttention, setNeedsAttention] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [isMinor, setIsMinor] = useState(false);
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [guardianCpf, setGuardianCpf] = useState("");
  const [healthTags, setHealthTags] = useState<string[]>([]);
  const [contraindications, setContraindications] = useState("");
  const [preferencesNotes, setPreferencesNotes] = useState("");
  const [observacoesGerais, setObservacoesGerais] = useState("");
  const [profissao, setProfissao] = useState("");
  const [comoConheceu, setComoConheceu] = useState("");

  const requiredCount = useMemo(() => {
    return [name, phone, birthDate, cpf].filter((value) => value.trim().length > 0).length;
  }, [name, phone, birthDate, cpf]);
  const requiredTotal = 4;
  const requiredStatus = requiredCount === requiredTotal ? "Completo" : "Em andamento";

  const phoneError = useMemo(() => {
    if (!phone) return "";
    const digits = phone.replace(/\D/g, "");
    return digits.length === 10 || digits.length === 11 ? "" : "Telefone inválido (com DDD).";
  }, [phone]);
  const cpfError = useMemo(() => {
    if (!cpf) return "";
    const digits = cpf.replace(/\D/g, "");
    return digits.length === 11 ? "" : "CPF inválido.";
  }, [cpf]);

  const addressLine = buildAddressLine({
    logradouro,
    numero,
    complemento,
    bairro,
    cidade,
    estado,
    cep,
  });

  const payloadPreview = useMemo(
    () => ({
      name: name || null,
      phone: phone || null,
      email: email || null,
      data_nascimento: birthDate || null,
      cpf: cpf || null,
      address_cep: cep || null,
      address_logradouro: logradouro || null,
      address_numero: numero || null,
      address_complemento: complemento || null,
      address_bairro: bairro || null,
      address_cidade: cidade || null,
      address_estado: estado || null,
      endereco_completo: addressLine || null,
      health_tags: healthTags,
      contraindications: contraindications || null,
      preferences_notes: preferencesNotes || null,
      observacoes_gerais: observacoesGerais || null,
      profissao: profissao || null,
      como_conheceu: comoConheceu || null,
      is_vip: isVip,
      needs_attention: needsAttention,
      marketing_opt_in: marketingOptIn,
      is_minor: isMinor,
      guardian_name: guardianName || null,
      guardian_phone: guardianPhone || null,
      guardian_cpf: guardianCpf || null,
    }),
    [
      name,
      phone,
      email,
      birthDate,
      cpf,
      cep,
      logradouro,
      numero,
      complemento,
      bairro,
      cidade,
      estado,
      addressLine,
      healthTags,
      contraindications,
      preferencesNotes,
      observacoesGerais,
      profissao,
      comoConheceu,
      isVip,
      needsAttention,
      marketingOptIn,
      isMinor,
      guardianName,
      guardianPhone,
      guardianCpf,
    ]
  );

  const handleCepLookup = async () => {
    const normalized = normalizeCep(cep);
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
    setLogradouro(result.logradouro);
    setBairro(result.bairro);
    setCidade(result.cidade);
    setEstado(result.estado);
    setCepStatus("success");
  };

  const toggleTag = (tag: string) => {
    setHealthTags((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]
    );
  };

  const handleReset = () => {
    setName("");
    setPhone("");
    setEmail("");
    setBirthDate("");
    setCpf("");
    setCep("");
    setLogradouro("");
    setNumero("");
    setComplemento("");
    setBairro("");
    setCidade("");
    setEstado("");
    setCepStatus("idle");
    setIsVip(false);
    setNeedsAttention(false);
    setMarketingOptIn(false);
    setIsMinor(false);
    setGuardianName("");
    setGuardianPhone("");
    setGuardianCpf("");
    setHealthTags([]);
    setContraindications("");
    setPreferencesNotes("");
    setObservacoesGerais("");
    setProfissao("");
    setComoConheceu("");
    formRef.current?.reset();
  };

  return (
    <div className="bg-paper -mx-4 -mt-4 min-h-[100dvh]">
      <header className="safe-top px-6 pt-8 pb-4 bg-white rounded-b-3xl shadow-soft z-20 sticky top-0">
        <div className="flex items-center justify-between mb-3">
          <Link
            href="/clientes"
            className="w-10 h-10 rounded-full bg-paper border border-line text-studio-text flex items-center justify-center hover:bg-white transition"
            aria-label="Voltar"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>

          <div className="text-center">
            <p className="text-[11px] font-extrabold text-studio-green uppercase tracking-[0.24em] mb-1">Cadastro</p>
            <h1 className="text-2xl font-serif text-studio-text leading-tight">Novo Cliente</h1>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="w-10 h-10 rounded-full bg-studio-light text-studio-green flex items-center justify-center hover:bg-studio-green hover:text-white transition shadow-sm"
            title="Limpar"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 bg-paper border border-line rounded-2xl px-4 py-3">
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold text-muted uppercase tracking-[0.22em]">Obrigatórios</p>
            <p className="text-sm font-black text-studio-text">
              {requiredCount}/{requiredTotal} preenchidos
              <span className="text-muted font-semibold"> • </span>
              <span className="text-muted font-extrabold">{requiredStatus}</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-white border border-line flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-muted" />
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar pb-28">
        <form ref={formRef} action={createClientAction} className="space-y-6">
          <input type="hidden" name="health_tags" value={healthTags.join(", ")} />
          <input type="hidden" name="endereco_completo" value={addressLine} />

          <section className="px-6 pt-5">
            <div className="bg-white rounded-3xl border border-white shadow-sm p-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-studio-light border border-studio-green/10 flex items-center justify-center">
                  <div className="w-11 h-11 rounded-xl bg-studio-green text-white flex items-center justify-center text-xl font-serif font-bold">
                    {getInitials(name)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-extrabold text-muted uppercase tracking-[0.22em]">Identificação</p>
                  <h2 className="text-lg font-serif font-bold text-studio-text truncate">
                    {name || "Nome completo"}
                  </h2>
                  <p className="text-xs text-muted font-semibold">
                    {phone || "Telefone principal"}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <label className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-xs font-extrabold border ${isVip ? "bg-studio-light text-studio-green border-studio-green/20" : "bg-white text-muted border-line"}`}>
                  <input
                    type="checkbox"
                    name="is_vip"
                    checked={isVip}
                    onChange={(event) => setIsVip(event.target.checked)}
                    className="accent-studio-green"
                  />
                  VIP
                </label>
                <label className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-xs font-extrabold border ${needsAttention ? "bg-red-50 text-danger border-red-200" : "bg-white text-muted border-line"}`}>
                  <input
                    type="checkbox"
                    name="needs_attention"
                    checked={needsAttention}
                    onChange={(event) => setNeedsAttention(event.target.checked)}
                    className="accent-studio-green"
                  />
                  Atenção
                </label>
              </div>
            </div>
          </section>

          <section className="px-6 pt-4">
            <div className="sticky top-[118px] z-10 bg-paper/90 backdrop-blur py-2">
              <h3 className="text-[11px] font-extrabold text-muted uppercase tracking-[0.22em] pl-1">Contato</h3>
            </div>

            <div className="bg-white rounded-3xl border border-white shadow-sm p-5 space-y-4">
              <div>
                <label className="text-[10px] font-extrabold text-muted uppercase tracking-[0.22em] mb-2 block">Nome completo</label>
                <div className="relative">
                  <User className="w-4 h-4 text-muted absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    name="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-2xl bg-paper border border-line focus:outline-none focus:ring-2 focus:ring-studio-green/20 text-sm font-semibold text-studio-text"
                    placeholder="Buscar ou digitar nome..."
                    required
                  />
                </div>
                <p className="text-[11px] text-muted mt-2 ml-1 flex items-center gap-1">
                  <Search className="w-3 h-3" /> Se já existir, revise os dados antes de salvar.
                </p>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-muted uppercase tracking-[0.22em] mb-2 block">WhatsApp (opcional)</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-muted absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    name="phone"
                    value={phone}
                    onChange={(event) => setPhone(formatPhone(event.target.value))}
                    className={`w-full pl-11 pr-4 py-3 rounded-2xl bg-paper border focus:outline-none focus:ring-2 text-sm ${
                      phoneError ? "border-red-200 focus:ring-red-200" : "border-line focus:ring-studio-green/20"
                    }`}
                    placeholder="(00) 00000-0000"
                    inputMode="numeric"
                    aria-invalid={phoneError ? "true" : "false"}
                  />
                </div>
                {phoneError && <p className="text-[11px] text-danger mt-1">{phoneError}</p>}
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-muted uppercase tracking-[0.22em] mb-2 block">Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-muted absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    name="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-2xl bg-paper border border-line focus:outline-none focus:ring-2 focus:ring-studio-green/20 text-sm"
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="px-6 pt-4">
            <div className="sticky top-[118px] z-10 bg-paper/90 backdrop-blur py-2">
              <h3 className="text-[11px] font-extrabold text-muted uppercase tracking-[0.22em] pl-1">Dados pessoais</h3>
            </div>

            <div className="bg-white rounded-3xl border border-white shadow-sm p-5 space-y-4">
              <div>
                <label className="text-[10px] font-extrabold text-muted uppercase tracking-[0.22em] mb-2 block">Data de nascimento</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-muted absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    name="data_nascimento"
                    type="date"
                    value={birthDate}
                    onChange={(event) => setBirthDate(event.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-2xl bg-paper border border-line focus:outline-none focus:ring-2 focus:ring-studio-green/20 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-muted uppercase tracking-[0.22em] mb-2 block">CPF</label>
                <div className="relative">
                  <IdCard className="w-4 h-4 text-muted absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    name="cpf"
                    value={cpf}
                    onChange={(event) => setCpf(formatCpf(event.target.value))}
                    className={`w-full pl-11 pr-4 py-3 rounded-2xl bg-paper border focus:outline-none focus:ring-2 text-sm ${
                      cpfError ? "border-red-200 focus:ring-red-200" : "border-line focus:ring-studio-green/20"
                    }`}
                    placeholder="000.000.000-00"
                    inputMode="numeric"
                    aria-invalid={cpfError ? "true" : "false"}
                  />
                </div>
                {cpfError && <p className="text-[11px] text-danger mt-1">{cpfError}</p>}
              </div>
            </div>
          </section>

          <section className="px-6 pt-4">
            <div className="sticky top-[118px] z-10 bg-paper/90 backdrop-blur py-2">
              <h3 className="text-[11px] font-extrabold text-muted uppercase tracking-[0.22em] pl-1">Endereço</h3>
            </div>

            <div className="bg-white rounded-3xl border border-white shadow-sm p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="flex items-center justify-between text-[10px] font-extrabold text-muted uppercase tracking-[0.22em] mb-2">
                    CEP <span className="text-muted">(opcional)</span>
                  </label>
                  <input
                    name="address_cep"
                    value={cep}
                    onChange={(event) => {
                      setCep(formatCep(event.target.value));
                      setCepStatus("idle");
                    }}
                    className={`w-full px-4 py-3 rounded-2xl bg-paper border focus:outline-none focus:ring-2 text-sm ${
                      cepStatus === "error" ? "border-red-200 focus:ring-red-200" : "border-line focus:ring-studio-green/20"
                    }`}
                    placeholder="00000-000"
                    inputMode="numeric"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleCepLookup}
                    className="w-full h-[46px] rounded-2xl bg-studio-light text-studio-green font-extrabold text-xs border border-studio-green/10 hover:bg-white transition flex items-center justify-center gap-2"
                  >
                    <Search className="w-4 h-4" />
                    {cepStatus === "loading" ? "Buscando" : "Buscar"}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-muted uppercase tracking-[0.22em] mb-2 block">Logradouro</label>
                <input
                  name="address_logradouro"
                  value={logradouro}
                  onChange={(event) => setLogradouro(event.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-paper border border-line focus:outline-none focus:ring-2 focus:ring-studio-green/20 text-sm"
                  placeholder="Rua / Avenida"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold text-muted uppercase tracking-[0.22em] mb-2 block">Número</label>
                  <input
                    name="address_numero"
                    value={numero}
                    onChange={(event) => setNumero(event.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-paper border border-line focus:outline-none focus:ring-2 focus:ring-studio-green/20 text-sm"
                    placeholder="120"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-extrabold text-muted uppercase tracking-[0.22em] mb-2 block">Complemento</label>
                  <input
                    name="address_complemento"
                    value={complemento}
                    onChange={(event) => setComplemento(event.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-paper border border-line focus:outline-none focus:ring-2 focus:ring-studio-green/20 text-sm"
                    placeholder="Apto, bloco, casa..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold text-muted uppercase tracking-[0.22em] mb-2 block">Bairro</label>
                  <input
                    name="address_bairro"
                    value={bairro}
                    onChange={(event) => setBairro(event.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-paper border border-line focus:outline-none focus:ring-2 focus:ring-studio-green/20 text-sm"
                    placeholder="Centro"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-muted uppercase tracking-[0.22em] mb-2 block">Cidade</label>
                  <input
                    name="address_cidade"
                    value={cidade}
                    onChange={(event) => setCidade(event.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-paper border border-line focus:outline-none focus:ring-2 focus:ring-studio-green/20 text-sm"
                    placeholder="São Paulo"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold text-muted uppercase tracking-[0.22em] mb-2 block">UF</label>
                  <input
                    name="address_estado"
                    value={estado}
                    onChange={(event) => setEstado(event.target.value.toUpperCase())}
                    className="w-full px-4 py-3 rounded-2xl bg-paper border border-line focus:outline-none focus:ring-2 focus:ring-studio-green/20 text-sm uppercase"
                    placeholder="SP"
                    maxLength={2}
                  />
                </div>
                <div className="flex items-end">
                  {addressLine && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressLine)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full h-[46px] rounded-2xl bg-paper border border-line text-studio-text font-extrabold text-xs hover:bg-white transition flex items-center justify-center gap-2"
                    >
                      <MapPin className="w-4 h-4" />
                      Mapa
                    </a>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="px-6 pt-4">
            <div className="sticky top-[118px] z-10 bg-paper/90 backdrop-blur py-2">
              <h3 className="text-[11px] font-extrabold text-muted uppercase tracking-[0.22em] pl-1">Saúde & Cuidados</h3>
            </div>

            <div className="bg-white rounded-3xl border border-white shadow-sm p-5 space-y-4">
              <div className="flex items-start gap-3 bg-paper border border-line rounded-2xl px-4 py-3">
                <ShieldAlert className="w-5 h-5 text-studio-text mt-0.5" />
                <p className="text-xs text-studio-text font-semibold leading-relaxed">
                  Campos pensados para produção: alergias, contraindicações, observações clínicas e preferências.
                </p>
              </div>

              <div>
                <p className="text-[10px] font-extrabold text-muted uppercase tracking-[0.22em] mb-2">Sinalizações rápidas</p>
                <div className="flex flex-wrap gap-2">
                  {HEALTH_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1 rounded-xl text-[11px] font-extrabold border ${
                        healthTags.includes(tag)
                          ? "bg-studio-light text-studio-green border-studio-green/20"
                          : "bg-white text-studio-text border-line"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-muted uppercase tracking-[0.22em] mb-2 block">Contraindicações / Atenções</label>
                <textarea
                  name="contraindications"
                  value={contraindications}
                  onChange={(event) => setContraindications(event.target.value)}
                  className="w-full h-28 bg-paper rounded-2xl p-4 text-sm text-studio-text border border-line focus:outline-none focus:ring-2 focus:ring-studio-green/20 resize-none"
                  placeholder="Ex.: evitar pressão profunda em X região..."
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-muted uppercase tracking-[0.22em] mb-2 block">Preferências de atendimento</label>
                <textarea
                  name="preferences_notes"
                  value={preferencesNotes}
                  onChange={(event) => setPreferencesNotes(event.target.value)}
                  className="w-full h-24 bg-paper rounded-2xl p-4 text-sm text-studio-text border border-line focus:outline-none focus:ring-2 focus:ring-studio-green/20 resize-none"
                  placeholder="Ex.: prefere música baixa, ambiente mais quente..."
                />
              </div>
            </div>
          </section>

          <section className="px-6 pt-4">
            <div className="sticky top-[118px] z-10 bg-paper/90 backdrop-blur py-2">
              <h3 className="text-[11px] font-extrabold text-muted uppercase tracking-[0.22em] pl-1">Relacionamento</h3>
            </div>

            <div className="bg-white rounded-3xl border border-white shadow-sm p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold text-muted uppercase tracking-[0.22em] mb-2 block">Origem do cliente</label>
                  <input
                    name="como_conheceu"
                    value={comoConheceu}
                    onChange={(event) => setComoConheceu(event.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-paper border border-line focus:outline-none focus:ring-2 focus:ring-studio-green/20 text-sm"
                    placeholder="Instagram, indicação, retorno..."
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-muted uppercase tracking-[0.22em] mb-2 block">Profissão</label>
                  <input
                    name="profissao"
                    value={profissao}
                    onChange={(event) => setProfissao(event.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-paper border border-line focus:outline-none focus:ring-2 focus:ring-studio-green/20 text-sm"
                    placeholder="Profissão"
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 bg-paper border border-line rounded-2xl px-4 py-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="marketing_opt_in"
                  checked={marketingOptIn}
                  onChange={(event) => setMarketingOptIn(event.target.checked)}
                  className="accent-studio-green w-4 h-4"
                />
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-studio-text">Permite receber mensagens</p>
                  <p className="text-xs text-muted font-semibold mt-0.5">
                    Campanhas, lembretes e novidades.
                  </p>
                </div>
              </label>

              <div>
                <label className="text-[10px] font-extrabold text-muted uppercase tracking-[0.22em] mb-2 block">Observações internas</label>
                <textarea
                  name="observacoes_gerais"
                  value={observacoesGerais}
                  onChange={(event) => setObservacoesGerais(event.target.value)}
                  className="w-full h-24 bg-paper rounded-2xl p-4 text-sm text-studio-text border border-line focus:outline-none focus:ring-2 focus:ring-studio-green/20 resize-none"
                  placeholder="Ex.: cliente pontual, preferir agendar pela manhã..."
                />
              </div>
            </div>
          </section>

          <section className="px-6 pt-4">
            <div className="sticky top-[118px] z-10 bg-paper/90 backdrop-blur py-2">
              <h3 className="text-[11px] font-extrabold text-muted uppercase tracking-[0.22em] pl-1">Dados complementares</h3>
            </div>

            <div className="bg-white rounded-3xl border border-white shadow-sm p-5 space-y-4">
              <div className="flex items-start gap-3 bg-paper border border-line rounded-2xl px-4 py-3">
                <BadgeCheck className="w-5 h-5 text-studio-text mt-0.5" />
                <p className="text-xs text-studio-text font-semibold leading-relaxed">
                  Estrutura pronta para produção: responsável (se menor) e documentos básicos.
                </p>
              </div>

              <label className="flex items-center gap-3 bg-paper border border-line rounded-2xl px-4 py-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="is_minor"
                  checked={isMinor}
                  onChange={(event) => setIsMinor(event.target.checked)}
                  className="accent-studio-green w-4 h-4"
                />
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-studio-text">Cliente menor de idade</p>
                  <p className="text-xs text-muted font-semibold mt-0.5">Habilita campos do responsável</p>
                </div>
              </label>

              {isMinor && (
                <div className="bg-white border border-line rounded-2xl p-4 space-y-3">
                  <div>
                    <label className="text-[10px] font-extrabold text-muted uppercase tracking-[0.22em] mb-2 block">Nome do responsável</label>
                    <input
                      name="guardian_name"
                      value={guardianName}
                      onChange={(event) => setGuardianName(event.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-paper border border-line focus:outline-none focus:ring-2 focus:ring-studio-green/20 text-sm"
                      placeholder="Nome completo"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-extrabold text-muted uppercase tracking-[0.22em] mb-2 block">Telefone</label>
                      <input
                        name="guardian_phone"
                        value={guardianPhone}
                        onChange={(event) => setGuardianPhone(formatPhone(event.target.value))}
                        className="w-full px-4 py-3 rounded-2xl bg-paper border border-line focus:outline-none focus:ring-2 focus:ring-studio-green/20 text-sm"
                        placeholder="(11) 99999-9999"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-extrabold text-muted uppercase tracking-[0.22em] mb-2 block">CPF</label>
                      <input
                        name="guardian_cpf"
                        value={guardianCpf}
                        onChange={(event) => setGuardianCpf(formatCpf(event.target.value))}
                        className="w-full px-4 py-3 rounded-2xl bg-paper border border-line focus:outline-none focus:ring-2 focus:ring-studio-green/20 text-sm"
                        placeholder="000.000.000-00"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          <div className="px-6">
            <button
              type="submit"
              disabled={Boolean(phoneError || cpfError)}
              className="w-full h-12 rounded-2xl bg-studio-green text-white font-extrabold shadow-soft active:scale-[0.99] transition disabled:opacity-60"
            >
              Salvar cliente
            </button>
          </div>

          <details className="mx-6 mt-6 mb-12 bg-white rounded-3xl border border-line p-4 shadow-soft">
            <summary className="text-xs font-extrabold text-muted uppercase tracking-widest cursor-pointer">
              Prévia do payload (DB)
            </summary>
            <pre className="mt-3 text-[10px] text-muted whitespace-pre-wrap">
              {JSON.stringify(payloadPreview, null, 2)}
            </pre>
          </details>
        </form>
      </main>
    </div>
  );
}
