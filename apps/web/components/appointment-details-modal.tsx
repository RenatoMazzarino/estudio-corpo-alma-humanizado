"use client";

import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
    X, Play, Pause, CheckCircle, 
    CreditCard, Banknote, Smartphone, 
    MapPin, Clock, FileText, User
} from "lucide-react";
import { finishAppointment } from "../app/admin/atendimento/actions";

// Tipagem deve vir de um arquivo compartilhado idealmente
export interface AppointmentDetails {
    id: string;
    service_name: string;
    start_time: string;
    finished_at: string | null;
    status: string;
    price: number | null;
    is_home_visit?: boolean;
    clients: {
        id: string; // Importante para fetch de notas se precisássemos aqui
        name: string;
        initials: string | null;
        phone?: string | null;
        health_tags?: string[] | null;
        endereco_completo?: string | null;
    } | null;
}

interface Props {
    appointment: AppointmentDetails;
    onClose: () => void;
    onUpdate: () => void;
}

type Tab = "INFO" | "EVOLUTION" | "CHECKOUT";
type PaymentMethod = 'pix' | 'cash' | 'card';

export function AppointmentDetailsModal({ appointment, onClose, onUpdate }: Props) {
    const [activeTab, setActiveTab] = useState<Tab>("INFO");
    const [notes, setNotes] = useState("");
    const [finalAmount, setFinalAmount] = useState<string>(String(appointment.price || "0.00"));
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Timer Logic
    const [isRunning, setIsRunning] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const timerInterval = useRef<NodeJS.Timeout | null>(null);

    // Formata o cronômetro HH:MM:SS
    const formatTime = (totalSeconds: number) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const toggleTimer = () => {
        if (isRunning) {
            if (timerInterval.current) clearInterval(timerInterval.current);
            setIsRunning(false);
        } else {
            setIsRunning(true);
            timerInterval.current = setInterval(() => {
                setElapsedSeconds(prev => prev + 1);
            }, 1000);
        }
    };

    // Cleanup timer
    useEffect(() => {
        return () => {
            if (timerInterval.current) clearInterval(timerInterval.current);
        };
    }, []);

    const handleFinish = async () => {
        if (!paymentMethod) return;

        setIsSubmitting(true);
        try {
            const result = await finishAppointment({
                appointmentId: appointment.id,
                paymentMethod,
                finalAmount: Number(finalAmount),
                notes
            });

            if (result.ok) {
                onUpdate(); // Recarrega tela pai
                onClose();
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

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] relative z-10 animate-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="bg-studio-green p-6 text-white relative">
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition">
                        <X size={20} />
                    </button>
                    
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-2xl font-bold backdrop-blur-md border border-white/10">
                            {appointment.clients?.initials || <User />}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold font-serif">{appointment.clients?.name}</h2>
                            <p className="text-green-100 text-sm opacity-90 flex items-center gap-1">
                                {appointment.service_name}
                                {appointment.is_home_visit && (
                                    <span className="bg-purple-500/80 text-white text-[10px] px-2 py-0.5 rounded-full ml-2">DOMICILIAR</span>
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Timer Integrado no Header */}
                    <div className="bg-green-900/30 rounded-xl p-3 flex items-center justify-between border border-white/10">
                        <div className="flex items-center gap-3">
                            <Clock size={18} className="text-green-200" />
                            <span className="font-mono text-xl font-bold tracking-widest">{formatTime(elapsedSeconds)}</span>
                        </div>
                        <button 
                            onClick={toggleTimer}
                            className={`p-2 rounded-full shadow-lg transition-transform active:scale-95 flex items-center gap-2 px-4 ${isRunning ? 'bg-orange-500 text-white' : 'bg-white text-studio-green'}`}
                        >
                            {isRunning ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                            <span className="text-xs font-bold uppercase">{isRunning ? 'Pausar' : 'Iniciar'}</span>
                        </button>
                    </div>
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

                            {appointment.clients?.phone && (
                                <div className="bg-white p-4 rounded-xl border border-stone-100 shadow-sm">
                                    <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Contato</label>
                                    <div className="flex items-center gap-2 text-gray-800">
                                        <Smartphone size={16} className="text-studio-green" />
                                        <span className="font-medium">{appointment.clients.phone}</span>
                                    </div>
                                </div>
                            )}

                            {appointment.is_home_visit && (
                                <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 shadow-sm">
                                    <label className="text-xs font-bold text-purple-400 uppercase mb-2 block flex items-center gap-1">
                                        <MapPin size={12} /> Endereço Domiciliar
                                    </label>
                                    <p className="text-purple-900 font-medium">
                                        {appointment.clients?.endereco_completo || "Endereço não cadastrado no perfil."}
                                    </p>
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
                                className="flex-1 w-full bg-white border border-stone-200 rounded-xl p-4 text-gray-700 focus:outline-none focus:ring-2 focus:ring-studio-green/20 min-h-[200px]"
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
