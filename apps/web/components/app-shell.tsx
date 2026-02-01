"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Calendar, Wallet, Users } from "lucide-react";
import { TimerBubble } from "./timer/timer-bubble";
import { TimerProvider } from "./timer/timer-provider";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const hideNav = pathname.startsWith("/atendimento") && process.env.NEXT_PUBLIC_ATTENDANCE_UIV4 === "1";

  // Função para decidir a cor do ícone (Ativo vs Inativo)
  // Agora usando as classes corretas do Tailwind
  const getIconColor = (path: string) => 
    pathname === path ? "text-studio-green" : "text-gray-300 hover:text-studio-green";

  return (
    <TimerProvider>
      {/* Fundo geral usando var(--color-studio-bg) */}
      <div className="min-h-screen bg-neutral-900 py-6 flex justify-center">
        <div
          className={`
          bg-studio-bg flex flex-col relative shadow-2xl overflow-hidden
          w-full max-w-[414px] min-h-[100dvh] rounded-2xl
        `}
        >
          <main className="flex-1 overflow-y-auto p-4 space-y-4 pb-24 scroll-smooth">
            {children}
          </main>

          <TimerBubble />

          {!hideNav && (
            <nav className="bg-white border-t border-gray-100 py-3 px-2 flex justify-around items-center z-40 absolute bottom-0 w-full">
              <Link href="/" className={`flex flex-col items-center gap-1 w-16 transition ${getIconColor("/")}`}>
                <Calendar size={22} />
                <span className="text-[10px] font-extrabold">Agenda</span>
              </Link>

              <Link href="/clientes" className={`flex flex-col items-center gap-1 w-16 transition ${getIconColor("/clientes")}`}>
                <Users size={22} />
                <span className="text-[10px] font-medium">Clientes</span>
              </Link>

              <Link href="/caixa" className={`flex flex-col items-center gap-1 w-16 transition ${getIconColor("/caixa")}`}>
                <Wallet size={22} />
                <span className="text-[10px] font-medium">Caixa</span>
              </Link>

              <Link href="/menu" className={`flex flex-col items-center gap-1 w-16 transition ${getIconColor("/menu")}`}>
                <Menu size={22} />
                <span className="text-[10px] font-medium">Menu</span>
              </Link>
            </nav>
          )}
        </div>
      </div>
    </TimerProvider>
  );
}
