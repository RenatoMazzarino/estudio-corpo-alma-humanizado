"use client";

import { useMemo, useState } from "react";
import {
  ChevronLeft,
  User,
  Phone,
  Mail,
  Calendar,
  IdCard,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  Baby,
} from "lucide-react";
import Link from "next/link";
import { createClientAction } from "./actions";
import { fetchAddressByCep, normalizeCep } from "../../../../src/shared/address/cep";
import { AppHeader } from "../../../../components/ui/app-header";
import { SurfaceCard } from "../../../../components/ui/surface-card";
import { FormSection } from "../../../../components/ui/form-section";
import { PrimaryButton } from "../../../../components/ui/buttons";

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
  const [isMinor, setIsMinor] = useState(false);
  const [isVip, setIsVip] = useState(false);
  const [needsAttention, setNeedsAttention] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);

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

  return (
    <div className="-mx-4 -mt-4">
      <AppHeader
        label="Cadastro"
        title="Novo Cliente"
        subtitle="Dados completos para um atendimento humanizado."
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

      <main className="px-6 pt-6 pb-28">
        <form action={createClientAction} className="space-y-6">
          <SurfaceCard>
            <FormSection title="Dados principais">
              <div className="grid gap-3">
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
                  <input
                    name="name"
                    type="text"
                    placeholder="Nome completo"
                    className="w-full bg-white border border-line rounded-2xl py-3.5 pl-11 pr-4 text-studio-text font-semibold focus:outline-none focus:ring-2 focus:ring-studio-green/20"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 text-xs font-extrabold text-muted">
                    <input
                      type="checkbox"
                      name="is_vip"
                      checked={isVip}
                      onChange={(event) => setIsVip(event.target.checked)}
                      className="accent-studio-green"
                    />
                    VIP
                  </label>
                  <label className="flex items-center gap-2 text-xs font-extrabold text-muted">
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
            </FormSection>
          </SurfaceCard>

          <SurfaceCard>
            <FormSection title="Contato">
              <div className="grid gap-3">
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
                  <input
                    name="phone"
                    type="tel"
                    placeholder="(00) 00000-0000"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    inputMode="numeric"
                    aria-invalid={phoneError ? "true" : "false"}
                    className={`w-full bg-white border rounded-2xl py-3.5 pl-11 pr-4 text-studio-text font-semibold focus:outline-none focus:ring-2 ${
                      phoneError
                        ? "border-red-200 focus:ring-red-200"
                        : "border-line focus:ring-studio-green/20"
                    }`}
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
                  <input
                    name="email"
                    type="email"
                    placeholder="email@exemplo.com"
                    className="w-full bg-white border border-line rounded-2xl py-3.5 pl-11 pr-4 text-studio-text font-semibold focus:outline-none focus:ring-2 focus:ring-studio-green/20"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs font-extrabold text-muted">
                  <input
                    type="checkbox"
                    name="marketing_opt_in"
                    checked={marketingOptIn}
                    onChange={(event) => setMarketingOptIn(event.target.checked)}
                    className="accent-studio-green"
                  />
                  Aceita receber novidades e lembretes
                </label>
                {phoneError && <p className="text-[11px] text-danger">{phoneError}</p>}
              </div>
            </FormSection>
          </SurfaceCard>

          <SurfaceCard>
            <FormSection title="Documentos">
              <div className="grid gap-3">
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
                  <input
                    name="data_nascimento"
                    type="date"
                    className="w-full bg-white border border-line rounded-2xl py-3.5 pl-11 pr-4 text-studio-text font-semibold focus:outline-none focus:ring-2 focus:ring-studio-green/20"
                  />
                </div>
                <div className="relative">
                  <IdCard className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
                  <input
                    name="cpf"
                    type="text"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => setCpf(formatCpf(e.target.value))}
                    inputMode="numeric"
                    aria-invalid={cpfError ? "true" : "false"}
                    className={`w-full bg-white border rounded-2xl py-3.5 pl-11 pr-4 text-studio-text font-semibold focus:outline-none focus:ring-2 ${
                      cpfError
                        ? "border-red-200 focus:ring-red-200"
                        : "border-line focus:ring-studio-green/20"
                    }`}
                  />
                </div>
                {cpfError && <p className="text-[11px] text-danger">{cpfError}</p>}
              </div>
            </FormSection>
          </SurfaceCard>

          <SurfaceCard>
            <FormSection title="Endereço">
              <div className="grid gap-3">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
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
                      className={`w-full bg-white border rounded-2xl py-3.5 pl-11 pr-4 text-studio-text font-semibold focus:outline-none focus:ring-2 ${
                        cepStatus === "error"
                          ? "border-red-200 focus:ring-red-200"
                          : "border-line focus:ring-studio-green/20"
                      }`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCepLookup}
                    className="px-4 py-3.5 rounded-2xl bg-studio-light text-studio-text text-xs font-extrabold hover:bg-studio-green hover:text-white transition"
                  >
                    {cepStatus === "loading" ? "Buscando..." : "Buscar CEP"}
                  </button>
                </div>
                {cepStatus === "error" && <p className="text-[11px] text-danger">CEP inválido.</p>}
                <input
                  name="address_logradouro"
                  value={logradouro}
                  placeholder="Logradouro"
                  onChange={(e) => setLogradouro(e.target.value)}
                  className="w-full bg-white border border-line rounded-2xl py-3.5 px-4 text-studio-text font-semibold focus:outline-none focus:ring-2 focus:ring-studio-green/20"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    name="address_numero"
                    value={numero}
                    placeholder="Número"
                    onChange={(e) => setNumero(e.target.value)}
                    className="w-full bg-white border border-line rounded-2xl py-3.5 px-4 text-studio-text font-semibold focus:outline-none focus:ring-2 focus:ring-studio-green/20"
                  />
                  <input
                    name="address_complemento"
                    value={complemento}
                    placeholder="Complemento"
                    onChange={(e) => setComplemento(e.target.value)}
                    className="w-full bg-white border border-line rounded-2xl py-3.5 px-4 text-studio-text font-semibold focus:outline-none focus:ring-2 focus:ring-studio-green/20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    name="address_bairro"
                    value={bairro}
                    placeholder="Bairro"
                    onChange={(e) => setBairro(e.target.value)}
                    className="w-full bg-white border border-line rounded-2xl py-3.5 px-4 text-studio-text font-semibold focus:outline-none focus:ring-2 focus:ring-studio-green/20"
                  />
                  <input
                    name="address_cidade"
                    value={cidade}
                    placeholder="Cidade"
                    onChange={(e) => setCidade(e.target.value)}
                    className="w-full bg-white border border-line rounded-2xl py-3.5 px-4 text-studio-text font-semibold focus:outline-none focus:ring-2 focus:ring-studio-green/20"
                  />
                </div>
                <input
                  name="address_estado"
                  value={estado}
                  placeholder="Estado (UF)"
                  onChange={(e) => setEstado(e.target.value.toUpperCase())}
                  maxLength={2}
                  className="w-full bg-white border border-line rounded-2xl py-3.5 px-4 text-studio-text font-semibold focus:outline-none focus:ring-2 focus:ring-studio-green/20 uppercase"
                />
              </div>
            </FormSection>
          </SurfaceCard>

          <SurfaceCard>
            <FormSection title="Perfil e saúde">
              <div className="grid gap-3">
                <input
                  name="profissao"
                  placeholder="Profissão"
                  className="w-full bg-white border border-line rounded-2xl py-3.5 px-4 text-studio-text font-semibold focus:outline-none focus:ring-2 focus:ring-studio-green/20"
                />
                <input
                  name="como_conheceu"
                  placeholder="Como conheceu o estúdio"
                  className="w-full bg-white border border-line rounded-2xl py-3.5 px-4 text-studio-text font-semibold focus:outline-none focus:ring-2 focus:ring-studio-green/20"
                />
                <input
                  name="health_tags"
                  placeholder="Tags de saúde (separe por vírgula)"
                  className="w-full bg-white border border-line rounded-2xl py-3.5 px-4 text-studio-text font-semibold focus:outline-none focus:ring-2 focus:ring-studio-green/20"
                />
                <div className="relative">
                  <ShieldCheck className="absolute left-4 top-4 text-muted" size={18} />
                  <textarea
                    name="preferences_notes"
                    placeholder="Preferências"
                    rows={3}
                    className="w-full bg-white border border-line rounded-2xl py-3 pl-11 pr-4 text-studio-text font-semibold focus:outline-none focus:ring-2 focus:ring-studio-green/20 resize-none"
                  />
                </div>
                <div className="relative">
                  <AlertTriangle className="absolute left-4 top-4 text-muted" size={18} />
                  <textarea
                    name="contraindications"
                    placeholder="Contraindicações"
                    rows={3}
                    className="w-full bg-white border border-line rounded-2xl py-3 pl-11 pr-4 text-studio-text font-semibold focus:outline-none focus:ring-2 focus:ring-studio-green/20 resize-none"
                  />
                </div>
              </div>
            </FormSection>
          </SurfaceCard>

          <SurfaceCard>
            <FormSection title="Observações internas">
              <textarea
                name="observacoes_gerais"
                placeholder="Observações gerais do cliente"
                rows={4}
                className="w-full bg-white border border-line rounded-2xl py-3 px-4 text-studio-text font-semibold focus:outline-none focus:ring-2 focus:ring-studio-green/20 resize-none"
              />
            </FormSection>
          </SurfaceCard>

          <SurfaceCard>
            <FormSection title="Menor de idade">
              <div className="grid gap-3">
                <label className="flex items-center gap-2 text-xs font-extrabold text-muted">
                  <input
                    type="checkbox"
                    name="is_minor"
                    checked={isMinor}
                    onChange={(event) => setIsMinor(event.target.checked)}
                    className="accent-studio-green"
                  />
                  Cliente é menor de idade
                </label>
                {isMinor && (
                  <>
                    <div className="relative">
                      <Baby className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
                      <input
                        name="guardian_name"
                        placeholder="Nome do responsável"
                        className="w-full bg-white border border-line rounded-2xl py-3.5 pl-11 pr-4 text-studio-text font-semibold focus:outline-none focus:ring-2 focus:ring-studio-green/20"
                      />
                    </div>
                    <input
                      name="guardian_phone"
                      placeholder="Telefone do responsável"
                      className="w-full bg-white border border-line rounded-2xl py-3.5 px-4 text-studio-text font-semibold focus:outline-none focus:ring-2 focus:ring-studio-green/20"
                    />
                    <input
                      name="guardian_cpf"
                      placeholder="CPF do responsável"
                      className="w-full bg-white border border-line rounded-2xl py-3.5 px-4 text-studio-text font-semibold focus:outline-none focus:ring-2 focus:ring-studio-green/20"
                    />
                  </>
                )}
              </div>
            </FormSection>
          </SurfaceCard>

          <PrimaryButton type="submit" disabled={Boolean(phoneError || cpfError)}>
            Salvar cliente
          </PrimaryButton>
        </form>
      </main>
    </div>
  );
}
