"use client";

import { ReactNode, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Monitor, Smartphone, Menu, Calendar, Wallet, Users } from "lucide-react";
import { ActiveSessionBar } from "./active-session-bar";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [isMobile, setIsMobile] = useState(true);
  const pathname = usePathname();

  // Função para decidir a cor do ícone (Ativo vs Inativo)
  // Agora usando as classes corretas do Tailwind
  const getIconColor = (path: string) => 
    pathname === path ? "text-studio-green bg-green-50" : "text-gray-400 hover:bg-gray-50";

  return (
    // Fundo geral usando var(--color-studio-bg)
    <div className={`min-h-screen transition-all duration-500 ${isMobile ? "bg-gray-200 py-8 flex justify-center" : "bg-studio-bg"}`}>
      
      <div 
        className={`
          bg-studio-bg flex flex-col relative transition-all duration-500 shadow-2xl overflow-hidden
          ${isMobile 
            ? "w-full max-w-[414px] h-[850px] rounded-[2.5rem] border-8 border-gray-800"
            : "w-full min-h-screen rounded-none border-0"
          }
        `}
      >
        
        {/* Cabeçalho */}
        <header className="bg-white/80 backdrop-blur-md border-b border-stone-200 px-6 py-4 flex justify-between items-center sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10">
                <Image 
                  src="/logo.png" 
                  alt="Logo Estúdio Corpo & Alma" 
                  width={40} 
                  height={40} 
                  className="object-contain"
                  priority 
                />
            </div>
            <div>
                <h1 className="text-sm font-bold text-studio-green uppercase tracking-wide">Corpo & Alma</h1>
                <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                <p className="text-[9px] text-gray-400 font-medium">Online</p>
                </div>
            </div>
          </div>
          
          <div className="w-8 h-8 bg-studio-pink/20 rounded-full flex items-center justify-center text-studio-green font-bold text-xs border border-studio-pink/50">
            JS
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 space-y-4 pb-24 scroll-smooth">
          {children}
        </main>

        <ActiveSessionBar />

        {/* Menu Inferior Interativo */}
        <nav className="bg-white border-t border-stone-100 h-20 absolute bottom-0 w-full flex justify-around items-center pb-2 z-30 shadow-[0_-5px_15px_rgba(0,0,0,0.02)]">
           
           <Link href="/" className={`flex flex-col items-center gap-1 p-2 rounded-lg transition ${getIconColor("/")}`}>
             <Calendar size={20} />
             <span className="text-[10px] font-medium">Agenda</span>
           </Link>

           <Link href="/clientes" className={`flex flex-col items-center gap-1 p-2 rounded-lg transition ${getIconColor("/clientes")}`}>
             <Users size={20} />
             <span className="text-[10px] font-medium">Clientes</span>
           </Link>

           <Link href="/caixa" className={`flex flex-col items-center gap-1 p-2 rounded-lg transition ${getIconColor("/caixa")}`}>
             <Wallet size={20} />
             <span className="text-[10px] font-medium">Caixa</span>
           </Link>

           <Link href="/menu" className={`flex flex-col items-center gap-1 p-2 rounded-lg transition ${getIconColor("/menu")}`}>
             <Menu size={20} />
             <span className="text-[10px] font-medium">Menu</span>
           </Link>
        </nav>

      </div>

      <button 
        onClick={() => setIsMobile(!isMobile)}
        className="fixed bottom-24 right-6 bg-studio-green hover:bg-studio-green-dark text-white p-4 rounded-full shadow-xl hover:scale-105 transition-all z-50 flex items-center gap-2 font-bold text-xs"
      >
        {isMobile ? <><Monitor size={18} /> Web</> : <><Smartphone size={18} /> Mobile</>}
      </button>

    </div>
  );
}
