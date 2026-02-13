"use client";

import type { CSSProperties, ReactNode } from "react";
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
    if (
      pathname === "/" ||
      pathname === "/clientes" ||
      pathname === "/caixa" ||
      pathname === "/mensagens" ||
      pathname === "/menu"
    ) {
      return true;
    }
    if (pathname === "/clientes/novo") return true;
    return false;
  };
  const showBottomNav = canShowBottomNav();
  const navHeight = showBottomNav ? "calc(48px + env(safe-area-inset-bottom))" : "0px";
  const isFullBleed = pathname === "/" || pathname === "/clientes";

  return (
    <TimerProvider>
      {/* Fundo geral usando var(--color-studio-bg) */}
      <div className="app-viewport flex justify-center items-stretch overflow-hidden bg-neutral-900">
        <div
          id="app-frame"
          className="app-frame bg-studio-bg grid grid-rows-[1fr_auto] relative shadow-2xl min-h-0 overflow-hidden"
          style={{ "--nav-height": navHeight } as CSSProperties}
        >
          <div
            data-shell-scroll
            className={`min-h-0 overflow-x-hidden scroll-smooth ${
              isFullBleed ? "flex flex-col p-0 overflow-y-auto" : "px-4 pt-0 space-y-4 overflow-y-auto"
            }`}
            style={{
              WebkitOverflowScrolling: "touch",
            }}
          >
            {children}
          </div>

          <TimerBubble />

          <div id="app-overlay" className="absolute inset-0 pointer-events-none z-40" />

          {showBottomNav && <BottomNav className="shrink-0" />}
        </div>
      </div>
    </TimerProvider>
  );
}
