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
  const hideNav = pathname.startsWith("/atendimento") && process.env.NEXT_PUBLIC_ATTENDANCE_UIV4 === "1";

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
            <BottomNav />
          )}
        </div>
      </div>
    </TimerProvider>
  );
}
