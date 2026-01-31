"use client";

import { useState } from "react";
import { Mail, Phone, MessageCircle, MapPin, Briefcase, Calendar, IdCard, Tags, Pencil } from "lucide-react";
import type { Database } from "../../../../lib/supabase/types";
import { updateClientProfile } from "./actions";

type ClientRow = Database["public"]["Tables"]["clients"]["Row"];

interface ClientProfileProps {
  client: ClientRow;
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function ClientProfile({ client }: ClientProfileProps) {
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const phoneDigits = client.phone ? onlyDigits(client.phone) : "";
  const whatsappLink = phoneDigits ? `https://wa.me/55${phoneDigits}` : null;
  const callLink = phoneDigits ? `tel:+55${phoneDigits}` : null;

  return (
    <div className="bg-white p-5 rounded-3xl shadow-sm border border-stone-100 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{client.name}</h2>
          {client.email && <p className="text-xs text-gray-400 mt-1">{client.email}</p>}
        </div>
        <button
          onClick={() => setEditing((prev) => !prev)}
          className="flex items-center gap-2 text-xs font-bold text-studio-green bg-green-50 px-3 py-2 rounded-full hover:bg-green-100 transition"
        >
          <Pencil size={14} />
          {editing ? "Fechar edição" : "Editar"}
        </button>
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
      </div>

      <div className="grid grid-cols-1 gap-3 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <Phone size={14} className="text-gray-400" />
          <span>{client.phone || "Telefone não informado"}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-gray-400" />
          <span>{client.data_nascimento || "Data de nascimento não informada"}</span>
        </div>
        <div className="flex items-center gap-2">
          <IdCard size={14} className="text-gray-400" />
          <span>{client.cpf || "CPF não informado"}</span>
        </div>
        <div className="flex items-center gap-2">
          <Briefcase size={14} className="text-gray-400" />
          <span>{client.profissao || "Profissão não informada"}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin size={14} className="text-gray-400" />
          <span>{client.endereco_completo || "Endereço não informado"}</span>
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
              defaultValue={client.phone ?? ""}
              placeholder="Telefone / WhatsApp"
              inputMode="numeric"
              pattern="\\(\\d{2}\\) \\d{4,5}-\\d{4}"
              className="w-full bg-stone-50 border-stone-100 border rounded-xl py-3.5 px-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20"
            />
            <p className="text-[11px] text-gray-400">DDD obrigatório.</p>
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
              defaultValue={client.cpf ?? ""}
              placeholder="CPF"
              inputMode="numeric"
              pattern="\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}"
              className="w-full bg-stone-50 border-stone-100 border rounded-xl py-3.5 px-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20"
            />
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
            <textarea
              name="endereco_completo"
              defaultValue={client.endereco_completo ?? ""}
              placeholder="Endereço completo"
              rows={3}
              className="w-full bg-stone-50 border-stone-100 border rounded-xl py-3.5 px-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20 resize-none"
            />
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
            className="w-full bg-studio-green text-white font-bold py-3 rounded-2xl shadow-lg shadow-green-100 hover:bg-studio-green-dark transition-all"
          >
            Salvar alterações
          </button>
        </form>
      )}
    </div>
  );
}
