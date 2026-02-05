"use client";

import type { ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { TimerBubble } from "./timer/timer-bubble";
import { TimerProvider } from "./timer/timer-provider";
import { BottomNav } from "./ui/bottom-nav";
import { DebugPointerOverlay } from "./debug/debug-pointer-overlay";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const debugTouch = searchParams.get("debug") === "1";
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
          app-frame bg-studio-bg flex flex-col relative shadow-2xl overflow-hidden min-h-0 ${
            debugTouch ? "debug-hitbox" : ""
          }
        `}
        >
          <div
            data-shell-scroll
            className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 pt-0 space-y-4 scroll-smooth"
            style={{
              WebkitOverflowScrolling: "touch",
              paddingBottom: showBottomNav ? "calc(48px + env(safe-area-inset-bottom))" : "2rem",
            }}
          >
            {children}
          </div>

          <TimerBubble />

          {showBottomNav && <BottomNav />}
        </div>
        {debugTouch && <DebugPointerOverlay />}
      </div>
    </TimerProvider>
  );
}
