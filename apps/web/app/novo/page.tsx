import { AppShell } from "../../components/app-shell";
import { format } from "date-fns";

import { ChevronLeft, Calendar, Clock, User, Sparkles, Banknote } from "lucide-react";
import Link from "next/link";
import { createClient } from "../../lib/supabase/server";
import { redirect } from "next/navigation";

import { FIXED_TENANT_ID } from "../../lib/tenant-context";

// Definindo tipos
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

interface PageProps {
  searchParams: SearchParams;
}

// Helper para sanitizar a data
function getSafeDate(dateParam: string | string[] | undefined): string {
  if (typeof dateParam === "string") {
    return dateParam;
  }
  // Fallback para hoje
  return format(new Date(), "yyyy-MM-dd");
}

// Ação do Servidor (Server Action)
async function createAppointment(formData: FormData) {
  "use server";

  const supabase = await createClient();
  
  const clientName = formData.get("clientName") as string;
  const service = formData.get("service") as string;
  const price = formData.get("price") as string; // NOVO: Pegando o preço
  const date = formData.get("date") as string; 
  const time = formData.get("time") as string; 

  if (!clientName || !service || !date || !time) {
    throw new Error("Dados incompletos");
  }

  // 1. Cria ou busca cliente
  const { data: newClient } = await supabase
    .from("clients")
    .insert({ 
      name: clientName, 
      initials: clientName.slice(0, 2).toUpperCase(),
      tenant_id: FIXED_TENANT_ID 
    })
    .select()
    .single();

  // 2. Cria o agendamento
  if (newClient) {
    // Correção do Fuso Horário (Gera ISO String baseada no horário local do input)
    const fullDate = new Date(`${date}T${time}:00`).toISOString();
    
    await supabase.from("appointments").insert({
      client_id: newClient.id,
      service_name: service,
      start_time: fullDate,
      price: parseFloat(price), // NOVO: Convertendo texto para numero decimal
      status: "pending",
      tenant_id: FIXED_TENANT_ID
    });
  }

  // 3. Redirecionamento
  redirect(`/?date=${date}`);
}

export default async function NewAppointment(props: PageProps) {
  const params = await props.searchParams;
  
  const safeDate = getSafeDate(params.date);


  return (
    <AppShell>
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/?date=${safeDate}`} className="p-2 bg-white rounded-full text-gray-600 shadow-sm border border-stone-100">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-lg font-bold text-gray-800">Novo Agendamento</h1>
      </div>

      {/* Formulário */}
      <form action={createAppointment} className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100 space-y-5">
        
        {/* Aviso da Data (Removido para usar o input nativo) */}
        {/* <div className="flex items-center gap-3 text-studio-green bg-green-50 p-4 rounded-2xl border border-green-100">
          <Calendar size={20} />
          <div>
            <p className="text-xs text-green-600 font-bold uppercase tracking-wider">Data Selecionada</p>
            <p className="font-bold capitalize">{formattedDate}</p>
          </div>
        </div> */}

        {/* Input: Data (Agora Visível para Retroativo) */}
        <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Data do Agendamento</label>
            <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                name="date"
                type="date" 
                defaultValue={safeDate}
                className="w-full bg-stone-50 border-stone-100 border rounded-xl py-3.5 pl-11 pr-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20 focus:border-studio-green"
                required
                />
            </div>
        </div>

        {/* Input: Cliente */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase ml-1">Nome da Cliente</label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              name="clientName"
              type="text" 
              placeholder="Ex: Fernanda Silva" 
              className="w-full bg-stone-50 border-stone-100 border rounded-xl py-3.5 pl-11 pr-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20 focus:border-studio-green"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
            {/* Input: Serviço */}
            <div className="space-y-2 col-span-2">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Serviço</label>
            <div className="relative">
                <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                name="service"
                type="text" 
                placeholder="Ex: Massagem" 
                className="w-full bg-stone-50 border-stone-100 border rounded-xl py-3.5 pl-11 pr-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20 focus:border-studio-green"
                required
                />
            </div>
            </div>

            {/* Input: Valor (NOVO) */}
            <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Valor (R$)</label>
            <div className="relative">
                <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                name="price"
                type="number" 
                step="0.01"
                placeholder="0,00" 
                className="w-full bg-stone-50 border-stone-100 border rounded-xl py-3.5 pl-11 pr-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20 focus:border-studio-green"
                required
                />
            </div>
            </div>

            {/* Input: Horário */}
            <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Horário</label>
            <div className="relative">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                name="time"
                type="time" 
                defaultValue="09:00"
                className="w-full bg-stone-50 border-stone-100 border rounded-xl py-3.5 pl-11 pr-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20 focus:border-studio-green"
                required
                />
            </div>
            </div>
        </div>

        {/* Botão Salvar */}
        <button 
          type="submit" 
          className="w-full bg-studio-green text-white font-bold py-4 rounded-2xl shadow-lg shadow-green-100 hover:bg-studio-green-dark transition-all mt-4 flex items-center justify-center gap-2"
        >
          Confirmar Agendamento
        </button>

      </form>
    </AppShell>
  );
}