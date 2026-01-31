"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
    X, Play, Pause, CheckCircle, 
    CreditCard, Banknote, Smartphone, 
    MapPin, Clock, FileText, User
} from "lucide-react";
import { finishAppointment } from "../app/(dashboard)/admin/atendimento/actions";
import { startAppointment as startAppointmentAction } from "../app/actions";
import Link from "next/link";
import { useActiveSession } from "../src/shared/timer/useActiveSession";

// Tipagem deve vir de um arquivo compartilhado idealmente
export interface AppointmentDetails {
    id: string;
    service_name: string;
    start_time: string;
    finished_at: string | null;
    status: string | null;
    price: number | null;
    is_home_visit?: boolean | null;
    service_duration_minutes?: number | null;
    total_duration_minutes?: number | null;
    actual_duration_minutes?: number | null;
    address_cep?: string | null;
    address_logradouro?: string | null;
    address_numero?: string | null;
    address_complemento?: string | null;
    address_bairro?: string | null;
    address_cidade?: string | null;
    address_estado?: string | null;
    clients: {
        id: string; // Importante para fetch de notas se precisássemos aqui
        name: string;
        initials: string | null;
        phone?: string | null;
        health_tags?: string[] | null;
        endereco_completo?: string | null;
        address_cep?: string | null;
        address_logradouro?: string | null;
        address_numero?: string | null;
        address_complemento?: string | null;
        address_bairro?: string | null;
        address_cidade?: string | null;
        address_estado?: string | null;
    } | null;
}

interface Props {
    appointment: AppointmentDetails;
    onClose?: () => void;
    onUpdate: () => void;
    variant?: "modal" | "page";
}

type Tab = "INFO" | "EVOLUTION" | "CHECKOUT";
type PaymentMethod = 'pix' | 'cash' | 'card';

