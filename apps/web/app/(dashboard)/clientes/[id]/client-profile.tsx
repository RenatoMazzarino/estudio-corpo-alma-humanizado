"use client";

import { useMemo, useState } from "react";
import { Mail, Phone, MessageCircle, MapPin, Briefcase, Calendar, IdCard, Tags, Pencil, Copy, Trash2, Navigation } from "lucide-react";
import type { Database } from "../../../../lib/supabase/types";
import { deleteClient, updateClientProfile } from "./actions";
import { fetchAddressByCep, normalizeCep } from "../../../../src/shared/address/cep";

type ClientRow = Database["public"]["Tables"]["clients"]["Row"];

interface ClientProfileProps {
  client: ClientRow;
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

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
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  fallback?: string | null;
}) {
  const parts = [
    payload.logradouro,
    payload.numero,
    payload.complemento,
    payload.bairro,
    payload.cidade,
    payload.estado,
    payload.cep,
  ]
    .map((value) => (value ? value.trim() : ""))
    .filter((value) => value.length > 0);

  if (parts.length > 0) return parts.join(", ");
  return payload.fallback?.trim() || "Endereço não informado";
}

export function ClientProfile({ client }: ClientProfileProps) {
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [phone, setPhone] = useState(client.phone ?? "");
  const [cpf, setCpf] = useState(client.cpf ?? "");
  const [cep, setCep] = useState(client.address_cep ?? "");
  const [logradouro, setLogradouro] = useState(client.address_logradouro ?? "");
  const [numero, setNumero] = useState(client.address_numero ?? "");
  const [complemento, setComplemento] = useState(client.address_complemento ?? "");
  const [bairro, setBairro] = useState(client.address_bairro ?? "");
  const [cidade, setCidade] = useState(client.address_cidade ?? "");
  const [estado, setEstado] = useState(client.address_estado ?? "");
  const [cepStatus, setCepStatus] = useState<"idle" | "loading" | "error" | "success">("idle");

  const phoneDigits = client.phone ? onlyDigits(client.phone) : "";
  const whatsappLink = phoneDigits ? `https://wa.me/55${phoneDigits}` : null;
  const callLink = phoneDigits ? `tel:+55${phoneDigits}` : null;
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
    logradouro: client.address_logradouro,
    numero: client.address_numero,
    complemento: client.address_complemento,
    bairro: client.address_bairro,
    cidade: client.address_cidade,
    estado: client.address_estado,
    cep: client.address_cep,
    fallback: client.endereco_completo,
  });

  const mapsQuery = buildAddressLine({
    logradouro,
    numero,
    complemento,
    bairro,
    cidade,
    estado,
    cep,
  });
  const hasMapsQuery = mapsQuery && mapsQuery !== "Endereço não informado";

  const handleCopy = async (value?: string | null) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setMessage({ type: "success", text: "Copiado para a área de transferência." });
    } catch {
      setMessage({ type: "error", text: "Não foi possível copiar agora." });
    }
  };

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

  return (
    <div className="bg-white p-5 rounded-3xl shadow-sm border border-stone-100 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{client.name}</h2>
          {client.email && <p className="text-xs text-gray-400 mt-1">{client.email}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditing((prev) => !prev)}
            className="flex items-center gap-2 text-xs font-bold text-studio-green bg-green-50 px-3 py-2 rounded-full hover:bg-green-100 transition"
          >
            <Pencil size={14} />
            {editing ? "Fechar edição" : "Editar"}
          </button>
          <button
            onClick={async () => {
              if (!confirm("Tem certeza? Isso apagará este cliente.")) return;
              const result = await deleteClient(client.id);
              if (!result.ok) {
                setMessage({ type: "error", text: result.error.message });
                return;
              }
              window.location.href = "/clientes";
            }}
            className="flex items-center gap-2 text-xs font-bold text-red-600 bg-red-50 px-3 py-2 rounded-full hover:bg-red-100 transition"
          >
            <Trash2 size={14} />
            Apagar
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {callLink && (
          <a
            href={callLink}
            className="inline-flex items-center gap-2 text-xs font-bold text-gray-700 bg-stone-100 px-3 py-2 rounded-full hover:bg-stone-200 transition"
          >
            <Phone size={14} />
            Ligar
          </a>
        )}
        {whatsappLink && (
          <a
            href={whatsappLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-xs font-bold text-green-700 bg-green-50 px-3 py-2 rounded-full hover:bg-green-100 transition"
          >
            <MessageCircle size={14} />
            WhatsApp
          </a>
        )}
        {client.email && (
          <a
            href={`mailto:${client.email}`}
            className="inline-flex items-center gap-2 text-xs font-bold text-blue-700 bg-blue-50 px-3 py-2 rounded-full hover:bg-blue-100 transition"
          >
            <Mail size={14} />
            Email
          </a>
        )}
        {addressLine && addressLine !== "Endereço não informado" && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressLine)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-xs font-bold text-studio-green bg-green-50 px-3 py-2 rounded-full hover:bg-green-100 transition"
          >
            <Navigation size={14} />
            Abrir mapa
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <Phone size={14} className="text-gray-400" />
          <span>{client.phone || "Telefone não informado"}</span>
          {client.phone && (
            <button
              type="button"
              onClick={() => handleCopy(client.phone)}
              className="ml-auto text-gray-400 hover:text-gray-600"
              aria-label="Copiar telefone"
            >
              <Copy size={14} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-gray-400" />
          <span>{client.data_nascimento || "Data de nascimento não informada"}</span>
        </div>
        <div className="flex items-center gap-2">
          <IdCard size={14} className="text-gray-400" />
          <span>{client.cpf || "CPF não informado"}</span>
          {client.cpf && (
            <button
              type="button"
              onClick={() => handleCopy(client.cpf)}
              className="ml-auto text-gray-400 hover:text-gray-600"
              aria-label="Copiar CPF"
            >
              <Copy size={14} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Briefcase size={14} className="text-gray-400" />
          <span>{client.profissao || "Profissão não informada"}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin size={14} className="text-gray-400" />
          <span>{addressLine}</span>
          {addressLine && addressLine !== "Endereço não informado" && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressLine)}`}
              target="_blank"
              rel="noreferrer"
              className="ml-auto text-studio-green hover:text-studio-green-dark"
              aria-label="Abrir endereço no GPS"
            >
              <Navigation size={16} />
            </a>
          )}
        </div>
        <div className="flex items-center gap-2">
          <MessageCircle size={14} className="text-gray-400" />
          <span>{client.como_conheceu || "Como conheceu não informado"}</span>
        </div>
        <div className="flex items-center gap-2">
          <Tags size={14} className="text-gray-400" />
          <span>
            {client.health_tags && client.health_tags.length > 0 ? client.health_tags.join(", ") : "Sem tags"}
          </span>
        </div>
      </div>

      {editing && (
        <form
          action={async (formData) => {
            setMessage(null);
            const result = await updateClientProfile(formData);
            if (!result.ok) {
              setMessage({ type: "error", text: result.error.message });
              return;
            }
            setMessage({ type: "success", text: "Cliente atualizado com sucesso." });
            setEditing(false);
          }}
          className="space-y-4 border-t border-stone-100 pt-4"
        >
          <input type="hidden" name="clientId" value={client.id} />

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Nome Completo</label>
            <input
              name="name"
              defaultValue={client.name}
              className="w-full bg-stone-50 border-stone-100 border rounded-xl py-3.5 px-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-3">
            <input
              name="phone"
              value={phone}
              placeholder="Telefone / WhatsApp"
              inputMode="numeric"
              aria-invalid={phoneError ? "true" : "false"}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              className={`w-full bg-stone-50 border rounded-xl py-3.5 px-4 text-gray-800 font-medium focus:outline-none focus:ring-2 ${
                phoneError
                  ? "border-red-200 focus:ring-red-200 focus:border-red-400"
                  : "border-stone-100 focus:ring-studio-green/20"
              }`}
            />
            <p className="text-[11px] text-gray-400">DDD obrigatório.</p>
            {phoneError && <p className="text-[11px] text-red-500">{phoneError}</p>}
            <input
              name="email"
              defaultValue={client.email ?? ""}
              placeholder="Email"
              className="w-full bg-stone-50 border-stone-100 border rounded-xl py-3.5 px-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20"
            />
            <input
              name="data_nascimento"
              type="date"
              defaultValue={client.data_nascimento ?? ""}
              className="w-full bg-stone-50 border-stone-100 border rounded-xl py-3.5 px-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20"
            />
            <input
              name="cpf"
              value={cpf}
              placeholder="CPF"
              inputMode="numeric"
              aria-invalid={cpfError ? "true" : "false"}
              onChange={(e) => setCpf(formatCpf(e.target.value))}
              className={`w-full bg-stone-50 border rounded-xl py-3.5 px-4 text-gray-800 font-medium focus:outline-none focus:ring-2 ${
                cpfError
                  ? "border-red-200 focus:ring-red-200 focus:border-red-400"
                  : "border-stone-100 focus:ring-studio-green/20"
              }`}
            />
            {cpfError && <p className="text-[11px] text-red-500">{cpfError}</p>}
            <input
              name="profissao"
              defaultValue={client.profissao ?? ""}
              placeholder="Profissão"
              className="w-full bg-stone-50 border-stone-100 border rounded-xl py-3.5 px-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20"
            />
            <input
              name="como_conheceu"
              defaultValue={client.como_conheceu ?? ""}
              placeholder="Como conheceu"
              className="w-full bg-stone-50 border-stone-100 border rounded-xl py-3.5 px-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20"
            />
            <input
              name="health_tags"
              defaultValue={(client.health_tags ?? []).join(", ")}
              placeholder="Tags de saúde (separe por vírgula)"
              className="w-full bg-stone-50 border-stone-100 border rounded-xl py-3.5 px-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20"
            />
            <div className="grid grid-cols-1 gap-3">
              <div className="flex gap-2">
                <input
                  name="address_cep"
                  value={cep}
                  placeholder="CEP"
                  inputMode="numeric"
                  aria-invalid={cepStatus === "error" ? "true" : "false"}
                  onChange={(e) => {
                    setCep(formatCep(e.target.value));
                    setCepStatus("idle");
                  }}
                  className={`w-full bg-stone-50 border rounded-xl py-3.5 px-4 text-gray-800 font-medium focus:outline-none focus:ring-2 ${
                    cepStatus === "error"
                      ? "border-red-200 focus:ring-red-200 focus:border-red-400"
                      : "border-stone-100 focus:ring-studio-green/20"
                  }`}
                />
                <button
                  type="button"
                  onClick={handleCepLookup}
                  className="px-4 py-3.5 rounded-xl bg-stone-100 text-gray-600 text-xs font-bold hover:bg-stone-200 transition"
                >
                  {cepStatus === "loading" ? "Buscando..." : "Buscar CEP"}
                </button>
              </div>
              {cepStatus === "error" && <p className="text-[11px] text-red-500">CEP inválido.</p>}
              <input
                name="address_logradouro"
                value={logradouro}
                placeholder="Logradouro"
                onChange={(e) => setLogradouro(e.target.value)}
                className="w-full bg-stone-50 border-stone-100 border rounded-xl py-3.5 px-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  name="address_numero"
                  value={numero}
                  placeholder="Número"
                  onChange={(e) => setNumero(e.target.value)}
                  className="w-full bg-stone-50 border-stone-100 border rounded-xl py-3.5 px-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20"
                />
                <input
                  name="address_complemento"
                  value={complemento}
                  placeholder="Complemento"
                  onChange={(e) => setComplemento(e.target.value)}
                  className="w-full bg-stone-50 border-stone-100 border rounded-xl py-3.5 px-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  name="address_bairro"
                  value={bairro}
                  placeholder="Bairro"
                  onChange={(e) => setBairro(e.target.value)}
                  className="w-full bg-stone-50 border-stone-100 border rounded-xl py-3.5 px-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20"
                />
                <input
                  name="address_cidade"
                  value={cidade}
                  placeholder="Cidade"
                  onChange={(e) => setCidade(e.target.value)}
                  className="w-full bg-stone-50 border-stone-100 border rounded-xl py-3.5 px-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20"
                />
              </div>
              <input
                name="address_estado"
                value={estado}
                placeholder="Estado (UF)"
                onChange={(e) => setEstado(e.target.value.toUpperCase())}
                maxLength={2}
                className="w-full bg-stone-50 border-stone-100 border rounded-xl py-3.5 px-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20 uppercase"
              />
              {hasMapsQuery && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-studio-green hover:underline"
                >
                  Ver endereço no Maps
                </a>
              )}
            </div>
            <textarea
              name="observacoes_gerais"
              defaultValue={client.observacoes_gerais ?? ""}
              placeholder="Observações"
              rows={3}
              className="w-full bg-stone-50 border-stone-100 border rounded-xl py-3.5 px-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20 resize-none"
            />
          </div>

          {message && (
            <div
              className={`text-xs font-bold px-3 py-2 rounded-xl ${
                message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
              }`}
            >
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={Boolean(phoneError || cpfError)}
            className="w-full bg-studio-green text-white font-bold py-3 rounded-2xl shadow-lg shadow-green-100 hover:bg-studio-green-dark transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Salvar alterações
          </button>
        </form>
      )}
    </div>
  );
}
