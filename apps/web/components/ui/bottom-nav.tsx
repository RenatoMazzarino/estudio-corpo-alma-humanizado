"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Menu, Users, Wallet } from "lucide-react";

interface BottomNavProps {
  className?: string;
}

export function BottomNav({ className = "" }: BottomNavProps) {
  const pathname = usePathname();
  const isActive = (path: string) => pathname === path;

  const itemClass = (path: string) =>
    `flex flex-col items-center gap-0.5 w-16 transition ${
      isActive(path) ? "text-studio-green" : "text-muted hover:text-studio-green"
    }`;

  const labelClass = (path: string) =>
    `text-[10px] ${isActive(path) ? "font-extrabold" : "font-medium"}`;

  return (
    <nav
      className={`bg-white border-t border-line h-14 px-2 flex justify-around items-center z-40 absolute bottom-0 w-full safe-bottom ${className}`}
    >
      <Link href="/" className={itemClass("/")}>
        <Calendar size={20} />
        <span className={labelClass("/")}>Agenda</span>
      </Link>
      <Link href="/clientes" className={itemClass("/clientes")}>
        <Users size={20} />
        <span className={labelClass("/clientes")}>Clientes</span>
      </Link>
      <Link href="/caixa" className={itemClass("/caixa")}>
        <Wallet size={20} />
        <span className={labelClass("/caixa")}>Caixa</span>
      </Link>
      <Link href="/menu" className={itemClass("/menu")}>
        <Menu size={20} />
        <span className={labelClass("/menu")}>Menu</span>
      </Link>
    </nav>
  );
}
