 "use client";

import { useMemo, useState } from "react";
import {
  ChevronLeft,
  User,
  Phone,
  FileText,
  Save,
  Mail,
  Calendar,
  IdCard,
  MapPin,
  Briefcase,
  MessageCircle,
  Tags,
} from "lucide-react";
import Link from "next/link";
import { createClientAction } from "./actions";
import { fetchAddressByCep, normalizeCep } from "../../../src/shared/address/cep";

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

function buildAddressQuery(payload: {
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

export default function NewClientPage() {
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [cep, setCep] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [cepStatus, setCepStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
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

  const mapsQuery = buildAddressQuery({
    logradouro,
    numero,
    complemento,
    bairro,
    cidade,
    estado,
    cep,
  });

  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/clientes" className="p-2 bg-white rounded-full text-gray-600 shadow-sm border border-stone-100">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-lg font-bold text-gray-800">Novo Cliente</h1>
      </div>

      <form action={createClientAction} className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100 space-y-5">
        
        {/* Nome */}
        <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Nome Completo</label>
            <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                name="name"
                type="text" 
                placeholder="Ex: Maria Silva"
                className="w-full bg-stone-50 border-stone-100 border rounded-xl py-3.5 pl-11 pr-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20 focus:border-studio-green"
                required
                />
            </div>
        </div>

        {/* Telefone */}
        <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Telefone / WhatsApp</label>
            <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                name="phone"
                type="tel" 
                placeholder="(00) 00000-0000"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                inputMode="numeric"
                aria-invalid={phoneError ? "true" : "false"}
                className={`w-full bg-stone-50 border rounded-xl py-3.5 pl-11 pr-4 text-gray-800 font-medium focus:outline-none focus:ring-2 ${
                  phoneError
                    ? "border-red-200 focus:ring-red-200 focus:border-red-400"
                    : "border-stone-100 focus:ring-studio-green/20 focus:border-studio-green"
                }`}
                />
            </div>
            <p className="text-[11px] text-gray-400 ml-1">DDD obrigatório.</p>
            {phoneError && <p className="text-[11px] text-red-500 ml-1">{phoneError}</p>}
        </div>

        {/* Email */}
        <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Email</label>
            <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                name="email"
                type="email" 
                placeholder="exemplo@email.com"
                className="w-full bg-stone-50 border-stone-100 border rounded-xl py-3.5 pl-11 pr-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20 focus:border-studio-green"
                />
            </div>
        </div>

        {/* Data de Nascimento */}
        <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Data de Nascimento</label>
            <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                name="data_nascimento"
                type="date" 
                className="w-full bg-stone-50 border-stone-100 border rounded-xl py-3.5 pl-11 pr-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20 focus:border-studio-green"
                />
            </div>
        </div>

        {/* CPF */}
        <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">CPF</label>
            <div className="relative">
                <IdCard className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                name="cpf"
                type="text" 
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(formatCpf(e.target.value))}
                inputMode="numeric"
                aria-invalid={cpfError ? "true" : "false"}
                className={`w-full bg-stone-50 border rounded-xl py-3.5 pl-11 pr-4 text-gray-800 font-medium focus:outline-none focus:ring-2 ${
                  cpfError
                    ? "border-red-200 focus:ring-red-200 focus:border-red-400"
                    : "border-stone-100 focus:ring-studio-green/20 focus:border-studio-green"
                }`}
                />
            </div>
            {cpfError && <p className="text-[11px] text-red-500 ml-1">{cpfError}</p>}
        </div>

        {/* Endereço */}
        <div className="space-y-3">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Endereço</label>
            <div className="grid grid-cols-1 gap-3">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      name="address_cep"
                      type="text"
                      placeholder="CEP"
                      value={cep}
                      onChange={(e) => {
                        setCep(formatCep(e.target.value));
                        setCepStatus("idle");
                      }}
                      inputMode="numeric"
                      aria-invalid={cepStatus === "error" ? "true" : "false"}
                      className={`w-full bg-stone-50 border rounded-xl py-3.5 pl-11 pr-4 text-gray-800 font-medium focus:outline-none focus:ring-2 ${
                        cepStatus === "error"
                          ? "border-red-200 focus:ring-red-200 focus:border-red-400"
                          : "border-stone-100 focus:ring-studio-green/20 focus:border-studio-green"
                      }`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCepLookup}
                    className="px-4 py-3.5 rounded-xl bg-stone-100 text-gray-600 text-xs font-bold hover:bg-stone-200 transition"
                  >
                    {cepStatus === "loading" ? "Buscando..." : "Buscar CEP"}
                  </button>
                </div>
                {cepStatus === "error" && <p className="text-[11px] text-red-500 ml-1">CEP inválido.</p>}
                <input 
                  name="address_logradouro"
                  type="text"
                  placeholder="Logradouro"
                  value={logradouro}
                  onChange={(e) => setLogradouro(e.target.value)}
                  className="w-full bg-stone-50 border-stone-100 border rounded-xl py-3.5 px-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20 focus:border-studio-green"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input 
                    name="address_numero"
                    type="text"
                    placeholder="Número"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    className="w-full bg-stone-50 border-stone-100 border rounded-xl py-3.5 px-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20 focus:border-studio-green"
                  />
                  <input 
                    name="address_complemento"
                    type="text"
                    placeholder="Complemento"
                    value={complemento}
                    onChange={(e) => setComplemento(e.target.value)}
                    className="w-full bg-stone-50 border-stone-100 border rounded-xl py-3.5 px-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20 focus:border-studio-green"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input 
                    name="address_bairro"
                    type="text"
                    placeholder="Bairro"
                    value={bairro}
                    onChange={(e) => setBairro(e.target.value)}
                    className="w-full bg-stone-50 border-stone-100 border rounded-xl py-3.5 px-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20 focus:border-studio-green"
                  />
                  <input 
                    name="address_cidade"
                    type="text"
                    placeholder="Cidade"
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    className="w-full bg-stone-50 border-stone-100 border rounded-xl py-3.5 px-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20 focus:border-studio-green"
                  />
                </div>
                <input 
                  name="address_estado"
                  type="text"
                  placeholder="Estado (UF)"
                  value={estado}
                  onChange={(e) => setEstado(e.target.value.toUpperCase())}
                  maxLength={2}
                  className="w-full bg-stone-50 border-stone-100 border rounded-xl py-3.5 px-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20 focus:border-studio-green uppercase"
                />
                {mapsQuery && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-studio-green hover:underline ml-1"
                  >
                    Ver endereço no Maps
                  </a>
                )}
            </div>
        </div>

        {/* Profissão */}
        <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Profissão</label>
            <div className="relative">
                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                name="profissao"
                type="text" 
                placeholder="Ex: Fisioterapeuta"
                className="w-full bg-stone-50 border-stone-100 border rounded-xl py-3.5 pl-11 pr-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20 focus:border-studio-green"
                />
            </div>
        </div>

        {/* Como Conheceu */}
        <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Como Conheceu</label>
            <div className="relative">
                <MessageCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                name="como_conheceu"
                type="text" 
                placeholder="Indicação, Instagram, Google..."
                className="w-full bg-stone-50 border-stone-100 border rounded-xl py-3.5 pl-11 pr-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20 focus:border-studio-green"
                />
            </div>
        </div>

        {/* Tags de Saúde */}
        <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Tags de Saúde</label>
            <div className="relative">
                <Tags className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                name="health_tags"
                type="text" 
                placeholder="alergia, hipertensão, diabetes"
                className="w-full bg-stone-50 border-stone-100 border rounded-xl py-3.5 pl-11 pr-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20 focus:border-studio-green"
                />
            </div>
            <p className="text-[11px] text-gray-400 ml-1">Separe por vírgulas.</p>
        </div>

        {/* Notas Initial */}
        <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Observações Iniciais</label>
            <div className="relative">
                <FileText className="absolute left-4 top-4 text-gray-400" size={18} />
                <textarea 
                name="observacoes_gerais"
                placeholder="Ex: Alérgica a amendoim..."
                rows={4}
                className="w-full bg-stone-50 border-stone-100 border rounded-xl py-3.5 pl-11 pr-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20 focus:border-studio-green resize-none"
                />
            </div>
        </div>

        <button 
          type="submit" 
          disabled={Boolean(phoneError || cpfError)}
          className="w-full bg-studio-green text-white font-bold py-4 rounded-2xl shadow-lg shadow-green-100 hover:bg-studio-green-dark transition-all mt-4 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Save size={18} />
          Salvar Cadastro
        </button>

      </form>
    </>
  );
}