export function AppointmentDetailsModal({ appointment, onClose, onUpdate, variant = "modal" }: Props) {
    const [activeTab, setActiveTab] = useState<Tab>("INFO");
    const [notes, setNotes] = useState("");
    const [finalAmount, setFinalAmount] = useState<string>(String(appointment.price || "0.00"));
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { session, remainingSeconds, progress, isPaused, startSession, togglePause, stopSession } = useActiveSession();
    const isActiveSession = session?.appointmentId === appointment.id;
    const baseDurationMinutes = appointment.service_duration_minutes ?? appointment.total_duration_minutes ?? 30;
    const totalSeconds = Math.max(1, baseDurationMinutes * 60);
    const displayRemaining = isActiveSession ? remainingSeconds : totalSeconds;

    const formatTime = (totalSeconds: number) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        const prefix = hours > 0 ? `${hours.toString().padStart(2, "0")}:` : "";
        return `${prefix}${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleFinish = async () => {
        if (!paymentMethod) return;

        setIsSubmitting(true);
        try {
            const actualDurationMinutes = isActiveSession
                ? Math.max(0, Math.round((totalSeconds - remainingSeconds) / 60))
                : null;

            const result = await finishAppointment({
                appointmentId: appointment.id,
                paymentMethod,
                finalAmount: Number(finalAmount),
                notes,
                actualDurationMinutes,
            });

            if (result.ok) {
                onUpdate(); // Recarrega tela pai
                stopSession();
                if (onClose) onClose();
            } else {
                alert("Erro ao finalizar: " + result.error.message);
            }
        } catch (err) {
            console.error(err);
            alert("Erro inesperado");
        } finally {
            setIsSubmitting(false);
        }
    };

    const isModal = variant === "modal";
    const containerClasses = isModal
        ? "bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] relative z-10 animate-in zoom-in-95 duration-200"
        : "bg-white w-full rounded-3xl shadow-sm border border-stone-100 overflow-hidden flex flex-col";

    const addressLine = [
      appointment.address_logradouro ?? appointment.clients?.address_logradouro,
      appointment.address_numero ?? appointment.clients?.address_numero,
      appointment.address_complemento ?? appointment.clients?.address_complemento,
      appointment.address_bairro ?? appointment.clients?.address_bairro,
      appointment.address_cidade ?? appointment.clients?.address_cidade,
      appointment.address_estado ?? appointment.clients?.address_estado,
      appointment.address_cep ?? appointment.clients?.address_cep,
    ]
      .filter((value) => value && value.trim().length > 0)
      .join(", ");

    return (
        <div className={isModal ? "absolute inset-0 z-50 flex items-center justify-center p-4" : "w-full"}>
            {isModal && onClose && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
            )}
            <div className={containerClasses}>
                
                {/* Header */}
                <div className={`p-6 relative ${isModal ? "bg-studio-green text-white" : "bg-white text-gray-800 border-b border-stone-100"}`}>
                    {isModal && onClose && (
                      <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition">
                          <X size={20} />
                      </button>
                    )}
                    
                    <div className="flex items-center gap-4 mb-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold ${isModal ? "bg-white/20 border border-white/10" : "bg-stone-100 text-stone-700"}`}>
                            {appointment.clients?.initials || <User />}
                        </div>
                        <div>
                            {appointment.clients?.id ? (
                              <Link href={`/clientes/${appointment.clients.id}`} className="text-xl font-bold hover:underline">
                                {appointment.clients?.name}
                              </Link>
                            ) : (
                              <h2 className="text-xl font-bold">{appointment.clients?.name}</h2>
                            )}
                            <p className={`text-sm flex items-center gap-1 ${isModal ? "text-green-100 opacity-90" : "text-gray-500"}`}>
                                {appointment.service_name}
                                {appointment.is_home_visit && (
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full ml-2 ${isModal ? "bg-purple-500/80 text-white" : "bg-purple-100 text-purple-700"}`}>DOMICILIAR</span>
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Timer Integrado no Header */}
                    <div className={`rounded-xl p-3 flex items-center justify-between ${isModal ? "bg-green-900/30 border border-white/10" : "bg-stone-50 border border-stone-100"}`}>
                        <div className="flex items-center gap-3">
                            <Clock size={18} className={isModal ? "text-green-200" : "text-studio-green"} />
                            <span className="font-mono text-xl font-bold tracking-widest">{formatTime(displayRemaining)}</span>
                        </div>
                        <button 
                            onClick={async () => {
                                if (!isActiveSession) {
                                    const result = await startAppointmentAction(appointment.id);
                                    if (!result.ok) {
                                      alert("Erro ao iniciar: " + result.error.message);
                                      return;
                                    }
                                    startSession({
                                      appointmentId: appointment.id,
                                      clientName: appointment.clients?.name || "Cliente",
                                      serviceName: appointment.service_name,
                                      totalDurationMinutes: baseDurationMinutes,
                                    });
                                    return;
                                }
                                togglePause();
                            }}
                            className={`p-2 rounded-full shadow-lg transition-transform active:scale-95 flex items-center gap-2 px-4 ${isActiveSession && !isPaused ? 'bg-orange-500 text-white' : 'bg-white text-studio-green'}`}
                        >
                            {isActiveSession && !isPaused ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                            <span className="text-xs font-bold uppercase">{isActiveSession && !isPaused ? 'Pausar' : 'Iniciar'}</span>
                        </button>
                    </div>

                    <div className={`mt-3 h-1.5 rounded-full overflow-hidden ${isModal ? "bg-white/20" : "bg-stone-100"}`}>
                        <div className={`h-full transition-all ${isModal ? "bg-white/80" : "bg-studio-green"}`} style={{ width: `${Math.round(progress * 100)}%` }} />
                    </div>

                    {appointment.status !== "completed" && (
                      <button
                        onClick={() => setActiveTab("CHECKOUT")}
                        className="mt-4 w-full bg-white text-studio-green font-bold py-2 rounded-xl shadow-sm hover:bg-green-50 transition"
                      >
                        Finalizar atendimento
                      </button>
                    )}
                </div>

                {/* Tabs Navigation */}
                <div className="flex border-b border-stone-100">
                    <button 
                        onClick={() => setActiveTab("INFO")}
                        className={`flex-1 py-4 text-sm font-bold uppercase tracking-wide border-b-2 transition-colors ${activeTab === 'INFO' ? 'border-studio-green text-studio-green' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                    >
                        Resumo
                    </button>
                    <button 
                        onClick={() => setActiveTab("EVOLUTION")}
                        className={`flex-1 py-4 text-sm font-bold uppercase tracking-wide border-b-2 transition-colors ${activeTab === 'EVOLUTION' ? 'border-studio-green text-studio-green' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                    >
                        Evolução
                    </button>
                    <button 
                        onClick={() => setActiveTab("CHECKOUT")}
                        className={`flex-1 py-4 text-sm font-bold uppercase tracking-wide border-b-2 transition-colors ${activeTab === 'CHECKOUT' ? 'border-studio-green text-studio-green' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                    >
                        Pagar
                    </button>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-stone-50">
                    
                    {/* ABA INFO */}
                    {activeTab === 'INFO' && (
                        <div className="space-y-4 animate-in slide-in-from-left-4 duration-300">
                            <div className="bg-white p-4 rounded-xl border border-stone-100 shadow-sm">
                                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Data e Hora</label>
                                <div className="flex items-center gap-2 text-gray-800">
                                    <Clock size={16} className="text-studio-green" />
                                    <span className="font-medium">
                                        {format(new Date(appointment.start_time), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                                    </span>
                                </div>
                            </div>

                            {appointment.actual_duration_minutes !== null && appointment.actual_duration_minutes !== undefined && (
                                <div className="bg-white p-4 rounded-xl border border-stone-100 shadow-sm">
                                    <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Tempo do Atendimento</label>
                                    <div className="flex items-center gap-2 text-gray-800">
                                        <Clock size={16} className="text-studio-green" />
                                        <span className="font-medium">{appointment.actual_duration_minutes} min</span>
                                    </div>
                                </div>
                            )}

                            {appointment.clients?.phone && (
                                <div className="bg-white p-4 rounded-xl border border-stone-100 shadow-sm">
                                    <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Contato</label>
                                    <div className="flex items-center gap-2 text-gray-800">
                                        <Smartphone size={16} className="text-studio-green" />
                                        <span className="font-medium">{appointment.clients.phone}</span>
                                    </div>
                                </div>
                            )}

                            <div className="bg-white p-4 rounded-xl border border-stone-100 shadow-sm">
                                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Música</label>
                                <a
                                  href="https://open.spotify.com"
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-2 text-sm font-bold text-studio-green hover:underline"
                                >
                                  Abrir Spotify
                                </a>
                            </div>

                            {appointment.is_home_visit && (
                                <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 shadow-sm">
                                    <label className="text-xs font-bold text-purple-400 uppercase mb-2 flex items-center gap-1">
                                        <MapPin size={12} /> Endereço Domiciliar
                                    </label>
                                    <p className="text-purple-900 font-medium">
                                        {addressLine || appointment.clients?.endereco_completo || "Endereço não cadastrado no perfil."}
                                    </p>
                                    {addressLine && (
                                      <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressLine)}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-2 text-xs font-bold text-purple-700 mt-2 hover:underline"
                                      >
                                        Abrir no Maps
                                      </a>
                                    )}
                                </div>
                            )}
                            
                             {/* Tags de Saúde */}
                             {appointment.clients?.health_tags && appointment.clients.health_tags.length > 0 && (
                                 <div className="flex gap-2 flex-wrap">
                                     {appointment.clients.health_tags.map(tag => (
                                         <span key={tag} className="text-[10px] bg-red-100 text-red-700 px-2 py-1 rounded-md font-bold uppercase">
                                             ⚠️ {tag}
                                         </span>
                                     ))}
                                 </div>
                             )}
                        </div>
                    )}

                    {/* ABA EVOLUTION */}
                    {activeTab === 'EVOLUTION' && (
                         <div className="h-full flex flex-col animate-in slide-in-from-right-4 duration-300">
                            <label className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-2">
                                <FileText size={14} /> Notas do Atendimento
                            </label>
                            <textarea 
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="flex-1 w-full bg-white border border-stone-200 rounded-xl p-4 text-gray-700 focus:outline-none focus:ring-2 focus:ring-studio-green/20 min-h-50"
                                placeholder="Escreva aqui a evolução do paciente, dores relatadas, procedimentos realizados..."
                            />
                         </div>
                    )}

                    {/* ABA CHECKOUT */}
                    {activeTab === 'CHECKOUT' && (
                         <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                             <div>
                                 <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Valor Final</label>
                                 <div className="relative">
                                     <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">R$</span>
                                     <input 
                                        type="number" 
                                        value={finalAmount}
                                        onChange={(e) => setFinalAmount(e.target.value)}
                                        className="w-full bg-white border border-stone-200 rounded-xl py-4 pl-10 pr-4 text-2xl font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-studio-green/20"
                                     />
                                 </div>
                             </div>

                             <div>
                                 <label className="text-xs font-bold text-gray-400 uppercase mb-3 block">Forma de Pagamento</label>
                                 <div className="grid grid-cols-3 gap-3">
                                     <button 
                                        onClick={() => setPaymentMethod('pix')}
                                        className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${paymentMethod === 'pix' ? 'bg-green-50 border-studio-green text-studio-green' : 'bg-white border-stone-200 text-gray-400 hover:border-gray-300'}`}
                                     >
                                         <Smartphone size={24} />
                                         <span className="text-xs font-bold">Pix</span>
                                     </button>
                                     <button 
                                         onClick={() => setPaymentMethod('cash')}
                                         className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${paymentMethod === 'cash' ? 'bg-green-50 border-studio-green text-studio-green' : 'bg-white border-stone-200 text-gray-400 hover:border-gray-300'}`}
                                     >
                                         <Banknote size={24} />
                                         <span className="text-xs font-bold">Dinheiro</span>
                                     </button>
                                     <button 
                                         onClick={() => setPaymentMethod('card')}
                                         className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${paymentMethod === 'card' ? 'bg-green-50 border-studio-green text-studio-green' : 'bg-white border-stone-200 text-gray-400 hover:border-gray-300'}`}
                                     >
                                         <CreditCard size={24} />
                                         <span className="text-xs font-bold">Cartão</span>
                                     </button>
                                 </div>
                             </div>

                             <button 
                                disabled={!paymentMethod || isSubmitting}
                                onClick={handleFinish}
                                className="w-full bg-studio-green text-white font-bold py-4 rounded-xl shadow-lg shadow-green-200 flex items-center justify-center gap-2 hover:bg-studio-green-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-4"
                             >
                                 {isSubmitting ? (
                                     "Processando..." 
                                 ) : (
                                     <>
                                        <CheckCircle size={20} /> Receber e Finalizar
                                     </>
                                 )}
                             </button>
                         </div>
                    )}
                </div>
            </div>
        </div>
    );
}
