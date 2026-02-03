"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { TimerBubble } from "./timer/timer-bubble";
import { TimerProvider } from "./timer/timer-provider";
import { BottomNav } from "./ui/bottom-nav";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const canShowBottomNav = () => {
    if (pathname === "/" || pathname === "/clientes" || pathname === "/caixa" || pathname === "/menu") {
      return true;
    }
    if (pathname === "/clientes/novo") return true;
    return false;
  };
  const showBottomNav = canShowBottomNav();

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
          <main
            data-shell-scroll
            className={`flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 scroll-smooth ${
              showBottomNav ? "pb-24" : "pb-8"
            }`}
          >
            {children}
          </main>

          <TimerBubble />

          {showBottomNav && (
            <BottomNav />
          )}
        </div>
      </div>
    </TimerProvider>
  );
}
