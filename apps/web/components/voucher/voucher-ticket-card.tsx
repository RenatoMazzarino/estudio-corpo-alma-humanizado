import Image from "next/image";
import { MapPin } from "lucide-react";
import type { Ref } from "react";

interface VoucherTicketCardProps {
  innerRef?: Ref<HTMLDivElement>;
  capture?: boolean;
  clientName: string;
  dayLabel: string;
  timeLabel: string;
  serviceName: string;
  locationLabel: string;
  bookingId: string;
  className?: string;
}

export function VoucherTicketCard({
  innerRef,
  capture = false,
  clientName,
  dayLabel,
  timeLabel,
  serviceName,
  locationLabel,
  bookingId,
  className,
}: VoucherTicketCardProps) {
  const barcodePattern = [1, 2, 1, 3, 1, 4, 2, 1, 3, 1, 2, 1];
  const colors = {
    studioText: "#2C3333",
    dom: "#C0A4B0",
    black30: "rgba(0, 0, 0, 0.3)",
    white12: "rgba(255, 255, 255, 0.12)",
    notchCutout: "rgba(0, 0, 0, 0.68)",
    studioGreen25: "rgba(93, 110, 86, 0.25)",
    studioText80: "rgba(44, 51, 51, 0.8)",
    studioText60: "rgba(44, 51, 51, 0.6)",
  };

  return (
    <div
      ref={innerRef}
      data-voucher-capture={capture ? "true" : undefined}
      className={`w-full max-w-[420px] mx-auto bg-transparent relative rounded-[14px] overflow-hidden ${
        className ?? ""
      }`}
      style={capture ? undefined : { boxShadow: "0 16px 34px rgba(0, 0, 0, 0.18)" }}
    >
      <div className="bg-studio-green px-7 pt-4 pb-5 text-center relative overflow-hidden">
        <svg
          className="absolute top-0 right-0 w-32 h-32 pointer-events-none"
          style={{ color: colors.white12 }}
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M17 8c-9 2-11.1 8.17-13.18 13.34L5.71 22l.95-2.3c.48.17.98.3 1.34.3 11 0 14-17 14-17-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8Z" />
        </svg>
        <div className="relative z-10 flex flex-col items-center">
          <Image
            src="/brand/logo-white.png"
            alt="Ícone Estúdio Corpo & Alma Humanizado"
            width={58}
            height={58}
            className="h-14 w-14 object-contain mb-2"
          />
          <h3
            className="font-serif text-[26px] text-white leading-[1.12] mb-1"
            style={{ fontFamily: "var(--font-playfair), serif" }}
          >
            Estúdio Corpo & Alma
            <br />
            Humanizado
          </h3>
          <p
            className="font-serif italic text-[12px] text-white/85 leading-tight mb-2"
            style={{ fontFamily: "var(--font-playfair), serif" }}
          >
            Toque que alivia, cuidado que transforma.
          </p>
          <p className="font-signature text-[38px] -rotate-2 leading-none" style={{ color: colors.dom }}>
            Voucher de Serviço
          </p>
        </div>
      </div>

      <div className="relative h-0 z-10">
        <div
          className="absolute top-0 left-5 right-5 border-t-[3px] border-dotted"
          style={{ borderColor: colors.black30 }}
        />
        <div className="absolute -left-4 -top-4 w-8 h-8 rounded-full" style={{ backgroundColor: colors.notchCutout }} />
        <div className="absolute -right-4 -top-4 w-8 h-8 rounded-full" style={{ backgroundColor: colors.notchCutout }} />
      </div>

      <div className="voucher-paper-texture px-6 py-5 pb-4 text-center text-studio-text">
        <div className="flex items-center justify-center gap-2.5 mb-1">
          <span
            className="font-serif text-[52px] font-semibold leading-none"
            style={{ fontFamily: "var(--font-playfair), serif" }}
          >
            {dayLabel}
          </span>
          <span className="h-7 w-[2px]" style={{ backgroundColor: "rgba(44, 51, 51, 0.3)" }} />
          <span
            className="font-serif text-[52px] font-semibold leading-none"
            style={{ fontFamily: "var(--font-playfair), serif" }}
          >
            {timeLabel}
          </span>
        </div>
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] mb-4 truncate px-2">
          CLIENTE: {clientName || "CLIENTE"}
        </p>

        <div
          className="border rounded-xl p-4 mb-4"
          style={{
            borderColor: colors.studioGreen25,
            backgroundColor: "rgba(255, 255, 255, 0.5)",
          }}
        >
          <p className="text-xs font-bold uppercase tracking-[0.2em] mb-2 text-studio-green">
            Procedimento
          </p>
          <h3
            className="font-serif text-[56px] text-studio-green leading-[1.02] mb-2 break-words"
            style={{ fontFamily: "var(--font-playfair), serif" }}
          >
            {serviceName}
          </h3>
        </div>

        <div className="flex items-center justify-center gap-2 px-2" style={{ color: colors.studioText80 }}>
          <MapPin className="w-5 h-5 text-studio-green shrink-0" />
          <p
            className={
              capture
                ? "min-w-0 flex-1 text-sm font-medium leading-snug whitespace-normal break-words text-left"
                : "min-w-0 flex-1 text-sm font-medium truncate"
            }
            title={locationLabel}
          >
            {locationLabel}
          </p>
        </div>
      </div>

      <div className="relative h-0 z-10">
        <div
          className="absolute top-0 left-5 right-5 border-t-[3px] border-dotted"
          style={{ borderColor: colors.black30 }}
        />
        <div className="absolute -left-4 -top-4 w-8 h-8 rounded-full" style={{ backgroundColor: colors.notchCutout }} />
        <div className="absolute -right-4 -top-4 w-8 h-8 rounded-full" style={{ backgroundColor: colors.notchCutout }} />
      </div>

      <div className="voucher-paper-texture px-6 py-4 rounded-b-[14px] flex items-end justify-between gap-4">
        <div className="text-left flex-1 min-w-0">
          <p
            className="font-signature text-[50px] mb-1 ml-[-3px] leading-none whitespace-nowrap"
            style={{ color: colors.studioText, transform: "rotate(-3deg)" }}
          >
            Janaina Santos
          </p>
          <p className="text-[10px] font-semibold tracking-wide" style={{ color: colors.studioText60 }}>
            Gerado por Flora • ID {bookingId}
          </p>
        </div>
        <div className="h-12 flex items-end gap-[3px] opacity-85 shrink-0">
          {barcodePattern.map((width, index) => (
            <span
              key={`${index}-${width}`}
              className="inline-block h-full bg-studio-text"
              style={{ width: `${Math.max(1, width) * 3}px` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
