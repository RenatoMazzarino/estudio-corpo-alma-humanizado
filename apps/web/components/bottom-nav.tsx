"use client";

import { Calendar, DollarSign, Users, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function BottomNav() {
  const pathname = usePathname();

  if (pathname.startsWith("/agendar")) return null;

  const isActive = (path: string) => pathname === path;

  return (
    <div className="bg-white border-t border-stone-100 px-6 py-4 flex justify-between items-center shadow-[0_-5px_20px_rgba(0,0,0,0.02)]">
      
      <Link href="/" className={`flex flex-col items-center gap-1 transition-colors ${isActive('/') ? 'text-studio-green' : 'text-gray-400 hover:text-gray-600'}`}>
        <Calendar size={24} strokeWidth={isActive('/') ? 2.5 : 2} />
        <span className="text-[10px] font-bold">Agenda</span>
      </Link>

      <Link href="/caixa" className={`flex flex-col items-center gap-1 transition-colors ${isActive('/caixa') ? 'text-studio-green' : 'text-gray-400 hover:text-gray-600'}`}>
        <DollarSign size={24} strokeWidth={isActive('/caixa') ? 2.5 : 2} />
        <span className="text-[10px] font-bold">Caixa</span>
      </Link>

      <Link href="/clientes" className={`flex flex-col items-center gap-1 transition-colors ${isActive('/clientes') ? 'text-studio-green' : 'text-gray-400 hover:text-gray-600'}`}>
        <Users size={24} strokeWidth={isActive('/clientes') ? 2.5 : 2} />
        <span className="text-[10px] font-bold">Clientes</span>
      </Link>

      <Link href="/menu" className={`flex flex-col items-center gap-1 transition-colors ${isActive('/menu') ? 'text-studio-green' : 'text-gray-400 hover:text-gray-600'}`}>
        <Menu size={24} strokeWidth={isActive('/menu') ? 2.5 : 2} />
        <span className="text-[10px] font-bold">Menu</span>
      </Link>

    </div>
  );
}
