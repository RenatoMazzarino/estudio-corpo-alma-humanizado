"use client";

import type { ReactNode } from "react";
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
      <div className="app-viewport bg-neutral-900 flex justify-center items-stretch overflow-hidden">
        <div
          className={`
          app-frame bg-studio-bg flex flex-col relative shadow-2xl overflow-hidden
        `}
        >
          <div
            data-shell-scroll
            className="flex-1 overflow-y-auto overflow-x-hidden px-4 pt-0 space-y-4 scroll-smooth"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {children}
          </div>

          <TimerBubble />

          {showBottomNav && <BottomNav className="shrink-0" />}
        </div>
      </div>
    </TimerProvider>
  );
}
