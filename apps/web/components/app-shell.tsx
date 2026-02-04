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
      <div className="h-[100dvh] bg-neutral-900 p-6 flex justify-center items-center overflow-hidden">
        <div
          className={`
          bg-studio-bg flex flex-col relative shadow-2xl overflow-hidden
          w-[min(414px,92vw)] h-[min(898px,92vh)] rounded-3xl
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
