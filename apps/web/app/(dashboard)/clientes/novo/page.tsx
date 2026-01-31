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

export default function NewClientPage() {
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
                className="w-full bg-stone-50 border-stone-100 border rounded-xl py-3.5 pl-11 pr-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20 focus:border-studio-green"
                />
            </div>
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
                className="w-full bg-stone-50 border-stone-100 border rounded-xl py-3.5 pl-11 pr-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20 focus:border-studio-green"
                />
            </div>
        </div>

        {/* Endereço */}
        <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Endereço Completo</label>
            <div className="relative">
                <MapPin className="absolute left-4 top-4 text-gray-400" size={18} />
                <textarea 
                name="endereco_completo"
                placeholder="Rua, número, bairro, cidade..."
                rows={3}
                className="w-full bg-stone-50 border-stone-100 border rounded-xl py-3.5 pl-11 pr-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20 focus:border-studio-green resize-none"
                />
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
          className="w-full bg-studio-green text-white font-bold py-4 rounded-2xl shadow-lg shadow-green-100 hover:bg-studio-green-dark transition-all mt-4 flex items-center justify-center gap-2"
        >
          <Save size={18} />
          Salvar Cadastro
        </button>

      </form>
    </>
  );
}
