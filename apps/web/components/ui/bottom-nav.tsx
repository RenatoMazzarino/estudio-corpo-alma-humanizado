"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, MessageCircle, Users, Wallet } from "lucide-react";
import { FooterRail } from "./footer-rail";

interface BottomNavProps {
  className?: string;
}

export function BottomNav({ className = "" }: BottomNavProps) {
  const pathname = usePathname();
  const isActive = (path: string) => pathname === path;

  const itemClass = (path: string) =>
    `flex w-16 flex-col items-center gap-0.5 transition ${
      isActive(path) ? "text-white" : "text-white/70 hover:text-white"
    }`;

  const labelClass = (path: string) =>
    `text-[9px] ${isActive(path) ? "font-extrabold" : "font-medium"}`;

  return (
    <FooterRail
      className={`z-40 w-full border-white/20 ${className}`}
      surfaceClassName="!bg-studio-green"
      paddingXClassName="px-2"
      rowClassName="flex items-center justify-around"
    >
      <Link href="/" className={itemClass("/")}>
        <Calendar size={20} />
        <span className={labelClass("/")}>Agenda</span>
      </Link>
      <Link href="/mensagens" className={itemClass("/mensagens")}>
        <MessageCircle size={20} />
        <span className={labelClass("/mensagens")}>Mensagens</span>
      </Link>
      <Link href="/clientes" className={itemClass("/clientes")}>
        <Users size={20} />
        <span className={labelClass("/clientes")}>Clientes</span>
      </Link>
      <Link href="/caixa" className={itemClass("/caixa")}>
        <Wallet size={20} />
        <span className={labelClass("/caixa")}>Financeiro</span>
      </Link>
    </FooterRail>
  );
}
