import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Wallet, TrendingUp, AlertCircle } from "lucide-react";
import Link from "next/link";
import { format, addDays, subDays, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FIXED_TENANT_ID } from "../../../lib/tenant-context";
import { listCompletedAppointmentsInRange } from "../../../src/modules/appointments/repository";
import { listTransactionsInRange } from "../../../src/modules/finance/repository";

// Interface dos dados
interface Appointment {
  id: string;
  service_name: string;
  price: number | null; 
  clients: {
    name: string;
  } | null;
}

type RawAppointment = Omit<Appointment, "clients"> & {
  clients: Appointment["clients"] | Appointment["clients"][] | null;
};

interface PageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

interface Transaction {
  id: string;
  appointment_id: string | null;
  description: string | null;
  amount: number | null;
  type: "income" | "expense" | "refund" | string;
  payment_method: string | null;
  created_at: string;
}

export default async function CaixaPage({ searchParams }: PageProps) {
  const today = new Date();
  let selectedDate = today;

  if (searchParams?.date && typeof searchParams.date === "string") {
    selectedDate = parseISO(searchParams.date);
  }
  
  const nextDay = format(addDays(selectedDate, 1), "yyyy-MM-dd");
  const prevDay = format(subDays(selectedDate, 1), "yyyy-MM-dd");

  const startOfDay = new Date(selectedDate);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(selectedDate);
  endOfDay.setHours(23, 59, 59, 999);

  // Busca transações do dia (ledger)
  const { data: transactionsData } = await listTransactionsInRange(
    FIXED_TENANT_ID,
    startOfDay.toISOString(),
    endOfDay.toISOString()
  );

  const transactions = (transactionsData ?? []) as Transaction[];
  const incomeTransactions = transactions.filter((transaction) => transaction.type === "income");

  const totalFaturado = incomeTransactions.reduce((acc, item) => {
    return acc + (item.amount || 0);
  }, 0);

  // Busca agendamentos finalizados para reconciliação
  const { data } = await listCompletedAppointmentsInRange(
    FIXED_TENANT_ID,
    startOfDay.toISOString(),
    endOfDay.toISOString()
  );

  const rawAppointments = (data ?? []) as unknown as RawAppointment[];
  const appointments: Appointment[] = rawAppointments.map((appt) => ({
    ...appt,
    clients: Array.isArray(appt.clients) ? appt.clients[0] ?? null : appt.clients,
  }));

  const appointmentTotal = appointments.reduce((acc, item) => acc + (item.price || 0), 0);
  const appointmentMap = new Map(appointments.map((item) => [item.id, item]));
  const incomeAppointmentIds = new Set(
    incomeTransactions.map((transaction) => transaction.appointment_id).filter(Boolean) as string[]
  );
  const missingTransactions = appointments.filter((appointment) => !incomeAppointmentIds.has(appointment.id));
  const orphanTransactions = incomeTransactions.filter(
    (transaction) => transaction.appointment_id && !appointmentMap.has(transaction.appointment_id)
  );
  const hasMismatch = missingTransactions.length > 0 || orphanTransactions.length > 0 || totalFaturado !== appointmentTotal;

  const dateTitle = format(selectedDate, "d 'de' MMMM", { locale: ptBR });
  const isToday = isSameDay(selectedDate, today);

  return (
    <div className="flex flex-col h-full bg-stone-50 p-4 pb-24 overflow-y-auto">
      {/* Navegação de Data */}
      <div className="flex items-center justify-between mb-6 bg-white p-3 rounded-2xl shadow-sm border border-stone-100 sticky top-0 z-10">
        <Link href={`/caixa?date=${prevDay}`} className="p-2 hover:bg-stone-50 rounded-full text-gray-500 transition">
          <ChevronLeft size={20} />
        </Link>
        
        <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
              {isToday ? "HOJE" : format(selectedDate, "yyyy", { locale: ptBR })}
            </span>
            <div className="flex items-center gap-2 text-gray-800 font-bold capitalize">
              <CalendarIcon size={14} className="text-studio-green" />
              {dateTitle}
            </div>
        </div>

        <Link href={`/caixa?date=${nextDay}`} className="p-2 hover:bg-stone-50 rounded-full text-gray-500 transition">
          <ChevronRight size={20} />
        </Link>
      </div>

      {/* PLACAR DO DINHEIRO */}
      <div className="bg-gray-900 text-white p-6 rounded-3xl shadow-xl shadow-gray-200 mb-6 relative overflow-hidden border border-gray-800 transform transition-transform hover:scale-[1.02] duration-300">
        <div className="absolute right-0 top-0 w-32 h-32 bg-studio-green/20 rounded-full blur-3xl"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Wallet size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Faturamento do Dia</span>
          </div>
          <h2 className="text-4xl font-bold tracking-tight text-white">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalFaturado)}
          </h2>
          <p className="text-gray-400 text-xs mt-2 flex items-center gap-1">
            <TrendingUp size={12} className="text-green-400" />
            Baseado em {incomeTransactions.length} transações de entrada
          </p>
        </div>
      </div>

      {hasMismatch && (
        <div className="bg-orange-50 border border-orange-200 text-orange-700 p-4 rounded-2xl mb-6 text-sm">
          <div className="flex items-center gap-2 font-bold mb-1">
            <AlertCircle size={14} />
            Divergência na reconciliação
          </div>
          <p className="text-xs">
            Total de atendimentos concluídos:{" "}
            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(appointmentTotal)}.
            Total do ledger:{" "}
            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalFaturado)}.
          </p>
          {missingTransactions.length > 0 && (
            <p className="text-xs mt-2">
              {missingTransactions.length} atendimento(s) concluído(s) sem transação registrada.
            </p>
          )}
          {orphanTransactions.length > 0 && (
            <p className="text-xs mt-1">
              {orphanTransactions.length} transação(ões) de entrada sem atendimento associado.
            </p>
          )}
        </div>
      )}

      {/* Lista de Entradas */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2">Histórico do Dia</h3>
        
        {transactions.length > 0 ? (
          transactions.map((transaction) => {
            const appointment = transaction.appointment_id
              ? appointmentMap.get(transaction.appointment_id) || null
              : null;
            const displayName = appointment?.clients?.name || transaction.description || "Transação";
            const displayService = appointment?.service_name || transaction.type;
            const value = transaction.amount || 0;

            return (
              <div
                key={transaction.id}
                className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100 flex justify-between items-center"
              >
                <div>
                  <h4 className="font-bold text-gray-800 text-sm">{displayName}</h4>
                  <p className="text-xs text-gray-500">{displayService}</p>
                </div>
                <div className="text-right">
                  {value ? (
                    <span className="font-bold text-gray-800">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)}
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded-md flex items-center gap-1">
                      <AlertCircle size={10} /> Sem Valor
                    </span>
                  )}
                </div>
              </div>
            );
          })
        ) : (
           <div className="text-center py-10 opacity-50 flex flex-col items-center">
             <Wallet size={32} className="text-gray-300 mb-2" />
             <p className="text-sm text-gray-400">Nenhum valor entrou hoje.</p>
           </div>
        )}
      </div>
    </div>
  );
}
